/**
 * Gramps Web API Client
 */

import { authManager } from "./auth.js";
import { GrampsAPIError, NotFoundError } from "./utils/errors.js";
import { DEFAULT_TIMEOUT_MS } from "./constants.js";
import type { Config } from "./config.js";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
}

class GrampsClient {
  private baseUrl: string = "";

  /**
   * Initialize the client with configuration
   */
  initialize(config: Config): void {
    if (config.treeId) {
      this.baseUrl = `${config.apiUrl}/api/trees/${config.treeId}`;
    } else {
      this.baseUrl = `${config.apiUrl}/api`;
    }
  }

  /**
   * Make an authenticated request to the Gramps API
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, params, timeout = DEFAULT_TIMEOUT_MS } = options;

    // Build URL with query params
    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Get auth token
    const token = await authManager.getToken();

    // Prepare headers
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      // Handle 401 - try refreshing token once
      if (response.status === 401) {
        authManager.clearToken();
        const newToken = await authManager.refreshToken();

        headers.Authorization = `Bearer ${newToken}`;

        const retryResponse = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        if (!retryResponse.ok) {
          await this.handleErrorResponse(retryResponse, endpoint);
        }

        return (await retryResponse.json()) as T;
      }

      if (!response.ok) {
        await this.handleErrorResponse(response, endpoint);
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      if (error instanceof GrampsAPIError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new GrampsAPIError(`Request timeout after ${timeout}ms`, undefined, endpoint);
        }
        throw new GrampsAPIError(error.message, undefined, endpoint);
      }

      throw new GrampsAPIError(String(error), undefined, endpoint);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Handle error responses
   */
  private async handleErrorResponse(response: Response, endpoint: string): Promise<never> {
    let message = `${response.status} ${response.statusText}`;

    try {
      const errorBody = await response.text();
      if (errorBody) {
        const parsed = JSON.parse(errorBody);
        if (parsed.detail) {
          message = parsed.detail;
        } else if (parsed.message) {
          message = parsed.message;
        }
      }
    } catch {
      // Ignore JSON parse errors
    }

    if (response.status === 404) {
      throw new NotFoundError("Resource", endpoint);
    }

    throw new GrampsAPIError(message, response.status, endpoint);
  }

  /**
   * GET request helper
   */
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", params });
  }

  /**
   * POST request helper
   */
  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: "POST", body });
  }

  /**
   * PUT request helper
   */
  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: "PUT", body });
  }

  /**
   * DELETE request helper
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

// Export singleton instance
export const grampsClient = new GrampsClient();

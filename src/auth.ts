/**
 * JWT Authentication singleton for Gramps Web API
 */

import { API_ENDPOINTS, TOKEN_EXPIRY_BUFFER_MS } from "./constants.js";
import { AuthenticationError } from "./utils/errors.js";
import type { Config } from "./config.js";
import type { TokenResponse, JWTPayload } from "./types.js";

class AuthManager {
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private config: Config | null = null;
  private refreshPromise: Promise<string> | null = null;

  /**
   * Initialize the auth manager with configuration
   */
  initialize(config: Config): void {
    this.config = config;
    this.token = null;
    this.tokenExpiry = 0;
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getToken(): Promise<string> {
    if (!this.config) {
      throw new AuthenticationError("Auth manager not initialized");
    }

    // Return cached token if still valid
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    // If already refreshing, wait for that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Refresh the token
    this.refreshPromise = this.refreshToken();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Force a token refresh
   */
  async refreshToken(): Promise<string> {
    if (!this.config) {
      throw new AuthenticationError("Auth manager not initialized");
    }

    const url = `${this.config.apiUrl}/api${API_ENDPOINTS.TOKEN}`;

    // Gramps Web expects form-urlencoded data for token endpoint
    const body = new URLSearchParams({
      username: this.config.username,
      password: this.config.password,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AuthenticationError(
        `Failed to authenticate: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = (await response.json()) as TokenResponse;

    if (!data.access_token) {
      throw new AuthenticationError("No access token in response");
    }

    this.token = data.access_token;
    this.tokenExpiry = this.extractExpiry(data.access_token);

    return this.token;
  }

  /**
   * Extract expiry time from JWT token
   */
  private extractExpiry(token: string): number {
    try {
      // JWT format: header.payload.signature
      const parts = token.split(".");
      if (parts.length !== 3) {
        // Can't decode, use default expiry (1 hour)
        return Date.now() + 60 * 60 * 1000 - TOKEN_EXPIRY_BUFFER_MS;
      }

      // Decode the payload (base64url)
      const payload = parts[1];
      const decoded = Buffer.from(payload, "base64url").toString("utf-8");
      const parsed = JSON.parse(decoded) as JWTPayload;

      if (parsed.exp) {
        // exp is in seconds, convert to ms and subtract buffer
        return parsed.exp * 1000 - TOKEN_EXPIRY_BUFFER_MS;
      }

      // No exp claim, use default
      return Date.now() + 60 * 60 * 1000 - TOKEN_EXPIRY_BUFFER_MS;
    } catch {
      // Failed to parse, use default expiry
      return Date.now() + 60 * 60 * 1000 - TOKEN_EXPIRY_BUFFER_MS;
    }
  }

  /**
   * Clear the cached token
   */
  clearToken(): void {
    this.token = null;
    this.tokenExpiry = 0;
  }

  /**
   * Check if we have a valid token
   */
  hasValidToken(): boolean {
    return this.token !== null && Date.now() < this.tokenExpiry;
  }
}

// Export singleton instance
export const authManager = new AuthManager();

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should load config from environment variables", () => {
    process.env.GRAMPS_API_URL = "https://gramps.example.com";
    process.env.GRAMPS_USERNAME = "testuser";
    process.env.GRAMPS_PASSWORD = "testpass";

    const config = loadConfig();

    expect(config.apiUrl).toBe("https://gramps.example.com");
    expect(config.username).toBe("testuser");
    expect(config.password).toBe("testpass");
  });

  it("should normalize API URL by removing trailing slash", () => {
    process.env.GRAMPS_API_URL = "https://gramps.example.com/";
    process.env.GRAMPS_USERNAME = "testuser";
    process.env.GRAMPS_PASSWORD = "testpass";

    const config = loadConfig();

    expect(config.apiUrl).toBe("https://gramps.example.com");
  });

  it("should throw error when GRAMPS_API_URL is missing", () => {
    process.env.GRAMPS_USERNAME = "testuser";
    process.env.GRAMPS_PASSWORD = "testpass";
    delete process.env.GRAMPS_API_URL;

    expect(() => loadConfig()).toThrow("GRAMPS_API_URL");
  });

  it("should throw error when GRAMPS_USERNAME is missing", () => {
    process.env.GRAMPS_API_URL = "https://gramps.example.com";
    process.env.GRAMPS_PASSWORD = "testpass";
    delete process.env.GRAMPS_USERNAME;

    expect(() => loadConfig()).toThrow("GRAMPS_USERNAME");
  });

  it("should throw error when GRAMPS_PASSWORD is missing", () => {
    process.env.GRAMPS_API_URL = "https://gramps.example.com";
    process.env.GRAMPS_USERNAME = "testuser";
    delete process.env.GRAMPS_PASSWORD;

    expect(() => loadConfig()).toThrow("GRAMPS_PASSWORD");
  });

  it("should list all missing variables in error message", () => {
    delete process.env.GRAMPS_API_URL;
    delete process.env.GRAMPS_USERNAME;
    delete process.env.GRAMPS_PASSWORD;

    expect(() => loadConfig()).toThrow("GRAMPS_API_URL");
    expect(() => loadConfig()).toThrow("GRAMPS_USERNAME");
    expect(() => loadConfig()).toThrow("GRAMPS_PASSWORD");
  });
});

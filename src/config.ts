/**
 * Environment configuration with validation
 */

export interface Config {
  apiUrl: string;
  username: string;
  password: string;
}

export function loadConfig(): Config {
  const apiUrl = process.env.GRAMPS_API_URL;
  const username = process.env.GRAMPS_USERNAME;
  const password = process.env.GRAMPS_PASSWORD;

  const missing: string[] = [];

  if (!apiUrl) missing.push("GRAMPS_API_URL");
  if (!username) missing.push("GRAMPS_USERNAME");
  if (!password) missing.push("GRAMPS_PASSWORD");

  if (missing.length > 0 || !apiUrl || !username || !password) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n\n` +
        "Please configure the following environment variables:\n" +
        "  GRAMPS_API_URL  - Base URL of your Gramps Web instance (e.g., https://gramps.example.com)\n" +
        "  GRAMPS_USERNAME - Your Gramps Web username\n" +
        "  GRAMPS_PASSWORD - Your Gramps Web password"
    );
  }

  // Normalize the API URL (remove trailing slash)
  const normalizedUrl = apiUrl.replace(/\/+$/, "");

  return {
    apiUrl: normalizedUrl,
    username: username,
    password: password,
  };
}

import { describe, it, expect } from "vitest";
import {
  formatPersonName,
  formatDate,
  formatPerson,
  formatSearchResults,
} from "./formatting.js";
import type { Person, PersonName, DateObject } from "../types.js";

describe("formatPersonName", () => {
  it("should format a full name", () => {
    const name: PersonName = {
      title: "Dr.",
      first_name: "John",
      surname: "Smith",
      suffix: "Jr.",
    };
    expect(formatPersonName(name)).toBe("Dr. John Smith Jr.");
  });

  it("should format a simple name", () => {
    const name: PersonName = {
      first_name: "Jane",
      surname: "Doe",
    };
    expect(formatPersonName(name)).toBe("Jane Doe");
  });

  it("should return Unknown for empty name", () => {
    expect(formatPersonName(undefined)).toBe("Unknown");
    expect(formatPersonName({})).toBe("Unknown");
  });
});

describe("formatDate", () => {
  it("should format a date with dateval", () => {
    const date: DateObject = {
      dateval: [15, 6, 1985],
    };
    expect(formatDate(date)).toBe("15-06-1985");
  });

  it("should format a date with text", () => {
    const date: DateObject = {
      text: "circa 1850",
    };
    expect(formatDate(date)).toBe("circa 1850");
  });

  it("should return empty string for undefined date", () => {
    expect(formatDate(undefined)).toBe("");
  });
});

describe("formatPerson", () => {
  it("should format a person with basic info", () => {
    const person: Person = {
      handle: "abc123",
      gramps_id: "I0001",
      primary_name: {
        first_name: "John",
        surname: "Smith",
      },
      gender: 1,
    };

    const result = formatPerson(person);

    expect(result).toContain("Person: John Smith");
    expect(result).toContain("Handle: abc123");
    expect(result).toContain("Gramps ID: I0001");
    expect(result).toContain("Gender: Male");
  });
});

describe("formatSearchResults", () => {
  it("should format empty results", () => {
    expect(formatSearchResults([])).toBe("No results found.");
  });

  it("should format multiple results", () => {
    const results = [
      {
        object_type: "person",
        object: {
          handle: "abc123",
          gramps_id: "I0001",
          primary_name: { first_name: "John", surname: "Smith" },
        } as Person,
      },
    ];

    const result = formatSearchResults(results);

    expect(result).toContain("Found 1 result(s):");
    expect(result).toContain("John Smith");
  });
});

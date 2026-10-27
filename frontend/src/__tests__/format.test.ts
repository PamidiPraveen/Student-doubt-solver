import { describe, expect, it } from "vitest";
import { formatDate, relativeTime } from "../lib/format";
import { isCode, messageFor } from "../lib/messages";
import { ApiError } from "../api/client";

describe("format", () => {
  it("treats timestamps without a zone as UTC", () => {
    expect(relativeTime("2026-01-01T10:00:00", Date.parse("2026-01-01T10:00:30Z"))).toBe("just now");
    expect(relativeTime("2026-01-01T10:00:00Z", Date.parse("2026-01-01T12:00:00Z"))).toBe("2 h ago");
  });
  it("returns empty text for missing dates", () => {
    expect(formatDate(null)).toBe("");
  });
});

describe("messages", () => {
  it("uses friendly text for known codes and the server text otherwise", () => {
    expect(messageFor(new ApiError(401, "INVALID_CREDENTIALS", "x"))).toMatch(/not correct/);
    expect(messageFor(new ApiError(400, "SOMETHING_NEW", "Server said this"))).toBe("Server said this");
    expect(messageFor(new Error("boom"))).toMatch(/Something went wrong/);
  });
  it("matches codes", () => {
    expect(isCode(new ApiError(409, "A", "x"), "A", "B")).toBe(true);
    expect(isCode(new Error("x"), "A")).toBe(false);
  });
});

import { canVisit } from "../lib/auth";
import type { User } from "../api/types";

describe("canVisit", () => {
  const user = (role: User["role"]): User => ({ id: 1, name: "n", email: "e", role });
  it("only allows pages that belong to the role", () => {
    expect(canVisit(user("student"), "/app/ask")).toBe(true);
    expect(canVisit(user("faculty"), "/app")).toBe(false);
    expect(canVisit(user("student"), "/faculty")).toBe(false);
    expect(canVisit(user("faculty"), "/questions/4")).toBe(true);
  });
});

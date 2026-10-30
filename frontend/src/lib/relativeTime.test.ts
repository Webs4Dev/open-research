import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { relativeTime } from "./relativeTime";

const NOW = new Date("2026-10-30T12:00:00Z").getTime();
const ago = (seconds: number) => NOW - seconds * 1000;

describe("relativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it.each([
    [30, "just now"],
    [60, "1 min ago"],
    [5 * 60, "5 mins ago"],
    [3600, "1 hour ago"],
    [3 * 86400, "3 days ago"],
  ])("%i seconds ago reads as %s", (seconds, expected) => {
    expect(relativeTime(ago(seconds))).toBe(expected);
  });

  it("switches to a date after a week", () => {
    expect(relativeTime(ago(8 * 86400))).toBe(new Date(ago(8 * 86400)).toLocaleDateString());
  });
});

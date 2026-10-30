import { describe, expect, it } from "vitest";
import { sourceMeta } from "./sources";

describe("sourceMeta", () => {
  it("labels known sources", () => {
    expect(sourceMeta("semantic_scholar").label).toBe("Semantic Scholar");
  });

  it("groups per-site web results under Web", () => {
    expect(sourceMeta("web_blog")).toEqual(sourceMeta("web"));
  });

  it("shows an unknown source by its own name in neutral colours", () => {
    expect(sourceMeta("dblp")).toMatchObject({ label: "dblp", chip: "bg-surface-2 text-ink-muted" });
  });
});

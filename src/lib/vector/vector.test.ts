import { describe, expect, it } from "vitest";
import { keywordSearch, type SearchableDoc } from "./index";

const corpus: SearchableDoc[] = [
  {
    id: "writing",
    text: "Freelance writing services. Write articles and newsletters for businesses.",
    keywords: ["online", "service", "cheap free low cost no money"],
  },
  {
    id: "pressure",
    text: "Pressure washing service. Clean driveways and siding for homeowners.",
    keywords: ["local in-person", "service"],
  },
  {
    id: "pod",
    text: "Print on demand store. Sell apparel with no inventory, a supplier prints each order.",
    keywords: ["online", "product physical"],
  },
];

describe("keywordSearch", () => {
  it("ranks the inventory-free option highest for a no-inventory query", () => {
    const hits = keywordSearch("something with no inventory I can do online", corpus);
    expect(hits[0].id).toBe("pod");
  });

  it("matches writing intent to the writing opportunity", () => {
    const hits = keywordSearch("a way to use my writing skills for businesses", corpus);
    expect(hits[0].id).toBe("writing");
  });

  it("returns nothing for an empty / stopword-only query", () => {
    expect(keywordSearch("i want to make money online", corpus)).toEqual([]);
  });

  it("scores are within 0..1 and sorted descending", () => {
    const hits = keywordSearch("clean driveways for homeowners locally", corpus);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id).toBe("pressure");
    for (const h of hits) {
      expect(h.score).toBeGreaterThan(0);
      expect(h.score).toBeLessThanOrEqual(1);
    }
    expect([...hits].sort((a, b) => b.score - a.score)).toEqual(hits);
  });
});

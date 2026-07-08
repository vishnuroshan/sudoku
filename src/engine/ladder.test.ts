import { describe, it, expect } from "vitest";
import { gradePuzzle } from "./ladder.ts";
import type { Grid } from "./types.ts";

function parse(s: string): Grid {
  const cells = s.replace(/[^0-9.]/g, "").replace(/\./g, "0");
  return Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => Number(cells[r * 9 + c])),
  );
}

const singlesOnly = parse(
  "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79",
);

const seventeenClueEasy = parse(
  ".......1.4.........2...........5.4.7..8...3....1.9....3..4..2...5.1........8.6...",
);

const escargot = parse(
  "1....7.9..3..2...8..96..5....53..9...1..8...26....4...3......1..4......7..7...3..",
);

describe("gradePuzzle", () => {
  it("grades a singles-only puzzle as tier 1", () => {
    const grade = gradePuzzle(singlesOnly);
    expect(grade.tier).toBe(1);
  });

  it("grades the classic 17-clue puzzle as tier 1 despite minimal clues", () => {
    const grade = gradePuzzle(seventeenClueEasy);
    expect(grade.tier).toBe(1);
    expect(grade.hardest).toBe("hidden-single");
  });

  it("grades AI Escargot (SE 10.5) as tier 5", () => {
    const grade = gradePuzzle(escargot);
    expect(grade.tier).toBe(5);
    expect(grade.hardest).toBe("beyond-ladder");
  });

  it("grades a complete grid as tier 1", () => {
    const solved = parse(
      "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
    );
    expect(gradePuzzle(solved).tier).toBe(1);
  });

  it("does not mutate its input", () => {
    const copy = escargot.map((row) => [...row]);
    gradePuzzle(escargot);
    expect(escargot).toEqual(copy);
  });
});

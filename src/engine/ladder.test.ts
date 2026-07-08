import { describe, it, expect } from "vitest";
import { gradePuzzle, nextStep, describeStep, computeCandidates } from "./ladder.ts";
import { solveGrid } from "./dlx.ts";
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

describe("nextStep", () => {
  it("returns a placement that agrees with the true solution", () => {
    const solution = solveGrid(singlesOnly)!;
    const step = nextStep(singlesOnly);
    expect(step).not.toBeNull();
    expect(step!.place).toBeDefined();
    const { cell, digit } = step!.place!;
    expect(digit).toBe(solution[Math.floor(cell / 9)][cell % 9]);
  });

  it("returns null for a complete grid", () => {
    const solved = solveGrid(singlesOnly)!;
    expect(nextStep(solved)).toBeNull();
  });

  it("describes a step in human terms", () => {
    const step = nextStep(singlesOnly)!;
    const text = describeStep(step);
    expect(text).toMatch(/single: \d goes in R\dC\d/);
  });
});

describe("computeCandidates", () => {
  it("is empty for filled cells and excludes peer digits elsewhere", () => {
    const solution = solveGrid(singlesOnly)!;
    const candidates = computeCandidates(singlesOnly);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (singlesOnly[r][c] !== 0) {
          expect(candidates[r][c]).toEqual([]);
          continue;
        }
        expect(candidates[r][c]).toContain(solution[r][c]);
        for (let i = 0; i < 9; i++) {
          if (singlesOnly[r][i] !== 0) {
            expect(candidates[r][c]).not.toContain(singlesOnly[r][i]);
          }
        }
      }
    }
  });
});

import { describe, it, expect } from "vitest";
import { generatePuzzle } from "./generate.ts";
import { countSolutions } from "./dlx.ts";
import { gradePuzzle } from "./ladder.ts";
import type { Grid, Difficulty } from "./types.ts";

const DIFFICULTIES: [Difficulty, number][] = [
  ["easy", 1],
  ["medium", 2],
  ["hard", 3],
  ["master", 4],
  ["extreme", 5],
];

function clueCount(grid: Grid): number {
  return grid.flat().filter((v) => v !== 0).length;
}

function isValidComplete(grid: Grid): boolean {
  for (let i = 0; i < 9; i++) {
    const row = new Set<number>();
    const col = new Set<number>();
    const box = new Set<number>();
    for (let j = 0; j < 9; j++) {
      row.add(grid[i][j]);
      col.add(grid[j][i]);
      box.add(grid[Math.floor(i / 3) * 3 + Math.floor(j / 3)][(i % 3) * 3 + (j % 3)]);
    }
    if (row.size !== 9 || col.size !== 9 || box.size !== 9) return false;
    if (row.has(0)) return false;
  }
  return true;
}

describe.each(DIFFICULTIES)("generatePuzzle(%s)", (difficulty, targetTier) => {
  const runs = Array.from({ length: 5 }, () => generatePuzzle(difficulty));

  it("returns a valid complete solution", () => {
    for (const { solved } of runs) {
      expect(isValidComplete(solved)).toBe(true);
    }
  });

  it("returns a puzzle whose givens match the solution", () => {
    for (const { solved, puzzle } of runs) {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (puzzle[r][c] !== 0) expect(puzzle[r][c]).toBe(solved[r][c]);
        }
      }
    }
  });

  it("returns a puzzle with exactly one solution", () => {
    for (const { puzzle } of runs) {
      expect(countSolutions(puzzle)).toBe(1);
    }
  });

  it(`grades at tier ${targetTier}`, () => {
    for (const { puzzle, grade } of runs) {
      expect(grade.tier).toBe(targetTier);
      expect(gradePuzzle(puzzle)).toEqual(grade);
    }
  });

  it("keeps at least 17 clues", () => {
    for (const { puzzle } of runs) {
      expect(clueCount(puzzle)).toBeGreaterThanOrEqual(17);
    }
  });

  it("has 180° rotational symmetry", () => {
    for (const { puzzle } of runs) {
      for (let cell = 0; cell < 81; cell++) {
        const twin = 80 - cell;
        expect(puzzle[Math.floor(cell / 9)][cell % 9] !== 0).toBe(
          puzzle[Math.floor(twin / 9)][twin % 9] !== 0,
        );
      }
    }
  });
});

describe("extreme puzzles", () => {
  it("are pair-minimal: removing any symmetric clue pair breaks uniqueness", () => {
    const { puzzle } = generatePuzzle("extreme");
    for (let i = 0; i <= 40; i++) {
      const cells = i === 40 ? [40] : [i, 80 - i];
      const values = cells.map((cell) => puzzle[Math.floor(cell / 9)][cell % 9]);
      if (values.every((v) => v === 0)) continue;
      for (const cell of cells) puzzle[Math.floor(cell / 9)][cell % 9] = 0;
      expect(countSolutions(puzzle)).toBeGreaterThan(1);
      cells.forEach((cell, j) => {
        puzzle[Math.floor(cell / 9)][cell % 9] = values[j];
      });
    }
  });
});

describe("difficulty spread", () => {
  it("hard puzzles exercise a range of tier-3 techniques", () => {
    const names = new Set(
      Array.from({ length: 15 }, () => generatePuzzle("hard").grade.hardest),
    );
    expect(names.size).toBeGreaterThan(1);
    for (const name of names) {
      expect([
        "naked-triple",
        "hidden-triple",
        "x-wing",
        "naked-quad",
        "hidden-quad",
        "swordfish",
        "xy-wing",
        "xyz-wing",
      ]).toContain(name);
    }
  });

  it("master puzzles top out at coloring or w-wing", () => {
    for (let i = 0; i < 5; i++) {
      const { grade } = generatePuzzle("master");
      expect(["simple-coloring", "w-wing"]).toContain(grade.hardest);
    }
  });
});

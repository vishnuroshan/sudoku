import { describe, it, expect } from "vitest";
import { solveGrid, countSolutions, randomSolvedGrid } from "./dlx.ts";
import type { Grid } from "./types.ts";

function parse(s: string): Grid {
  const cells = s.replace(/[^0-9.]/g, "").replace(/\./g, "0");
  return Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => Number(cells[r * 9 + c])),
  );
}

function isCompleteAndValid(grid: Grid): boolean {
  for (const unit of allUnits()) {
    const seen = new Set(unit.map(([r, c]) => grid[r][c]));
    if (seen.size !== 9 || seen.has(0)) return false;
  }
  return true;
}

function allUnits(): [number, number][][] {
  const units: [number, number][][] = [];
  for (let i = 0; i < 9; i++) {
    units.push(Array.from({ length: 9 }, (_, j) => [i, j] as [number, number]));
    units.push(Array.from({ length: 9 }, (_, j) => [j, i] as [number, number]));
    const br = Math.floor(i / 3) * 3;
    const bc = (i % 3) * 3;
    units.push(
      Array.from({ length: 9 }, (_, j) => [br + Math.floor(j / 3), bc + (j % 3)] as [number, number]),
    );
  }
  return units;
}

const uniquePuzzle = parse(`
  53..7....
  6..195...
  .98....6.
  8...6...3
  4..8.3..1
  7...2...6
  .6....28.
  ...419..5
  ....8..79
`);

const uniqueSolution = parse(`
  534678912
  672195348
  198342567
  859761423
  426853791
  713924856
  961537284
  287419635
  345286179
`);

const seventeenClue = parse(`
  .......1.
  4........
  .2.......
  ....5.4.7
  ..8...3..
  ..1.9....
  3..4..2..
  .5.1.....
  ...8.6...
`);

const multiSolution = parse(`
  .........
  .........
  .........
  ....5.4.7
  ..8...3..
  ..1.9....
  3..4..2..
  .5.1.....
  ...8.6...
`);

const unsolvable = parse(`
  12345678.
  .........
  .........
  .........
  .........
  .........
  .........
  .........
  ........9
`);

describe("solveGrid", () => {
  it("solves a known puzzle to its published solution", () => {
    expect(solveGrid(uniquePuzzle)).toEqual(uniqueSolution);
  });

  it("solves a 17-clue puzzle", () => {
    const solution = solveGrid(seventeenClue);
    expect(solution).not.toBeNull();
    expect(isCompleteAndValid(solution!)).toBe(true);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (seventeenClue[r][c] !== 0) {
          expect(solution![r][c]).toBe(seventeenClue[r][c]);
        }
      }
    }
  });

  it("returns null for an unsolvable grid", () => {
    expect(solveGrid(unsolvable)).toBeNull();
  });

  it("returns null for a grid with duplicate clues in a row", () => {
    const invalid = parse(`
      11.......
      .........
      .........
      .........
      .........
      .........
      .........
      .........
      .........
    `);
    expect(solveGrid(invalid)).toBeNull();
  });

  it("does not mutate its input", () => {
    const copy = uniquePuzzle.map((row) => [...row]);
    solveGrid(uniquePuzzle);
    expect(uniquePuzzle).toEqual(copy);
  });
});

describe("countSolutions", () => {
  it("returns 1 for a proper puzzle", () => {
    expect(countSolutions(uniquePuzzle)).toBe(1);
  });

  it("returns 1 for a 17-clue proper puzzle", () => {
    expect(countSolutions(seventeenClue)).toBe(1);
  });

  it("returns 2 (capped) for an underdetermined grid", () => {
    expect(countSolutions(multiSolution)).toBe(2);
  });

  it("respects a higher limit", () => {
    expect(countSolutions(multiSolution, 10)).toBe(10);
  });

  it("returns 0 for an unsolvable grid", () => {
    expect(countSolutions(unsolvable)).toBe(0);
  });

  it("leaves the matrix reusable across calls", () => {
    expect(countSolutions(multiSolution)).toBe(2);
    expect(countSolutions(uniquePuzzle)).toBe(1);
    expect(solveGrid(uniquePuzzle)).toEqual(uniqueSolution);
  });
});

describe("randomSolvedGrid", () => {
  it("produces complete valid grids", () => {
    for (let i = 0; i < 5; i++) {
      expect(isCompleteAndValid(randomSolvedGrid())).toBe(true);
    }
  });

  it("produces different grids across runs", () => {
    const a = JSON.stringify(randomSolvedGrid());
    const b = JSON.stringify(randomSolvedGrid());
    expect(a).not.toBe(b);
  });
});

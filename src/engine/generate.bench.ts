import { bench, describe } from "vitest";
import { generatePuzzle } from "./generate.ts";
import { countSolutions, randomSolvedGrid, solveGrid } from "./dlx.ts";
import { gradePuzzle } from "./ladder.ts";
import type { Difficulty } from "./types.ts";

describe("generatePuzzle", () => {
  for (const d of ["easy", "medium", "hard", "master", "extreme"] as Difficulty[]) {
    bench(d, () => {
      generatePuzzle(d);
    });
  }
});

describe("primitives", () => {
  const puzzle = generatePuzzle("extreme").puzzle;

  bench("randomSolvedGrid", () => {
    randomSolvedGrid();
  });

  bench("countSolutions (minimal puzzle)", () => {
    countSolutions(puzzle);
  });

  bench("solveGrid (minimal puzzle)", () => {
    solveGrid(puzzle);
  });

  bench("gradePuzzle (minimal puzzle)", () => {
    gradePuzzle(puzzle);
  });
});

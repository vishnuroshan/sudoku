import { shuffle } from "lodash-es";
import { countSolutions, randomSolvedGrid } from "./dlx.ts";
import { gradePuzzle } from "./ladder.ts";
import type { Grade, Tier } from "./ladder.ts";
import type { Grid, Difficulty } from "./types.ts";

export interface GeneratedPuzzle {
  solved: Grid;
  puzzle: Grid;
  grade: Grade;
}

const TARGET_TIER: Record<Difficulty, Tier> = {
  easy: 1,
  medium: 2,
  hard: 3,
  master: 4,
  extreme: 5,
};

const CLUE_FLOOR: Record<Difficulty, number> = {
  easy: 36,
  medium: 30,
  hard: 25,
  master: 22,
  extreme: 0,
};

const MAX_ATTEMPTS = 100;

// 180°-rotational pairs (i, 80 - i); the center cell 40 stands alone.
const SYMMETRIC_PAIRS: number[][] = [
  ...Array.from({ length: 40 }, (_, i) => [i, 80 - i]),
  [40],
];

const cloneGrid = (g: Grid): Grid => g.map((row) => [...row]);

interface Carve {
  puzzle: Grid;
  grade: Grade;
}

function removePair(puzzle: Grid, pair: number[]): number[] {
  const values = pair.map((cell) => puzzle[Math.floor(cell / 9)][cell % 9]);
  for (const cell of pair) puzzle[Math.floor(cell / 9)][cell % 9] = 0;
  return values;
}

function restorePair(puzzle: Grid, pair: number[], values: number[]) {
  pair.forEach((cell, i) => {
    puzzle[Math.floor(cell / 9)][cell % 9] = values[i];
  });
}

// Both solution count and graded tier are monotone under clue removal, so a
// pair that fails either check can never succeed later: one shuffled pass
// is enough, no re-sweeps needed.
function carveBounded(solved: Grid, target: Tier, floor: number): Carve {
  const puzzle = cloneGrid(solved);
  let grade: Grade = { tier: 1, hardest: "naked-single" };
  let clues = 81;

  for (const pair of shuffle(SYMMETRIC_PAIRS)) {
    if (clues <= floor && grade.tier === target) break;
    const values = removePair(puzzle, pair);

    if (countSolutions(puzzle) !== 1) {
      restorePair(puzzle, pair, values);
      continue;
    }
    const next = gradePuzzle(puzzle);
    if (next.tier > target) {
      restorePair(puzzle, pair, values);
      continue;
    }
    grade = next;
    clues -= pair.length;
  }

  return { puzzle, grade };
}

function carveMinimal(solved: Grid, symmetric: boolean): Carve {
  const puzzle = cloneGrid(solved);
  const groups = symmetric
    ? SYMMETRIC_PAIRS
    : Array.from({ length: 81 }, (_, i) => [i]);
  for (const pair of shuffle(groups)) {
    const values = removePair(puzzle, pair);
    if (countSolutions(puzzle) !== 1) restorePair(puzzle, pair, values);
  }
  return { puzzle, grade: gradePuzzle(puzzle) };
}

export function generatePuzzle(difficulty: Difficulty): GeneratedPuzzle {
  const target = TARGET_TIER[difficulty];
  let best: GeneratedPuzzle | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const solved = randomSolvedGrid();
    const { puzzle, grade } =
      target === 5
        ? carveMinimal(solved, true)
        : carveBounded(solved, target, CLUE_FLOOR[difficulty]);

    if (grade.tier === target) return { solved, puzzle, grade };

    if (
      !best ||
      Math.abs(grade.tier - target) < Math.abs(best.grade.tier - target)
    ) {
      best = { solved, puzzle, grade };
    }
  }

  return best!;
}

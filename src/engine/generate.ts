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

const MAX_ATTEMPTS = 50;

const CELLS = Array.from({ length: 81 }, (_, i) => i);

const cloneGrid = (g: Grid): Grid => g.map((row) => [...row]);

interface Carve {
  puzzle: Grid;
  grade: Grade;
}

// Both solution count and graded tier are monotone under clue removal, so a
// removal that fails either check can never succeed later: one shuffled pass
// is enough, no re-sweeps needed.
function carveBounded(solved: Grid, target: Tier, floor: number): Carve {
  const puzzle = cloneGrid(solved);
  let grade: Grade = { tier: 1, hardest: "naked-single" };
  let clues = 81;

  for (const cell of shuffle(CELLS)) {
    if (clues <= floor && grade.tier === target) break;
    const r = Math.floor(cell / 9);
    const c = cell % 9;
    const value = puzzle[r][c];
    puzzle[r][c] = 0;

    if (countSolutions(puzzle) !== 1) {
      puzzle[r][c] = value;
      continue;
    }
    const next = gradePuzzle(puzzle);
    if (next.tier > target) {
      puzzle[r][c] = value;
      continue;
    }
    grade = next;
    clues--;
  }

  return { puzzle, grade };
}

function carveMinimal(solved: Grid): Carve {
  const puzzle = cloneGrid(solved);
  for (const cell of shuffle(CELLS)) {
    const r = Math.floor(cell / 9);
    const c = cell % 9;
    const value = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(puzzle) !== 1) puzzle[r][c] = value;
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
        ? carveMinimal(solved)
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

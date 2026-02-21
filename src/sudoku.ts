import { shuffle } from "lodash-es";

// ─── Types ───────────────────────────────────────────────────────────────────
// Grid is a 9x9 2D array. 0 means empty cell.
export type Grid = number[][];

export type Difficulty = "easy" | "medium" | "hard";

// How many clues (filled cells) to leave for each difficulty.
export const DIFFICULTY_CLUES: Record<
  Difficulty,
  { min: number; max: number }
> = {
  easy: { min: 27, max: 32 },
  medium: { min: 25, max: 27 },
  hard: { min: 17, max: 19 },
};

// Log callback — used to stream generation/solver events to the UI.
type LogFn = (message: string) => void;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a deep copy of a grid so mutations don't leak. */
export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

/**
 * Check whether placing `num` at (row, col) violates Sudoku constraints.
 *
 * Three rules:
 *  1. No duplicate in the same row.
 *  2. No duplicate in the same column.
 *  3. No duplicate in the 3×3 box the cell belongs to.
 */
export function isValid(
  grid: Grid,
  row: number,
  col: number,
  num: number,
): boolean {
  // Row check
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === num) return false;
  }

  // Column check
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num) return false;
  }

  // 3×3 box check
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }

  return true;
}

// ─── Solver ──────────────────────────────────────────────────────────────────

/**
 * Backtracking solver that fills the first empty cell it finds.
 * Returns true if a solution exists (grid is mutated in place).
 */
export function solve(grid: Grid): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] !== 0) continue;

      for (let num = 1; num <= 9; num++) {
        if (!isValid(grid, row, col, num)) continue;
        grid[row][col] = num;
        if (solve(grid)) return true;
        grid[row][col] = 0; // backtrack
      }

      // No valid number fits → dead end.
      return false;
    }
  }
  // No empty cell left → solved!
  return true;
}

/**
 * Count the number of solutions a grid has using backtracking.
 *
 * We stop early as soon as we find MORE than 1 solution because we only
 * care about uniqueness (exactly 1 solution). Continuing beyond 2 would
 * be wasted work.
 */
export function countSolutions(grid: Grid): number {
  let count = 0;

  function search(): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] !== 0) continue;

        for (let num = 1; num <= 9; num++) {
          if (!isValid(grid, row, col, num)) continue;
          grid[row][col] = num;

          // Recurse. If we already found 2+ solutions, bail out.
          if (search()) return true;

          grid[row][col] = 0; // backtrack
        }

        // Tried all numbers for this cell, none led to a new solution path
        // beyond what we already counted. Dead end for this branch.
        return false;
      }
    }

    // Reached here → the grid is fully filled → found a solution.
    count++;
    // Return true to stop early once we exceed 1 solution.
    return count > 1;
  }

  search();
  return count;
}

// ─── Full Grid Generation ────────────────────────────────────────────────────

/**
 * Generate a complete, valid 9×9 Sudoku grid using backtracking with
 * randomised number ordering.
 *
 * For each empty cell we shuffle the candidates 1–9 so that every run
 * produces a different grid. Backtracking ensures the result always
 * satisfies all Sudoku constraints.
 */
export function generateFullGrid(log: LogFn): Grid {
  // Start with an empty grid.
  const grid: Grid = Array.from({ length: 9 }, () => Array(9).fill(0));

  function fill(row: number, col: number): boolean {
    // Advance to the next row when we reach the end of a column.
    if (col === 9) {
      row++;
      col = 0;
    }
    // If we've passed the last row, the grid is complete.
    if (row === 9) return true;

    // Shuffle 1–9 so the grid is different each time.
    const candidates = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    for (const num of candidates) {
      if (!isValid(grid, row, col, num)) continue;

      grid[row][col] = num;
      log(`Placed ${num} at (${row}, ${col})`);

      if (fill(row, col + 1)) return true;

      // Backtrack — this path didn't work out.
      grid[row][col] = 0;
      log(`Backtracked at (${row}, ${col})`);
    }

    return false;
  }

  fill(0, 0);
  return grid;
}

// ─── Puzzle Creation (Removal Phase) ─────────────────────────────────────────

/**
 * Generate a puzzle for the given difficulty.
 *
 * Strategy:
 *  1. Generate a fresh solved grid.
 *  2. Run a single removal pass — try to remove as many cells as possible
 *     while preserving a unique solution.
 *  3. If the resulting clue count falls within the difficulty range, we're done.
 *     Otherwise, start over with a new grid (different grids allow different
 *     amounts of removal).
 *
 * A max-attempts safeguard prevents infinite loops. If we can't hit the
 * exact range we return the best attempt so far.
 */
export function generatePuzzle(
  difficulty: Difficulty,
  log: LogFn,
): { solved: Grid; puzzle: Grid } {
  const { min: minClues, max: maxClues } = DIFFICULTY_CLUES[difficulty];
  const maxAttempts = 50;

  let bestResult: { solved: Grid; puzzle: Grid; clues: number } | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    log(`--- Attempt ${attempt} ---`);
    log("Generating full grid...");
    const solved = generateFullGrid(log);

    log("Removing cells...");
    const puzzle = removeCells(solved, difficulty, log);

    const clues = puzzle.flat().filter((v) => v !== 0).length;
    log(`Attempt ${attempt} result: ${clues} clues`);

    // Track the closest result in case we never land exactly in range.
    if (
      !bestResult ||
      Math.abs(clues - minClues) < Math.abs(bestResult.clues - minClues)
    ) {
      bestResult = { solved: cloneGrid(solved), puzzle, clues };
    }

    if (clues >= minClues && clues <= maxClues) {
      log(`✓ Puzzle accepted with ${clues} clues (target ${minClues}–${maxClues})`);
      return { solved: cloneGrid(solved), puzzle };
    }

    log(`Clues ${clues} not in range ${minClues}–${maxClues}, retrying...`);
  }

  // Fallback to the best attempt we found.
  log(`Max attempts reached. Using best result with ${bestResult!.clues} clues.`);
  return { solved: bestResult!.solved, puzzle: bestResult!.puzzle };
}

/**
 * Single-pass removal: try to remove as many cells as possible from a solved
 * grid while keeping exactly one solution.
 */
function removeCells(
  solvedGrid: Grid,
  difficulty: Difficulty,
  log: LogFn,
): Grid {
  const puzzle = cloneGrid(solvedGrid);
  const { min: minClues } = DIFFICULTY_CLUES[difficulty];
  const maxRemovals = 81 - minClues;

  // Build a shuffled list of all 81 cell positions.
  const positions: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  const shuffledPositions = shuffle(positions);

  let removed = 0;

  for (const [row, col] of shuffledPositions) {
    if (removed >= maxRemovals) break;

    const value = puzzle[row][col];
    if (value === 0) continue;

    puzzle[row][col] = 0;
    log(`Trying to remove ${value} from (${row}, ${col})`);

    const solutions = countSolutions(cloneGrid(puzzle));

    if (solutions !== 1) {
      puzzle[row][col] = value;
      log(`Reverted (${row}, ${col}) — ${solutions} solutions detected`);
    } else {
      removed++;
      log(`Removed ${value} from (${row}, ${col}) — unique solution preserved`);
    }
  }

  log(`Pass complete: removed ${removed} cells, ${81 - removed} clues remain`);
  return puzzle;
}

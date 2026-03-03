import type { Grid, Difficulty } from "../sudoku";

export type { Grid, Difficulty };

export type NotesGrid = number[][][];

export const DIFFICULTIES: Difficulty[] = [
  "easy",
  "medium",
  "hard",
  "master",
  "extreme",
];

export function createEmptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

export function cloneGrid(g: Grid): Grid {
  return g.map((row) => [...row]);
}

export function createEmptyNotesGrid(): NotesGrid {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
}

export function getConflicts(grid: Grid, puzzleGrid: Grid): Set<string> {
  const conflicts = new Set<string>();

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = grid[r][c];
      if (val === 0) continue;
      if (puzzleGrid[r][c] !== 0) continue;

      for (let cc = 0; cc < 9; cc++) {
        if (cc !== c && grid[r][cc] === val) {
          conflicts.add(`${r},${c}`);
          conflicts.add(`${r},${cc}`);
        }
      }
      for (let rr = 0; rr < 9; rr++) {
        if (rr !== r && grid[rr][c] === val) {
          conflicts.add(`${r},${c}`);
          conflicts.add(`${rr},${c}`);
        }
      }
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let rr = br; rr < br + 3; rr++) {
        for (let cc = bc; cc < bc + 3; cc++) {
          if ((rr !== r || cc !== c) && grid[rr][cc] === val) {
            conflicts.add(`${r},${c}`);
            conflicts.add(`${rr},${cc}`);
          }
        }
      }
    }
  }
  return conflicts;
}

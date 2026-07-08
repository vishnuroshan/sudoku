import { shuffle } from "lodash-es";
import type { Grid } from "./types.ts";

const NUM_COLUMNS = 324;
const NUM_ROWS = 729;
const NUM_NODES = NUM_COLUMNS + 1 + NUM_ROWS * 4;
const HEAD = NUM_COLUMNS;

const left = new Int32Array(NUM_NODES);
const right = new Int32Array(NUM_NODES);
const up = new Int32Array(NUM_NODES);
const down = new Int32Array(NUM_NODES);
const colOf = new Int32Array(NUM_NODES);
const rowOf = new Int32Array(NUM_NODES);
const colSize = new Int32Array(NUM_COLUMNS);

const candidateRow = (r: number, c: number, d: number) => r * 81 + c * 9 + (d - 1);

function constraintColumns(row: number): [number, number, number, number] {
  const r = Math.floor(row / 81);
  const c = Math.floor(row / 9) % 9;
  const d = row % 9;
  const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
  return [r * 9 + c, 81 + r * 9 + d, 162 + c * 9 + d, 243 + b * 9 + d];
}

function buildMatrix() {
  for (let col = 0; col <= HEAD; col++) {
    left[col] = col === 0 ? HEAD : col - 1;
    right[col] = col === HEAD ? 0 : col + 1;
    up[col] = col;
    down[col] = col;
    colOf[col] = col;
  }

  let node = HEAD + 1;
  for (let row = 0; row < NUM_ROWS; row++) {
    const cols = constraintColumns(row);
    const first = node;
    for (let i = 0; i < 4; i++) {
      const col = cols[i];
      colOf[node] = col;
      rowOf[node] = row;
      up[node] = up[col];
      down[node] = col;
      down[up[col]] = node;
      up[col] = node;
      colSize[col]++;
      left[node] = i === 0 ? first + 3 : node - 1;
      right[node] = i === 3 ? first : node + 1;
      node++;
    }
  }
}

buildMatrix();

function cover(col: number) {
  right[left[col]] = right[col];
  left[right[col]] = left[col];
  for (let i = down[col]; i !== col; i = down[i]) {
    for (let j = right[i]; j !== i; j = right[j]) {
      down[up[j]] = down[j];
      up[down[j]] = up[j];
      colSize[colOf[j]]--;
    }
  }
}

function uncover(col: number) {
  for (let i = up[col]; i !== col; i = up[i]) {
    for (let j = left[i]; j !== i; j = left[j]) {
      colSize[colOf[j]]++;
      down[up[j]] = j;
      up[down[j]] = j;
    }
  }
  right[left[col]] = col;
  left[right[col]] = col;
}

function coverRow(row: number): number {
  const first = HEAD + 1 + row * 4;
  cover(colOf[first]);
  for (let j = right[first]; j !== first; j = right[j]) {
    cover(colOf[j]);
  }
  return first;
}

function uncoverRow(firstNode: number) {
  for (let j = left[firstNode]; j !== firstNode; j = left[j]) {
    uncover(colOf[j]);
  }
  uncover(colOf[firstNode]);
}

function coverClues(grid: Grid): number[] | null {
  const covered: number[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const d = grid[r][c];
      if (d === 0) continue;
      const row = candidateRow(r, c, d);
      const conflict = constraintColumns(row).some((col) => right[left[col]] !== col);
      if (conflict) {
        uncoverClues(covered);
        return null;
      }
      covered.push(coverRow(row));
    }
  }
  return covered;
}

function uncoverClues(covered: number[]) {
  for (let i = covered.length - 1; i >= 0; i--) uncoverRow(covered[i]);
}

function smallestColumn(): number {
  let best = -1;
  let bestSize = Infinity;
  for (let col = right[HEAD]; col !== HEAD; col = right[col]) {
    if (colSize[col] < bestSize) {
      bestSize = colSize[col];
      best = col;
      if (bestSize <= 1) break;
    }
  }
  return best;
}

function search(
  limit: number,
  solution: number[],
  onSolution: (rows: number[]) => void,
  found: { count: number },
): void {
  if (right[HEAD] === HEAD) {
    found.count++;
    onSolution(solution);
    return;
  }
  const col = smallestColumn();
  if (colSize[col] === 0) return;

  cover(col);
  for (let i = down[col]; i !== col && found.count < limit; i = down[i]) {
    solution.push(rowOf[i]);
    for (let j = right[i]; j !== i; j = right[j]) cover(colOf[j]);
    search(limit, solution, onSolution, found);
    for (let j = left[i]; j !== i; j = left[j]) uncover(colOf[j]);
    solution.pop();
  }
  uncover(col);
}

function rowsToGrid(base: Grid, rows: number[]): Grid {
  const grid = base.map((row) => [...row]);
  for (const row of rows) {
    const r = Math.floor(row / 81);
    const c = Math.floor(row / 9) % 9;
    grid[r][c] = (row % 9) + 1;
  }
  return grid;
}

export function solveGrid(grid: Grid): Grid | null {
  const covered = coverClues(grid);
  if (covered === null) return null;

  let result: Grid | null = null;
  search(1, [], (rows) => {
    result = rowsToGrid(grid, rows);
  }, { count: 0 });

  uncoverClues(covered);
  return result;
}

export function countSolutions(grid: Grid, limit = 2): number {
  const covered = coverClues(grid);
  if (covered === null) return 0;

  const found = { count: 0 };
  search(limit, [], () => {}, found);

  uncoverClues(covered);
  return found.count;
}

export function randomSolvedGrid(): Grid {
  const empty: Grid = Array.from({ length: 9 }, () => Array(9).fill(0));

  let result: Grid | null = null;
  const found = { count: 0 };

  function randomSearch(solution: number[]): void {
    if (right[HEAD] === HEAD) {
      found.count = 1;
      result = rowsToGrid(empty, solution);
      return;
    }
    const col = smallestColumn();
    if (colSize[col] === 0) return;

    const choices: number[] = [];
    for (let i = down[col]; i !== col; i = down[i]) choices.push(i);

    cover(col);
    for (const i of shuffle(choices)) {
      if (found.count > 0) break;
      solution.push(rowOf[i]);
      for (let j = right[i]; j !== i; j = right[j]) cover(colOf[j]);
      randomSearch(solution);
      for (let j = left[i]; j !== i; j = left[j]) uncover(colOf[j]);
      solution.pop();
    }
    uncover(col);
  }

  randomSearch([]);
  return result!;
}

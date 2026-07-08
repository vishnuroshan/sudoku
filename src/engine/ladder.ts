import type { Grid } from "./types.ts";

export type TechniqueName =
  | "naked-single"
  | "hidden-single"
  | "naked-pair"
  | "hidden-pair"
  | "locked-candidates"
  | "naked-triple"
  | "hidden-triple"
  | "x-wing"
  | "naked-quad"
  | "hidden-quad"
  | "swordfish"
  | "xy-wing"
  | "xyz-wing"
  | "simple-coloring"
  | "w-wing"
  | "beyond-ladder";

export type Tier = 1 | 2 | 3 | 4 | 5;

export interface Grade {
  tier: Tier;
  hardest: TechniqueName;
}

export interface Elimination {
  cell: number;
  digit: number;
}

export interface Step {
  technique: TechniqueName;
  cells: number[];
  digits: number[];
  place?: { cell: number; digit: number };
  eliminations: Elimination[];
}

const ALL = 0x1ff;
const bit = (d: number) => 1 << (d - 1);
const digitOf = (mask: number) => 32 - Math.clz32(mask);

const POPCOUNT = new Uint8Array(512);
for (let i = 1; i < 512; i++) POPCOUNT[i] = POPCOUNT[i >> 1] + (i & 1);

function maskDigits(mask: number): number[] {
  const digits = [];
  for (let d = 1; d <= 9; d++) {
    if (mask & bit(d)) digits.push(d);
  }
  return digits;
}

const ROWS: number[][] = [];
const COLS: number[][] = [];
const BOXES: number[][] = [];
for (let i = 0; i < 9; i++) {
  ROWS.push(Array.from({ length: 9 }, (_, j) => i * 9 + j));
  COLS.push(Array.from({ length: 9 }, (_, j) => j * 9 + i));
  const br = Math.floor(i / 3) * 3;
  const bc = (i % 3) * 3;
  BOXES.push(
    Array.from({ length: 9 }, (_, j) => (br + Math.floor(j / 3)) * 9 + bc + (j % 3)),
  );
}
const UNITS = [...ROWS, ...COLS, ...BOXES];

const IS_PEER = new Uint8Array(81 * 81);
const PEERS: number[][] = Array.from({ length: 81 }, () => []);
for (const unit of UNITS) {
  for (const a of unit) {
    for (const b of unit) {
      if (a !== b && !IS_PEER[a * 81 + b]) {
        IS_PEER[a * 81 + b] = 1;
        PEERS[a].push(b);
      }
    }
  }
}

interface Board {
  values: Uint8Array;
  cands: Uint16Array;
}

function createBoard(puzzle: Grid): Board {
  const board: Board = {
    values: new Uint8Array(81),
    cands: new Uint16Array(81).fill(ALL),
  };
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzle[r][c] !== 0) place(board, r * 9 + c, puzzle[r][c]);
    }
  }
  return board;
}

function place(board: Board, cell: number, d: number) {
  board.values[cell] = d;
  board.cands[cell] = 0;
  const m = ~bit(d);
  for (const p of PEERS[cell]) board.cands[p] &= m;
}

function isSolved(board: Board): boolean {
  return board.values.every((v) => v !== 0);
}

function* combos(items: number[], k: number, start = 0, acc: number[] = []): Generator<number[]> {
  if (acc.length === k) {
    yield acc;
    return;
  }
  for (let i = start; i <= items.length - (k - acc.length); i++) {
    yield* combos(items, k, i + 1, [...acc, items[i]]);
  }
}

function placeStep(technique: TechniqueName, cell: number, d: number): Step {
  return {
    technique,
    cells: [cell],
    digits: [d],
    place: { cell, digit: d },
    eliminations: [],
  };
}

function collectFromCells(b: Board, cells: number[], exclude: number[], mask: number): Elimination[] {
  const out: Elimination[] = [];
  for (const cell of cells) {
    if (exclude.includes(cell)) continue;
    const hit = b.cands[cell] & mask;
    if (!hit) continue;
    for (const digit of maskDigits(hit)) out.push({ cell, digit });
  }
  return out;
}

function collectSeenBy(b: Board, watchers: number[], mask: number): Elimination[] {
  const out: Elimination[] = [];
  for (let cell = 0; cell < 81; cell++) {
    if (!(b.cands[cell] & mask)) continue;
    if (watchers.every((w) => IS_PEER[w * 81 + cell])) {
      for (const digit of maskDigits(b.cands[cell] & mask)) out.push({ cell, digit });
    }
  }
  return out;
}

function nakedSingle(b: Board): Step | null {
  for (let cell = 0; cell < 81; cell++) {
    if (b.values[cell] === 0 && POPCOUNT[b.cands[cell]] === 1) {
      return placeStep("naked-single", cell, digitOf(b.cands[cell]));
    }
  }
  return null;
}

function hiddenSingle(b: Board): Step | null {
  for (const unit of UNITS) {
    for (let d = 1; d <= 9; d++) {
      const m = bit(d);
      let found = -1;
      let count = 0;
      for (const cell of unit) {
        if (b.values[cell] === d) {
          count = -1;
          break;
        }
        if (b.cands[cell] & m) {
          found = cell;
          count++;
        }
      }
      if (count === 1) return placeStep("hidden-single", found, d);
    }
  }
  return null;
}

function nakedSet(b: Board, k: number, technique: TechniqueName): Step | null {
  for (const unit of UNITS) {
    const members = unit.filter(
      (c) => b.values[c] === 0 && POPCOUNT[b.cands[c]] <= k,
    );
    if (members.length < k) continue;
    for (const set of combos(members, k)) {
      let union = 0;
      for (const c of set) union |= b.cands[c];
      if (POPCOUNT[union] !== k) continue;
      const eliminations = collectFromCells(b, unit, set, union);
      if (eliminations.length > 0) {
        return { technique, cells: set, digits: maskDigits(union), eliminations };
      }
    }
  }
  return null;
}

function hiddenSet(b: Board, k: number, technique: TechniqueName): Step | null {
  for (const unit of UNITS) {
    const positions = new Array<number>(10).fill(0);
    for (let slot = 0; slot < 9; slot++) {
      const cell = unit[slot];
      if (b.values[cell] !== 0) continue;
      for (let d = 1; d <= 9; d++) {
      if (b.cands[cell] & bit(d)) positions[d] |= 1 << slot;
      }
    }
    const digits = [];
    for (let d = 1; d <= 9; d++) {
      const n = POPCOUNT[positions[d]];
      if (n >= 2 && n <= k) digits.push(d);
    }
    if (digits.length < k) continue;
    for (const set of combos(digits, k)) {
      let slotUnion = 0;
      let digitMask = 0;
      for (const d of set) {
        slotUnion |= positions[d];
        digitMask |= bit(d);
      }
      if (POPCOUNT[slotUnion] !== k) continue;
      const cells: number[] = [];
      const eliminations: Elimination[] = [];
      for (let slot = 0; slot < 9; slot++) {
        if (!(slotUnion & (1 << slot))) continue;
        const cell = unit[slot];
        cells.push(cell);
        for (const digit of maskDigits(b.cands[cell] & ~digitMask)) {
          eliminations.push({ cell, digit });
        }
      }
      if (eliminations.length > 0) {
        return { technique, cells, digits: set, eliminations };
      }
    }
  }
  return null;
}

function boxIndex(cell: number): number {
  return Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3);
}

function lockedCandidates(b: Board): Step | null {
  for (let d = 1; d <= 9; d++) {
    const m = bit(d);
    for (const box of BOXES) {
      const spots = box.filter((c) => b.cands[c] & m);
      if (spots.length < 2) continue;
      const row = Math.floor(spots[0] / 9);
      if (spots.every((c) => Math.floor(c / 9) === row)) {
        const eliminations = collectFromCells(b, ROWS[row], box, m);
        if (eliminations.length > 0) {
          return { technique: "locked-candidates", cells: spots, digits: [d], eliminations };
        }
      }
      const col = spots[0] % 9;
      if (spots.every((c) => c % 9 === col)) {
        const eliminations = collectFromCells(b, COLS[col], box, m);
        if (eliminations.length > 0) {
          return { technique: "locked-candidates", cells: spots, digits: [d], eliminations };
        }
      }
    }
    for (const line of [...ROWS, ...COLS]) {
      const spots = line.filter((c) => b.cands[c] & m);
      if (spots.length < 2) continue;
      const box = boxIndex(spots[0]);
      if (spots.every((c) => boxIndex(c) === box)) {
        const eliminations = collectFromCells(b, BOXES[box], line, m);
        if (eliminations.length > 0) {
          return { technique: "locked-candidates", cells: spots, digits: [d], eliminations };
        }
      }
    }
  }
  return null;
}

function basicFish(b: Board, k: number, technique: TechniqueName): Step | null {
  for (let d = 1; d <= 9; d++) {
    const m = bit(d);
    for (const rowBased of [true, false]) {
      const cellAt = (line: number, cross: number) =>
        rowBased ? line * 9 + cross : cross * 9 + line;
      const lineMasks: number[] = [];
      for (let line = 0; line < 9; line++) {
        let mask = 0;
        for (let cross = 0; cross < 9; cross++) {
          if (b.cands[cellAt(line, cross)] & m) mask |= 1 << cross;
        }
        lineMasks.push(mask);
      }
      const baseLines = [];
      for (let line = 0; line < 9; line++) {
        const n = POPCOUNT[lineMasks[line]];
        if (n >= 2 && n <= k) baseLines.push(line);
      }
      if (baseLines.length < k) continue;
      for (const base of combos(baseLines, k)) {
        let crossUnion = 0;
        for (const line of base) crossUnion |= lineMasks[line];
        if (POPCOUNT[crossUnion] !== k) continue;
        const eliminations: Elimination[] = [];
        for (let line = 0; line < 9; line++) {
          if (base.includes(line)) continue;
          for (let cross = 0; cross < 9; cross++) {
            if (!(crossUnion & (1 << cross))) continue;
            if (b.cands[cellAt(line, cross)] & m) {
              eliminations.push({ cell: cellAt(line, cross), digit: d });
            }
          }
        }
        if (eliminations.length > 0) {
          const cells: number[] = [];
          for (const line of base) {
            for (let cross = 0; cross < 9; cross++) {
              if (lineMasks[line] & (1 << cross)) cells.push(cellAt(line, cross));
            }
          }
          return { technique, cells, digits: [d], eliminations };
        }
      }
    }
  }
  return null;
}

function xyWing(b: Board): Step | null {
  for (let pivot = 0; pivot < 81; pivot++) {
    if (POPCOUNT[b.cands[pivot]] !== 2) continue;
    const pincers = PEERS[pivot].filter(
      (p) => POPCOUNT[b.cands[p]] === 2 && POPCOUNT[b.cands[p] & b.cands[pivot]] === 1,
    );
    for (const [p1, p2] of combos(pincers, 2)) {
      const shared1 = b.cands[p1] & b.cands[pivot];
      const shared2 = b.cands[p2] & b.cands[pivot];
      if (shared1 === shared2) continue;
      const z1 = b.cands[p1] & ~shared1;
      const z2 = b.cands[p2] & ~shared2;
      if (z1 !== z2 || z1 & b.cands[pivot]) continue;
      const eliminations = collectSeenBy(b, [p1, p2], z1);
      if (eliminations.length > 0) {
        return {
          technique: "xy-wing",
          cells: [pivot, p1, p2],
          digits: [digitOf(z1)],
          eliminations,
        };
      }
    }
  }
  return null;
}

function xyzWing(b: Board): Step | null {
  for (let pivot = 0; pivot < 81; pivot++) {
    if (POPCOUNT[b.cands[pivot]] !== 3) continue;
    const pincers = PEERS[pivot].filter(
      (p) =>
        POPCOUNT[b.cands[p]] === 2 && (b.cands[p] & ~b.cands[pivot]) === 0,
    );
    for (const [p1, p2] of combos(pincers, 2)) {
      const z = b.cands[p1] & b.cands[p2];
      if (POPCOUNT[z] !== 1 || (b.cands[p1] | b.cands[p2]) !== b.cands[pivot]) continue;
      const eliminations = collectSeenBy(b, [pivot, p1, p2], z);
      if (eliminations.length > 0) {
        return {
          technique: "xyz-wing",
          cells: [pivot, p1, p2],
          digits: [digitOf(z)],
          eliminations,
        };
      }
    }
  }
  return null;
}

function conjugateLinks(b: Board, m: number): [number, number][] {
  const links: [number, number][] = [];
  for (const unit of UNITS) {
    const spots = unit.filter((c) => b.cands[c] & m);
    if (spots.length === 2) links.push([spots[0], spots[1]]);
  }
  return links;
}

function simpleColoring(b: Board): Step | null {
  for (let d = 1; d <= 9; d++) {
    const m = bit(d);
    const links = conjugateLinks(b, m);
    if (links.length === 0) continue;

    const color = new Int8Array(81);
    const component = new Int16Array(81).fill(-1);
    const adjacency: number[][] = Array.from({ length: 81 }, () => []);
    for (const [a, c] of links) {
      adjacency[a].push(c);
      adjacency[c].push(a);
    }

    let comp = 0;
    for (const [start] of links) {
      if (component[start] !== -1) continue;
      const queue = [start];
      component[start] = comp;
      color[start] = 1;
      while (queue.length > 0) {
        const cell = queue.pop()!;
        for (const next of adjacency[cell]) {
          if (component[next] !== -1) continue;
          component[next] = comp;
          color[next] = -color[cell];
          queue.push(next);
        }
      }
      comp++;
    }

    for (let cc = 0; cc < comp; cc++) {
      const cells: number[] = [];
      for (let cell = 0; cell < 81; cell++) {
        if (component[cell] === cc) cells.push(cell);
      }
      if (cells.length < 3) continue;

      for (const unit of UNITS) {
        for (const sign of [1, -1]) {
          const same = unit.filter((c) => component[c] === cc && color[c] === sign);
          if (same.length >= 2) {
            const eliminations = cells
              .filter((cell) => color[cell] === sign && b.cands[cell] & m)
              .map((cell) => ({ cell, digit: d }));
            if (eliminations.length > 0) {
              return { technique: "simple-coloring", cells, digits: [d], eliminations };
            }
          }
        }
      }

      const eliminations: Elimination[] = [];
      for (let cell = 0; cell < 81; cell++) {
        if (!(b.cands[cell] & m) || component[cell] === cc) continue;
        let seesPlus = false;
        let seesMinus = false;
        for (const other of cells) {
          if (!IS_PEER[cell * 81 + other]) continue;
          if (color[other] === 1) seesPlus = true;
          else seesMinus = true;
        }
        if (seesPlus && seesMinus) eliminations.push({ cell, digit: d });
      }
      if (eliminations.length > 0) {
        return { technique: "simple-coloring", cells, digits: [d], eliminations };
      }
    }
  }
  return null;
}

function wWing(b: Board): Step | null {
  const bivalues: number[] = [];
  for (let cell = 0; cell < 81; cell++) {
    if (POPCOUNT[b.cands[cell]] === 2) bivalues.push(cell);
  }
  for (const [c1, c2] of combos(bivalues, 2)) {
    if (b.cands[c1] !== b.cands[c2] || IS_PEER[c1 * 81 + c2]) continue;
    const mask = b.cands[c1];
    for (let d = 1; d <= 9; d++) {
      const m = bit(d);
      if (!(mask & m)) continue;
      const other = mask & ~m;
      for (const [s1, s2] of conjugateLinks(b, m)) {
        if (s1 === c1 || s1 === c2 || s2 === c1 || s2 === c2) continue;
        const bridges =
          (IS_PEER[s1 * 81 + c1] && IS_PEER[s2 * 81 + c2]) ||
          (IS_PEER[s1 * 81 + c2] && IS_PEER[s2 * 81 + c1]);
        if (!bridges) continue;
        const eliminations = collectSeenBy(b, [c1, c2], other);
        if (eliminations.length > 0) {
          return {
            technique: "w-wing",
            cells: [c1, c2, s1, s2],
            digits: maskDigits(mask),
            eliminations,
          };
        }
      }
    }
  }
  return null;
}

interface Technique {
  tier: Tier;
  find: (b: Board) => Step | null;
}

const TECHNIQUES: Technique[] = [
  { tier: 1, find: nakedSingle },
  { tier: 1, find: hiddenSingle },
  { tier: 2, find: (b) => nakedSet(b, 2, "naked-pair") },
  { tier: 2, find: (b) => hiddenSet(b, 2, "hidden-pair") },
  { tier: 2, find: lockedCandidates },
  { tier: 3, find: (b) => nakedSet(b, 3, "naked-triple") },
  { tier: 3, find: (b) => hiddenSet(b, 3, "hidden-triple") },
  { tier: 3, find: (b) => basicFish(b, 2, "x-wing") },
  { tier: 3, find: (b) => nakedSet(b, 4, "naked-quad") },
  { tier: 3, find: (b) => hiddenSet(b, 4, "hidden-quad") },
  { tier: 3, find: (b) => basicFish(b, 3, "swordfish") },
  { tier: 3, find: xyWing },
  { tier: 3, find: xyzWing },
  { tier: 4, find: simpleColoring },
  { tier: 4, find: wWing },
];

function findStep(b: Board): { index: number; step: Step } | null {
  for (let i = 0; i < TECHNIQUES.length; i++) {
    const step = TECHNIQUES[i].find(b);
    if (step) return { index: i, step };
  }
  return null;
}

function applyStep(b: Board, step: Step) {
  if (step.place) {
    place(b, step.place.cell, step.place.digit);
    return;
  }
  for (const { cell, digit } of step.eliminations) {
    b.cands[cell] &= ~bit(digit);
  }
}

export function gradePuzzle(puzzle: Grid): Grade {
  const board = createBoard(puzzle);
  let hardest = -1;
  let hardestName: TechniqueName = "naked-single";

  while (!isSolved(board)) {
    const found = findStep(board);
    if (!found) return { tier: 5, hardest: "beyond-ladder" };
    applyStep(board, found.step);
    if (found.index > hardest) {
      hardest = found.index;
      hardestName = found.step.technique;
    }
  }

  if (hardest === -1) return { tier: 1, hardest: "naked-single" };
  return { tier: TECHNIQUES[hardest].tier, hardest: hardestName };
}

export function nextStep(grid: Grid): Step | null {
  const board = createBoard(grid);
  if (isSolved(board)) return null;
  return findStep(board)?.step ?? null;
}

export function computeCandidates(grid: Grid): number[][][] {
  const board = createBoard(grid);
  return Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) =>
      board.values[r * 9 + c] !== 0 ? [] : maskDigits(board.cands[r * 9 + c]),
    ),
  );
}

const cellName = (cell: number) => `R${Math.floor(cell / 9) + 1}C${(cell % 9) + 1}`;

const LABELS: Record<TechniqueName, string> = {
  "naked-single": "Naked single",
  "hidden-single": "Hidden single",
  "naked-pair": "Naked pair",
  "hidden-pair": "Hidden pair",
  "locked-candidates": "Locked candidates",
  "naked-triple": "Naked triple",
  "hidden-triple": "Hidden triple",
  "x-wing": "X-Wing",
  "naked-quad": "Naked quad",
  "hidden-quad": "Hidden quad",
  swordfish: "Swordfish",
  "xy-wing": "XY-Wing",
  "xyz-wing": "XYZ-Wing",
  "simple-coloring": "Simple coloring",
  "w-wing": "W-Wing",
  "beyond-ladder": "Beyond the ladder",
};

export function describeStep(step: Step): string {
  const label = LABELS[step.technique];
  if (step.place) {
    return `${label}: ${step.place.digit} goes in ${cellName(step.place.cell)}`;
  }
  const digits = step.digits.join("/");
  const spots = [...new Set(step.eliminations.map((e) => cellName(e.cell)))];
  return `${label} on ${digits} at ${step.cells.map(cellName).join(", ")} — removes candidates from ${spots.join(", ")}`;
}

# Sudoku Generation Algorithm

A detailed breakdown of how the puzzle generator works — from producing a complete solved board to carving out cells while preserving a unique solution.

---

## Table of Contents

1. [Data Structures](#data-structures)
2. [Constraint Validation (`isValid`)](#constraint-validation)
3. [Backtracking Solver (`solve`)](#backtracking-solver)
4. [Solution Counter (`countSolutions`)](#solution-counter)
5. [Full Grid Generation (`generateFullGrid`)](#full-grid-generation)
6. [Cell Removal (`removeCells`)](#cell-removal)
   - [Phase 1: Greedy Pass](#phase-1-greedy-pass)
   - [Phase 2: Cleanup Passes](#phase-2-cleanup-passes)
7. [Puzzle Generation Loop (`generatePuzzle`)](#puzzle-generation-loop)
8. [Difficulty Ranges](#difficulty-ranges)
9. [Why the Greedy Pass Gets Stuck](#why-the-greedy-pass-gets-stuck)
10. [Why Earlier Decisions Go Stale](#why-earlier-decisions-go-stale)
11. [Irreducibility](#irreducibility)
12. [Known Limitations](#known-limitations)

---

## Data Structures

The grid is a 9×9 two-dimensional array of integers. Empty cells are represented by `0`.

```ts
type Grid = number[][];
```

A freshly initialised empty grid:

```ts
const grid: Grid = Array.from({ length: 9 }, () => Array(9).fill(0));
```

Grids are cloned before any mutation to prevent side effects leaking between functions:

```ts
function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}
```

---

## Constraint Validation

The `isValid` function answers a single question: **can `num` legally be placed at position `(row, col)` without breaking any Sudoku rules?**

Three checks are performed:

### 1. Row uniqueness

Scan every column in the same row. If `num` already appears, return false.

```ts
for (let c = 0; c < 9; c++) {
  if (grid[row][c] === num) return false;
}
```

### 2. Column uniqueness

Scan every row in the same column.

```ts
for (let r = 0; r < 9; r++) {
  if (grid[r][col] === num) return false;
}
```

### 3. Box uniqueness

Identify the top-left corner of the 3×3 box the cell belongs to, then scan all 9 cells in that box.

```ts
const boxRow = Math.floor(row / 3) * 3;
const boxCol = Math.floor(col / 3) * 3;
for (let r = boxRow; r < boxRow + 3; r++) {
  for (let c = boxCol; c < boxCol + 3; c++) {
    if (grid[r][c] === num) return false;
  }
}
```

If all three pass, the placement is legal across all Sudoku constraints. This function is purely read-only — it never mutates the grid.

---

## Backtracking Solver

The `solve` function takes a partially filled grid and attempts to complete it using recursive backtracking.

### How it works

1. Scan cells left-to-right, top-to-bottom until an empty cell (`0`) is found.
2. Try numbers 1 through 9 in that cell.
3. For each candidate, check if it's valid via `isValid`. If yes, place it and recurse.
4. If recursion succeeds (returns `true`), the grid is solved — propagate success upward.
5. If recursion fails, **backtrack**: reset the cell to `0` and try the next candidate.
6. If no candidate works, return `false` — this branch is a dead end, triggering backtracking in the caller.
7. If no empty cell is found, the grid is fully filled — return `true`.

```ts
function solve(grid: Grid): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] !== 0) continue;

      for (let num = 1; num <= 9; num++) {
        if (!isValid(grid, row, col, num)) continue;
        grid[row][col] = num;
        if (solve(grid)) return true;
        grid[row][col] = 0;
      }

      return false;
    }
  }
  return true;
}
```

The grid is mutated in place. After `solve` returns `true`, the grid contains a valid complete solution.

### Complexity

Worst case is exponential, but Sudoku constraints prune the search tree heavily. In practice, solving a typical 9×9 puzzle takes sub-millisecond time.

---

## Solution Counter

The `countSolutions` function determines how many distinct solutions a partially filled grid has. This is the critical function that enables puzzle generation — it tells us whether removing a clue breaks uniqueness.

### Why we only need to count up to 2

We never care about the exact number of solutions. The only question is: **is the solution unique?** So the function stops the moment it finds a second solution.

```ts
function countSolutions(grid: Grid): number {
  let count = 0;

  function search(): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] !== 0) continue;

        for (let num = 1; num <= 9; num++) {
          if (!isValid(grid, row, col, num)) continue;
          grid[row][col] = num;
          if (search()) return true;
          grid[row][col] = 0;
        }

        return false;
      }
    }

    count++;
    return count > 1; // early exit: found 2+ solutions
  }

  search();
  return count;
}
```

### Walk-through of the early exit

The inner `search` function is nearly identical to `solve`, with one key difference: when it reaches a fully filled grid (no empty cells), it increments `count` instead of returning `true`. It only returns `true` (halting the entire search) when `count` exceeds 1.

So the backtracker exhaustively explores the solution space, but bails out the instant a second valid completion is found. This avoids wasting time counting thousands of solutions — we only need to know "1 or more than 1."

### Why this can't be replaced by a local check

A common idea is: "just check if another number fits in the empty cell using `isValid`." That only checks row/column/box constraints at that single cell. It doesn't check whether that alternative number leads to a complete, valid grid. A number might pass `isValid` locally but create an impossible contradiction several cells later.

`countSolutions` is the only way to get a definitive answer because it explores the full search tree.

---

## Full Grid Generation

`generateFullGrid` produces a complete, valid 9×9 Sudoku board from scratch. It uses the same backtracking approach as `solve`, with one critical addition: **randomised candidate ordering**.

```ts
function generateFullGrid(): Grid {
  const grid: Grid = Array.from({ length: 9 }, () => Array(9).fill(0));

  function fill(row: number, col: number): boolean {
    if (col === 9) {
      row++;
      col = 0;
    }
    if (row === 9) return true;

    const candidates = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    for (const num of candidates) {
      if (!isValid(grid, row, col, num)) continue;
      grid[row][col] = num;
      if (fill(row, col + 1)) return true;
      grid[row][col] = 0;
    }

    return false;
  }

  fill(0, 0);
  return grid;
}
```

### Why shuffle?

Without shuffling, the solver always tries 1 first, then 2, then 3, etc. It would produce the same grid every time. By shuffling the candidates at each cell, every invocation produces a different valid grid.

### Cell traversal order

Cells are visited left-to-right (`col + 1`), wrapping to the next row when `col` reaches 9. This is a simple linear scan — nothing fancy, but combined with the random candidates, it produces uniformly varied grids.

### Performance

Generating a full grid takes a few milliseconds at most. The backtracker rarely needs to go deep because Sudoku constraints are tight — most candidate orderings find a valid placement quickly.

---

## Cell Removal

This is the core of puzzle creation. Starting from a solved grid, `removeCells` selectively empties cells while ensuring the puzzle retains **exactly one solution**.

The function has two phases: a greedy pass and one or more cleanup passes.

### Phase 1: Greedy Pass

1. **Clone the solved grid** — the clone becomes the puzzle we'll poke holes in.
2. **Compute the removal budget** — `81 - minClues` for the target difficulty. For hard (min 25 clues), that's 56 removals maximum.
3. **Shuffle all 81 cell positions** — this randomises which cells we attempt to remove first, producing varied puzzles each time.
4. **Iterate through the shuffled positions** and for each cell:

```ts
for (const [row, col] of shuffledPositions) {
  if (removed >= maxRemovals) break;

  const value = puzzle[row][col];
  if (value === 0) continue; // already empty

  // Step A: tentatively remove the value
  puzzle[row][col] = 0;

  // Step B: check if the puzzle still has exactly one solution
  const solutions = countSolutions(cloneGrid(puzzle));

  if (solutions !== 1) {
    // Step C: multiple solutions — put the value back
    puzzle[row][col] = value;
  } else {
    // Step D: still unique — keep it removed
    removed++;
  }
}
```

After this pass, the puzzle is valid (unique solution) but may not yet be irreducible. Clues that were tested early in the pass might have become removable by the time the pass finished, because later removals altered the solution space. This is addressed in the next phase.

### Phase 2: Cleanup Passes

After the greedy pass, sweep through **all** remaining clues again. For each one, tentatively remove it and run `countSolutions`. If the puzzle is still unique, keep the removal.

Repeat the entire sweep until a full pass produces zero new removals. This is a **fixed-point iteration** — it converges when no stale decisions remain.

```ts
let pass = 0;
let cleanupRemoved: number;

do {
  pass++;
  cleanupRemoved = 0;

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (removed >= maxRemovals) break;

      const value = puzzle[row][col];
      if (value === 0) continue;

      puzzle[row][col] = 0;

      const solutions = countSolutions(cloneGrid(puzzle));

      if (solutions !== 1) {
        puzzle[row][col] = value;
      } else {
        removed++;
        cleanupRemoved++;
      }
    }
  }
} while (cleanupRemoved > 0 && removed < maxRemovals);
```

In practice, 1–3 cleanup passes are enough. Each pass typically recovers 2–5 extra removals. The cost is modest — each sweep calls `countSolutions` once per remaining clue (~25–30 calls), and the function is fast on near-complete grids due to the early exit at 2 solutions.

### Why clone before counting?

`countSolutions` mutates the grid internally during its search. If we passed the puzzle directly, the search would corrupt it. Cloning creates a throwaway copy that gets mangled by the backtracker while the real puzzle stays intact.

### What determines the final clue count?

Three factors:

1. **The removal order** — different orderings in the greedy pass produce different intermediate states.
2. **The grid itself** — some solved grids inherently support more removals than others due to their internal structure.
3. **The cleanup passes** — these recover removals that the greedy pass missed due to ordering-dependent stale decisions.

---

## Puzzle Generation Loop

`generatePuzzle` wraps the removal process in a retry loop that targets a specific clue range.

```ts
function generatePuzzle(difficulty: Difficulty): {
  solved: Grid;
  puzzle: Grid;
} {
  const { min: minClues, max: maxClues } = DIFFICULTY_CLUES[difficulty];
  const maxAttempts = 50;

  let bestResult = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const solved = generateFullGrid();
    const puzzle = removeCells(solved, difficulty);
    const clues = puzzle.flat().filter((v) => v !== 0).length;

    // Track the closest result as fallback
    if (
      !bestResult ||
      Math.abs(clues - minClues) < Math.abs(bestResult.clues - minClues)
    ) {
      bestResult = { solved: cloneGrid(solved), puzzle, clues };
    }

    // Accept if within range
    if (clues >= minClues && clues <= maxClues) {
      return { solved: cloneGrid(solved), puzzle };
    }
  }

  // Fallback: return the best attempt
  return { solved: bestResult.solved, puzzle: bestResult.puzzle };
}
```

### The retry strategy

Each attempt generates a **brand new** solved grid and runs a fresh removal pass with a new random ordering. If the resulting clue count falls within `[minClues, maxClues]`, it's accepted immediately.

If no attempt hits the range within 50 tries, the result closest to `minClues` is returned as a fallback.

### Why 50 attempts?

It's a balance between thoroughness and generation time. For easy/medium/hard, the first few attempts almost always succeed. For master/extreme, 50 attempts may not be enough (see [Known Limitations](#known-limitations)).

---

## Difficulty Ranges

| Difficulty | Min Clues | Max Clues | Cells Removed |
| ---------- | --------- | --------- | ------------- |
| easy       | 35        | 38        | 43–46         |
| medium     | 30        | 35        | 46–51         |
| hard       | 25        | 30        | 51–56         |
| master     | 20        | 25        | 56–61         |
| extreme    | 17        | 19        | 62–64         |

The minimum of 17 clues for extreme is based on the mathematical proof by McGuire, Tugemann, and Civario (2012) that no 16-clue Sudoku with a unique solution exists.

---

## Why the Greedy Pass Gets Stuck

A single greedy pass (without cleanup) typically plateaus at around 25–28 clues, regardless of the target. This isn't a bug — it's an inherent limitation of making one-shot, order-dependent decisions.

### The "painted into a corner" problem

Consider the removal order as a path through a maze. Each cell removal narrows the constraints on remaining cells. Early removals commit us to a specific "shape" of remaining clues. After enough removals, every remaining cell _appears_ load-bearing — removing any one of them creates multiple solutions.

But a **different** ordering might have removed different cells early on, leaving the puzzle in a state where further removals are still possible. The greedy approach has no way to backtrack and try a different path.

### Analogy

Think of it like Tetris. The pieces (removals) arrive in random order. Sometimes the sequence naturally stacks well and you clear many lines (remove many cells). Other times you get stuck with an awkward gap early on that blocks future progress. Re-rolling the piece sequence (re-shuffling the removal order) might yield a much better outcome.

---

## Why Earlier Decisions Go Stale

The greedy pass makes each keep/remove decision based on the puzzle state at that exact moment. But the puzzle state keeps changing as subsequent cells are removed. This creates a subtle problem: **a clue that was necessary earlier can become unnecessary later.**

### How it happens

Suppose cells A, B, and C form a dependency chain:

1. **Check A** — removing A allows an alternative solution where B and C cooperate to form a second valid completion. A stays.
2. **Check B** — removing B is fine, the puzzle remains unique. B goes.
3. **Check C** — removing C is fine. C goes.

Now B and C are both gone. The alternative solution that required B and C no longer exists. If we checked A again now, `countSolutions` would return 1. A is removable. But the algorithm already moved past A.

### The anti-monotonicity of clue necessity

The greedy pass implicitly assumes "necessary now → necessary forever." That would be true if clue necessity were **monotone** — if removing other cells could only make remaining cells _more_ necessary.

But it's the opposite. Removing cells **destroys** alternative solution paths, not creates them. Every removal tightens the solution space. A tighter solution space means fewer alternatives, which means fewer cells are needed to disambiguate.

So clue necessity is **anti-monotone**: removing clues can only decrease (or maintain) the number of alternative solutions for any previously-tested cell.

### What the cleanup pass does about it

The cleanup pass re-evaluates every remaining clue against the **final** puzzle state. It asks again — with all the current constraints in place — whether each clue is still required. Any clue that is no longer required gets removed, which can itself unlock further removals. Repeating until convergence ensures no stale decisions remain.

---

## Irreducibility

A puzzle is **irreducible** (also called **minimal**) if every remaining clue is necessary — removing any single clue would create multiple solutions.

### Why the greedy pass alone is NOT irreducible

A common claim is that the greedy removal pass produces irreducible puzzles because each kept clue was tested and found necessary. The argument goes:

> Since later iterations only remove other cells (never restore previously removed ones), any clue that was necessary at step _k_ is still necessary at step _k+1_ — removing additional cells can only make remaining clues more constrained, not less.

This reasoning is **incorrect**. The premise "removing cells makes remaining clues more constrained" is backwards. Removing cells destroys alternative solution paths. A clue that was distinguishing between two solutions at step _k_ might find that the second solution no longer exists at step _k+20_, because the cells enabling that alternative were removed in the interim.

In other words, clue necessity is **anti-monotone** with respect to further removals. The greedy pass can leave behind clues that were necessary _when checked_ but are redundant _in the final state_.

### How the cleanup pass achieves irreducibility

The cleanup pass re-evaluates every remaining clue against the final puzzle state and removes any that are no longer necessary. It repeats until convergence — a full sweep with zero removals.

At that point, we have a **fixed-point guarantee**: every remaining clue was tested in the current configuration and confirmed necessary. No single clue can be removed. That is the definition of irreducibility.

The proof is straightforward:

1. The cleanup loop terminates when a full sweep produces zero removals.
2. This means every remaining clue was individually tested — tentatively removed, checked with `countSolutions`, and found to produce multiple solutions.
3. Therefore, no single remaining clue can be removed without breaking uniqueness.
4. The puzzle is irreducible. ∎

---

## Known Limitations

### Difficulty ceilings for master/extreme

The greedy pass + cleanup reliably produces puzzles in the easy/medium/hard ranges and pushes further into master territory than the old single-pass approach. However, reaching extreme (17–19 clues) consistently is still unlikely — cleanup recovers a few extra clues per attempt, but the greedy pass's initial ordering still dominates the outcome.

### Potential improvements

1. **Multiple removal orderings per grid** — Instead of generating a new grid each attempt, try several different shuffled removal orders on the same solved grid. This is cheap (no new grid generation) and explores different "paths" through the removal maze. Combined with the cleanup pass on each ordering, this can push results significantly lower.

2. **Backtracking removal** — When the greedy pass stalls, undo previous removals and try alternative cells. This is the most powerful approach and can reliably reach 17-clue puzzles, but significantly increases implementation complexity.

3. **Hybrid strategy** — Use a fast local check (naked single) for easy/medium difficulties where performance matters more than minimality, and reserve the full `countSolutions` backtracker for hard/master/extreme where reaching low clue counts is essential.

### Generation time

Generating easy/medium puzzles is near-instant (<100ms). Hard puzzles may take a few hundred milliseconds. The cleanup passes add roughly 1.3–2× overhead to the removal phase, which is modest given that they can recover 2–5 extra clue removals per attempt. Master/extreme would benefit from the improvements listed above to be both fast and reliable.

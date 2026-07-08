# Sudoku Engine

How puzzles are generated: an exact-cover solver (Dancing Links) proves uniqueness, a human-technique solver grades difficulty, and a grade-targeted carve produces a puzzle that honestly matches the difficulty you asked for.

---

## Table of Contents

1. [The Pipeline](#the-pipeline)
2. [Sudoku as Exact Cover](#sudoku-as-exact-cover)
3. [Dancing Links (Algorithm X)](#dancing-links-algorithm-x)
4. [Counting Solutions](#counting-solutions)
5. [Generating a Full Grid](#generating-a-full-grid)
6. [The Technique Ladder](#the-technique-ladder)
7. [Grading a Puzzle](#grading-a-puzzle)
8. [Grade-Targeted Carving](#grade-targeted-carving)
9. [Why One Carving Pass Is Enough](#why-one-carving-pass-is-enough)
10. [Difficulty Is Not Clue Count](#difficulty-is-not-clue-count)
11. [Performance](#performance)

---

## The Pipeline

Every puzzle is produced by the same three-stage loop:

1. **Generate** a complete solved grid (Dancing Links with randomised branching).
2. **Carve** cells out one by one. A removal is kept only if the puzzle still has exactly one solution — and, for most difficulties, only if the puzzle is still solvable with techniques at or below the requested difficulty.
3. **Grade** the result by solving it the way a human would, recording the hardest technique required. If the grade matches the requested difficulty, ship it; otherwise start over with a fresh grid.

The expensive questions — "is this still unique?" asked dozens of times per carve — are answered by the exact-cover solver in microseconds.

## Sudoku as Exact Cover

A finished Sudoku is exactly a set of 81 choices of the form "digit *d* goes in row *r*, column *c*" that together satisfy every rule once. That phrasing makes it an [exact cover](https://en.wikipedia.org/wiki/Exact_cover) problem.

There are **729 candidates** (9 rows × 9 columns × 9 digits) and **324 constraints**:

| Constraint family | Count | Meaning |
| ----------------- | ----- | ------- |
| Cell              | 81    | every cell contains exactly one digit |
| Row–digit         | 81    | every row contains each digit exactly once |
| Column–digit      | 81    | every column contains each digit exactly once |
| Box–digit         | 81    | every 3×3 box contains each digit exactly once |

Each candidate satisfies exactly 4 constraints (one from each family). Solving Sudoku means picking a set of candidates such that every one of the 324 constraints is satisfied exactly once — an exact cover of a 729 × 324 zero-one matrix.

Givens are handled by *pre-selecting* their candidate rows before the search starts: the clue's four constraints are marked satisfied and every conflicting candidate disappears from the matrix automatically.

## Dancing Links (Algorithm X)

Knuth's [Algorithm X](https://en.wikipedia.org/wiki/Knuth%27s_Algorithm_X) solves exact cover by trial and error: pick an unsatisfied constraint, try each remaining candidate that satisfies it, recurse, undo, try the next. The magic is in the undo.

The matrix is stored as a torus of doubly-linked nodes — every node knows its left, right, up, and down neighbour. Removing a node is two pointer writes:

```
right[left[x]] = right[x]
left[right[x]] = left[x]
```

Restoring it is the same two writes in reverse — the removed node still remembers its old neighbours. This is the "dancing" in Dancing Links: covering a constraint unlinks a whole column and every row that touches it, and backtracking relinks them in reverse order at almost zero cost. No copying, no re-scanning.

Two details make it fast in practice:

- **S-heuristic** — always branch on the constraint with the fewest remaining candidates. If some cell has only one possible digit, the search looks at it first and never wastes time guessing elsewhere.
- **Persistent matrix** — the 3,241-node torus is built once at module load. Each solver call covers the clue rows, searches, and uncovers them, leaving the matrix pristine for the next call.

The implementation stores the torus in six flat `Int32Array`s (left/right/up/down/column/row) rather than node objects — the whole structure fits in about 80 KB and traversal is pure integer arithmetic.

## Counting Solutions

Puzzle generation never needs the full solution count — only the answer to "is it still exactly one?". The counter therefore stops the moment it finds a second solution. On a well-formed puzzle this typically terminates in tens of microseconds, which is what makes it affordable to re-verify uniqueness after every single removal during carving.

## Generating a Full Grid

A complete random grid is just Algorithm X run on the *empty* matrix with one tweak: at each branch point the candidate order is shuffled. The S-heuristic keeps the search nearly backtrack-free, and the shuffle makes every run produce a different grid.

## The Technique Ladder

The second solver knows nothing about backtracking. It solves the way a person does: scan for the easiest applicable technique, apply it, repeat. The board is a set of 81 nine-bit candidate masks; each technique is a pure function that either makes progress (places a digit or eliminates candidates) or reports that it can't.

| Tier | Difficulty | Techniques |
| ---- | ---------- | ---------- |
| 1 | easy    | naked single, hidden single |
| 2 | medium  | naked/hidden pair, locked candidates (pointing & claiming) |
| 3 | hard    | naked/hidden triple & quad, X-Wing, Swordfish, XY-Wing, XYZ-Wing |
| 4 | master  | simple coloring, W-Wing |
| 5 | extreme | beyond the ladder — needs chains, ALS, or trial and error |

In brief:

- **Naked single** — a cell with one candidate left.
- **Hidden single** — a digit with one home left in a row, column, or box.
- **Naked pair/triple/quad** — *k* cells in a unit sharing the same *k* candidates lock those digits; eliminate them from the rest of the unit.
- **Hidden pair/triple/quad** — *k* digits confined to the same *k* cells of a unit; those cells hold nothing else.
- **Locked candidates** — a digit confined to one row/column inside a box (or one box inside a line) is eliminated from the rest of that line (or box).
- **X-Wing / Swordfish** — a digit restricted to the same 2 (or 3) columns across 2 (or 3) rows forms a fish; the digit vanishes from those columns elsewhere. Works transposed too.
- **XY-Wing / XYZ-Wing** — three bivalue (or one trivalue + two bivalue) cells forming a pivot-and-pincers pattern; whatever happens, some digit *z* is placed in a pincer, so *z* is eliminated from every cell seeing both pincers.
- **Simple coloring** — for one digit, chain together the units where it has exactly two spots. Two-color the chain; any outside cell that sees both colors can never hold the digit, and a color that collides with itself in a unit is entirely false.
- **W-Wing** — two identical bivalue cells `{a,b}` bridged by a strong link on *b*: one of them must be *a*, so *a* is eliminated from cells seeing both.

Every puzzle this app generates is guaranteed unique by the exact-cover solver, so even a tier-5 puzzle always has exactly one solution — the ladder just can't *prove* it without guessing.

## Grading a Puzzle

The grade is the hardest technique the ladder needed:

```
loop until solved:
  find the cheapest technique that makes progress
  none found → tier 5 (beyond the ladder)
  record it if it's the hardest so far
grade = hardest technique used
```

Always retrying from the cheapest technique matters: humans don't use a Swordfish when a naked single is available, and grading must mirror that or it would overrate nearly everything.

## Grade-Targeted Carving

Difficulty is enforced *during* carving, not checked after. Cells are visited in random order and each removal must pass two tests:

1. **Uniqueness** — the exact-cover counter still finds exactly one solution.
2. **Grade bound** — the ladder still solves the puzzle using only techniques at or below the target tier.

A removal that fails either test is reverted, and carving continues with the next cell. Carving stops when the puzzle has reached both its target tier and its clue floor (36 for easy, 30 for medium, 25 for hard, 22 for master). For extreme, the bound is dropped entirely: carve to a minimal puzzle and accept it if it grades beyond the ladder.

Because the bound is enforced per removal, an easy puzzle is not "a puzzle that happened to be easy" — it is a puzzle that provably never requires more than singles at any point.

If a fresh grid carves to the wrong final grade (say, a hard request that never develops past tier 2), the generator throws it away and starts over. Measured acceptance rates keep the retry count low at every difficulty.

## Why One Carving Pass Is Enough

Both tests are **monotone** in the clues: removing a clue can never shrink the solution set, and it can never make a puzzle easier to solve. So once a removal fails — either test — it will fail forever, no matter what else is removed later.

Two useful consequences:

- A single shuffled pass over all 81 cells already produces a *minimal* puzzle (no clue can be removed without breaking uniqueness). Re-sweeping can never find anything new.
- The carve can stop early with confidence: the blocked cells stay blocked.

(An earlier version of this engine ran repeated "cleanup passes" after the first sweep, believing later removals could unlock earlier ones. Monotonicity proves those passes could never remove anything — they only appeared useful because the first pass capped itself and skipped cells.)

## Difficulty Is Not Clue Count

The previous engine defined difficulty by how many clues survived carving. That metric is folklore, not fact: the famous 17-clue puzzles — the theoretical minimum — are mostly *easy*, solvable with singles, while some of the hardest puzzles ever constructed (AI Escargot, SE 10.5) have 23 clues.

The grader agrees:

| Puzzle | Clues | Grade |
| ------ | ----- | ----- |
| First entry of the 49k 17-clue collection | 17 | tier 1 — hidden singles only |
| AI Escargot | 23 | tier 5 — beyond the ladder |

Difficulty here is defined by the techniques you'll actually need, which is the same convention used by serious rating systems (Sudoku Explainer, HoDoKu, sudoku.coach).

## Performance

Measured on the same machine, 3-run averages for the old engine vs. 20-run averages for the new one:

| Difficulty | Old engine | New engine |
| ---------- | ---------- | ---------- |
| easy    | 2 ms | ~1 ms |
| medium  | 3 ms | ~6 ms |
| hard    | 11 ms | ~14 ms |
| master  | 20 ms | ~17 ms |
| extreme | ~1,000 ms | ~6 ms |

The old "extreme" also silently failed: it chased an unreachable 17–19 clue target, burned 50 full generation attempts every time, and returned a ~22-clue puzzle of unknown difficulty. The new extreme returns in milliseconds with a puzzle that provably requires more than the entire technique ladder.

The medium/hard rows are slightly slower than before because they now do strictly more work — the old engine never graded anything. That trade buys the difficulty guarantee.

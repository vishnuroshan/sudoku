import { useState, useEffect, useCallback, useRef } from "react";
import useLocalStorageState from "use-local-storage-state";
import { openDB } from "idb";
import { generatePuzzle } from "./sudoku";
import type { Grid, Difficulty } from "./sudoku";
import {
  Sun,
  Moon,
  Settings,
  Eraser,
  PartyPopper,
  RotateCcw,
  Eye,
  Gauge,
} from "lucide-react";
import {
  Button,
  DialogTrigger,
  Popover,
  Dialog,
  RadioGroup,
  Radio,
  Switch,
  Group,
  Modal,
  ModalOverlay,
  Heading,
} from "react-aria-components";

type Theme = "light" | "dark";

function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("sudoku_theme");
    return stored === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "dark") root.classList.add("dark");
    localStorage.setItem("sudoku_theme", theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function createEmptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function cloneGrid(g: Grid): Grid {
  return g.map((row) => [...row]);
}

/* ── IndexedDB Stats ──────────────────────────────────────────────────── */

interface DifficultyStats {
  difficulty: Difficulty;
  wins: number;
  played: number;
}

const DB_NAME = "sudoku-stats";
const DB_VERSION = 1;
const STORE_NAME = "stats";

function getStatsDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "difficulty" });
      }
    },
  });
}

async function incrementPlayed(difficulty: Difficulty) {
  const db = await getStatsDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const existing: DifficultyStats | undefined = await store.get(difficulty);
  await store.put({
    difficulty,
    wins: existing?.wins ?? 0,
    played: (existing?.played ?? 0) + 1,
  });
  await tx.done;
}

async function incrementWins(difficulty: Difficulty) {
  const db = await getStatsDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const existing: DifficultyStats | undefined = await store.get(difficulty);
  await store.put({
    difficulty,
    wins: (existing?.wins ?? 0) + 1,
    played: existing?.played ?? 0,
  });
  await tx.done;
}

/** Returns a Set of "r,c" strings for all cells that have conflicts. */
function getConflicts(grid: Grid, puzzleGrid: Grid): Set<string> {
  const conflicts = new Set<string>();

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = grid[r][c];
      if (val === 0) continue;
      // Only check user-entered cells (non-givens)
      if (puzzleGrid[r][c] !== 0) continue;

      // Check row
      for (let cc = 0; cc < 9; cc++) {
        if (cc !== c && grid[r][cc] === val) {
          conflicts.add(`${r},${c}`);
          conflicts.add(`${r},${cc}`);
        }
      }
      // Check column
      for (let rr = 0; rr < 9; rr++) {
        if (rr !== r && grid[rr][c] === val) {
          conflicts.add(`${r},${c}`);
          conflicts.add(`${rr},${c}`);
        }
      }
      // Check 3×3 box
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

function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [solvedGrid, setSolvedGrid] = useLocalStorageState<Grid | null>(
    "sudoku_solved",
    { defaultValue: null },
  );
  const [puzzleGrid, setPuzzleGrid] = useLocalStorageState<Grid | null>(
    "sudoku_puzzle",
    { defaultValue: null },
  );
  const [userGrid, setUserGrid] = useLocalStorageState<Grid>("sudoku_user", {
    defaultValue: createEmptyGrid(),
  });
  const [difficulty, setDifficulty] = useLocalStorageState<Difficulty>(
    "sudoku_difficulty",
    { defaultValue: "medium" },
  );
  const [showSolution, setShowSolution] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(
    null,
  );
  const [hasWonCurrent, setHasWonCurrent] = useLocalStorageState("sudoku_won", {
    defaultValue: false,
  });
  const gridRef = useRef<HTMLTableElement>(null);

  // Auto-generate a puzzle on first load if none saved
  const didAutoGenerate = useRef(false);
  useEffect(() => {
    if (!puzzleGrid && !didAutoGenerate.current) {
      didAutoGenerate.current = true;
      const { solved, puzzle } = generatePuzzle("medium");
      setSolvedGrid(solved);
      setPuzzleGrid(puzzle);
      incrementPlayed("medium");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleGenerate(overrideDifficulty?: Difficulty) {
    const diff = overrideDifficulty ?? difficulty;
    if (overrideDifficulty) setDifficulty(overrideDifficulty);
    setGenerating(true);
    setShowSolution(false);
    setSelectedCell(null);
    setUserGrid(createEmptyGrid());
    setHasWonCurrent(false);

    setTimeout(() => {
      const { solved, puzzle } = generatePuzzle(diff);
      setSolvedGrid(solved);
      setPuzzleGrid(puzzle);
      setGenerating(false);
      incrementPlayed(diff);
    }, 50);
  }

  // Build the display grid: givens from puzzle, user entries on top
  const displayGrid: Grid | null = (() => {
    if (showSolution && solvedGrid) return solvedGrid;
    if (!puzzleGrid) return null;
    const merged = cloneGrid(puzzleGrid);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzleGrid[r][c] === 0 && userGrid[r][c] !== 0) {
          merged[r][c] = userGrid[r][c];
        }
      }
    }
    return merged;
  })();

  // Conflict detection
  const conflicts =
    displayGrid && puzzleGrid && !showSolution
      ? getConflicts(displayGrid, puzzleGrid)
      : new Set<string>();

  // Win detection: grid is full, no conflicts, matches solution
  const isWon = (() => {
    if (!displayGrid || !solvedGrid || showSolution) return false;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (displayGrid[r][c] !== solvedGrid[r][c]) return false;
      }
    }
    return true;
  })();

  // Track win in IndexedDB (only once per puzzle)
  useEffect(() => {
    if (isWon && !hasWonCurrent) {
      setHasWonCurrent(true);
      incrementWins(difficulty);
    }
  }, [isWon, hasWonCurrent, difficulty, setHasWonCurrent]);

  function isGivenCell(r: number, c: number): boolean {
    return puzzleGrid !== null && puzzleGrid[r][c] !== 0;
  }

  function enterNumber(n: number) {
    if (!selectedCell || !puzzleGrid) return;
    const [r, c] = selectedCell;
    if (isGivenCell(r, c)) return;
    setUserGrid((prev) => {
      const next = cloneGrid(prev);
      next[r][c] = n;
      return next;
    });
  }

  function eraseCell() {
    if (!selectedCell || !puzzleGrid) return;
    const [r, c] = selectedCell;
    if (isGivenCell(r, c)) return;
    setUserGrid((prev) => {
      const next = cloneGrid(prev);
      next[r][c] = 0;
      return next;
    });
  }

  function handleCellClick(r: number, c: number) {
    setSelectedCell([r, c]);
    gridRef.current?.focus();
  }

  function handleGridKeyDown(e: React.KeyboardEvent) {
    if (!selectedCell) return;
    const [r, c] = selectedCell;
    let nr = r;
    let nc = c;

    switch (e.key) {
      case "ArrowUp":
        nr = Math.max(0, r - 1);
        break;
      case "ArrowDown":
        nr = Math.min(8, r + 1);
        break;
      case "ArrowLeft":
        nc = Math.max(0, c - 1);
        break;
      case "ArrowRight":
        nc = Math.min(8, c + 1);
        break;
      case "Escape":
        setSelectedCell(null);
        return;
      case "Backspace":
      case "Delete":
        e.preventDefault();
        eraseCell();
        return;
      default: {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
          e.preventDefault();
          enterNumber(num);
        }
        return;
      }
    }
    e.preventDefault();
    setSelectedCell([nr, nc]);
  }

  function getCellHighlight(r: number, c: number): string {
    if (!selectedCell || !displayGrid) return "";
    const [sr, sc] = selectedCell;

    // Conflict takes priority on the selected cell too
    const isConflict = conflicts.has(`${r},${c}`);

    // Selected cell itself
    if (r === sr && c === sc) {
      return isConflict ? "bg-cell-conflict" : "bg-cell-selected";
    }

    // Conflict highlight
    if (isConflict) return "bg-cell-conflict";

    // Same value highlight
    const selectedVal = displayGrid[sr][sc];
    if (selectedVal !== 0 && displayGrid[r][c] === selectedVal)
      return "bg-cell-same-value";

    // Peer highlight: same row, column, or 3×3 box
    const sameRow = r === sr;
    const sameCol = c === sc;
    const sameBox =
      Math.floor(r / 3) === Math.floor(sr / 3) &&
      Math.floor(c / 3) === Math.floor(sc / 3);
    if (sameRow || sameCol || sameBox) return "bg-cell-peer";

    return "";
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex w-full items-center justify-between border-b border-border-primary bg-container px-4 py-3 sm:px-6">
        <h1 className="text-lg font-semibold tracking-tight text-text-primary">
          Sudoku
        </h1>
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border-primary bg-elevated text-text-secondary transition-colors hover:border-border-strong hover:bg-hover"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* ── Main Content ───────────────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center justify-center px-2 py-4 md:py-12">
        {/* Controls */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <button
            onClick={() => handleGenerate()}
            disabled={generating}
            className="cursor-pointer rounded-md border border-border-primary bg-elevated px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-hover active:bg-active disabled:cursor-not-allowed disabled:opacity-35"
          >
            {generating ? "Generating…" : "Generate Puzzle"}
          </button>

          {/* Settings Popover */}
          <DialogTrigger isOpen={settingsOpen} onOpenChange={setSettingsOpen}>
            <Button
              aria-label="Settings"
              isDisabled={!puzzleGrid || generating}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-border-primary bg-elevated text-text-secondary transition-colors hover:border-border-strong hover:bg-hover outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Settings size={18} />
            </Button>
            <Popover
              placement="bottom end"
              className="w-64 rounded-lg border border-border-primary bg-container shadow-lg outline-none entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95"
            >
              <Dialog className="p-4 outline-none">
                <div className="space-y-4">
                  {/* Difficulty */}
                  <div>
                    <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                      Difficulty
                    </span>
                    <RadioGroup
                      aria-label="Difficulty"
                      value={difficulty}
                      onChange={(val) => {
                        setSettingsOpen(false);
                        handleGenerate(val as Difficulty);
                      }}
                      className="flex gap-1"
                    >
                      {DIFFICULTIES.map((d) => (
                        <Radio
                          key={d}
                          value={d}
                          className="flex-1 cursor-pointer rounded-md border border-border-primary px-3 py-1.5 text-center text-sm font-medium capitalize text-text-primary transition-colors data-[selected]:border-accent data-[selected]:bg-accent data-[selected]:text-white hover:bg-hover"
                        >
                          {d}
                        </Radio>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Show Answer */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">
                      Show Answer
                    </span>
                    <Switch
                      isSelected={showSolution}
                      onChange={(val) => {
                        setShowSolution(val);
                        setSettingsOpen(false);
                      }}
                      isDisabled={!puzzleGrid || generating}
                      className="group flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-border-primary bg-active p-0.5 transition-colors data-[selected]:bg-accent disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <span className="block h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 group-data-[selected]:translate-x-4" />
                    </Switch>
                  </div>
                </div>
              </Dialog>
            </Popover>
          </DialogTrigger>
        </div>

        {/* Grid + Controls */}
        {displayGrid && (
          <div className="flex flex-col items-center">
            {/* Board info */}
            {!generating && (
              <div className="mb-2 flex w-full items-center gap-3 text-sm text-text-secondary">
                <span className="flex items-center gap-1 capitalize">
                  <Gauge size={18} />
                  {difficulty}
                </span>
                {showSolution && (
                  <span className="flex items-center gap-1 text-accent">
                    <Eye size={18} />
                    Answers shown
                  </span>
                )}
              </div>
            )}
            <table
              ref={gridRef}
              tabIndex={0}
              onKeyDown={handleGridKeyDown}
              className="border-collapse bg-container outline-none"
            >
              <tbody>
                {displayGrid.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => {
                      const isGiven = isGivenCell(r, c);
                      const isEmpty = cell === 0;
                      const isUserEntry = !isGiven && userGrid[r][c] !== 0;
                      const highlight = getCellHighlight(r, c);
                      const hasConflict = conflicts.has(`${r},${c}`);
                      return (
                        <td
                          key={c}
                          onClick={() => handleCellClick(r, c)}
                          className={`text-center align-middle font-semibold tabular-nums border border-border-primary cursor-pointer select-none transition-colors duration-75
                          w-10 h-10 text-[1.05rem]
                          min-[390px]:w-11 min-[390px]:h-11 min-[390px]:text-[1.2rem]
                          min-[480px]:w-12 min-[480px]:h-12 min-[480px]:text-[1.25rem]
                          md:w-[54px] md:h-[54px] md:text-[1.35rem]
                          lg:w-[60px] lg:h-[60px] lg:text-2xl
                          min-[1440px]:w-[68px] min-[1440px]:h-[68px] min-[1440px]:text-[1.65rem]
                          min-[1920px]:w-[76px] min-[1920px]:h-[76px] min-[1920px]:text-[1.8rem]
                          ${c % 3 === 0 ? "border-l-2 border-l-border-strong" : ""}
                          ${r % 3 === 0 ? "border-t-2 border-t-border-strong" : ""}
                          ${c === 8 ? "border-r-2 border-r-border-strong" : ""}
                          ${r === 8 ? "border-b-2 border-b-border-strong" : ""}
                          ${highlight}
                          ${hasConflict && isUserEntry ? "text-error" : isGiven ? "text-clue" : isUserEntry ? "text-solution" : "text-text-tertiary"}
                        `}
                        >
                          {isEmpty ? "" : cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Tool row: Erase + Undo ─────────────────────────── */}
            <div className="mt-2 flex w-full gap-1">
              <Button
                aria-label="Erase"
                onPress={eraseCell}
                isDisabled={
                  generating ||
                  !selectedCell ||
                  (selectedCell &&
                    isGivenCell(selectedCell[0], selectedCell[1]))
                }
                className="flex h-10 w-10 min-[390px]:h-11 min-[390px]:w-11 cursor-pointer items-center justify-center rounded-md border border-border-primary bg-elevated text-text-secondary outline-none transition-colors hover:border-border-strong hover:bg-hover active:bg-active disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Eraser size={18} />
              </Button>
              <Button
                aria-label="Undo"
                isDisabled
                className="flex h-10 w-10 min-[390px]:h-11 min-[390px]:w-11 cursor-pointer items-center justify-center rounded-md border border-border-primary bg-elevated text-text-secondary outline-none transition-colors hover:border-border-strong hover:bg-hover active:bg-active disabled:cursor-not-allowed disabled:opacity-35"
              >
                <RotateCcw size={18} />
              </Button>
            </div>

            {/* ── Numpad ─────────────────────────────────────────── */}
            <Group
              aria-label="Number pad"
              className="mt-1 flex w-full gap-0.5 min-[480px]:gap-1"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                // Count how many times this number appears in the display grid
                const count = displayGrid
                  ? displayGrid.flat().filter((v) => v === n).length
                  : 0;
                const isComplete = count >= 9;
                return (
                  <Button
                    key={n}
                    aria-label={`${n}`}
                    onPress={() => enterNumber(n)}
                    isDisabled={generating || !selectedCell || isComplete}
                    className={`flex flex-1 cursor-pointer items-center justify-center rounded-md border py-3 text-xl font-semibold tabular-nums outline-none transition-colors
                    min-[390px]:py-3.5
                    min-[480px]:py-4 min-[480px]:text-2xl
                    hover:border-border-strong hover:bg-hover active:bg-active
                    disabled:cursor-not-allowed disabled:opacity-35
                    ${isComplete ? "border-border-primary bg-active text-text-tertiary" : "border-border-primary bg-elevated text-text-primary"}
                  `}
                  >
                    {n}
                  </Button>
                );
              })}
            </Group>
          </div>
        )}

        {/* ── Win Dialog ─────────────────────────────────────── */}
        <ModalOverlay
          isOpen={isWon}
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm entering:animate-in entering:fade-in exiting:animate-out exiting:fade-out"
        >
          <Modal className="mx-4 w-full max-w-sm rounded-xl border border-border-primary bg-container p-6 shadow-xl outline-none entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95">
            <Dialog className="outline-none">
              <div className="flex flex-col items-center gap-4 text-center">
                <PartyPopper size={40} className="text-success" />
                <Heading
                  slot="title"
                  className="text-lg font-semibold text-text-primary"
                >
                  Puzzle Solved!
                </Heading>
                <p className="text-sm text-text-secondary">
                  Congratulations! You completed the puzzle.
                </p>
                <Button
                  onPress={() => handleGenerate()}
                  className="mt-2 w-full cursor-pointer rounded-md border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-white outline-none transition-colors hover:bg-accent-hover active:bg-accent"
                >
                  New Puzzle
                </Button>
              </div>
            </Dialog>
          </Modal>
        </ModalOverlay>
      </main>
    </div>
  );
}

export default App;

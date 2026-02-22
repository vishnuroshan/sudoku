import { useState, useEffect, useCallback, useRef } from "react";
import useLocalStorageState from "use-local-storage-state";
import { useMediaQuery } from "@uidotdev/usehooks";
import { openDB } from "idb";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generatePuzzle, solve, countSolutions } from "./sudoku";
import type { Grid, Difficulty } from "./sudoku";
import {
  Sun,
  Moon,
  Settings,
  Eraser,
  PartyPopper,
  Eye,
  Info,
  X,
  Pencil,
  Bug,
  Pause,
  Play,
  ChartColumnBig,
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
  Tabs,
  TabList,
  Tab,
  TabPanel,
} from "react-aria-components";

import aboutMd from "./about.md?raw";
import algorithmMd from "../ALGORITHM.md?raw";
import limitationsMd from "./limitations.md?raw";

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

const DIFFICULTIES: Difficulty[] = [
  "easy",
  "medium",
  "hard",
  "master",
  "extreme",
];

function createEmptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function cloneGrid(g: Grid): Grid {
  return g.map((row) => [...row]);
}

// Notes grid: 9×9 array of number arrays (serializable, each cell holds pencilled candidates)
type NotesGrid = number[][][];

function createEmptyNotesGrid(): NotesGrid {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => []),
  );
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

async function getAllStats(): Promise<DifficultyStats[]> {
  const db = await getStatsDB();
  return db.getAll(STORE_NAME);
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
  const isMobile = useMediaQuery("only screen and (max-width: 768px)");
  const iconSize = isMobile ? 22 : 18;
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
  const [notesGrid, setNotesGrid] = useLocalStorageState<NotesGrid>(
    "sudoku_notes",
    { defaultValue: createEmptyNotesGrid() },
  );
  const [notesMode, setNotesMode] = useState(false);
  const [testResult, setTestResult] = useState<{
    title: string;
    ok: boolean;
    message: string;
  } | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsData, setStatsData] = useState<DifficultyStats[]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(
    null,
  );
  const [hasWonCurrent, setHasWonCurrent] = useLocalStorageState("sudoku_won", {
    defaultValue: false,
  });

  // ── Timer ──────────────────────────────────────────────────────────────
  const [elapsedSeconds, setElapsedSeconds] = useLocalStorageState<number>(
    "sudoku_elapsed",
    { defaultValue: 0 },
  );
  const [timerPaused, setTimerPaused] = useLocalStorageState<boolean>(
    "sudoku_timer_paused",
    { defaultValue: false },
  );
  // Non-persisted: whether the interval is currently ticking.
  // Lazy initializer restores the running state on page reload without needing
  // a separate mount effect (which would trigger a cascading setState in effect).
  const [timerActive, setTimerActive] = useState<boolean>(
    () =>
      (elapsedSeconds as number) > 0 &&
      !(timerPaused as boolean) &&
      !(hasWonCurrent as boolean),
  );

  const gridRef = useRef<HTMLTableElement>(null);

  // Load stats whenever the stats dialog opens
  useEffect(() => {
    if (statsOpen) {
      getAllStats().then(setStatsData);
    }
  }, [statsOpen]);

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
    setNotesGrid(createEmptyNotesGrid());
    setNotesMode(false);
    setElapsedSeconds(0);
    setTimerPaused(false);
    setTimerActive(false);
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

  // Shake animation: track cells that just entered conflict state
  const [shakingCells, setShakingCells] = useState<Set<string>>(new Set());

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

  // Tick every second while the timer is active and the puzzle is unsolved.
  // isWon as a dep ensures the interval is torn down the moment the user wins,
  // without needing to call setState inside the win effect.
  useEffect(() => {
    if (!timerActive || isWon) return;
    const id = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [timerActive, isWon, setElapsedSeconds]);

  // Track win in IndexedDB (only once per puzzle).
  // Timer is stopped via the tick effect's isWon dep — no setState here.
  // setTimerPaused(true) on win persists the stopped state so that a page
  // reload does not resume the timer (the lazy initializer checks timerPaused).
  useEffect(() => {
    if (isWon && !hasWonCurrent) {
      setHasWonCurrent(true);
      setTimerPaused(true);
      incrementWins(difficulty);
    }
  }, [isWon, hasWonCurrent, difficulty, setHasWonCurrent, setTimerPaused]);

  // Start the timer on the player's first action (fill, note, or erase).
  // No-op if already ticking or if the user has explicitly paused it.
  function startTimerIfIdle() {
    if (!timerActive && !timerPaused) {
      setTimerActive(true);
    }
  }

  function pauseTimer() {
    setTimerActive(false);
    setTimerPaused(true);
  }

  function resumeTimer() {
    setTimerActive(true);
    setTimerPaused(false);
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function isGivenCell(r: number, c: number): boolean {
    return puzzleGrid !== null && puzzleGrid[r][c] !== 0;
  }

  function enterNumber(n: number) {
    if (!selectedCell || !puzzleGrid) return;
    const [r, c] = selectedCell;
    if (isGivenCell(r, c)) return;

    // ── Notes mode: toggle candidate in this cell's notes, no fill ──
    if (notesMode) {
      startTimerIfIdle();
      setNotesGrid((prev) => {
        const next = prev.map((row) => row.map((cell) => [...cell]));
        const idx = next[r][c].indexOf(n);
        if (idx === -1) {
          next[r][c].push(n);
        } else {
          next[r][c].splice(idx, 1);
        }
        return next;
      });
      return;
    }

    // ── Fill mode: existing conflict-detection + shake logic (unchanged) ──
    startTimerIfIdle();
    const nextUserGrid = cloneGrid(userGrid);
    nextUserGrid[r][c] = n;
    const nextMerged = cloneGrid(puzzleGrid);
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (puzzleGrid[row][col] === 0 && nextUserGrid[row][col] !== 0) {
          nextMerged[row][col] = nextUserGrid[row][col];
        }
      }
    }
    const nextConflicts = getConflicts(nextMerged, puzzleGrid);
    const newConflictKeys = [...nextConflicts].filter((k) => !conflicts.has(k));

    setUserGrid((prev) => {
      const next = cloneGrid(prev);
      next[r][c] = n;
      return next;
    });

    // Auto-remove n from notes in the filled cell and all its peers
    setNotesGrid((prev) => {
      const next = prev.map((row) => row.map((cell) => [...cell]));
      next[r][c] = []; // clear this cell's notes
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let i = 0; i < 9; i++) {
        next[r][i] = next[r][i].filter((v) => v !== n);
        next[i][c] = next[i][c].filter((v) => v !== n);
      }
      for (let rr = br; rr < br + 3; rr++) {
        for (let cc = bc; cc < bc + 3; cc++) {
          next[rr][cc] = next[rr][cc].filter((v) => v !== n);
        }
      }
      return next;
    });

    if (newConflictKeys.length > 0) {
      setShakingCells((prev) => new Set([...prev, ...newConflictKeys]));
      setTimeout(() => {
        setShakingCells((prev) => {
          const next = new Set(prev);
          newConflictKeys.forEach((k) => next.delete(k));
          return next;
        });
      }, 350);
    }
  }

  function eraseCell() {
    if (!selectedCell || !puzzleGrid) return;
    const [r, c] = selectedCell;
    if (isGivenCell(r, c)) return;
    startTimerIfIdle();
    setUserGrid((prev) => {
      const next = cloneGrid(prev);
      next[r][c] = 0;
      return next;
    });
    // Also clear notes for this cell
    setNotesGrid((prev) => {
      const next = prev.map((row) => row.map((cell) => [...cell]));
      next[r][c] = [];
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
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex w-full items-center justify-between border-b border-border-primary bg-container px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <h1
            className="text-2xl font-bold tracking-tight text-text-primary"
            style={{ fontFamily: "Times New Roman, Times, serif" }}
          >
            Sudoku{" "}
            <span className="text-red-500 text-sm font-bold">
              数独 愛する妻のために
            </span>
          </h1>
          <button
            onClick={() => setInfoOpen(true)}
            aria-label="About this app"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border-primary bg-elevated text-text-secondary transition-colors hover:border-border-strong hover:bg-hover"
          >
            <Info size={iconSize} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://www.linkedin.com/in/vishnu-roshan/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn profile"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border-primary bg-elevated text-[#0077b5] transition-colors hover:border-border-strong hover:bg-hover"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              className="lucide lucide-linkedin-icon lucide-linkedin"
            >
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
              <rect width="4" height="12" x="2" y="9" />
              <circle cx="4" cy="4" r="2" />
            </svg>
          </a>
          <a
            href="https://github.com/vishnuroshan/sudoku"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border-primary bg-elevated text-text-secondary transition-colors hover:border-border-strong hover:bg-hover"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              className="lucide lucide-github-icon lucide-github"
            >
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
          </a>
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border-primary bg-elevated text-text-secondary transition-colors hover:border-border-strong hover:bg-hover"
          >
            {theme === "dark" ? (
              <Sun size={iconSize} />
            ) : (
              <Moon size={iconSize} />
            )}
          </button>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────── */}
      <main className="flex flex-1 min-h-0 flex-col items-center justify-center px-2 py-3 md:py-10">
        {/* Controls */}
        <div className="mb-4 flex items-center justify-center gap-2">
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
              <Settings size={iconSize} />
            </Button>
            <Popover
              placement="bottom end"
              className="w-72 rounded-lg border border-border-primary bg-container shadow-lg outline-none entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95"
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
                      className="grid grid-cols-2 gap-1"
                    >
                      {DIFFICULTIES.map((d) => (
                        <Radio
                          key={d}
                          value={d}
                          className="flex-1 cursor-pointer rounded-md border border-border-primary px-3 py-1.5 text-center text-sm font-medium capitalize text-text-primary transition-colors data-selected:border-accent data-selected:bg-accent data-selected:text-white hover:bg-hover"
                        >
                          {d}
                        </Radio>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Show Answer */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary flex items-center gap-1">
                      <Bug size={iconSize} />
                      Show Answer
                    </span>
                    <Switch
                      isSelected={showSolution}
                      onChange={(val) => {
                        setShowSolution(val);
                        if (val) pauseTimer();
                        setSettingsOpen(false);
                      }}
                      isDisabled={!puzzleGrid || generating}
                      className="group flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-border-primary bg-active p-0.5 transition-colors data-selected:bg-accent disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <span className="block h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 group-data-selected:translate-x-4" />
                    </Switch>
                  </div>
                </div>
              </Dialog>
            </Popover>
          </DialogTrigger>
          <button
            onClick={() => setStatsOpen(true)}
            aria-label="Statistics"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-border-primary bg-elevated text-text-secondary transition-colors hover:border-border-strong hover:bg-hover outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChartColumnBig size={iconSize} />
          </button>
        </div>

        {/* Grid + Controls */}
        {displayGrid && (
          <div className="flex flex-col items-center">
            {/* Board info */}
            {!generating && (
              <div className="mb-2 flex w-full items-center justify-between text-sm text-text-secondary">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex items-center gap-1 capitalize font-medium ${
                      difficulty === "easy"
                        ? "text-green-600 dark:text-green-400"
                        : difficulty === "medium"
                          ? "text-yellow-500 dark:text-yellow-400"
                          : difficulty === "hard"
                            ? "text-amber-700 dark:text-amber-500"
                            : "text-red-700 dark:text-red-500"
                    }`}
                  >
                    {/* <Gauge size={iconSize} /> */}
                    {difficulty}
                  </span>
                  {showSolution && (
                    <span className="flex items-center gap-1 text-accent">
                      <Eye size={iconSize} />
                      Answers shown
                    </span>
                  )}
                </div>

                {/* Timer */}
                <div className="flex items-center gap-1.5">
                  <span className="tabular-nums font-medium text-text-primary">
                    {formatTime(elapsedSeconds)}
                  </span>
                  <button
                    onClick={timerActive ? pauseTimer : resumeTimer}
                    disabled={elapsedSeconds === 0 && !timerActive}
                    aria-label={timerActive ? "Pause timer" : "Resume timer"}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-border-primary bg-elevated text-text-secondary transition-colors hover:border-border-strong hover:bg-hover disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    {timerActive ? (
                      <Pause size={isMobile ? 16 : 13} />
                    ) : (
                      <Play size={isMobile ? 16 : 13} />
                    )}
                  </button>
                </div>
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
                      const cellNotes = notesGrid?.[r]?.[c] ?? [];
                      const showNotes =
                        isEmpty && cellNotes.length > 0 && !showSolution;
                      return (
                        <td
                          key={c}
                          onClick={() => handleCellClick(r, c)}
                          className={`border border-border-strong cursor-pointer select-none transition-colors duration-75
                          w-10 h-10
                          min-[390px]:w-11 min-[390px]:h-11
                          min-[480px]:w-12 min-[480px]:h-12
                          md:w-13.5 md:h-13.5
                          lg:w-15 lg:h-15
                          min-[1440px]:w-17 min-[1440px]:h-17
                          min-[1920px]:w-19 min-[1920px]:h-19
                          ${showNotes ? "p-0.5" : "text-center align-middle font-semibold tabular-nums text-[1.05rem] min-[390px]:text-[1.2rem] min-[480px]:text-[1.25rem] md:text-[1.35rem] lg:text-2xl min-[1440px]:text-[1.65rem] min-[1920px]:text-[1.8rem]"}
                          ${c % 3 === 0 ? "border-l-2 border-l-border-strong" : ""}
                          ${r % 3 === 0 ? "border-t-2 border-t-border-strong" : ""}
                          ${c === 8 ? "border-r-2 border-r-border-strong" : ""}
                          ${r === 8 ? "border-b-2 border-b-border-strong" : ""}
                          ${highlight}
                          ${shakingCells.has(`${r},${c}`) ? "animate-shake" : ""}
                          ${!showNotes ? (hasConflict && isUserEntry ? "text-error" : isGiven ? "text-clue" : isUserEntry ? "text-solution" : "text-text-tertiary") : ""}
                        `}
                        >
                          {showNotes ? (
                            <div className="grid h-full w-full grid-cols-3">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                                <span
                                  key={n}
                                  className={`flex items-center justify-center font-semibold leading-none tabular-nums
                                    text-[0.42rem] min-[390px]:text-[0.48rem] min-[480px]:text-[0.52rem] md:text-[0.55rem] lg:text-[0.6rem]
                                    ${cellNotes.includes(n) ? "text-accent" : "text-transparent"}`}
                                >
                                  {n}
                                </span>
                              ))}
                            </div>
                          ) : isEmpty ? (
                            ""
                          ) : (
                            cell
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Tool row: Erase + Notes ─────────────────────────── */}
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
                <Eraser size={iconSize} />
              </Button>
              <Button
                aria-label={notesMode ? "Notes on" : "Notes off"}
                onPress={() => setNotesMode((m) => !m)}
                isDisabled={generating || !puzzleGrid || showSolution}
                className={`flex h-10 w-10 min-[390px]:h-11 min-[390px]:w-11 cursor-pointer items-center justify-center rounded-md border outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-35
                  ${
                    notesMode
                      ? "border-accent bg-accent text-white"
                      : "border-border-primary bg-elevated text-text-secondary hover:border-border-strong hover:bg-hover active:bg-active"
                  }`}
              >
                <Pencil size={isMobile ? 20 : 16} />
              </Button>

              {/* ── DEV: test buttons ── */}
              <Button
                aria-label="Validate solvability"
                onPress={() => {
                  if (!displayGrid) return;
                  const clone = displayGrid.map((row) => [...row]);
                  const ok = solve(clone);
                  setTestResult({
                    title: "Validate",
                    ok,
                    message: ok
                      ? "The current board is solvable."
                      : "The current board has no valid solution.",
                  });
                }}
                isDisabled={!puzzleGrid || generating}
                className="flex cursor-pointer items-center gap-1 rounded-md border border-border-primary bg-elevated px-2.5 py-1 text-xs font-medium text-text-secondary outline-none transition-colors hover:border-border-strong hover:bg-hover active:bg-active disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Bug size={iconSize} />
                Validate
              </Button>
              <Button
                aria-label="Check uniqueness"
                onPress={() => {
                  if (!puzzleGrid) return;
                  const clone = puzzleGrid.map((row) => [...row]);
                  const n = countSolutions(clone);
                  const ok = n === 1;
                  setTestResult({
                    title: "Uniqueness",
                    ok,
                    message:
                      n === 1
                        ? "The puzzle has exactly one solution."
                        : n === 0
                          ? "The puzzle has no valid solution."
                          : "The puzzle has multiple solutions.",
                  });
                }}
                isDisabled={!puzzleGrid || generating}
                className="flex cursor-pointer items-center gap-1 rounded-md border border-border-primary bg-elevated px-2.5 py-1 text-xs font-medium text-text-secondary outline-none transition-colors hover:border-border-strong hover:bg-hover active:bg-active disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Bug size={iconSize} />
                Uniqueness
              </Button>
            </div>

            {/* ── Numpad ─────────────────────────────────────────── */}
            <Group
              aria-label="Number pad"
              className="mt-2 flex w-full gap-1.5 min-[480px]:gap-2"
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
                    className="flex flex-1 cursor-pointer items-center justify-center rounded-xl py-3.5 text-2xl font-bold text-numpad tabular-nums outline-none transition-colors
                    min-[390px]:py-4 min-[390px]:text-3xl
                    min-[480px]:py-4 min-[480px]:text-3xl
                    hover:text-numpad-hover active:bg-numpad/10 active:text-numpad-active
                    disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {n}
                  </Button>
                );
              })}
            </Group>
          </div>
        )}

        {/* ── Test Result Dialog ─────────────────────────────── */}
        <ModalOverlay
          isOpen={testResult !== null}
          onOpenChange={(open) => {
            if (!open) setTestResult(null);
          }}
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm entering:animate-in entering:fade-in exiting:animate-out exiting:fade-out"
        >
          <Modal className="mx-4 w-full max-w-xs rounded-xl border border-border-primary bg-container p-6 shadow-xl outline-none entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95">
            <Dialog className="outline-none">
              <div className="flex flex-col gap-3">
                <Heading
                  slot="title"
                  className="text-base font-semibold text-text-primary"
                >
                  {testResult?.title}
                </Heading>
                <p
                  className={`text-sm font-medium ${
                    testResult?.ok ? "text-success" : "text-error"
                  }`}
                >
                  {testResult?.ok ? "✓" : "✗"} {testResult?.message}
                </p>
                <Button
                  onPress={() => setTestResult(null)}
                  className="mt-1 cursor-pointer rounded-md border border-accent bg-accent px-4 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-accent-hover active:bg-accent"
                >
                  OK
                </Button>
              </div>
            </Dialog>
          </Modal>
        </ModalOverlay>

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
                  Congratulations! You completed the{" "}
                  <span className="font-medium capitalize">{difficulty}</span>{" "}
                  puzzle in{" "}
                  <span className="font-semibold tabular-nums text-text-primary">
                    {formatTime(elapsedSeconds)}
                  </span>
                  .
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

        {/* ── Stats Dialog ───────────────────────────────────── */}
        <ModalOverlay
          isOpen={statsOpen}
          onOpenChange={setStatsOpen}
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm entering:animate-in entering:fade-in exiting:animate-out exiting:fade-out"
        >
          <Modal className="mx-4 w-full max-w-sm rounded-xl border border-border-primary bg-container p-6 shadow-xl outline-none entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95">
            <Dialog className="outline-none">
              <div className="flex flex-col gap-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <Heading
                    slot="title"
                    className="text-base font-semibold text-text-primary"
                  >
                    Statistics
                  </Heading>
                  <Button
                    onPress={() => setStatsOpen(false)}
                    aria-label="Close"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border-primary bg-elevated text-text-secondary outline-none transition-colors hover:border-border-strong hover:bg-hover"
                  >
                    <X size={iconSize} />
                  </Button>
                </div>

                {/* Stats table */}
                {statsData.length === 0 ? (
                  <p className="text-center text-sm text-text-secondary">
                    No games played yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-y-3 text-sm">
                    {/* Column headers */}
                    <span className="font-medium text-text-secondary">
                      Mode
                    </span>
                    <span className="text-center font-medium text-text-secondary">
                      Played
                    </span>
                    <span className="text-center font-medium text-text-secondary">
                      Won
                    </span>
                    <span className="text-center font-medium text-text-secondary">
                      Win %
                    </span>

                    {/* Divider */}
                    <div className="col-span-4 border-t border-border-primary" />

                    {/* Rows — sorted by canonical difficulty order */}
                    {(DIFFICULTIES as Difficulty[])
                      .map((d) => statsData.find((s) => s.difficulty === d))
                      .filter((s): s is DifficultyStats => s !== undefined)
                      .map((s) => {
                        const pct =
                          s.played > 0
                            ? Math.round((s.wins / s.played) * 100)
                            : 0;
                        return (
                          <>
                            <span
                              key={`${s.difficulty}-label`}
                              className={`capitalize font-medium ${
                                s.difficulty === "easy"
                                  ? "text-green-600 dark:text-green-400"
                                  : s.difficulty === "medium"
                                    ? "text-yellow-500 dark:text-yellow-400"
                                    : s.difficulty === "hard"
                                      ? "text-amber-700 dark:text-amber-500"
                                      : "text-red-700 dark:text-red-500"
                              }`}
                            >
                              {s.difficulty}
                            </span>
                            <span
                              key={`${s.difficulty}-played`}
                              className="text-center tabular-nums text-text-primary"
                            >
                              {s.played}
                            </span>
                            <span
                              key={`${s.difficulty}-wins`}
                              className="text-center tabular-nums text-text-primary"
                            >
                              {s.wins}
                            </span>
                            <span
                              key={`${s.difficulty}-pct`}
                              className="text-center tabular-nums text-text-primary"
                            >
                              {pct}%
                            </span>
                          </>
                        );
                      })}
                  </div>
                )}
              </div>
            </Dialog>
          </Modal>
        </ModalOverlay>

        {/* ── Info Dialog ────────────────────────────────────── */}
        <ModalOverlay
          isOpen={infoOpen}
          onOpenChange={setInfoOpen}
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm entering:animate-in entering:fade-in exiting:animate-out exiting:fade-out"
        >
          <Modal className="flex h-dvh w-full flex-col bg-container outline-none sm:mx-4 sm:my-6 sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-2xl sm:rounded-xl sm:border sm:border-border-primary sm:shadow-xl entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95">
            <Dialog className="flex flex-1 min-h-0 flex-col outline-none">
              {/* Dialog header */}
              <div className="flex items-center justify-between border-b border-border-primary px-4 py-3 sm:px-6">
                <Heading
                  slot="title"
                  className="text-lg font-semibold text-text-primary"
                >
                  Info
                </Heading>
                <Button
                  onPress={() => setInfoOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-text-secondary outline-none transition-colors hover:bg-hover"
                >
                  <X size={iconSize} />
                </Button>
              </div>

              {/* Tabs */}
              <Tabs className="flex flex-1 min-h-0 flex-col">
                <TabList
                  aria-label="Info sections"
                  className="flex shrink-0 border-b border-border-primary px-4 sm:px-6"
                >
                  <Tab
                    id="about"
                    className="cursor-pointer border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-text-secondary outline-none transition-colors hover:text-text-primary data-selected:border-accent data-selected:text-accent"
                  >
                    About
                  </Tab>
                  <Tab
                    id="algorithm"
                    className="cursor-pointer border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-text-secondary outline-none transition-colors hover:text-text-primary data-selected:border-accent data-selected:text-accent"
                  >
                    Algorithm
                  </Tab>
                  <Tab
                    id="limitations"
                    className="cursor-pointer border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-text-secondary outline-none transition-colors hover:text-text-primary data-selected:border-accent data-selected:text-accent"
                  >
                    Limitations
                  </Tab>
                </TabList>

                <TabPanel
                  id="about"
                  className="flex-1 overflow-y-auto px-4 py-4 sm:px-6"
                >
                  <div className="prose-custom">
                    <Markdown remarkPlugins={[remarkGfm]}>{aboutMd}</Markdown>
                  </div>
                </TabPanel>

                <TabPanel
                  id="algorithm"
                  className="flex-1 overflow-y-auto px-4 py-4 sm:px-6"
                >
                  <div className="prose-custom">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {algorithmMd}
                    </Markdown>
                  </div>
                </TabPanel>

                <TabPanel
                  id="limitations"
                  className="flex-1 overflow-y-auto px-4 py-4 sm:px-6"
                >
                  <div className="prose-custom">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {limitationsMd}
                    </Markdown>
                  </div>
                </TabPanel>
              </Tabs>
            </Dialog>
          </Modal>
        </ModalOverlay>
      </main>
    </div>
  );
}

export default App;

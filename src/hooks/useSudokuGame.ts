import { useState, useEffect, useRef } from "react";
import useLocalStorageState from "use-local-storage-state";
import { generatePuzzle } from "../sudoku";
import type { Grid, Difficulty } from "../sudoku";
import {
  DIFFICULTIES,
  createEmptyGrid,
  cloneGrid,
  createEmptyNotesGrid,
  getConflicts,
} from "../lib/grid";
import type { NotesGrid } from "../lib/grid";
import { incrementPlayed, incrementWins } from "../lib/stats";

export type { Grid, Difficulty, NotesGrid };
export { DIFFICULTIES };

export function useSudokuGame() {
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
    { defaultValue: "easy" },
  );
  const [notesGrid, setNotesGrid] = useLocalStorageState<NotesGrid>(
    "sudoku_notes",
    { defaultValue: createEmptyNotesGrid() },
  );
  const [notesMode, setNotesMode] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [generating, setGenerating] = useState(false);
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
  const [timerActive, setTimerActive] = useState<boolean>(
    () =>
      (elapsedSeconds as number) > 0 &&
      !(timerPaused as boolean) &&
      !(hasWonCurrent as boolean),
  );

  const gridRef = useRef<HTMLTableElement>(null);

  // Build the display grid
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

  const conflicts =
    displayGrid && puzzleGrid && !showSolution
      ? getConflicts(displayGrid, puzzleGrid)
      : new Set<string>();

  const [shakingCells, setShakingCells] = useState<Set<string>>(new Set());

  const isWon = (() => {
    if (!displayGrid || !solvedGrid || showSolution) return false;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (displayGrid[r][c] !== solvedGrid[r][c]) return false;
      }
    }
    return true;
  })();

  // Timer tick
  useEffect(() => {
    if (!timerActive || isWon) return;
    const id = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [timerActive, isWon, setElapsedSeconds]);

  // Win tracking
  useEffect(() => {
    if (isWon && !hasWonCurrent) {
      setHasWonCurrent(true);
      setTimerPaused(true);
      incrementWins(difficulty, elapsedSeconds as number);
    }
  }, [
    isWon,
    hasWonCurrent,
    difficulty,
    elapsedSeconds,
    setHasWonCurrent,
    setTimerPaused,
  ]);

  function startTimerIfIdle() {
    if (!timerActive && !hasWonCurrent) {
      setTimerActive(true);
      setTimerPaused(false);
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

  function enterNumber(n: number) {
    if (!selectedCell || !puzzleGrid) return;
    const [r, c] = selectedCell;
    if (isGivenCell(r, c)) return;

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

    setNotesGrid((prev) => {
      const next = prev.map((row) => row.map((cell) => [...cell]));
      next[r][c] = [];
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
    const isConflict = conflicts.has(`${r},${c}`);

    if (r === sr && c === sc) {
      return isConflict ? "bg-cell-conflict" : "bg-cell-selected";
    }
    if (isConflict) return "bg-cell-conflict";

    const selectedVal = displayGrid[sr][sc];
    if (selectedVal !== 0 && displayGrid[r][c] === selectedVal)
      return "bg-cell-same-value";

    const sameRow = r === sr;
    const sameCol = c === sc;
    const sameBox =
      Math.floor(r / 3) === Math.floor(sr / 3) &&
      Math.floor(c / 3) === Math.floor(sc / 3);
    if (sameRow || sameCol || sameBox) return "bg-cell-peer";

    return "";
  }

  return {
    // Puzzle state
    puzzleGrid,
    solvedGrid,
    userGrid,
    notesGrid,
    displayGrid,
    difficulty,
    conflicts,
    isWon,
    generating,
    showSolution,
    setShowSolution,
    notesMode,
    setNotesMode,
    shakingCells,
    selectedCell,
    setSelectedCell,
    hasWonCurrent,
    // Timer
    elapsedSeconds,
    timerActive,
    timerPaused,
    pauseTimer,
    resumeTimer,
    formatTime,
    // Actions
    handleGenerate,
    enterNumber,
    eraseCell,
    handleCellClick,
    handleGridKeyDown,
    isGivenCell,
    getCellHighlight,
    // Ref
    gridRef,
  };
}

import { useState, useEffect, useCallback, useRef } from "react";
import { generatePuzzle } from "./sudoku";
import type { Grid, Difficulty } from "./sudoku";
import { Sun, Moon, Settings } from "lucide-react";
import {
  Button,
  DialogTrigger,
  Popover,
  Dialog,
  RadioGroup,
  Radio,
  Switch,
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

function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [solvedGrid, setSolvedGrid] = useState<Grid | null>(null);
  const [puzzleGrid, setPuzzleGrid] = useState<Grid | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(
    null,
  );
  const gridRef = useRef<HTMLTableElement>(null);

  function handleGenerate() {
    setGenerating(true);
    setShowSolution(false);
    setSelectedCell(null);

    setTimeout(() => {
      const { solved, puzzle } = generatePuzzle(difficulty);
      setSolvedGrid(solved);
      setPuzzleGrid(puzzle);
      setGenerating(false);
    }, 50);
  }

  const displayGrid: Grid | null =
    showSolution && solvedGrid ? solvedGrid : puzzleGrid;

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
      default:
        return;
    }
    e.preventDefault();
    setSelectedCell([nr, nc]);
  }

  function getCellHighlight(r: number, c: number): string {
    if (!selectedCell || !displayGrid) return "";
    const [sr, sc] = selectedCell;

    // Selected cell itself
    if (r === sr && c === sc) return "bg-cell-selected";

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
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 md:py-12">
        {/* Controls */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="cursor-pointer rounded-md border border-border-primary bg-elevated px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-hover active:bg-active disabled:cursor-not-allowed disabled:opacity-35"
          >
            {generating ? "Generating…" : "Generate Puzzle"}
          </button>

          {/* Settings Popover */}
          <DialogTrigger isOpen={settingsOpen} onOpenChange={setSettingsOpen}>
            <Button
              aria-label="Settings"
              isDisabled={!puzzleGrid}
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
                      onChange={(val) => setDifficulty(val as Difficulty)}
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
                      isDisabled={!puzzleGrid}
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

        {/* Grid */}
        {displayGrid && (
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
                    const isGiven =
                      puzzleGrid !== null && puzzleGrid[r][c] !== 0;
                    const isEmpty = cell === 0;
                    const highlight = getCellHighlight(r, c);
                    return (
                      <td
                        key={c}
                        onClick={() => handleCellClick(r, c)}
                        className={`text-center align-middle font-semibold tabular-nums border border-border-primary cursor-pointer select-none transition-colors duration-75
                          w-10 h-10 text-[1.05rem]
                          min-[480px]:w-12 min-[480px]:h-12 min-[480px]:text-[1.2rem]
                          md:w-[54px] md:h-[54px] md:text-[1.35rem]
                          lg:w-[60px] lg:h-[60px] lg:text-2xl
                          min-[1440px]:w-[68px] min-[1440px]:h-[68px] min-[1440px]:text-[1.65rem]
                          min-[1920px]:w-[76px] min-[1920px]:h-[76px] min-[1920px]:text-[1.8rem]
                          ${c % 3 === 0 ? "border-l-2 border-l-border-strong" : ""}
                          ${r % 3 === 0 ? "border-t-2 border-t-border-strong" : ""}
                          ${c === 8 ? "border-r-2 border-r-border-strong" : ""}
                          ${r === 8 ? "border-b-2 border-b-border-strong" : ""}
                          ${highlight}
                          ${isGiven ? "text-clue" : !isEmpty ? "text-solution" : "text-text-tertiary"}
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
        )}
      </main>
    </div>
  );
}

export default App;

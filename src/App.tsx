import { useState, useEffect, useCallback } from "react";
import { generatePuzzle } from "./sudoku";
import type { Grid, Difficulty } from "./sudoku";
import { Sun, Moon } from "lucide-react";

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

function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [solvedGrid, setSolvedGrid] = useState<Grid | null>(null);
  const [puzzleGrid, setPuzzleGrid] = useState<Grid | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  function handleGenerate() {
    setGenerating(true);
    setShowSolution(false);

    setTimeout(() => {
      const { solved, puzzle } = generatePuzzle(difficulty);
      setSolvedGrid(solved);
      setPuzzleGrid(puzzle);
      setGenerating(false);
    }, 50);
  }

  const displayGrid: Grid | null =
    showSolution && solvedGrid ? solvedGrid : puzzleGrid;

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex w-full items-center justify-between border-b border-border-primary bg-container px-6 py-3">
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
      <main className="flex flex-1 flex-col items-center px-4 py-8 md:py-12">
        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            disabled={generating}
            className="cursor-pointer rounded-md border border-border-primary bg-elevated px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-hover disabled:cursor-not-allowed disabled:opacity-35"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="cursor-pointer rounded-md border border-border-primary bg-elevated px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-hover active:bg-active disabled:cursor-not-allowed disabled:opacity-35"
          >
            {generating ? "Generating…" : "Generate Puzzle"}
          </button>
          {puzzleGrid && (
            <button
              onClick={() => setShowSolution((s) => !s)}
              className="cursor-pointer rounded-md border border-border-primary bg-elevated px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-hover active:bg-active"
            >
              {showSolution ? "Hide Solution" : "Show Solution"}
            </button>
          )}
        </div>

        {/* Grid */}
        {displayGrid && (
          <table className="border-collapse bg-container">
            <tbody>
              {displayGrid.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => {
                    const isGiven =
                      puzzleGrid !== null && puzzleGrid[r][c] !== 0;
                    const isEmpty = cell === 0;
                    return (
                      <td
                        key={c}
                        className={`text-center align-middle font-semibold tabular-nums border border-border-primary
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

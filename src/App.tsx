import { useState, useRef, useEffect } from "react";
import { generateFullGrid, createPuzzle, cloneGrid } from "./sudoku";
import type { Grid, Difficulty } from "./sudoku";
import "./App.css";

function App() {
  const [solvedGrid, setSolvedGrid] = useState<Grid | null>(null);
  const [puzzleGrid, setPuzzleGrid] = useState<Grid | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const logPanelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log panel to bottom when new logs arrive.
  useEffect(() => {
    if (logPanelRef.current) {
      logPanelRef.current.scrollTop = logPanelRef.current.scrollHeight;
    }
  }, [logs]);

  /** Generate a new puzzle (full grid → removal phase). */
  function handleGenerate() {
    setGenerating(true);
    setShowSolution(false);
    const newLogs: string[] = [];
    const log = (msg: string) => newLogs.push(msg);

    // Use setTimeout so the UI shows the "generating" state before blocking.
    setTimeout(() => {
      log("=== Generating full grid ===");
      const solved = generateFullGrid(log);

      log("=== Creating puzzle (removing cells) ===");
      const puzzle = createPuzzle(solved, difficulty, log);

      setSolvedGrid(cloneGrid(solved));
      setPuzzleGrid(puzzle);
      setLogs(newLogs);
      setGenerating(false);
    }, 50);
  }

  /** Determine which grid to render based on showSolution toggle. */
  const displayGrid: Grid | null =
    showSolution && solvedGrid ? solvedGrid : puzzleGrid;

  return (
    <div className="app">
      <h1>Sudoku Generator</h1>

      <div className="main-layout">
        {/* Left: log panel */}
        {logs.length > 0 && (
          <div className="log-panel" ref={logPanelRef}>
            <h3>Generation Log</h3>
            {logs.map((entry, i) => (
              <div key={i} className="log-entry">
                {entry}
              </div>
            ))}
          </div>
        )}

        {/* Right: controls + puzzle */}
        <div className="puzzle-section">
          <div className="controls">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              disabled={generating}
            >
              <option value="easy">Easy (27–32 clues)</option>
              <option value="medium">Medium (25–27 clues)</option>
              <option value="hard">Hard (17–19 clues)</option>
            </select>
            <button onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating…" : "Generate Puzzle"}
            </button>
            {puzzleGrid && (
              <button onClick={() => setShowSolution((s) => !s)}>
                {showSolution ? "Hide Solution" : "Show Solution"}
              </button>
            )}
          </div>

          {displayGrid && (
            <table className="sudoku-grid">
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
                          className={[
                            "cell",
                            c % 3 === 0 ? "border-left" : "",
                            r % 3 === 0 ? "border-top" : "",
                            c === 8 ? "border-right" : "",
                            r === 8 ? "border-bottom" : "",
                            isGiven ? "given-cell" : "",
                            !isGiven && !isEmpty ? "solved-cell" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
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
        </div>
      </div>
    </div>
  );
}

export default App;

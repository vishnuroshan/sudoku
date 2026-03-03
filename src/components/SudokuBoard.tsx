import type { RefObject } from "react";
import type { Grid } from "../sudoku";
import type { NotesGrid } from "../lib/grid";

interface SudokuBoardProps {
  displayGrid: Grid;
  userGrid: Grid;
  conflicts: Set<string>;
  notesGrid: NotesGrid;
  shakingCells: Set<string>;
  showSolution: boolean;
  isGivenCell: (r: number, c: number) => boolean;
  getCellHighlight: (r: number, c: number) => string;
  handleCellClick: (r: number, c: number) => void;
  handleGridKeyDown: (e: React.KeyboardEvent) => void;
  gridRef: RefObject<HTMLTableElement | null>;
}

export function SudokuBoard({
  displayGrid,
  userGrid,
  conflicts,
  notesGrid,
  shakingCells,
  showSolution,
  isGivenCell,
  getCellHighlight,
  handleCellClick,
  handleGridKeyDown,
  gridRef,
}: SudokuBoardProps) {
  return (
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
                  className={`border border-border-strong cursor-pointer select-none transition-colors duration-150
                    w-10 h-10
                    min-[390px]:w-11 min-[390px]:h-11
                    min-[480px]:w-12 min-[480px]:h-12
                    md:w-16 md:h-16
                    lg:w-18 lg:h-18
                    min-[1440px]:w-20 min-[1440px]:h-20
                    min-[1920px]:w-22 min-[1920px]:h-22
                    ${showNotes ? "p-0.5" : "text-center align-middle font-semibold tabular-nums text-[1.3rem] min-[390px]:text-[1.45rem] min-[480px]:text-[1.55rem] md:text-[1.85rem] lg:text-[2.1rem] min-[1440px]:text-[2.3rem] min-[1920px]:text-[2.55rem]"}
                    ${c % 3 === 0 ? "border-l-[3px] border-l-border-strong" : ""}
                    ${r % 3 === 0 ? "border-t-[3px] border-t-border-strong" : ""}
                    ${c === 8 ? "border-r-[3px] border-r-border-strong" : ""}
                    ${r === 8 ? "border-b-[3px] border-b-border-strong" : ""}
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
  );
}

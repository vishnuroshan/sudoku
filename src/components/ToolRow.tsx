import { Eraser, Pencil } from "lucide-react";
import { Button } from "react-aria-components";
import type { Grid } from "../sudoku";

interface ToolRowProps {
  generating: boolean;
  selectedCell: [number, number] | null;
  isGivenCell: (r: number, c: number) => boolean;
  eraseCell: () => void;
  notesMode: boolean;
  setNotesMode: (fn: (m: boolean) => boolean) => void;
  puzzleGrid: Grid | null;
  showSolution: boolean;
  isMobile: boolean;
}

export function ToolRow({
  generating,
  selectedCell,
  isGivenCell,
  eraseCell,
  notesMode,
  setNotesMode,
  puzzleGrid,
  showSolution,
  isMobile,
}: ToolRowProps) {
  const iconSize = isMobile ? 20 : 16;
  return (
    <div className="mt-2 flex w-full gap-1">
      <Button
        aria-label="Erase"
        onPress={eraseCell}
        isDisabled={
          generating ||
          !selectedCell ||
          (selectedCell !== null &&
            isGivenCell(selectedCell[0], selectedCell[1]))
        }
        className="flex cursor-pointer items-center gap-1 rounded-md border border-border-primary bg-elevated px-2.5 py-1 text-xs font-medium text-text-secondary outline-none transition-colors hover:border-border-strong hover:bg-hover active:bg-active disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Eraser size={iconSize} />
        Clear
      </Button>
      <Button
        aria-label={notesMode ? "Notes on" : "Notes off"}
        onPress={() => setNotesMode((m) => !m)}
        isDisabled={generating || !puzzleGrid || showSolution}
        className={`flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-35
          ${
            notesMode
              ? "border-accent bg-accent text-white"
              : "border-border-primary bg-elevated text-text-secondary hover:border-border-strong hover:bg-hover active:bg-active"
          }`}
      >
        <Pencil size={iconSize} />
        Notes
      </Button>
    </div>
  );
}

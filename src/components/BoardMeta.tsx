import { Pause, Play } from "lucide-react";
import type { Difficulty } from "../lib/grid";

interface BoardMetaProps {
  difficulty: Difficulty;
  elapsedSeconds: number;
  timerActive: boolean;
  pauseTimer: () => void;
  resumeTimer: () => void;
  isMobile: boolean;
  formatTime: (s: number) => string;
}

export function BoardMeta({
  difficulty,
  elapsedSeconds,
  timerActive,
  pauseTimer,
  resumeTimer,
  isMobile,
  formatTime,
}: BoardMetaProps) {
  return (
    <div className="mb-2 flex w-full items-center justify-between">
      <span
        className={`capitalize font-medium text-sm ${
          difficulty === "easy"
            ? "text-green-600 dark:text-green-400"
            : difficulty === "medium"
              ? "text-yellow-500 dark:text-yellow-400"
              : difficulty === "hard"
                ? "text-amber-700 dark:text-amber-500"
                : "text-red-700 dark:text-red-500"
        }`}
      >
        {difficulty}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="tabular-nums text-sm font-medium text-text-primary">
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
  );
}

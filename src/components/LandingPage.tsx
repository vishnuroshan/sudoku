import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  CalendarDays,
  Play,
  Plus,
  ChartColumnBig,
  Sun,
  Moon,
} from "lucide-react";
import useLocalStorageState from "use-local-storage-state";
import {
  Button,
  DialogTrigger,
  Popover,
  Dialog,
  RadioGroup,
  Radio,
} from "react-aria-components";
import { DIFFICULTIES } from "../lib/grid";
import type { Difficulty } from "../lib/grid";
import { DIFFICULTY_COLOR } from "../sudoku";
import { useGame } from "../context/GameContext";
import { useTheme } from "../hooks/useTheme";
import { StatsModal } from "./StatsModal";
import { getAllStats } from "../lib/stats";
import type { DifficultyStats } from "../lib/stats";

export function LandingPage() {
  const navigate = useNavigate();
  const game = useGame();
  const { theme, toggle: toggleTheme } = useTheme();
  const [diffOpen, setDiffOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsData, setStatsData] = useState<DifficultyStats[]>([]);
  const [selectedDiff, setSelectedDiff] = useLocalStorageState<Difficulty>(
    "sudoku_difficulty",
    { defaultValue: "easy" },
  );

  const hasActiveGame =
    game.puzzleGrid !== null && !(game.hasWonCurrent as boolean);

  useEffect(() => {
    if (statsOpen) getAllStats().then(setStatsData);
  }, [statsOpen]);

  function handleContinue() {
    game.resumeTimer();
    navigate("/game");
  }

  function handleNewGame() {
    game.handleGenerate(selectedDiff as Difficulty);
    navigate("/game");
  }

  function handleDailyChallenge() {
    game.handleGenerate("medium");
    navigate("/game");
  }

  const isDark = theme === "dark";
  const bgFill = isDark ? "%23151619" : "%23f7f8fa";
  const bgStroke = isDark ? "%232e3035" : "%23bcbff7";
  const bgPattern = `url("data:image/svg+xml,<svg id='patternId' width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'><defs><pattern id='a' patternUnits='userSpaceOnUse' width='20' height='20' patternTransform='scale(1) rotate(60)'><rect x='0' y='0' width='100%25' height='100%25' fill='${bgFill}'/><path d='M 10,-2.55e-7 V 20 Z M -1.1677362e-8,10 H 20 Z' stroke-width='0.5' stroke='${bgStroke}' fill='none'/></pattern></defs><rect width='800%25' height='800%25' transform='translate(-10,0)' fill='url(%23a)'/></svg>")`;

  return (
    <div
      className="relative flex h-dvh flex-col items-center justify-center px-4"
      style={{ backgroundImage: bgPattern }}
    >
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        className="absolute top-4 right-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border-primary bg-elevated text-text-secondary transition-colors hover:border-border-strong hover:bg-hover"
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <h1
        className="mb-12 text-8xl font-bold tracking-tight text-text-primary sm:text-8xl"
        style={{ fontFamily: "Times New Roman, Times, serif" }}
      >
        Sudoku
      </h1>

      <div className="flex w-full max-w-xs flex-col gap-3">
        {/* Daily Challenge */}
        <button
          onClick={handleDailyChallenge}
          className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-border-primary bg-elevated px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-hover active:bg-active"
        >
          <CalendarDays size={16} className="shrink-0 text-text-secondary" />
          <span>Daily Challenge</span>
          <span className="ml-auto font-mono text-xs text-text-secondary">
            {new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            })}
          </span>
        </button>

        {/* Continue */}
        {hasActiveGame && (
          <button
            onClick={handleContinue}
            className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-accent bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover active:bg-accent"
          >
            <Play size={16} className="shrink-0" />
            <span>Continue</span>
            <span className="ml-auto font-mono text-xs opacity-80">
              {game.formatTime(game.elapsedSeconds as number)}
            </span>
          </button>
        )}

        {/* Stats */}
        <button
          onClick={() => setStatsOpen(true)}
          className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-border-primary bg-elevated px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-hover active:bg-active"
        >
          <ChartColumnBig size={16} className="shrink-0 text-text-secondary" />
          <span>Statistics</span>
        </button>

        {/* New Game with difficulty selector */}
        <div className="flex gap-2">
          <button
            onClick={handleNewGame}
            className="flex flex-1 cursor-pointer items-center gap-3 rounded-md border border-border-primary bg-elevated px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-hover active:bg-active"
          >
            <Plus size={16} className="shrink-0 text-text-secondary" />
            <span>New Game</span>
            <span
              className={`ml-auto capitalize text-xs font-medium ${DIFFICULTY_COLOR[selectedDiff as Difficulty]}`}
            >
              {selectedDiff}
            </span>
          </button>
          <DialogTrigger isOpen={diffOpen} onOpenChange={setDiffOpen}>
            <Button
              aria-label="Select difficulty"
              className="flex w-11 cursor-pointer items-center justify-center rounded-md border border-border-primary bg-elevated text-text-secondary transition-colors hover:border-border-strong hover:bg-hover outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Settings size={18} />
            </Button>
            <Popover
              placement="bottom end"
              className="w-48 rounded-lg border border-border-primary bg-container shadow-lg outline-none entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95"
            >
              <Dialog className="p-3 outline-none">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Difficulty
                </span>
                <RadioGroup
                  aria-label="Difficulty"
                  value={selectedDiff}
                  onChange={(val) => {
                    setSelectedDiff(val as Difficulty);
                    setDiffOpen(false);
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
              </Dialog>
            </Popover>
          </DialogTrigger>
        </div>
      </div>

      <StatsModal
        statsOpen={statsOpen}
        setStatsOpen={setStatsOpen}
        statsData={statsData}
        iconSize={16}
      />
    </div>
  );
}

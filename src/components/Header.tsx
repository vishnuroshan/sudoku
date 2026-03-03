import { Sun, Moon, Settings, Bug, ChartColumnBig } from "lucide-react";
import {
  Button,
  DialogTrigger,
  Popover,
  Dialog,
  RadioGroup,
  Radio,
  Switch,
} from "react-aria-components";
import type { Difficulty } from "../lib/grid";
import { DIFFICULTIES } from "../lib/grid";
import type { Theme } from "../hooks/useTheme";
import type { Grid } from "../sudoku";

interface HeaderProps {
  iconSize: number;
  theme: Theme;
  toggleTheme: () => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  generating: boolean;
  puzzleGrid: Grid | null;
  difficulty: Difficulty;
  handleGenerate: (diff?: Difficulty) => void;
  showSolution: boolean;
  setShowSolution: (val: boolean) => void;
  pauseTimer: () => void;
  setStatsOpen: (open: boolean) => void;
}

export function Header({
  iconSize,
  theme,
  toggleTheme,
  settingsOpen,
  setSettingsOpen,
  generating,
  puzzleGrid,
  difficulty,
  handleGenerate,
  showSolution,
  setShowSolution,
  pauseTimer,
  setStatsOpen,
}: HeaderProps) {
  return (
    <header className="flex w-full items-center justify-between border-b border-border-primary bg-container px-4 py-2 sm:px-6">
      <div className="flex items-center gap-2">
        <h1
          className="text-2xl font-bold tracking-tight text-text-primary"
          style={{ fontFamily: "Times New Roman, Times, serif" }}
        >
          Sudoku
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Settings Popover */}
        <DialogTrigger isOpen={settingsOpen} onOpenChange={setSettingsOpen}>
          <Button
            aria-label="Settings"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border-primary bg-elevated text-text-secondary transition-colors hover:border-border-strong hover:bg-hover outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Settings size={iconSize} />
          </Button>
          <Popover
            placement="bottom end"
            className="w-72 rounded-lg border border-border-primary bg-container shadow-lg outline-none entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95"
          >
            <Dialog className="p-4 outline-none">
              <div className="space-y-4">
                {/* Generate Puzzle */}
                <button
                  onClick={() => {
                    setSettingsOpen(false);
                    handleGenerate();
                  }}
                  disabled={generating}
                  className="w-full cursor-pointer rounded-md border border-border-primary bg-elevated px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-hover active:bg-active disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {generating ? "Generating…" : "Generate New Puzzle"}
                </button>
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
                {/* Show Answer (DEV only) */}
                {import.meta.env.DEV && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-sm font-medium text-text-primary">
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
                )}
              </div>
            </Dialog>
          </Popover>
        </DialogTrigger>

        {/* Stats */}
        <button
          onClick={() => setStatsOpen(true)}
          aria-label="Statistics"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border-primary bg-elevated text-text-secondary transition-colors hover:border-border-strong hover:bg-hover outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ChartColumnBig size={iconSize} />
        </button>

        {/* LinkedIn */}
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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect width="4" height="12" x="2" y="9" />
            <circle cx="4" cy="4" r="2" />
          </svg>
        </a>

        {/* GitHub */}
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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        </a>

        {/* Theme toggle */}
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
  );
}

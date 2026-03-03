import { useState, useEffect } from "react";
import { useMediaQuery } from "@uidotdev/usehooks";
import {
  Button,
  Modal,
  ModalOverlay,
  Dialog,
  Heading,
} from "react-aria-components";
import { useTheme } from "./hooks/useTheme";
import { useSudokuGame } from "./hooks/useSudokuGame";
import { getAllStats } from "./lib/stats";
import type { DifficultyStats } from "./lib/stats";
import { Header } from "./components/Header";
import { BoardMeta } from "./components/BoardMeta";
import { SudokuBoard } from "./components/SudokuBoard";
import { ToolRow } from "./components/ToolRow";
import { Numpad } from "./components/Numpad";
import { StatsModal } from "./components/StatsModal";
import { WinModal } from "./components/WinModal";
import { InfoModal } from "./components/InfoModal";
import { PauseModal } from "./components/PauseModal";

function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const isMobile = useMediaQuery("only screen and (max-width: 768px)");
  const iconSize = isMobile ? 22 : 18;

  // UI-only state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsData, setStatsData] = useState<DifficultyStats[]>([]);
  const [testResult, setTestResult] = useState<{
    title: string;
    ok: boolean;
    message: string;
  } | null>(null);

  // Game + timer logic
  const game = useSudokuGame();

  // Load stats whenever the stats dialog opens
  useEffect(() => {
    if (statsOpen) {
      getAllStats().then(setStatsData);
    }
  }, [statsOpen]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header
        iconSize={iconSize}
        theme={theme}
        toggleTheme={toggleTheme}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        generating={game.generating}
        puzzleGrid={game.puzzleGrid}
        difficulty={game.difficulty}
        handleGenerate={game.handleGenerate}
        showSolution={game.showSolution}
        setShowSolution={game.setShowSolution}
        pauseTimer={game.pauseTimer}
        setStatsOpen={setStatsOpen}
      />

      <main className="flex flex-1 min-h-0 flex-col items-center justify-center px-2 py-3 md:py-5">
        {game.displayGrid &&
          (() => {
            const isPaused =
              (game.timerPaused as boolean) &&
              !game.isWon &&
              game.elapsedSeconds > 0;
            return (
              <>
                {!isPaused && (
                  <div className="flex flex-col items-center">
                    <BoardMeta
                      difficulty={game.difficulty}
                      elapsedSeconds={game.elapsedSeconds}
                      timerActive={game.timerActive}
                      pauseTimer={game.pauseTimer}
                      resumeTimer={game.resumeTimer}
                      isMobile={isMobile}
                      formatTime={game.formatTime}
                    />
                    <SudokuBoard
                      displayGrid={game.displayGrid}
                      userGrid={game.userGrid}
                      conflicts={game.conflicts}
                      notesGrid={game.notesGrid}
                      shakingCells={game.shakingCells}
                      showSolution={game.showSolution}
                      isGivenCell={game.isGivenCell}
                      getCellHighlight={game.getCellHighlight}
                      handleCellClick={game.handleCellClick}
                      handleGridKeyDown={game.handleGridKeyDown}
                      gridRef={game.gridRef}
                    />
                    <ToolRow
                      generating={game.generating}
                      selectedCell={game.selectedCell}
                      isGivenCell={game.isGivenCell}
                      eraseCell={game.eraseCell}
                      notesMode={game.notesMode}
                      setNotesMode={game.setNotesMode}
                      puzzleGrid={game.puzzleGrid}
                      showSolution={game.showSolution}
                      isMobile={isMobile}
                    />
                    <Numpad
                      displayGrid={game.displayGrid}
                      generating={game.generating}
                      selectedCell={game.selectedCell}
                      enterNumber={game.enterNumber}
                    />
                  </div>
                )}
                <PauseModal
                  isPaused={isPaused}
                  elapsedSeconds={game.elapsedSeconds}
                  formatTime={game.formatTime}
                  resumeTimer={game.resumeTimer}
                />
              </>
            );
          })()}

        {/* Test Result Dialog (DEV) */}
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
                  className={`text-sm font-medium ${testResult?.ok ? "text-success" : "text-error"}`}
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

        <WinModal
          isWon={game.isWon}
          difficulty={game.difficulty}
          elapsedSeconds={game.elapsedSeconds}
          formatTime={game.formatTime}
          handleGenerate={game.handleGenerate}
        />

        <StatsModal
          statsOpen={statsOpen}
          setStatsOpen={setStatsOpen}
          statsData={statsData}
          iconSize={iconSize}
        />

        <InfoModal
          infoOpen={infoOpen}
          setInfoOpen={setInfoOpen}
          iconSize={iconSize}
        />
      </main>
    </div>
  );
}

export default App;

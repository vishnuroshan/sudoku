import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "@uidotdev/usehooks";
import {
  Button,
  Modal,
  ModalOverlay,
  Dialog,
  Heading,
} from "react-aria-components";
import { useTheme } from "../hooks/useTheme";
import { useGame } from "../context/GameContext";
import { getAllStats } from "../lib/stats";
import type { DifficultyStats } from "../lib/stats";
import { Header } from "./Header";
import { BoardMeta } from "./BoardMeta";
import { SudokuBoard } from "./SudokuBoard";
import { ToolRow } from "./ToolRow";
import { Numpad } from "./Numpad";
import { StatsModal } from "./StatsModal";
import { WinModal } from "./WinModal";
import { InfoModal } from "./InfoModal";
import { PauseModal } from "./PauseModal";

export function GamePage() {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const isMobile = useMediaQuery("only screen and (max-width: 768px)");
  const iconSize = isMobile ? 22 : 18;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsData, setStatsData] = useState<DifficultyStats[]>([]);
  const [testResult, setTestResult] = useState<{
    title: string;
    ok: boolean;
    message: string;
  } | null>(null);

  const game = useGame();

  // Redirect to landing if no puzzle exists
  useEffect(() => {
    if (!game.puzzleGrid && !game.generating) {
      navigate("/", { replace: true });
    }
  }, [game.puzzleGrid, game.generating, navigate]);

  // Pause timer when leaving the game page
  useEffect(() => {
    return () => {
      game.pauseTimer();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        onBack={() => {
          game.pauseTimer();
          navigate("/");
        }}
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

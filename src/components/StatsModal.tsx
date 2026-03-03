import { X } from "lucide-react";
import {
  Button,
  Modal,
  ModalOverlay,
  Dialog,
  Heading,
} from "react-aria-components";
import type { DifficultyStats } from "../lib/stats";
import { DIFFICULTIES } from "../lib/grid";
import type { Difficulty } from "../lib/grid";

interface StatsModalProps {
  statsOpen: boolean;
  setStatsOpen: (open: boolean) => void;
  statsData: DifficultyStats[];
  iconSize: number;
}

export function StatsModal({
  statsOpen,
  setStatsOpen,
  statsData,
  iconSize,
}: StatsModalProps) {
  return (
    <ModalOverlay
      isOpen={statsOpen}
      onOpenChange={setStatsOpen}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm entering:animate-in entering:fade-in exiting:animate-out exiting:fade-out"
    >
      <Modal className="mx-4 w-full max-w-sm rounded-xl border border-border-primary bg-container p-6 shadow-xl outline-none entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95">
        <Dialog className="outline-none">
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <Heading
                slot="title"
                className="text-base font-semibold text-text-primary"
              >
                Statistics
              </Heading>
              <Button
                onPress={() => setStatsOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border-primary bg-elevated text-text-secondary outline-none transition-colors hover:border-border-strong hover:bg-hover"
              >
                <X size={iconSize} />
              </Button>
            </div>

            {statsData.length === 0 ? (
              <p className="text-center text-sm text-text-secondary">
                No games played yet.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-y-3 text-sm">
                <span className="font-medium text-text-secondary">Mode</span>
                <span className="text-center font-medium text-text-secondary">
                  Played
                </span>
                <span className="text-center font-medium text-text-secondary">
                  Won
                </span>
                <span className="text-center font-medium text-text-secondary">
                  Win %
                </span>
                <div className="col-span-4 border-t border-border-primary" />
                {(DIFFICULTIES as Difficulty[])
                  .map((d) => statsData.find((s) => s.difficulty === d))
                  .filter((s): s is DifficultyStats => s !== undefined)
                  .map((s) => {
                    const pct =
                      s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0;
                    return (
                      <>
                        <span
                          key={`${s.difficulty}-label`}
                          className={`capitalize font-medium ${
                            s.difficulty === "easy"
                              ? "text-green-600 dark:text-green-400"
                              : s.difficulty === "medium"
                                ? "text-yellow-500 dark:text-yellow-400"
                                : s.difficulty === "hard"
                                  ? "text-amber-700 dark:text-amber-500"
                                  : "text-red-700 dark:text-red-500"
                          }`}
                        >
                          {s.difficulty}
                        </span>
                        <span
                          key={`${s.difficulty}-played`}
                          className="text-center tabular-nums text-text-primary"
                        >
                          {s.played}
                        </span>
                        <span
                          key={`${s.difficulty}-wins`}
                          className="text-center tabular-nums text-text-primary"
                        >
                          {s.wins}
                        </span>
                        <span
                          key={`${s.difficulty}-pct`}
                          className="text-center tabular-nums text-text-primary"
                        >
                          {pct}%
                        </span>
                      </>
                    );
                  })}
              </div>
            )}
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

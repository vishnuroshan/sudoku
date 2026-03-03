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
import { DIFFICULTY_COLOR } from "../sudoku";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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
      <Modal className="mx-4 w-full max-w-md rounded-xl border border-border-primary bg-container p-6 shadow-xl outline-none entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95">
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
              <div className="grid grid-cols-2 gap-3">
                {(DIFFICULTIES as Difficulty[])
                  .map((d) => statsData.find((s) => s.difficulty === d))
                  .filter((s): s is DifficultyStats => s !== undefined)
                  .map((s) => {
                    const pct =
                      s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0;
                    const avgTime =
                      s.wins > 0
                        ? Math.round((s.totalTime ?? 0) / s.wins)
                        : null;
                    return (
                      <div
                        key={s.difficulty}
                        className="flex flex-col gap-2 rounded-lg border border-border-primary bg-elevated p-3"
                      >
                        <span
                          className={`text-sm font-semibold capitalize ${DIFFICULTY_COLOR[s.difficulty]}`}
                        >
                          {s.difficulty}
                        </span>

                        <div className="grid grid-cols-3 gap-1 text-xs">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-text-secondary">Played</span>
                            <span className="tabular-nums font-medium text-text-primary">
                              {s.played}
                            </span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-text-secondary">Won</span>
                            <span className="tabular-nums font-medium text-text-primary">
                              {s.wins}
                            </span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-text-secondary">Win%</span>
                            <span className="tabular-nums font-medium text-text-primary">
                              {pct}%
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1 border-t border-border-primary pt-2 text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-text-secondary">Best</span>
                            <span className="tabular-nums font-medium text-text-primary">
                              {s.bestTime != null
                                ? formatTime(s.bestTime)
                                : "—"}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-text-secondary">Avg</span>
                            <span className="tabular-nums font-medium text-text-primary">
                              {avgTime != null ? formatTime(avgTime) : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
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

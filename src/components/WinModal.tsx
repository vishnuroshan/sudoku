import { PartyPopper } from "lucide-react";
import {
  Button,
  Modal,
  ModalOverlay,
  Dialog,
  Heading,
} from "react-aria-components";
import type { Difficulty } from "../lib/grid";

interface WinModalProps {
  isWon: boolean;
  difficulty: Difficulty;
  elapsedSeconds: number;
  formatTime: (s: number) => string;
  handleGenerate: () => void;
}

export function WinModal({
  isWon,
  difficulty,
  elapsedSeconds,
  formatTime,
  handleGenerate,
}: WinModalProps) {
  return (
    <ModalOverlay
      isOpen={isWon}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm entering:animate-in entering:fade-in exiting:animate-out exiting:fade-out"
    >
      <Modal className="mx-4 w-full max-w-sm rounded-xl border border-border-primary bg-container p-6 shadow-xl outline-none entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95">
        <Dialog className="outline-none">
          <div className="flex flex-col items-center gap-4 text-center">
            <PartyPopper size={40} className="text-success" />
            <Heading
              slot="title"
              className="text-lg font-semibold text-text-primary"
            >
              Puzzle Solved!
            </Heading>
            <p className="text-sm text-text-secondary">
              Congratulations! You completed the{" "}
              <span className="font-medium capitalize">{difficulty}</span>{" "}
              puzzle in{" "}
              <span className="font-semibold tabular-nums text-text-primary">
                {formatTime(elapsedSeconds)}
              </span>
              .
            </p>
            <Button
              onPress={handleGenerate}
              className="mt-2 w-full cursor-pointer rounded-md border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-white outline-none transition-colors hover:bg-accent-hover active:bg-accent"
            >
              New Puzzle
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

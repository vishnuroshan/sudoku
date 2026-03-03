import { Play } from "lucide-react";
import {
  Button,
  Modal,
  ModalOverlay,
  Dialog,
  Heading,
} from "react-aria-components";

interface PauseModalProps {
  isPaused: boolean;
  elapsedSeconds: number;
  formatTime: (s: number) => string;
  resumeTimer: () => void;
}

export function PauseModal({
  isPaused,
  elapsedSeconds,
  formatTime,
  resumeTimer,
}: PauseModalProps) {
  return (
    <ModalOverlay
      isOpen={isPaused}
      isDismissable={false}
      isKeyboardDismissDisabled
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <Modal className="mx-4 w-full max-w-xs rounded-xl border border-border-primary bg-container p-6 shadow-xl outline-none entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95">
        <Dialog className="outline-none">
          <div className="flex flex-col items-center gap-4 text-center">
            <Heading
              slot="title"
              className="text-base font-semibold text-text-primary"
            >
              Game Paused
            </Heading>
            <p className="tabular-nums text-3xl font-bold text-text-primary">
              {formatTime(elapsedSeconds)}
            </p>
            <Button
              onPress={resumeTimer}
              className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-white outline-none transition-colors hover:bg-accent-hover active:bg-accent"
            >
              <Play size={15} />
              Resume
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

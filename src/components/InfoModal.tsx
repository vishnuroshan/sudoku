import { X } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Button,
  Modal,
  ModalOverlay,
  Dialog,
  Heading,
  Tabs,
  TabList,
  Tab,
  TabPanel,
} from "react-aria-components";

import aboutMd from "../about.md?raw";
import algorithmMd from "../../ALGORITHM.md?raw";
import limitationsMd from "../limitations.md?raw";

interface InfoModalProps {
  infoOpen: boolean;
  setInfoOpen: (open: boolean) => void;
  iconSize: number;
}

export function InfoModal({ infoOpen, setInfoOpen, iconSize }: InfoModalProps) {
  return (
    <ModalOverlay
      isOpen={infoOpen}
      onOpenChange={setInfoOpen}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm entering:animate-in entering:fade-in exiting:animate-out exiting:fade-out"
    >
      <Modal className="flex h-dvh w-full flex-col bg-container outline-none sm:mx-4 sm:my-6 sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-2xl sm:rounded-xl sm:border sm:border-border-primary sm:shadow-xl entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95">
        <Dialog className="flex flex-1 min-h-0 flex-col outline-none">
          <div className="flex items-center justify-between border-b border-border-primary px-4 py-3 sm:px-6">
            <Heading
              slot="title"
              className="text-lg font-semibold text-text-primary"
            >
              Info
            </Heading>
            <Button
              onPress={() => setInfoOpen(false)}
              aria-label="Close"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-text-secondary outline-none transition-colors hover:bg-hover"
            >
              <X size={iconSize} />
            </Button>
          </div>

          <Tabs className="flex flex-1 min-h-0 flex-col">
            <TabList
              aria-label="Info sections"
              className="flex shrink-0 border-b border-border-primary px-4 sm:px-6"
            >
              <Tab
                id="about"
                className="cursor-pointer border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-text-secondary outline-none transition-colors hover:text-text-primary data-selected:border-accent data-selected:text-accent"
              >
                About
              </Tab>
              <Tab
                id="algorithm"
                className="cursor-pointer border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-text-secondary outline-none transition-colors hover:text-text-primary data-selected:border-accent data-selected:text-accent"
              >
                Algorithm
              </Tab>
              <Tab
                id="limitations"
                className="cursor-pointer border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-text-secondary outline-none transition-colors hover:text-text-primary data-selected:border-accent data-selected:text-accent"
              >
                Limitations
              </Tab>
            </TabList>

            <TabPanel
              id="about"
              className="flex-1 overflow-y-auto px-4 py-4 sm:px-6"
            >
              <div className="prose-custom">
                <Markdown remarkPlugins={[remarkGfm]}>{aboutMd}</Markdown>
              </div>
            </TabPanel>
            <TabPanel
              id="algorithm"
              className="flex-1 overflow-y-auto px-4 py-4 sm:px-6"
            >
              <div className="prose-custom">
                <Markdown remarkPlugins={[remarkGfm]}>{algorithmMd}</Markdown>
              </div>
            </TabPanel>
            <TabPanel
              id="limitations"
              className="flex-1 overflow-y-auto px-4 py-4 sm:px-6"
            >
              <div className="prose-custom">
                <Markdown remarkPlugins={[remarkGfm]}>{limitationsMd}</Markdown>
              </div>
            </TabPanel>
          </Tabs>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

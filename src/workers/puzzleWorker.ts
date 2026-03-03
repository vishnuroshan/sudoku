import { generatePuzzle } from "../sudoku";
import type { Difficulty } from "../sudoku";

self.onmessage = (e: MessageEvent<{ difficulty: Difficulty }>) => {
  const result = generatePuzzle(e.data.difficulty);
  self.postMessage(result);
};

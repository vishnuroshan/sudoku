import type { Difficulty } from "./engine/types.ts";

export type { Grid, Difficulty } from "./engine/types.ts";
export type { Grade, TechniqueName, Tier, Step } from "./engine/ladder.ts";
export { nextStep, describeStep, computeCandidates } from "./engine/ladder.ts";
export type { GeneratedPuzzle } from "./engine/generate.ts";
export { generatePuzzle } from "./engine/generate.ts";

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: "text-green-600 dark:text-green-400",
  medium: "text-yellow-500 dark:text-yellow-400",
  hard: "text-amber-700 dark:text-amber-500",
  master: "text-red-800 dark:text-red-500",
  extreme: "text-red-900 dark:text-red-500",
};

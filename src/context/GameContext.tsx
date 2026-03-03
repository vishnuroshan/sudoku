import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useSudokuGame } from "../hooks/useSudokuGame";

export type GameContextType = ReturnType<typeof useSudokuGame>;

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const game = useSudokuGame();
  return <GameContext.Provider value={game}>{children}</GameContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

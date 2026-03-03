import { openDB } from "idb";
import type { Difficulty } from "../sudoku";

export interface DifficultyStats {
  difficulty: Difficulty;
  wins: number;
  played: number;
}

const DB_NAME = "sudoku-stats";
const DB_VERSION = 1;
const STORE_NAME = "stats";

function getStatsDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "difficulty" });
      }
    },
  });
}

export async function incrementPlayed(difficulty: Difficulty) {
  const db = await getStatsDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const existing: DifficultyStats | undefined = await store.get(difficulty);
  await store.put({
    difficulty,
    wins: existing?.wins ?? 0,
    played: (existing?.played ?? 0) + 1,
  });
  await tx.done;
}

export async function incrementWins(difficulty: Difficulty) {
  const db = await getStatsDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const existing: DifficultyStats | undefined = await store.get(difficulty);
  await store.put({
    difficulty,
    wins: (existing?.wins ?? 0) + 1,
    played: existing?.played ?? 0,
  });
  await tx.done;
}

export async function getAllStats(): Promise<DifficultyStats[]> {
  const db = await getStatsDB();
  return db.getAll(STORE_NAME);
}

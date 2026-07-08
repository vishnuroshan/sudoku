# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # vite --host (LAN-exposed; PWA service worker disabled in dev)
npm run build    # tsc -b && vite build — typecheck runs as part of build
npm run lint     # eslint .
npm run preview  # serve the production build
```

There is no test framework installed. Verify changes by running the app; don't invent test commands.

## Architecture

Single-page React 19 + Vite PWA. Two routes (`/` landing, `/game`) in `App.tsx`, both wrapped in `GameProvider`.

### State ownership

`useSudokuGame` (`src/hooks/useSudokuGame.ts`) owns **all** game state and is instantiated exactly once, in `GameProvider`. Components read it via `useGame()`. Calling `useSudokuGame()` directly from a component would create a second, independent copy of the game — never do this.

Persistence is split:
- **Game state** → `localStorage` via `use-local-storage-state`, keys prefixed `sudoku_` (`sudoku_puzzle`, `sudoku_user`, `sudoku_notes`, `sudoku_elapsed`, …). Every reload resumes mid-game.
- **Stats** → IndexedDB via `idb` (`src/lib/stats.ts`, db `sudoku-stats`, keyed by difficulty).
- **Theme** → plain `localStorage` key `sudoku_theme`, managed by `useTheme` (`src/hooks/useTheme.ts`), which toggles a `.dark` class on `<html>`.

`LandingPage` also reads `sudoku_difficulty` through its own `useLocalStorageState` — that key is shared with the hook, not passed through context.

### Grid model

Three grids, all `number[][]` with `0` = empty:
- `puzzleGrid` — the generated puzzle. **A non-zero cell here is a given/clue and is immutable.**
- `userGrid` — the player's entries, only meaningful where `puzzleGrid` is `0`.
- `solvedGrid` — the answer, used for win detection and "show solution".

`displayGrid` is derived each render by merging `userGrid` into `puzzleGrid`. Rendering and conflict detection always work on `displayGrid`, never on the raw grids.

`notesGrid` is `number[][][]` (pencil marks). Entering a number auto-strips it from the notes of every peer cell (row, column, box) — see `enterNumber`.

### Puzzle generation

`src/sudoku.ts` is the pure algorithm (backtracking solver with MRV, uniqueness-preserving cell removal, cleanup passes to a fixed point). It is **CPU-heavy and must never run on the main thread**: `useSudokuGame` spawns `src/workers/puzzleWorker.ts` via Vite's `?worker` import, terminating any in-flight worker before starting a new one.

`sudoku.ts` also `console.log`s every placement and backtrack. That's tolerable only because it runs in the worker.

`ALGORITHM.md` documents this in depth. It is **not just docs** — it is imported with `?raw` into `InfoModal` and rendered in the app, as are `src/about.md` and `src/limitations.md`. Editing those files changes the UI.

## Styling

Tailwind v4, CSS-first config. There is no `tailwind.config.js` — the design system lives in the `@theme` block of `src/index.css`, which defines semantic tokens consumed as utilities: `bg-page`, `bg-container`, `text-text-primary`, `bg-cell-selected`, `bg-cell-peer`, `bg-cell-conflict`, `text-clue`, `animate-shake`, etc. Dark values are overridden under `:root.dark`.

Use these tokens. Do not introduce raw Tailwind palette colors (`bg-gray-100`, `text-slate-700`) into UI chrome — they won't respond to the theme toggle. `DIFFICULTY_COLOR` in `src/sudoku.ts` is the one deliberate exception.

Interactive primitives (modals, popovers, tabs, radio groups) come from `react-aria-components`, styled with its `data-*` and `entering:`/`exiting:` variants. Icons are `lucide-react`.

## PWA

`vite-plugin-pwa` with `registerType: "autoUpdate"` and `manifest: false` — the web app manifest is hand-maintained at `public/site.webmanifest`, so manifest changes go there, not into `vite.config.ts`. Workbox precaches all built assets and falls back to `index.html` for client-side routing. The service worker is off during `vite dev`.

## Notes

- `README.md` is still the stock Vite template and describes nothing about this project.
- `tsconfig.app.json` is strict, with `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax` — type-only imports must use `import type`.

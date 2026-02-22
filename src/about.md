# About

A clean, mobile-first Sudoku app built as a learning project and something my wife and I could genuinely use.

## Why this exists

This started as a way to get better at React, TypeScript, and building something end-to-end. But it quickly turned into a collaborative project my wife helped shape the puzzle generation algorithm and the overall UX design. The goal was to build something polished enough that she'd actually want to use it on her phone instead of downloading yet another ad-filled Sudoku app.

It's been a fun one to work on together.

## How it was built

Wrote the core puzzle generation algorithm by hand and brainstormed the approach, researched the logic behind Sudoku uniqueness and irreducibility, and iterated from there. Used AI to refine and improve the algorithm further, and for building out the UI/UX. But every decision was planned and intentional. This was not vibe-coded.

## Tech Stack

| Layer             | Technology                                                      |
| ----------------- | --------------------------------------------------------------- |
| Framework         | React 19                                                        |
| Language          | TypeScript 5.9                                                  |
| Bundler           | Vite 7                                                          |
| Styling           | Tailwind CSS v4                                                 |
| Icons             | Lucide React                                                    |
| Accessible UI     | React Aria Components                                           |
| Local Storage     | use-local-storage-state                                         |
| Stats Storage     | IndexedDB (via idb)                                             |
| Puzzle Generation | Custom backtracking solver with greedy removal + cleanup passes |

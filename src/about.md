# About

A clean, mobile-first Sudoku app built for my lovely wife ❤️

## Why this exists

A fun weekend project that I made for my wife. I saw that the Sudoku iOS app my wife used had too many ads, and I wanted to do something cool for her.

We eventually collaborated and made this app. Discussed a lot about the algo, UX and other important features. Now, I kinda want to make this for everybody. But I want my wife to test this for some time and find and fill the gaps and improve before sharing this with everybody.

If you are seeing this, thanks!

Reach out to me if you have any feedback (constructive only).


## How it was built

Wrote the core puzzle generation algorithm by hand. Brainstormed the approach with my wife, researched the logic behind Sudoku uniqueness, irreducibility, and iterated from there. Used AI to refine and improve the algorithm further, and for building out the UI/UX. But every decision was planned and intentional. This was not vibe-coded.

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

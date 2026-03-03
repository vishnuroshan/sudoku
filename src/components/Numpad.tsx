import { Button, Group } from "react-aria-components";
import type { Grid } from "../sudoku";

interface NumpadProps {
  displayGrid: Grid;
  generating: boolean;
  selectedCell: [number, number] | null;
  enterNumber: (n: number) => void;
}

export function Numpad({
  displayGrid,
  generating,
  selectedCell,
  enterNumber,
}: NumpadProps) {
  return (
    <Group
      aria-label="Number pad"
      className="mt-2 flex w-full gap-1.5 min-[480px]:gap-2"
    >
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
        const count = displayGrid.flat().filter((v) => v === n).length;
        const isComplete = count >= 9;
        return (
          <Button
            key={n}
            aria-label={`${n}`}
            onPress={() => enterNumber(n)}
            isDisabled={generating || !selectedCell || isComplete}
            className="flex flex-1 cursor-pointer items-center justify-center rounded-xl py-3.5 text-2xl font-bold text-numpad tabular-nums outline-none transition
              min-[390px]:py-4 min-[390px]:text-3xl
              min-[480px]:py-4 min-[480px]:text-3xl
              hover:text-numpad-hover md:hover:scale-125 active:bg-numpad/10 active:text-numpad-active
              disabled:cursor-not-allowed disabled:opacity-30"
          >
            {n}
          </Button>
        );
      })}
    </Group>
  );
}

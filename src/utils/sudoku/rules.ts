import {
  ICell,
  ICellWithValue,
  IGame,
  IInvalidValueMap,
} from "src/utils/sudoku/types";

function sudoku(cell: ICell): IInvalidValueMap {
  const out: IInvalidValueMap = {};
  for (const group of cell.groups) {
    const possiblyUndefinedBlockers = group.cells.filter(
      (c) => c !== cell && c.value !== undefined
    );
    // @ts-ignore: TS does not seem to have a way to trust that a filter applies a condition
    const blockers: ICellWithValue[] = possiblyUndefinedBlockers;

    for (const blocker of blockers) {
      if (!out[blocker.value]) out[blocker.value] = [];
      // TODO: Add reasons here...
      out[blocker.value].push();
    }
  }

  return out;
}

export const rules = {
  sudoku,
};

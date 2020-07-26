import { deepclone } from "../index";
import { Cell } from "../../state/sudoku";
import { ICell } from "src/utils/sudoku/types";

export function readBoardFile(rawData: unknown): number[] {
  let arrData;
  if (Array.isArray(rawData)) {
    arrData = deepclone(rawData);
  } else if (typeof rawData === "string") {
    let strData = rawData.replace(/[\n ]/, "").replace(/[^0-9]/, "0");
    arrData = Array.from(strData);
  } else {
    throw new Error(`Unknown file type: ${typeof rawData}`);
  }

  const out = arrData.map<number>((c: any) => parseInt(c, 10));

  if (Math.sqrt(Math.sqrt(out.length)) % 1 !== 0) {
    throw new Error(`Invalid board length: ${out.length}`);
  }

  return out;
}

export function findCoveredUnions<T, G>(
  getUnionValue: (c: G) => T[],
  list: G[],
  union = new Set<T>(),
  covered: G[] = []
): [Set<T>, G[]][] {
  if (union.size > 0 && union.size === covered.length) return [[union, covered]];
  else if (list.length === 0) return [];
  else {
    const out = [];
    for (let i = 1; i < list.length; i += 1) {
      const coveredUnions = findCoveredUnions(
        getUnionValue,
        list.slice(i),
        new Set([...union, ...getUnionValue(list[i - 1])]),
        [...covered, list[i - 1]]
      );
      out.push(...coveredUnions);
    }
    return out;
  }
}

export const getReableCells = (cells: ICell[]) =>
  cells.map((c) => c.readableName).join("/");
export const grc = getReableCells;

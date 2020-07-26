import { Cell, Game, Group } from "src/state/sudoku";
import { grc } from "src/utils/sudoku/utils";

export enum GameAction {
  Set,
  Block,
  Reset,
}

export enum GameMethod {
  // Initial game
  InitialGame,
  ResetToStart,
  Unknown,

  // Set
  SolvedSquare,
  HiddenSingle,

  // Rule
  Sudoku,

  // Block
  NakedSet,
  HiddenSet,
  PointingPair,
  XWing,
  YWing,
}

export type IInvalidReason = {};
export type IBlockedReason = {};

export type IInvalidValueMap = { [n: number]: IInvalidReason[] };
export type IBlockedValueMap = { [n: number]: IBlockedReason[] };

export type IGameRule = (cell: ICell) => IInvalidValueMap;

export type HistoryId = string;
export type IHistoryItem = {
  id: HistoryId;
  action: GameAction;
  method: GameMethod;
  description: (affectedCells: Cell[]) => string;
  affectedCells: Cell[];
};

type IRawStrategyItem = {
  action: GameAction;
  method: GameMethod;
  description: (affectedCells: Cell[]) => string;
};

export interface ISetStrategyItem extends IRawStrategyItem {
  action: GameAction.Set;
  method: GameMethod.InitialGame | GameMethod.SolvedSquare | GameMethod.HiddenSingle;
  affected: ICell;
  value: number;
}

export interface IBlockStrategyItem extends IRawStrategyItem {
  action: GameAction.Block;
  method:
    | GameMethod.NakedSet
    | GameMethod.HiddenSet
    | GameMethod.PointingPair
    | GameMethod.XWing
    | GameMethod.YWing;
  affected: ICell[];
  values: number[];
}

export type IStrategyItem = ISetStrategyItem | IBlockStrategyItem;

export type IPossibleToCellsMap = { [key: number]: ICell[] };
export type IPossibleToCellsArray = { n: number; matching: ICell[] }[];

export type ICellWithValue = ICell & {
  value: number;
};

export type ICell = {
  index: number;
  value: number | undefined;
  groups: IGroup[];
  source: GameMethod | undefined;
  isValid: boolean;
  colNumber: number;
  colName: string;
  rowNumber: number;
  rowName: string;
  readableName: string;
  invalidValues: IInvalidValueMap;
  blockedValues: IBlockedValueMap;
  availableNumbers: number[];
};

export type IGroup = {
  readableName: string;
  type: string;
  cells: ICell[];

  possibleToCellsMap: IPossibleToCellsMap;
  possibleToCellsArray: IPossibleToCellsArray;
};

export type IGame = {
  rules: IGameRule[];
  groups: IGroup[];
  possibleValues: number[];
  size: number;
  squareSize: number;
  isSolved: boolean;
  isValid: boolean;
  isPossible: boolean;
  isValidGame: boolean;
  isEmptyGame: boolean;
  cells: ICell[];
};

export const solvedSquareReason = (cell: ICell, value: number) => () =>
  `Solved Square ${cell.readableName} with ${value}`;

export const hiddenSingleReason = (cell: ICell, value: number) => () =>
  `hidden single ${cell.readableName} with ${value}`;

export const nakedSetsReason = (group: IGroup, nums: number[], cells: ICell[]) => (
  affected: Cell[]
) => `\
NAKED SET (${group.readableName}): \
[${nums.join(",")}] unique within \
${grc(cells)}. \
Can be removed from remaining cells in group. Affected: \
${grc(affected)}.`;

export const hiddenSetsReason = (
  group: IGroup,
  originCells: ICell[],
  values: number[]
) => (affectedCells: Cell[]) => `\
HIDDEN SET (${group.readableName}): ${grc(originCells)} \
unique within "${group.readableName}" \
to have values [${values.join(",")}]. All other possible \
values can be removed from ${grc(originCells)}.`;

export const pointingPairReason = (
  group: IGroup,
  affectedGroup: IGroup,
  cells: ICell[],
  value: number
) => (affectedCells: Cell[]) => `\
POINTING PAIR (${group.readableName}): ${grc(cells)} \
unique by having available (${value}) \
and are also contained within ${affectedGroup.readableName}. \
(${value}) removed from ${grc(affectedCells)}`;

export const xWingReason = () => (affectedCells: Cell[]) => `\
X-WING (): ${grc(affectedCells)}`;

export const yWingReason = () => (affectedCells: Cell[]) => `\
Y-WING (): ${grc(affectedCells)}`;

export const COPY_BOARD_WITH_VALUES_WARNING = `\
It appears you have set values on this board. \
We have copied the board with these values included, \
to copy the original board, please reset to start.`;

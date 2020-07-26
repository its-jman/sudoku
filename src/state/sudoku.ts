import copy from "copy-to-clipboard";
import { createContext } from "react";
import { action, computed, observable } from "mobx";
import rawGameData from "src/__data";
import { findLastIndex, range, uuid } from "src/utils";
import { readBoardFile } from "src/utils/sudoku/utils";
import {
  COPY_BOARD_WITH_VALUES_WARNING,
  GameAction,
  GameMethod,
  IBlockedValueMap,
  IBlockStrategyItem,
  ICell,
  IGame,
  IGameRule,
  IGroup,
  IHistoryItem,
  IInvalidValueMap,
  IPossibleToCellsArray,
  IPossibleToCellsMap,
  ISetStrategyItem,
  IStrategyItem,
} from "src/utils/sudoku/types";
import { rules } from "src/utils/sudoku/rules";
import { buildStrategyStep } from "src/utils/sudoku/strategy";

export class Cell {
  @observable game: Game;
  @observable private __value: number | undefined;
  @observable index: number;
  @observable source: GameMethod | undefined;
  @observable groups: Group[] = [];
  @observable blockStrategyItems: IBlockStrategyItem[] = [];

  constructor(game: Game, value: number, i: number) {
    this.game = game;
    this.index = i;

    const strategyItem: IStrategyItem = {
      action: GameAction.Set,
      method: GameMethod.InitialGame,
      description: () => `Initial Game ${this.readableName} as ${value}`,
      affected: this,
      value: value,
    };

    this.setValue(value, strategyItem);
  }

  /* -------------------------------- Basic definitions -------------------------------- */
  @computed get rowNumber() {
    return Math.floor(this.index / this.game.size);
  }

  @computed get rowName() {
    return String.fromCharCode(65 + this.rowNumber);
  }

  @computed get colNumber() {
    return this.index % this.game.size;
  }

  @computed get colName() {
    return `${this.colNumber + 1}`;
  }

  @computed get readableName() {
    return `${this.rowName}${this.colName}`;
  }

  /* -------------------------------- Logic definitions -------------------------------- */
  /**
   * Value of the local cell.
   */
  @computed get value() {
    return this.__value;
  }
  @computed get strategyValue() {
    const anyActions = this.game.strategy.filter(
      (s) => s.action === GameAction.Set && s.affected === this
    );
    const actions: ISetStrategyItem[] = anyActions as ISetStrategyItem[];

    if (actions.length > 0) return actions[-1].value;
    return this.value;
  }

  /**
   * A map of invalid values for the provided cell, based on the rules of the game.
   * @param cell
   * @param game
   */
  static invalidValues([cell, game]: [ICell, IGame]) {
    return game.rules.reduce<IInvalidValueMap>((prev, curr) => {
      const res = curr(cell);
      for (const strValue of Object.keys(res)) {
        // @ts-ignore: convert to string, without ignoring other errors
        const value: number = strValue;
        if (!prev[value]) prev[value] = [];
        prev[value].push(res[value]);
      }
      return prev;
    }, {});
  }
  @computed get invalidValues(): IInvalidValueMap {
    return Cell.invalidValues(this.regularProps);
  }
  @computed get strategyInvalidValues(): IInvalidValueMap {
    return Cell.invalidValues(this.strategyProps);
  }

  /**
   * A map of invalid values for the provided cell, based on the rules of the game.
   */
  @computed get blockedValues(): IBlockedValueMap {
    return this.blockStrategyItems.reduce<IBlockedValueMap>((prev, curr) => {
      for (const value of curr.values) {
        if (!prev[value]) prev[value] = [];
        // TODO:
        // prev[value].push(curr);
      }
      return prev;
    }, {});
  }
  @computed get strategyBlockedValues(): IBlockedValueMap {
    return this.game.strategy.reduce<IBlockedValueMap>((prev, curr) => {
      if (curr.action === GameAction.Block) {
        for (const value of curr.values) {
          if (!prev[value]) prev[value] = [];
          // TODO:
          // prev[value].push(curr);
        }
      }
      return prev;
    }, this.blockedValues);
  }

  /**
   * List of the numbers that are available for the current cell.
   * @param cell
   * @param game
   */
  static availableNumbers([cell, game]: [ICell, IGame]): number[] {
    if (cell.value !== undefined) return [];
    return game.possibleValues.filter(
      (possible) => !cell.invalidValues[possible] && !cell.blockedValues[possible]
    );
  }
  @computed get availableNumbers(): number[] {
    return Cell.availableNumbers(this.regularProps);
  }
  @computed get strategyAvailableNumbers(): number[] {
    if (this.game.strategy.find((s) => s.action === GameAction.Block))
      throw new Error("Available, not implemented");
    return Cell.availableNumbers(this.strategyProps);
  }

  /**
   * Boolean if the provided cell is valid, based on the candidates eliminated by rules within
   * cell.invalidValues
   * @param cell
   */
  static isValid(cell: ICell): boolean {
    return cell.value === undefined || !cell.invalidValues[cell.value];
  }
  @computed get isValid(): boolean {
    return Cell.isValid(this);
  }
  @computed get isStrategyValid(): boolean {
    return Cell.isValid(this.strategyCell);
  }

  /* -------------------------------- Action definitions -------------------------------- */
  @action setValue(v: number | undefined, strategyItem?: ISetStrategyItem) {
    if (this.source === GameMethod.InitialGame) {
      console.error(
        `Can not set value of static cell. ${this.readableName} :: ${v}`
      );
      throw new Error(`Can not set value of static cell. ${this.readableName} `);
    } else {
      // TODO: Determine...
      // this.game.addAffectedCellToHistory(historyItem, this);
      if (v === 0 || v === undefined) {
        this.__value = undefined;
        this.source = undefined;
      } else {
        this.__value = v;
        this.source =
          strategyItem === undefined ? GameMethod.Unknown : strategyItem.method;
      }
    }
  }

  @action applyBlockStrategy(blockedReason: IBlockStrategyItem) {
    // prettier-ignore
    if (this.availableNumbers.filter((n) =>
      !blockedReason.values.includes(n)).length === 0
    ) {
      throw new Error("Blocking values that are not even possible here...");
    }

    if (this.value !== undefined) {
      throw new Error("Adding blocked numbers to cell with value...");
    }

    this.blockStrategyItems.push(blockedReason);
    // TODO: Determine...
    // this.game.addAffectedCellToHistory(historyItem, this);
  }

  @action applyStrategy(strategy: IStrategyItem) {
    if (
      (Array.isArray(strategy.affected) && strategy.affected.includes(this)) ||
      strategy.affected === this
    ) {
      if (strategy.action === GameAction.Set) {
        this.setValue(strategy.value, strategy);
      } else if (strategy.action === GameAction.Block) {
        if (
          this.availableNumbers.filter((n) => strategy.values.includes(n)).length > 0
        ) {
          this.applyBlockStrategy(strategy);
        }
      } else {
        throw new Error("Not Implemented...");
      }
    }
  }

  @action resetPossibles() {
    if (this.source !== GameMethod.InitialGame) {
      this.blockStrategyItems = [];
    }
  }

  @action reset() {
    if (this.source !== GameMethod.InitialGame) {
      this.setValue(undefined);
      this.resetPossibles();
    }
  }

  /* -------------------------------- Readonly definitions -------------------------------- */
  /**
   *    * This is used for components which cannot respect the `observer(...)` definition.
   *        Specifically, libraries such as StyledComponents.
   *
   *    * Also used to pass an interface to a function who doesn't
   *        care if it is a normal game or strategy game.
   */
  @computed get readonlyCell(): ICell {
    return {
      index: this.index,
      colNumber: this.colNumber,
      colName: this.colName,
      rowNumber: this.rowNumber,
      rowName: this.rowName,
      readableName: this.readableName,

      // Non strategy-specific values
      groups: this.groups,
      value: this.value,
      isValid: this.isValid,
      invalidValues: this.invalidValues,
      blockedValues: this.blockedValues,
      availableNumbers: this.availableNumbers,
      source: this.source,
    };
  }

  @computed get strategyCell(): ICell {
    return {
      index: this.index,
      colNumber: this.colNumber,
      colName: this.colName,
      rowNumber: this.rowNumber,
      rowName: this.rowName,
      readableName: this.readableName,

      // Strategy-specific values
      groups: this.groups.map((g) => g.strategyGroup),
      value: this.strategyValue,
      isValid: this.isStrategyValid,
      invalidValues: this.strategyInvalidValues,
      blockedValues: this.strategyBlockedValues,
      availableNumbers: this.strategyAvailableNumbers,

      // TODO:
      source: this.source,
    };
  }

  @computed get regularProps(): [ICell, IGame] {
    return [this, this.game];
  }

  @computed get strategyProps(): [ICell, IGame] {
    return [this.strategyCell, this.game.strategyGame];
  }
}

export class Group {
  @observable private readonly _game: Game;
  @observable cells: Cell[];
  @observable type: string;
  @observable index: number;

  constructor(game: Game, type: string, index: number, cells: Cell[]) {
    this._game = game;
    this.type = type;
    this.index = index;
    if (cells.length !== 9)
      console.warn(`Invalid group size, should be 9... ${type}`);
    this.cells = cells;
  }

  /* -------------------------------- Basic definitions -------------------------------- */
  @computed get readableName() {
    return `${this.type} ${this.index + 1}`;
  }

  /* -------------------------------- Logic definitions -------------------------------- */
  /**
   * List of numbers available in the group
   *
   * @param group
   * @param game
   */
  static availableNumbers([group, game]: [IGroup, IGame]) {
    return game.possibleValues.filter((possible) =>
      group.cells.every((c) => c.value !== possible)
    );
  }
  @computed get availableNumbers() {
    return Group.availableNumbers(this.regularProps);
  }
  @computed get strategyAvailableNumbers() {
    return Group.availableNumbers(this.strategyProps);
  }

  /**
   * Li
   */
  static possibleToCellsMap([group, game]: [IGroup, IGame]): IPossibleToCellsMap {
    let cells = group.cells.filter((c) => !c.value);

    let possibleToCellsMap = cells.reduce<IPossibleToCellsMap>((prev, curr) => {
      for (const avail of curr.availableNumbers) {
        if (!prev[avail]) prev[avail] = [];
        prev[avail].push(curr);
      }
      return prev;
    }, {});

    return possibleToCellsMap;
  }
  @computed get possibleToCellsMap() {
    return Group.possibleToCellsMap(this.regularProps);
  }
  @computed get strategyPossibleToCellsMap() {
    return Group.possibleToCellsMap(this.strategyProps);
  }

  static possibleToCellsArray([group, game]: [
    IGroup,
    IGame
  ]): IPossibleToCellsArray {
    let possibleToCellsArray = Object.entries(group.possibleToCellsMap).map(
      ([n, matching]) => {
        return { n: parseInt(n, 10), matching };
      }
    );
    possibleToCellsArray.sort((a, b) => a.matching.length - b.matching.length);

    return possibleToCellsArray;
  }
  @computed get possibleToCellsArray() {
    return Group.possibleToCellsArray(this.regularProps);
  }
  @computed get strategyPossibleToCellsArray() {
    return Group.possibleToCellsArray(this.strategyProps);
  }

  /* -------------------------------- Readonly definitions -------------------------------- */
  @computed get strategyGroup(): IGroup {
    return {
      type: this.type,
      readableName: this.readableName,

      // Strategy-specific values
      cells: this.cells.map((c) => c.strategyCell),
      possibleToCellsMap: this.strategyPossibleToCellsMap,
      possibleToCellsArray: this.strategyPossibleToCellsArray,
    };
  }

  @computed get regularProps(): [IGroup, IGame] {
    return [this, this._game];
  }

  @computed get strategyProps(): [IGroup, IGame] {
    return [this.strategyGroup, this._game.strategyGame];
  }
}

export class Game {
  @observable name: string;
  @observable readonly: boolean;
  @observable cells: Cell[];
  @observable rows: Group[] = [];
  @observable cols: Group[] = [];
  @observable boxes: Group[] = [];
  @observable strategy: IStrategyItem[] = [];
  @observable private _history: IHistoryItem[] = [];

  constructor(name: string, data: number[], readonly: boolean = false) {
    this.name = name;
    this.readonly = readonly;

    this.cells = data.map<Cell>((d, i) => new Cell(this, d, i));

    // Add box assignments
    let boxN = 0;
    for (let i = 0; i < this.squareSize; i += 1) {
      for (let j = 0; j < this.squareSize; j += 1) {
        let topLeftY = i * this.squareSize;
        let topLeftX = j * this.squareSize;

        const boxCells = [];
        for (let boxY = topLeftY; boxY < topLeftY + this.squareSize; boxY += 1) {
          for (let boxX = topLeftX; boxX < topLeftX + this.squareSize; boxX += 1) {
            boxCells.push(this.cells[boxY * this.size + boxX]);
          }
        }

        const box = new Group(this, "box", boxN, boxCells);
        this.boxes[boxN] = box;
        boxCells.forEach((c) => c.groups.push(box));
        boxN += 1;
      }
    }

    // Add row assignments
    for (let i = 0; i < this.size; i += 1) {
      const rowCells = this.cells.slice(i * this.size, i * this.size + this.size);
      this.rows[i] = new Group(this, "row", i, rowCells);
      rowCells.forEach((c) => c.groups.push(this.rows[i]));
    }

    // Add col assignments
    for (let i = 0; i < this.size; i += 1) {
      const colCells = this.cells.filter((cell, j) => j % this.size === i);
      this.cols[i] = new Group(this, "column", i, colCells);
      colCells.forEach((c) => c.groups.push(this.cols[i]));
    }
  }

  /* -------------------------------- Basic definitions -------------------------------- */
  @computed get rules(): IGameRule[] {
    return [rules.sudoku].filter((e) => e);
  }

  @computed get size() {
    return Math.sqrt(this.cells.length);
  }

  @computed get squareSize() {
    return Math.sqrt(this.size);
  }

  @computed get isValidGame() {
    return this.squareSize % 1 === 0;
  }

  @computed get possibleValues() {
    return range(1, this.size + 1);
  }

  @computed get isEmptyGame() {
    return this.cells.filter((c) => c.value !== undefined).length === 0;
  }

  @computed get groups() {
    return [...this.boxes, ...this.cols, ...this.rows];
  }

  toString() {
    return this.cells.map((c) => c.value || 0).join("");
  }

  copyToClipboard() {
    // prettier-ignore
    if (this.cells.filter((c) =>
      c.value !== undefined && c.source !== GameMethod.InitialGame
    ).length > 0) {
      alert(COPY_BOARD_WITH_VALUES_WARNING);
    }
    copy(this.toString());
  }

  /* -------------------------------- Logic definitions -------------------------------- */
  /**
   * Boolean indicator if the current game LOOSELY seems possible, based on if
   * each cell has an available value.
   *
   * @param game
   */
  static isPossible(game: IGame): boolean {
    return game.cells.every((c) => c.value || c.availableNumbers.length > 0);
  }
  @computed get isPossible(): boolean {
    return Game.isPossible(this);
  }
  @computed get isStrategyPossible() {
    return Game.isPossible(this.strategyGame);
  }

  /**
   * Boolean indicator if the current game seems valid, based on if the game is possible
   * and if every cell is valid.
   *
   * @param game
   */
  static isValid(game: IGame): boolean {
    return game.isPossible && game.cells.every((c) => c.isValid);
  }
  @computed get isValid(): boolean {
    return Game.isValid(this);
  }
  @computed get isStrategyValid(): boolean {
    return Game.isValid(this.strategyGame);
  }

  /**
   * Boolean indicator if the current game is solved.
   * @param game
   */
  static isSolved(game: IGame): boolean {
    return game.cells.every((c) => c.value && c.isValid);
  }
  @computed get isSolved(): boolean {
    return Game.isSolved(this);
  }
  @computed get isStrategySolved(): boolean {
    return Game.isSolved(this.strategyGame);
  }

  /* -------------------------------- Action definitions -------------------------------- */
  @action resetPossibles() {
    const historyItem = this.createHistoryItem({
      action: GameAction.Reset,
      method: GameMethod.ResetToStart,
      description: () => "Reset possibles",
    });
    this.cells.forEach((c) => {
      c.resetPossibles();
    });
  }

  @action resetToStart() {
    const historyItem = this.createHistoryItem({
      action: GameAction.Reset,
      method: GameMethod.ResetToStart,
      description: () => "Reset to start",
    });
    this.cells.forEach((c) => {
      c.reset();
    });
  }

  @action applyStrategy(strategy: IStrategyItem) {
    this.cells.forEach((c) => c.applyStrategy(strategy));
  }

  @action checkSolutions() {
    this.strategy = [];
    while (!this.isStrategySolved) {
      if (!this.isStrategyValid) break;
      const strategy = buildStrategyStep(this.strategyGame);
      if (!strategy) break;
      this.strategy.push(strategy);
    }
  }

  @action stepSolveGame() {
    this.strategy = [];
    const strategy = buildStrategyStep(this);
    if (!strategy) return;
    this.applyStrategy(strategy);
  }

  @action solveGame() {
    this.strategy = [];
    while (!this.isSolved) {
      if (!this.isValid) break;
      const strategy = buildStrategyStep(this);
      if (!strategy) break;
      this.applyStrategy(strategy);
    }
  }

  /* -------------------------------- Readonly definitions -------------------------------- */
  @computed get readonlyGame(): IGame {
    return {
      rules: this.rules,
      size: this.size,
      groups: this.groups,
      squareSize: this.squareSize,
      possibleValues: this.possibleValues,
      isValidGame: this.isValidGame,
      isEmptyGame: this.isEmptyGame,

      // Strategy-specific values
      cells: this.cells,
      isValid: this.isValid,
      isPossible: this.isPossible,
      isSolved: this.isSolved,
    };
  }

  @computed get strategyGame(): IGame {
    return {
      rules: this.rules,
      size: this.size,
      groups: this.groups.map((g) => g.strategyGroup),
      squareSize: this.squareSize,
      possibleValues: this.possibleValues,
      isValidGame: this.isValidGame,
      isEmptyGame: this.isEmptyGame,

      // Strategy-specific values
      cells: this.cells.map((c) => c.strategyCell),
      isValid: this.isStrategyValid,
      isPossible: this.isStrategyPossible,
      isSolved: this.isStrategySolved,
    };
  }

  /* -------------------------- TODO: Remove history definitions -------------------------- */
  @computed get history(): ReadonlyArray<IHistoryItem> {
    let lastResetIndex = findLastIndex(
      this._history,
      (h) => h.method === GameMethod.ResetToStart
    );
    return this._history
      .slice(lastResetIndex + 1)
      .filter(
        (h) => h.method !== GameMethod.InitialGame && h.affectedCells.length > 0
      );
  }

  private _getHistoryId(): string {
    const id = uuid();
    return this._history.find((h) => h.id === id) ? this._getHistoryId() : id;
  }

  @action createHistoryItem(item: Omit<IHistoryItem, "id" | "affectedCells">) {
    const historyItem: IHistoryItem = {
      ...item,
      id: this._getHistoryId(),
      affectedCells: [],
    };
    this._history.push(historyItem);
    return historyItem;
  }

  @action addAffectedCellToHistory(historyItem: IHistoryItem, cell: Cell) {
    const item = this._history.find((h) => h.id === historyItem.id);
    if (!item) throw new Error("History item not found");
    if (!item.affectedCells.includes(cell)) item.affectedCells.push(cell);
  }
}

class GameManager {
  @observable private _currentGame?: Game;
  private static emptyGame: Game = new Game(
    "empty game",
    Array.from(Array(81), () => 0),
    true
  );

  constructor() {
    if (process.env.NODE_ENV === "development") {
      const gameId = "hiddenCandidates2";
      const game = this.knownGames.find((kg) => kg.name === gameId);
      if (game) this.startGame(game.name, game.val);
    }
  }

  @action startGame(name: string, data: number[]) {
    this._currentGame = new Game(name, data);
    if (process.env.NODE_ENV === "development") {
      this._currentGame.solveGame();
    }
  }

  @computed get knownGames() {
    return Object.entries(rawGameData).map(([k, v]) => ({
      name: k,
      val: readBoardFile(v),
    }));
  }

  @computed get currentGame(): Game {
    if (this._currentGame && !this._currentGame.isValidGame) {
      alert("Current game does not seem to be valid");
      return GameManager.emptyGame;
    }
    return this._currentGame || GameManager.emptyGame;
  }
}

const gameManager = new GameManager();
// @ts-ignore
window.gameManager = gameManager;
export const GameContext = createContext(gameManager);

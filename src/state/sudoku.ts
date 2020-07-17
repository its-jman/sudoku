import copy from "copy-to-clipboard";
import { createContext } from "react";
import { action, computed, observable } from "mobx";
import rawGameData from "src/__data";
import { exists, range, readBoardFile } from "src/utils";
import { findCoveredUnions } from "src/utils/sudoku";

export enum ValueSource {
  InitialGame,
  ComputerSolved,
  UserEntry,
}

export type ICell = Readonly<{
  index: number;
  value: number | undefined;
  source: ValueSource | undefined;
  isValid: boolean;
  colNumber: number;
  colName: string;
  rowNumber: number;
  rowName: string;
}>;

export type IGame = Readonly<{
  size: number;
  squareSize: number;
  isSolved: boolean;
  isValid: boolean;
  isPossible: boolean;
  isValidGame: boolean;
  isEmptyGame: boolean;
}>;

export class Cell {
  @observable private readonly _game: Game;
  @observable private __value: number | undefined;
  @observable readonly index: number;
  @observable source: ValueSource | undefined;
  @observable groups: Group[] = [];
  @observable notPossibleValues: Set<number> = new Set();

  constructor(game: Game, value: number, i: number) {
    this._game = game;
    this.index = i;
    this.setValue(value, ValueSource.InitialGame);
  }

  @computed get value() {
    return this.__value;
  }

  /*
        Every group must have that number available
   */
  @computed get availableNumbers() {
    if (this.value !== undefined) return [];
    return this._game.possibleValues.filter(
      (possible) =>
        !this.notPossibleValues.has(possible) &&
        this.groups.every((g) => g.availableNumbers.includes(possible))
    );
  }

  /*
        For every group, every cell within that group can not equal this.value
   */
  @computed get isValid() {
    return (
      this.value === undefined ||
      this.groups.every((g) => g.cells.every((c) => c === this || c.value !== this.value))
    );
  }

  @computed get rowNumber() {
    return Math.floor(this.index / this._game.size);
  }

  @computed get rowName() {
    return String.fromCharCode(65 + this.rowNumber);
  }

  @computed get colNumber() {
    return this.index % this._game.size;
  }

  @computed get colName() {
    return `${this.colNumber + 1}`;
  }

  @computed get readonlyCell(): ICell {
    return {
      index: this.index,
      value: this.value,
      source: this.source,
      isValid: this.isValid,
      colNumber: this.colNumber,
      colName: this.colName,
      rowNumber: this.rowNumber,
      rowName: this.rowName,
    };
  }

  @action setValue(v: number | undefined, source: ValueSource) {
    if (this.source === ValueSource.InitialGame) {
      throw new Error("Can not set value of static cell.");
    } else {
      if (v === 0 || v === undefined) {
        this.__value = undefined;
        this.source = undefined;
      } else {
        this.__value = v;
        this.source = source;
      }
    }
  }

  @action addGroup(group: Group) {
    this.groups.push(group);
  }

  @action addNotPossibleNumbers(...nums: number[]): boolean {
    if (this.value !== undefined) return false;
    let modified = false;
    for (const n of nums) {
      if (!this.notPossibleValues.has(n) && this.availableNumbers.includes(n)) {
        this.notPossibleValues.add(n);
        modified = true;
      }
    }
    return modified;
  }

  @action reset() {
    if (this.source !== ValueSource.InitialGame) {
      this.setValue(undefined, ValueSource.ComputerSolved);
      this.notPossibleValues.clear();
    }
  }
}

export class Group {
  @observable private readonly _game: Game;
  @observable type: string;
  @observable cells: Cell[];

  constructor(game: Game, type: string, cells: Cell[]) {
    this.type = type;
    this._game = game;
    if (cells.length !== 9) console.warn(`Invalid group size, should be 9... ${type}`);
    this.cells = cells;
  }

  @computed get availableNumbers() {
    return this._game.possibleValues.filter((possible) =>
      this.cells.every((c) => c.value !== possible)
    );
  }

  @computed get possibleToCellsMap() {
    let cells = this.cells.filter((c) => !c.value);

    let possibleToCellsMap = cells.reduce<{ [key: number]: Cell[] }>((prev, curr) => {
      for (const avail of curr.availableNumbers) {
        if (!prev[avail]) prev[avail] = [];
        prev[avail].push(curr);
      }
      return prev;
    }, {});

    return possibleToCellsMap;
  }

  @computed get possibleToCellsArray() {
    let possibleToCellsArray = Object.entries(this.possibleToCellsMap).map(
      ([n, matching]) => ({
        // Since dictionaries transform keys to strings
        n: parseInt(n, 10),
        matching,
      })
    );
    possibleToCellsArray.sort((a, b) => a.matching.length - b.matching.length);

    return possibleToCellsArray;
  }
}

export class Game {
  @observable name: string;
  @observable readonly: boolean;
  @observable actions: string[] = [];
  @observable cells: Cell[] = new Array(81);
  @observable rows: Group[] = new Array(9);
  @observable cols: Group[] = new Array(9);
  @observable boxes: Group[] = new Array(9);

  constructor(name: string, initial: number[], readonly: boolean = false) {
    this.name = name;
    this.readonly = readonly;
    if (initial.length !== 81) {
      console.warn("Invalid board size, should be 9x9");
    }

    for (let i = 0; i < initial.length; i += 1) {
      this.cells[i] = new Cell(this, initial[i], i);
    }

    for (let i = 0; i < 9; i += 1) {
      const colCells = this.cells.filter((cell, j) => j % 9 === i);
      this.cols[i] = new Group(this, "column", colCells);
      colCells.forEach((c) => c.addGroup(this.cols[i]));

      const rowCells = this.cells.slice(i * 9, i * 9 + 9);
      this.rows[i] = new Group(this, "row", rowCells);
      rowCells.forEach((c) => c.addGroup(this.rows[i]));
    }

    let boxN = 0;
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        let topLeftY = i * 3;
        let topLeftX = j * 3;

        const cells = [];
        for (let boxY = topLeftY; boxY < topLeftY + 3; boxY += 1) {
          for (let boxX = topLeftX; boxX < topLeftX + 3; boxX += 1) {
            cells.push(this.cells[boxY * 9 + boxX]);
          }
        }

        const box = new Group(this, "box", cells);
        this.boxes[boxN] = box;
        cells.forEach((c) => c.addGroup(box));
        boxN += 1;
      }
    }
  }

  @computed get size() {
    return Math.sqrt(this.cells.length);
  }

  @computed get squareSize() {
    return Math.sqrt(this.size);
  }

  @computed get possibleValues() {
    return range(1, this.size + 1);
  }

  @computed get groups() {
    return [...this.boxes, ...this.cols, ...this.rows];
  }

  @computed get isSolved() {
    return this.cells.every((c) => c.value && c.isValid);
  }

  @computed get isValid() {
    return this.isPossible && this.cells.every((c) => c.isValid);
  }

  @computed get isPossible() {
    return this.cells.every((c) => c.value || c.availableNumbers.length > 0);
  }

  @computed get isValidGame() {
    return this.size % 1 === 0;
  }

  @computed get isEmptyGame() {
    return this.cells.filter((c) => c.value !== undefined).length === 0;
  }

  @computed get readonlyGame(): IGame {
    return {
      size: this.size,
      squareSize: this.squareSize,
      isValid: this.isValid,
      isValidGame: this.isValidGame,
      isEmptyGame: this.isEmptyGame,
      isPossible: this.isPossible,
      isSolved: this.isSolved,
    };
  }

  @action solvedSquare(): boolean {
    for (const origCell of this.cells) {
      if (origCell.availableNumbers.length === 1) {
        origCell.setValue(origCell.availableNumbers[0], ValueSource.ComputerSolved);
        return true;
      }
    }
    return false;
  }

  @action hiddenSingle(): boolean {
    for (const origGroup of this.groups) {
      for (const possible of this.possibleValues) {
        const possibleCells = origGroup.cells.filter((c) =>
          c.availableNumbers.includes(possible)
        );
        if (possibleCells.length === 1) {
          possibleCells[0].setValue(possible, ValueSource.ComputerSolved);
          return true;
        }
      }
    }
    return false;
  }

  @action nakedSets(): boolean {
    for (const origGroup of this.groups) {
      let cells = origGroup.cells.filter((c) => !c.value);
      cells.sort((a, b) => a.availableNumbers.length - b.availableNumbers.length);

      const coveredUnions = findCoveredUnions((c) => c.availableNumbers, cells);
      for (const [union, covered] of coveredUnions) {
        let performedAction = false;
        for (const c of cells) {
          if (!covered.includes(c)) {
            if (c.addNotPossibleNumbers(...union)) {
              performedAction = true;
            }
          }
        }
        if (performedAction) return performedAction;
      }
    }
    return false;
  }

  @action hiddenSets(): boolean {
    for (const origGroup of this.groups) {
      const coveredUnions = findCoveredUnions(
        (cl) => cl.matching,
        origGroup.possibleToCellsArray
      );
      for (const [union, covered] of coveredUnions) {
        const removals = this.possibleValues.filter(
          (p) => !covered.find((cov) => cov.n === p)
        );
        let performedAction = false;
        for (const c of union) {
          if (c.addNotPossibleNumbers(...removals)) {
            performedAction = true;
          }
        }
        if (performedAction) return performedAction;
      }
    }
    return false;
  }

  @action pointingPairs(): boolean {
    for (const origGroup of this.groups) {
      for (const mc of origGroup.possibleToCellsArray) {
        const matchingGroups = mc.matching[0].groups.filter(
          (mcg) => mcg !== origGroup && mc.matching.every((mcc) => mcc.groups.includes(mcg))
        );
        if (matchingGroups.length > 0) {
          for (const mcg of matchingGroups) {
            let cells = mcg.cells.filter((c) => !c.value && !mc.matching.includes(c));
            let performedAction = false;
            for (const c of cells) {
              if (c.addNotPossibleNumbers(mc.n)) {
                performedAction = true;
              }
            }
            if (performedAction) return true;
          }
        }
      }
    }
    return false;
  }

  @action xWing(): boolean {
    for (const origPossible of this.possibleValues) {
      const candidates = this.groups.filter(
        (g) => g.possibleToCellsMap[origPossible]?.length === 2
      );

      if (candidates.length >= 2) {
        const typeToCandidatesMap = candidates.reduce<{ [key: string]: Group[] }>(
          (prev, curr) => {
            if (!prev[curr.type]) prev[curr.type] = [];
            prev[curr.type].push(curr);
            return prev;
          },
          {}
        );
        for (const [type, candidateList] of Object.entries(typeToCandidatesMap)) {
          if (candidateList.length >= 2) {
            for (let i = 0; i < candidateList.length; i += 1) {
              const groupCandidateI = candidateList[i];
              const candidateIPossibleCells = groupCandidateI.possibleToCellsMap[origPossible];

              for (let j = i + 1; j < candidateList.length; j += 1) {
                const groupCandidateJ = candidateList[j];
                const candidateJPossibleCells =
                  groupCandidateJ.possibleToCellsMap[origPossible];

                let zeroMatchIndex: number | undefined;
                let zeroMatch: Group | undefined;
                for (let matchIndex = 0; matchIndex < 2; matchIndex += 1) {
                  const match = candidateIPossibleCells[0].groups.find(
                    (g) =>
                      g !== groupCandidateI &&
                      g !== groupCandidateJ &&
                      g.type !== type &&
                      candidateJPossibleCells[matchIndex].groups.includes(g)
                  );

                  if (match) {
                    zeroMatchIndex = matchIndex;
                    zeroMatch = match;
                    break;
                  }
                }

                if (!exists(zeroMatch) || !exists(zeroMatchIndex)) continue;
                const oneMatch = candidateIPossibleCells[1].groups.find(
                  (g) =>
                    g !== groupCandidateI &&
                    g !== groupCandidateJ &&
                    g.type !== type &&
                    candidateJPossibleCells[zeroMatchIndex === 0 ? 1 : 0].groups.includes(g)
                );
                if (zeroMatch && oneMatch) {
                  const matchedCells = [...zeroMatch.cells, ...oneMatch.cells];
                  let performedAction;
                  for (const c of matchedCells) {
                    if (
                      !groupCandidateI.cells.includes(c) &&
                      !groupCandidateJ.cells.includes(c) &&
                      c.availableNumbers.includes(origPossible)
                    ) {
                      if (c.addNotPossibleNumbers(origPossible)) {
                        performedAction = true;
                      }
                    }
                  }

                  if (performedAction) return true;
                }
              }
            }
          }
        }
      }
    }
    return false;
  }

  @action yWing(): boolean {
    const openCells = this.cells.filter((c) => !c.value);
    for (const abCell of openCells) {
      if (abCell.availableNumbers.length === 2) {
        for (const bcGroup of abCell.groups) {
          const bcPossibles = bcGroup.cells.filter(
            (c) =>
              c !== abCell &&
              c.availableNumbers.length === 2 &&
              abCell.groups.filter((g) => c.groups.includes(g)).length === 1
          );

          for (const bcCell of bcPossibles) {
            let abbcIntersection = abCell.availableNumbers.filter((c) =>
              bcCell.availableNumbers.includes(c)
            );
            if (abbcIntersection.length !== 1) continue;
            let bCandidate = abbcIntersection[0];
            let aCandidate = abCell.availableNumbers.find((c) => c !== bCandidate) ?? -1;
            let cCandidate = bcCell.availableNumbers.find((c) => c !== bCandidate) ?? -1;
            if (aCandidate === -1) throw new Error("A undefined in yWing");
            if (cCandidate === -1) throw new Error("C undefined in yWing");

            for (const acGroup of abCell.groups.filter((g) => g !== bcGroup)) {
              const acPossibles = acGroup.cells.filter(
                (c) =>
                  c !== abCell &&
                  c.availableNumbers.length === 2 &&
                  abCell.groups.filter((g) => c.groups.includes(g)).length === 1 &&
                  c.availableNumbers.includes(aCandidate) &&
                  c.availableNumbers.includes(cCandidate)
              );

              for (const acCell of acPossibles) {
                const cGroups = [...acCell.groups, ...abCell.groups].filter(
                  (g) => g !== acGroup && g !== bcGroup && !abCell.groups.includes(g)
                );
                for (const cGroup of cGroups) {
                  for (const cCell of cGroup.cells) {
                    if (
                      cCell.availableNumbers.includes(cCandidate) &&
                      acCell.groups.find((abCellGroup) => abCellGroup.cells.includes(cCell)) &&
                      bcCell.groups.find((bcCellGroup) => bcCellGroup.cells.includes(cCell))
                    ) {
                      cCell.addNotPossibleNumbers(cCandidate);
                      return true;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return false;
  }

  @action swordfish(): boolean {
    return false;
  }

  @action stepSolveGame(): boolean {
    // Solved square
    if (this.solvedSquare()) return true;

    // Hidden singles
    if (this.hiddenSingle()) return true;

    // Naked pairs/triples/quads
    if (this.nakedSets()) return true;

    // Hidden pairs/triples
    if (this.hiddenSets()) return true;

    // Pointing pairs
    if (this.pointingPairs()) return true;

    // X-Wing (Superset of box line reduction/intersection removal)
    if (this.xWing()) return true;

    // Y-Wing
    if (this.yWing()) return true;

    // TODO: Swordfish
    // if (this.swordfish()) return true;

    return false;
  }

  @action solveGame() {
    while (!this.isSolved) {
      if (this.stepSolveGame()) {
        if (!this.isValid) return;
        continue;
      }

      break;
    }
  }

  toString() {
    return this.cells.map((c) => c.value || 0).join("");
  }

  copyToClipboard() {
    copy(this.toString());
  }

  @action resetToStart() {
    this.cells.forEach((c) => {
      c.reset();
    });
  }
}

class SudokuStore {
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
    return Object.entries(rawGameData).map(([k, v]) => ({ name: k, val: readBoardFile(v) }));
  }

  @computed get currentGame(): Game {
    if (this._currentGame && !this._currentGame.isValidGame) {
      alert("Current game does not seem to be valid");
    }
    return this._currentGame || SudokuStore.emptyGame;
  }
}

const gameStore = new SudokuStore();

export const GameContext = createContext(gameStore);

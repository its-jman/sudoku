import { findCoveredUnions } from "src/utils/sudoku/utils";
import { arraysOverlap, exists } from "src/utils";
import { Game, Group } from "src/state/sudoku";
import {
  GameAction,
  GameMethod,
  hiddenSetsReason,
  hiddenSingleReason,
  IGame,
  IGroup,
  IStrategyItem,
  nakedSetsReason,
  pointingPairReason,
  solvedSquareReason,
  xWingReason,
  yWingReason,
} from "src/utils/sudoku/types";

// TODO: FOR ALL OF THESE CHECKS, THE EQUALITY OF CELLS CAN NOT BE COMPARED.
//    NO: .includes(...), `===`,

function solvedSquare(game: IGame): IStrategyItem | null {
  for (const origCell of game.cells) {
    if (origCell.availableNumbers.length === 1) {
      const valueToSet = origCell.availableNumbers[0];
      return {
        action: GameAction.Set,
        method: GameMethod.SolvedSquare,
        affected: origCell,
        value: valueToSet,
        description: solvedSquareReason(origCell, valueToSet),
      };
    }
  }

  return null;
}

function hiddenSingle(game: IGame): IStrategyItem | null {
  for (const origGroup of game.groups) {
    for (const possible of game.possibleValues) {
      const possibleCells = origGroup.cells.filter((c) =>
        c.availableNumbers.includes(possible)
      );
      if (possibleCells.length === 1) {
        const cellToUse = possibleCells[0];
        const valueToSet = possible;
        return {
          action: GameAction.Set,
          method: GameMethod.HiddenSingle,
          affected: cellToUse,
          value: valueToSet,
          description: hiddenSingleReason(cellToUse, valueToSet),
        };
      }
    }
  }
  return null;
}

function nakedSets(game: IGame): IStrategyItem | null {
  for (const origGroup of game.groups) {
    let cells = origGroup.cells.filter((c) => !c.value);
    cells.sort((a, b) => a.availableNumbers.length - b.availableNumbers.length);

    const coveredUnions = findCoveredUnions((c) => c.availableNumbers, cells);
    for (const [union, covered] of coveredUnions) {
      const unionArr = [...union];
      const cellsToAffect = cells.filter((c) => !covered.includes(c));

      const cellsAffected = cellsToAffect.filter((c) =>
        arraysOverlap(c.availableNumbers, unionArr)
      );
      if (cellsAffected.length > 0) {
        return {
          action: GameAction.Block,
          method: GameMethod.NakedSet,
          affected: cellsToAffect,
          values: unionArr,
          description: nakedSetsReason(origGroup, unionArr, covered),
        };
      }
    }
  }
  return null;
}

function hiddenSets(game: IGame): IStrategyItem | null {
  for (const origGroup of game.groups) {
    const coveredUnions = findCoveredUnions(
      (cl) => cl.matching,
      origGroup.possibleToCellsArray
    );
    for (const [union, covered] of coveredUnions) {
      const unionArr = [...union];
      const removals = game.possibleValues.filter(
        (p) => !covered.find((cov) => cov.n === p)
      );

      const affectedCells = unionArr.filter((c) =>
        arraysOverlap(c.availableNumbers, unionArr)
      );

      if (affectedCells.length > 0) {
        return {
          action: GameAction.Block,
          method: GameMethod.HiddenSet,
          affected: origGroup.cells,
          values: removals,
          description: hiddenSetsReason(
            origGroup,
            unionArr,
            covered.map((c) => c.n)
          ),
        };
      }
    }
  }
  return null;
}

function pointingPairs(game: IGame): IStrategyItem | null {
  for (const origGroup of game.groups) {
    for (const possibleNumber of origGroup.possibleToCellsArray) {
      // find groups that are shared by all cells in origGroup with possibleNumber
      const possibleAffectedGroups = possibleNumber.matching[0].groups.filter(
        (mcg) =>
          mcg !== origGroup &&
          possibleNumber.matching.every((mcc) => mcc.groups.includes(mcg))
      );

      if (possibleAffectedGroups.length > 0) {
        for (const affectedGroup of possibleAffectedGroups) {
          const valueToSet = possibleNumber.n;
          const cellsToAffect = affectedGroup.cells.filter(
            (c) => !possibleNumber.matching.includes(c)
          );

          const affectedCells = cellsToAffect.filter((c) =>
            c.availableNumbers.includes(valueToSet)
          );

          if (affectedCells.length > 0) {
            return {
              action: GameAction.Block,
              method: GameMethod.PointingPair,
              affected: cellsToAffect,
              values: [valueToSet],
              description: pointingPairReason(
                origGroup,
                affectedGroup,
                possibleNumber.matching,
                possibleNumber.n
              ),
            };
          }
        }
      }
    }
  }
  return null;
}

function xWing(game: IGame): IStrategyItem | null {
  for (const origPossible of game.possibleValues) {
    const candidates = game.groups.filter(
      (g) => g.possibleToCellsMap[origPossible]?.length === 2
    );

    if (candidates.length >= 2) {
      const typeToCandidatesMap = candidates.reduce<{ [key: string]: IGroup[] }>(
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
            const candidateIPossibleCells =
              groupCandidateI.possibleToCellsMap[origPossible];

            for (let j = i + 1; j < candidateList.length; j += 1) {
              const groupCandidateJ = candidateList[j];
              const candidateJPossibleCells =
                groupCandidateJ.possibleToCellsMap[origPossible];

              let zeroMatchIndex: number | undefined;
              let zeroMatch: IGroup | undefined;
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
                  candidateJPossibleCells[
                    zeroMatchIndex === 0 ? 1 : 0
                  ].groups.includes(g)
              );
              if (zeroMatch && oneMatch) {
                const cellsToAffect = [...zeroMatch.cells, ...oneMatch.cells].filter(
                  (c) =>
                    !groupCandidateI.cells.includes(c) &&
                    !groupCandidateJ.cells.includes(c)
                );

                const affectedCells = cellsToAffect.filter((c) =>
                  c.availableNumbers.includes(origPossible)
                );

                if (affectedCells.length > 0) {
                  return {
                    action: GameAction.Block,
                    method: GameMethod.XWing,
                    affected: cellsToAffect,
                    values: [origPossible],
                    description: xWingReason(),
                  };
                }
              }
            }
          }
        }
      }
    }
  }
  return null;
}

function yWing(game: IGame): IStrategyItem | null {
  const openCells = game.cells.filter((c) => !c.value);
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
          let aCandidate =
            abCell.availableNumbers.find((c) => c !== bCandidate) ?? -1;
          let cCandidate =
            bcCell.availableNumbers.find((c) => c !== bCandidate) ?? -1;
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
                    acCell.groups.find((abCellGroup) =>
                      abCellGroup.cells.includes(cCell)
                    ) &&
                    bcCell.groups.find((bcCellGroup) =>
                      bcCellGroup.cells.includes(cCell)
                    )
                  ) {
                    const valuesToSet = [cCandidate];
                    const cellsToAffect = [cCell];

                    return {
                      action: GameAction.Block,
                      method: GameMethod.YWing,
                      affected: cellsToAffect,
                      values: valuesToSet,
                      description: yWingReason(),
                    };
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return null;
}

/*
function swordfish(game: Game): IStrategyItem | null {
  return false;
}*/

export function buildStrategyStep(game: IGame): IStrategyItem | null {
  if (!game.isValid) throw new Error("buildStrategyStep: Game invalid... Exiting.");

  let strategy;
  if ((strategy = solvedSquare(game))) return strategy;
  if ((strategy = hiddenSingle(game))) return strategy;
  if ((strategy = nakedSets(game))) return strategy;
  if ((strategy = hiddenSets(game))) return strategy;
  if ((strategy = pointingPairs(game))) return strategy;
  if ((strategy = xWing(game))) return strategy;
  if ((strategy = yWing(game))) return strategy;

  return null;
}

import React from "react";
import styled from "styled-components";
import tailwindConfig, { tailwindTheme } from "src/styles/tailwind";
import { Game as GameObj, Cell as CellObj, ICell, IGame, ValueSource } from "src/state/sudoku";
import { observer } from "mobx-react-lite";

const getBorderColor = ({ game }: { game: IGame }) =>
  game.isSolved
    ? tailwindTheme.colors.green["600"]
    : !game.isValid
    ? tailwindTheme.colors.red["600"]
    : tailwindTheme.colors.gray["900"];

type BoardProps = {
  game: IGame;
};

export const Board = styled.div<BoardProps>`
  display: grid;
  grid-template-rows: repeat(${({ game }) => game.size + 1}, 1fr);
  grid-template-columns: repeat(${({ game }) => game.size + 1}, 1fr);
`;

type CellSquareProps = {
  isColLabel?: boolean;
  isRowLabel?: boolean;
};

export const CellSquare = styled.div<CellSquareProps>`
  width: 75px;
  height: 75px;
  display: flex;
  align-items: ${({ isColLabel }) => (isColLabel ? "flex-end" : "center")};
  justify-content: ${({ isRowLabel }) => (isRowLabel ? "flex-end" : "center")};
  padding: ${({ isColLabel, isRowLabel }) => (isColLabel || isRowLabel) && "8px"};
  line-height: 1;
`;

type StyledGameCellProps = {
  game: IGame;
  cell: ICell;
  isFocused: boolean;
};

export const StyledGameCell = styled.div<StyledGameCellProps>`
  padding: 2px;
  width: 100%;
  height: 100%;

  ${({ cell, game }) => {
    const out: string[] = [];

    if (cell.value) {
      out.push(`display: flex;`);
      out.push(`justify-content: center;`);
      out.push(`align-items: center;`);
    } else {
      out.push(`display: grid;`);
      out.push(`grid-template-rows: repeat(${game.squareSize}, minmax(0, 1fr));`);
      out.push(`grid-template-columns: repeat(${game.squareSize}, minmax(0, 1fr));`);
    }

    return out;
  }};

  color: ${({ cell }) => {
    if (!cell.isValid) return tailwindConfig.theme.colors.red[700];
    else if (cell.source === ValueSource.InitialGame)
      return tailwindConfig.theme.colors.gray[500];
    return;
  }};

  font-size: ${({ cell }) => (cell.value !== undefined ? "3em" : ".75em")};
  background: ${({ isFocused }) => isFocused && "var(--blue-3)"};

  ${({ cell, game }) => {
    const out: string[] = [];

    const standardBorder = `2px solid ${tailwindTheme.colors.gray[600]};`;
    const solidBorder = `3px solid ${getBorderColor({ game })};`;

    let squareColNumber = cell.colNumber % game.squareSize;
    if (squareColNumber === 0) {
      out.push(`border-left: ${solidBorder}`);
    }
    if (cell.colNumber === game.size - 1) {
      out.push(`border-right: ${solidBorder}`);
    }
    if (squareColNumber > 0 && squareColNumber < game.squareSize) {
      out.push(`border-left: ${standardBorder}`);
    }

    const squareRowNumber = cell.rowNumber % game.squareSize;
    if (squareRowNumber === 0) {
      out.push(`border-top: ${solidBorder}`);
    }
    if (cell.rowNumber === game.size - 1) {
      out.push(`border-bottom: ${solidBorder}`);
    }
    if (squareRowNumber > 0 && squareRowNumber < game.squareSize) {
      out.push(`border-top: ${standardBorder}`);
    }

    return out;
  }};
`;

export const AvailableNumber = styled.div`
  padding: 1px;

  display: flex;
  justify-content: center;
  align-items: center;
`;

type GameCellProps = {
  game: GameObj;
  cell: CellObj;
  isFocused: boolean;
};

export const GameCell = observer<GameCellProps>(({ game, cell }) => {
  return (
    <React.Fragment key={`invisGroup_${cell.index}`}>
      {cell.colNumber % game.size === 0 ? (
        <CellSquare isRowLabel>{cell.rowName}</CellSquare>
      ) : undefined}

      <CellSquare>
        <StyledGameCell game={game.readonlyGame} cell={cell.readonlyCell} isFocused={false}>
          {cell.value !== undefined
            ? cell.value
            : game.isEmptyGame
            ? undefined
            : cell.availableNumbers.map((a) => <AvailableNumber key={a}>{a}</AvailableNumber>)}
        </StyledGameCell>
      </CellSquare>
    </React.Fragment>
  );
});

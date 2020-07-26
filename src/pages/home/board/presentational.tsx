import { Cell as CellObj, Game, Game as GameObj } from "src/state/sudoku";
import { observer } from "mobx-react-lite";
import React from "react";
import * as S from "src/pages/home/board/_board.styled";

type GameCellProps = {
  game: GameObj;
  cell: CellObj;
  isFocused: boolean;
};

export type BoardProps = {
  game: Game;
};

const GameCell = observer<GameCellProps>(({ game, cell }) => {
  return (
    <React.Fragment key={`invisGroup_${cell.index}`}>
      {cell.colNumber % game.size === 0 ? (
        <S.CellSquare isRowLabel>{cell.rowName}</S.CellSquare>
      ) : undefined}

      <S.CellSquare>
        <S.StyledGameCell
          game={game.readonlyGame}
          cell={cell.readonlyCell}
          isFocused={false}
        >
          {cell.value !== undefined
            ? cell.value
            : game.isEmptyGame
            ? undefined
            : cell.availableNumbers.map((a) => (
                <S.AvailableNumber key={a}>{a}</S.AvailableNumber>
              ))}
        </S.StyledGameCell>
      </S.CellSquare>
    </React.Fragment>
  );
});

export const Board = React.forwardRef<HTMLDivElement, BoardProps>(
  ({ game }, ref) => (
    <S.Board ref={ref} game={game}>
      <S.CellSquare />
      {game.cells.slice(0, game.size).map((c) => (
        <S.CellSquare key={`column_${c.colName}`} isColLabel>
          {c.colName}
        </S.CellSquare>
      ))}
      {game.cells.map((cell, i) => (
        <GameCell key={i} game={game} cell={cell} isFocused={false} />
      ))}
    </S.Board>
  )
);

import React, { FC, useCallback, useRef, useState } from "react";
import { Game } from "src/state/sudoku";
import * as S from "./_board.styled";
import { useKeyDown, useOutsideClick } from "src/utils/hooks";
import { observer } from "mobx-react-lite";
import { AvailableNumber } from "./_board.styled";

type BoardProps = {
  game: Game;
};

const Board = observer<BoardProps>(({ game }) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(-1);
  const [y, setY] = useState(-1);

  const cellClick = (x: number, y: number) => () => {
    setX(x);
    setY(y);
  };

  useOutsideClick(boardRef, () => {
    setX(-1);
    setY(-1);
  });

  const leftHandler = useCallback(() => {
    if (x > 0) setX(x - 1);
  }, [x, setX]);
  const rightHandler = useCallback(() => {
    if (x < 8) setX(x + 1);
  }, [x, setX]);
  const upHandler = useCallback(() => {
    if (y > 0) setY(y - 1);
  }, [y, setY]);
  const downHandler = useCallback(() => {
    if (y < 8) setY(y + 1);
  }, [y, setY]);

  const escapeHandler = useCallback(() => {
    setX(-1);
    setY(-1);
  }, [setX, setY]);

  useKeyDown([
    { targetKey: "Escape", handler: escapeHandler },
    { targetKey: "ArrowLeft", handler: leftHandler },
    { targetKey: "ArrowRight", handler: rightHandler },
    { targetKey: "ArrowUp", handler: upHandler },
    { targetKey: "ArrowDown", handler: downHandler },
  ]);

  return (
    <S.Board ref={boardRef} game={game}>
      <S.CellSquare />
      {game.cells.slice(0, game.size).map((c) => (
        <S.CellSquare key={`column_${c.colName}`} isColLabel>
          {c.colName}
        </S.CellSquare>
      ))}
      {game.cells.map((cell, i) => (
        <S.GameCell key={i} game={game} cell={cell} isFocused={false} />
      ))}
    </S.Board>
  );
});

export default Board;

import React, { useCallback, useRef, useState } from "react";
import { useKeyDown, useOutsideClick } from "src/utils/hooks";
import { observer } from "mobx-react-lite";
import {
  BoardProps,
  Board as PresentationalBoard,
} from "src/pages/home/board/presentational";

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

  return <PresentationalBoard game={game} />;
});

export default Board;

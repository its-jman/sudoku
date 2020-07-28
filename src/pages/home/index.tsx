import React, { useContext } from "react";

import { GameContext } from "src/state/sudoku";
import { observer } from "mobx-react-lite";
import Board from "./board";
import { gcn } from "src/utils";

const Home = observer(() => {
  const gameManager = useContext(GameContext);
  const game = gameManager.currentGame;

  return (
    <div className="flex h-full py-1 pr-24" style={{ width: 1350 }}>
      <div className="w-56 p-3 flex flex-col items-start flex-shrink-0">
        <button
          className="btn-primary mb-2"
          onClick={() => alert("Not implemented...")}
        >
          New Board
        </button>
        <button
          className="btn-primary mb-2"
          onClick={() => alert("Not implemented...")}
        >
          Import Board
        </button>
        <button className="btn-primary mb-2" onClick={() => game.copyToClipboard()}>
          Copy board
        </button>
        <div className="rounded-lg border-2 border-grey-400 w-full">
          <h3 className="p-3">Sample Games</h3>
          <hr />
          <div className="p-3">
            {gameManager.knownGames.map((board, i) => (
              <div key={i}>
                <a
                  className={gcn(board.name === game.name && "underline font-bold")}
                  onClick={() => gameManager.startGame(board.name, board.val)}
                >
                  {board.name}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex justify-start items-start ml-19">
          <button className="btn-primary ml-8" onClick={() => game.resetToStart()}>
            Reset to start
          </button>
          <button className="btn-primary ml-2" onClick={() => game.solveGame()}>
            Solve game
          </button>
          <button className="btn-primary ml-2" onClick={() => game.stepSolveGame()}>
            Get hint
          </button>
          <button className="btn-primary ml-2" onClick={() => game.checkSolutions()}>
            Check Solutions
          </button>
        </div>
        <Board game={game} className="mt-3" />
        <div className="mt-5">
          Re-implementation using Recoil.js here:{" "}
          <a href="https://sudoku-recoil.jman.me">sudoku-recoil.jman.me</a>. It only
          has a the `naked single` rule implemented, which means that it will only
          solve extremely basic puzzles. The implementation in Recoil.js is much less
          performant than the implementation in MobX (this version).
        </div>
      </div>
      <div className="w-56 ml-8 flex-shrink-0">History:</div>
    </div>
  );
});

export default Home;

import React, { useContext } from "react";

import * as S from "./_home.styled";
import { GameContext } from "src/state/sudoku";
import { observer } from "mobx-react-lite";
import Board from "./board";

const Home = observer(() => {
  const gameManager = useContext(GameContext);

  const game = gameManager.currentGame;

  return (
    <S.Wrapper>
      <S.LeftSidebar>
        <S.Button onClick={() => alert("Not implemented...")}>New Board</S.Button>
        <S.Button onClick={() => alert("Not implemented...")}>Import Board</S.Button>
        <S.Button onClick={() => game.copyToClipboard()}>Copy board</S.Button>
        <S.GamesListWrapper>
          <h3>Sample Games</h3>
          <hr />
          <S.GamesList>
            {gameManager.knownGames.map((board, i) => (
              <div key={i}>
                <a
                  onClick={() => gameManager.startGame(board.name, board.val)}
                  style={
                    board.name === game.name
                      ? {
                          textDecoration: "underline",
                          fontWeight: "bold",
                        }
                      : undefined
                  }
                >
                  {board.name}
                </a>
              </div>
            ))}
          </S.GamesList>
        </S.GamesListWrapper>
      </S.LeftSidebar>
      <S.BoardWrapper>
        <S.BoardActions>
          <S.Button onClick={() => game.resetToStart()}>Reset to start</S.Button>
          <S.Button onClick={() => game.solveGame()}>Solve game</S.Button>
          <S.Button onClick={() => game.stepSolveGame()}>Get hint</S.Button>
          <S.Button onClick={() => game.checkSolutions()}>Check Solutions</S.Button>
        </S.BoardActions>
        <Board game={game} />
        <div style={{ marginTop: 24, maxWidth: 900 }}>
          Re-implementation using Recoil.js here:{" "}
          <a href="https://sudoku-recoil.jman.me">sudoku-recoil.jman.me</a>. It only
          has a the `naked single` rule implemented, which means that it will only
          solve extremely basic puzzles. The implementation in Recoil.js is much less
          performant than the implementation in MobX (this version).
        </div>
      </S.BoardWrapper>
    </S.Wrapper>
  );
});

export default Home;

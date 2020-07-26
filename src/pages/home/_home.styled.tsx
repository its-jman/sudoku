import styled from "styled-components";

export const Wrapper = styled.div`
  display: flex;
  min-height: 100vh;
  padding: 0.25em 80px 0.25em 0;
`;

export const Button = styled.button`
  display: block;
  transition: all 0.3s ease-in-out;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 2px solid transparent;
  background: var(--blue-6);
  color: white;

  &:hover {
    background: var(--blue-8);
    text-decoration: underline;
  }
`;

export const LeftSidebar = styled.div`
  width: 240px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex-shrink: 0;

  > *:not(:first-child) {
    margin-top: 8px;
  }
`;

export const BoardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 750px;
`;

export const BoardActions = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  margin-left: 75px;

  > *:not(:first-child) {
    margin-left: 8px;
  }
`;

export const GamesListWrapper = styled.div`
  border-radius: 8px;
  border: 2px solid var(--grey-4);
  width: 100%;

  h3 {
    border-bottom: 1px solid var(--grey-4);
    padding: 12px;
  }
`;

export const GamesList = styled.div`
  padding: 12px;
`;

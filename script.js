const ROWS = 9;
const COLS = 9;
const MINE_TOTAL = 10;

const boardElement = document.querySelector("#board");
const mineCountElement = document.querySelector("#mine-count");
const timerElement = document.querySelector("#timer");
const messageElement = document.querySelector("#message");
const restartButton = document.querySelector("#restart");

let cells = [];
let flags = 0;
let elapsedSeconds = 0;
let timerId = null;
let gameStarted = false;
let gameOver = false;
let suppressContextMenu = false;

function createBoard() {
  cells = Array.from({ length: ROWS * COLS }, (_, index) => ({
    index,
    mine: false,
    adjacentMines: 0,
    revealed: false,
    flagged: false,
    element: null,
  }));

  boardElement.replaceChildren();
  cells.forEach((cell) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cell";
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-label", `닫힌 칸 ${rowOf(cell.index) + 1}행 ${colOf(cell.index) + 1}열`);
    button.addEventListener("click", () => revealCell(cell.index));
    button.addEventListener("mousedown", (event) => {
      if (suppressContextMenu) suppressContextMenu = false;
      if ((event.button !== 0 && event.button !== 2) || (event.buttons & 3) !== 3) return;

      const currentCell = cells[cell.index];
      if (gameOver || !currentCell.revealed || currentCell.adjacentMines === 0) return;

      suppressContextMenu = true;
      chordCell(cell.index);
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      if (suppressContextMenu) {
        suppressContextMenu = false;
        return;
      }
      toggleFlag(cell.index);
    });
    cell.element = button;
    boardElement.append(button);
  });

  flags = 0;
  elapsedSeconds = 0;
  gameStarted = false;
  gameOver = false;
  suppressContextMenu = false;
  window.clearInterval(timerId);
  timerId = null;
  timerElement.textContent = "000";
  restartButton.querySelector("span").textContent = "🙂";
  messageElement.textContent = "지뢰를 조심하세요!";
  updateMineCount();
}

function rowOf(index) {
  return Math.floor(index / COLS);
}

function colOf(index) {
  return index % COLS;
}

function neighborsOf(index) {
  const row = rowOf(index);
  const col = colOf(index);
  const neighbors = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) continue;
      const neighborRow = row + rowOffset;
      const neighborCol = col + colOffset;
      if (neighborRow < 0 || neighborRow >= ROWS || neighborCol < 0 || neighborCol >= COLS) continue;
      neighbors.push(neighborRow * COLS + neighborCol);
    }
  }
  return neighbors;
}

function placeMines(safeIndex) {
  const candidates = cells.filter((cell) => cell.index !== safeIndex);
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[randomIndex]] = [candidates[randomIndex], candidates[index]];
  }

  candidates.slice(0, MINE_TOTAL).forEach((cell) => {
    cell.mine = true;
  });

  cells.forEach((cell) => {
    if (!cell.mine) {
      cell.adjacentMines = neighborsOf(cell.index).filter((index) => cells[index].mine).length;
    }
  });
}

function startTimer() {
  if (timerId !== null || gameOver) return;
  timerId = window.setInterval(() => {
    elapsedSeconds += 1;
    timerElement.textContent = String(Math.min(elapsedSeconds, 999)).padStart(3, "0");
  }, 1000);
}

function revealCell(index) {
  const cell = cells[index];
  if (gameOver || cell.revealed || cell.flagged) return;

  if (!gameStarted) {
    gameStarted = true;
    placeMines(index);
    startTimer();
  }

  if (cell.mine) {
    cell.revealed = true;
    renderCell(cell);
    finishGame(false);
    return;
  }

  revealArea(index);
  if (cells.filter((item) => !item.mine && !item.revealed).length === 0) {
    finishGame(true);
  }
}

function revealArea(startIndex) {
  const queue = [startIndex];
  const queued = new Set(queue);

  while (queue.length > 0) {
    const index = queue.shift();
    const cell = cells[index];
    if (cell.revealed || cell.flagged || cell.mine) continue;

    cell.revealed = true;
    renderCell(cell);
    if (cell.adjacentMines === 0) {
      neighborsOf(index).forEach((neighborIndex) => {
        if (!queued.has(neighborIndex)) {
          queued.add(neighborIndex);
          queue.push(neighborIndex);
        }
      });
    }
  }
}

function chordCell(index) {
  const cell = cells[index];
  const neighbors = neighborsOf(index);
  const flaggedNeighbors = neighbors.filter((neighborIndex) => cells[neighborIndex].flagged).length;
  if (flaggedNeighbors !== cell.adjacentMines) return;

  for (const neighborIndex of neighbors) {
    const neighbor = cells[neighborIndex];
    if (neighbor.revealed || neighbor.flagged) continue;

    if (neighbor.mine) {
      neighbor.revealed = true;
      renderCell(neighbor);
      finishGame(false);
      return;
    }

    revealArea(neighborIndex);
  }

  if (cells.filter((item) => !item.mine && !item.revealed).length === 0) {
    finishGame(true);
  }
}

function toggleFlag(index) {
  const cell = cells[index];
  if (gameOver || cell.revealed) return;

  if (!cell.flagged && flags >= MINE_TOTAL) {
    messageElement.textContent = "깃발은 10개까지 꽂을 수 있어요.";
    return;
  }

  cell.flagged = !cell.flagged;
  flags += cell.flagged ? 1 : -1;
  renderCell(cell);
  updateMineCount();
  messageElement.textContent = cell.flagged ? "깃발을 표시했어요." : "깃발을 회수했어요.";
}

function renderCell(cell) {
  const button = cell.element;
  button.className = "cell";
  button.textContent = "";

  if (cell.flagged && !cell.revealed) {
    button.classList.add("flagged");
    button.textContent = "🚩";
    button.setAttribute("aria-label", `깃발 표시된 칸 ${rowOf(cell.index) + 1}행 ${colOf(cell.index) + 1}열`);
    return;
  }

  if (!cell.revealed) {
    button.setAttribute("aria-label", `닫힌 칸 ${rowOf(cell.index) + 1}행 ${colOf(cell.index) + 1}열`);
    return;
  }

  button.classList.add("revealed");
  if (cell.mine) {
    button.textContent = "💣";
    button.classList.add(gameOver ? "mine-shown" : "mine-hit");
    button.setAttribute("aria-label", "지뢰");
  } else if (cell.adjacentMines > 0) {
    button.textContent = String(cell.adjacentMines);
    button.classList.add(`number-${cell.adjacentMines}`);
    button.setAttribute("aria-label", `주변 지뢰 ${cell.adjacentMines}개`);
  } else {
    button.setAttribute("aria-label", "주변에 지뢰가 없는 칸");
  }
}

function updateMineCount() {
  mineCountElement.textContent = String(MINE_TOTAL - flags).padStart(3, "0");
}

function finishGame(won) {
  gameOver = true;
  window.clearInterval(timerId);
  timerId = null;

  if (won) {
    messageElement.textContent = "성공! 모든 안전한 칸을 열었어요.";
    restartButton.querySelector("span").textContent = "😎";
  } else {
    messageElement.textContent = "앗, 지뢰를 밟았어요. 다시 도전해 보세요!";
    restartButton.querySelector("span").textContent = "😵";
  }

  cells.forEach((cell) => {
    if (cell.mine && !cell.revealed && !cell.flagged) renderCell({ ...cell, revealed: true });
    if (!cell.mine && cell.flagged) {
      cell.element.classList.add("wrong-flag");
      cell.element.textContent = "❌";
      cell.element.setAttribute("aria-label", "잘못 표시한 깃발");
    }
  });
}

restartButton.addEventListener("click", createBoard);
createBoard();

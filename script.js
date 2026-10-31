
/* =========================================
   75 GAMES - CHESS ARENA VERSION 11
   HISTORY SAVE FIX
========================================= */

// =========================================
// ELEMENTS
// =========================================

const loginSection = document.getElementById("login-section");
const chessSection = document.getElementById("chess-game");
const boardElement = document.getElementById("chessboard");

let game = new Chess();

let currentMode = "Friend";
let selectedSquare = null;
let legalMoves = [];

let aiThinking = false;
let gameFinished = false;
let resultRecorded = false;

let timerStarted = false;
let timerInterval = null;
let lastClockUpdate = 0;

let soundEnabled = true;
let audioContext = null;

let initialSeconds = 600;
let whiteTime = initialSeconds;
let blackTime = initialSeconds;

const pieces = {
    wk: "♔", wq: "♕", wr: "♖",
    wb: "♗", wn: "♘", wp: "♙",
    bk: "♚", bq: "♛", br: "♜",
    bb: "♝", bn: "♞", bp: "♟"
};

const pieceValues = {
    p: 100, n: 320, b: 330,
    r: 500, q: 900, k: 20000
};


// =========================================
// LOGIN
// =========================================

document.getElementById("login-btn").onclick = () => {
    loginSection.classList.remove("hidden");
    loginSection.scrollIntoView({ behavior: "smooth" });
};

document.getElementById("login-form").onsubmit = (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;

    document.getElementById("login-message").textContent =
        "Welcome, " + username + "! Demo completed.";

    e.target.reset();
};


// =========================================
// NAVIGATION
// =========================================

document.getElementById("play-chess").onclick = () => {
    document.getElementById("games").scrollIntoView({
        behavior: "smooth"
    });
};


// =========================================
// GAME MODE
// =========================================

document.querySelectorAll(".mode-btn").forEach(button => {
    button.onclick = () => {
        currentMode = button.dataset.mode;

        document.getElementById("game-mode").textContent =
            currentMode === "Computer"
                ? "You: White | Computer: Black"
                : "Local Two Player Mode";

        chessSection.classList.remove("hidden");

        resetGame();

        chessSection.scrollIntoView({
            behavior: "smooth"
        });
    };
});


// =========================================
// SOUND
// =========================================

function playSound(type) {
    if (!soundEnabled) return;

    try {
        const AudioClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioClass) return;

        if (!audioContext) audioContext = new AudioClass();

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        const sounds = {
            move: 440,
            capture: 260,
            check: 650,
            finish: 180
        };

        oscillator.frequency.value = sounds[type] || 440;
        oscillator.type = "sine";

        gain.gain.setValueAtTime(0.12, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + 0.16
        );

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.17);

    } catch (error) {
        console.log("Sound unavailable:", error);
    }
}

document.getElementById("sound-btn").onclick = () => {
    soundEnabled = !soundEnabled;

    document.getElementById("sound-btn").textContent =
        soundEnabled ? "🔊 Sound On" : "🔇 Sound Off";

    if (soundEnabled) playSound("move");
};


// =========================================
// TIMER
// =========================================

function formatTime(seconds) {
    seconds = Math.max(0, Math.ceil(seconds));

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return String(mins).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0");
}

function updateClocks() {
    document.getElementById("white-clock").textContent =
        formatTime(whiteTime);

    document.getElementById("black-clock").textContent =
        formatTime(blackTime);

    document.getElementById("white-clock").classList.toggle(
        "active",
        timerStarted && game.turn() === "w" && !gameFinished
    );

    document.getElementById("black-clock").classList.toggle(
        "active",
        timerStarted && game.turn() === "b" && !gameFinished
    );
}

function syncClock() {
    if (!timerStarted || gameFinished) return;

    const now = Date.now();
    const elapsed = (now - lastClockUpdate) / 1000;

    lastClockUpdate = now;

    if (game.turn() === "w") {
        whiteTime -= elapsed;
    } else {
        blackTime -= elapsed;
    }

    if (whiteTime <= 0) {
        whiteTime = 0;
        finishByTimeout("Black");
        return;
    }

    if (blackTime <= 0) {
        blackTime = 0;
        finishByTimeout("White");
        return;
    }

    updateClocks();
}

function startTimer() {
    if (timerStarted || gameFinished) return;

    timerStarted = true;
    lastClockUpdate = Date.now();

    document.getElementById("timer-setting").disabled = true;

    timerInterval = setInterval(syncClock, 200);
}

function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function finishByTimeout(winner) {
    if (gameFinished) return;

    gameFinished = true;
    stopTimer();

    document.getElementById("game-status").textContent =
        winner + " wins on time!";

    document.getElementById("game-message").textContent =
        "Time is over.";

    document.getElementById("reset-board").textContent =
        "▶ Play Again";

    playSound("finish");

    // Friend mode: White is the local player for result tracking.
    recordResult(winner === "White" ? "win" : "loss");

    drawBoard();
}

function loadTimerSetting() {
    const minutes = Number(
        document.getElementById("timer-setting").value
    );

    initialSeconds = minutes * 60;
    whiteTime = initialSeconds;
    blackTime = initialSeconds;

    updateClocks();
}

document.getElementById("timer-setting").onchange =
    loadTimerSetting;


// =========================================
// CHESSBOARD
// =========================================

function drawBoard() {
    boardElement.innerHTML = "";

    const position = game.board();

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = document.createElement("div");
            const squareName = "abcdefgh"[c] + (8 - r);

            square.className =
                (r + c) % 2 === 0
                    ? "square light"
                    : "square dark";

            const piece = position[r][c];

            if (piece) {
                square.textContent =
                    pieces[piece.color + piece.type];

                square.classList.add(
                    piece.color === "w"
                        ? "white-piece"
                        : "black-piece"
                );

                if (
                    piece.type === "k" &&
                    piece.color === game.turn() &&
                    game.in_check()
                ) {
                    square.classList.add(
                        game.in_checkmate()
                            ? "king-checkmate"
                            : "king-check"
                    );
                }
            }

            if (selectedSquare === squareName) {
                square.classList.add("selected");
            }

            if (legalMoves.some(m => m.to === squareName)) {
                square.classList.add(
                    piece ? "capture" : "legal"
                );
            }

            square.onclick = () => handleSquareClick(squareName);

            boardElement.appendChild(square);
        }
    }

    updateStatus();
    renderMoveHistory();
    updateClocks();
}


// =========================================
// PLAYER MOVE
// =========================================

function handleSquareClick(squareName) {
    if (
        gameFinished ||
        game.game_over() ||
        aiThinking ||
        (currentMode === "Computer" && game.turn() === "b")
    ) return;

    const piece = game.get(squareName);

    if (piece && piece.color === game.turn()) {
        selectedSquare = squareName;

        legalMoves = game.moves({
            square: squareName,
            verbose: true
        });

        drawBoard();
        return;
    }

    if (!selectedSquare) return;

    syncClock();

    if (gameFinished) return;

    const move = game.move({
        from: selectedSquare,
        to: squareName,
        promotion: "q"
    });

    if (!move) {
        document.getElementById("game-message").textContent =
            "Illegal move! Choose a highlighted square.";
        return;
    }

    if (!timerStarted) {
        startTimer();
    } else {
        lastClockUpdate = Date.now();
    }

    selectedSquare = null;
    legalMoves = [];

    playSound(move.captured ? "capture" : "move");

    drawBoard();

    if (game.in_check()) playSound("check");

    checkGameEnd();

    if (
        currentMode === "Computer" &&
        !gameFinished &&
        !game.game_over()
    ) {
        computerMove();
    }
}


// =========================================
// AI EVALUATION
// =========================================

function evaluatePosition(position) {
    let score = 0;
    const board = position.board();

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];

            if (!piece) continue;

            let value = pieceValues[piece.type];

            const centerBonus =
                7 - Math.abs(3.5 - r) - Math.abs(3.5 - c);

            if (piece.type === "n" || piece.type === "b") {
                value += centerBonus * 8;
            }

            if (piece.type === "p") {
                const advancement =
                    piece.color === "b" ? r : 7 - r;

                value += advancement * 10;
            }

            score += piece.color === "b" ? value : -value;
        }
    }

    return score;
}


// =========================================
// MOVE ORDERING
// =========================================

function orderMoves(moves) {
    return moves.sort((a, b) => {
        function priority(move) {
            let score = 0;

            if (move.captured) {
                score +=
                    10 * pieceValues[move.captured] -
                    pieceValues[move.piece] / 10;
            }

            if (move.promotion) {
                score += pieceValues[move.promotion];
            }

            return score;
        }

        return priority(b) - priority(a);
    });
}


// =========================================
// MINIMAX
// =========================================

function minimax(position, depth, alpha, beta, maximizing) {
    if (position.game_over()) {
        if (position.in_checkmate()) {
            return position.turn() === "b"
                ? -100000 - depth
                : 100000 + depth;
        }

        return 0;
    }

    if (depth <= 0) return evaluatePosition(position);

    const moves = orderMoves(
        position.moves({ verbose: true })
    );

    if (maximizing) {
        let best = -Infinity;

        for (const move of moves) {
            position.move({
                from: move.from,
                to: move.to,
                promotion: move.promotion || "q"
            });

            const score = minimax(
                position, depth - 1, alpha, beta, false
            );

            position.undo();

            best = Math.max(best, score);
            alpha = Math.max(alpha, best);

            if (beta <= alpha) break;
        }

        return best;
    } else {
        let best = Infinity;

        for (const move of moves) {
            position.move({
                from: move.from,
                to: move.to,
                promotion: move.promotion || "q"
            });

            const score = minimax(
                position, depth - 1, alpha, beta, true
            );

            position.undo();

            best = Math.min(best, score);
            beta = Math.min(beta, best);

            if (beta <= alpha) break;
        }

        return best;
    }
}


// =========================================
// COMPUTER MOVE
// =========================================

function computerMove() {
    if (
        gameFinished ||
        game.game_over() ||
        game.turn() !== "b" ||
        aiThinking
    ) return;

    aiThinking = true;

    document.getElementById("game-message").textContent =
        "Computer is thinking...";

    drawBoard();

    const moves = orderMoves(
        game.moves({ verbose: true })
    );

    const setting =
        Number(document.getElementById("difficulty").value);

    const depth =
        setting === 1 ? 1 :
        setting === 2 ? 2 : 4;

    const thinkDelay =
        setting === 1 ? 500 :
        setting === 2 ? 1000 : 1800;

    let bestScore = -Infinity;
    let bestMoves = [];
    let moveIndex = 0;
    let alpha = -Infinity;

    function makeComputerMove() {
        if (gameFinished || game.turn() !== "b") {
            aiThinking = false;
            return;
        }

        syncClock();

        if (gameFinished) {
            aiThinking = false;
            return;
        }

        if (bestMoves.length > 0) {
            const chosen = bestMoves[
                Math.floor(Math.random() * bestMoves.length)
            ];

            const result = game.move({
                from: chosen.from,
                to: chosen.to,
                promotion: chosen.promotion || "q"
            });

            if (result) {
                playSound(result.captured ? "capture" : "move");
            }
        }

        aiThinking = false;
        selectedSquare = null;
        legalMoves = [];

        lastClockUpdate = Date.now();

        drawBoard();

        if (game.in_check() && !game.game_over()) {
            playSound("check");
        }

        checkGameEnd();
    }

    function calculateNextMove() {
        if (gameFinished || !aiThinking || game.turn() !== "b") {
            aiThinking = false;
            return;
        }

        if (moveIndex >= moves.length) {
            setTimeout(makeComputerMove, thinkDelay);
            return;
        }

        const move = moves[moveIndex++];

        game.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion || "q"
        });

        const score = minimax(
            game,
            depth - 1,
            alpha,
            Infinity,
            false
        );

        game.undo();

        if (score > bestScore) {
            bestScore = score;
            bestMoves = [move];
        } else if (score === bestScore) {
            bestMoves.push(move);
        }

        alpha = Math.max(alpha, bestScore);

        setTimeout(calculateNextMove, 0);
    }

    setTimeout(calculateNextMove, 0);
}


// =========================================
// GAME STATUS
// =========================================

function updateStatus() {
    const status = document.getElementById("game-status");
    const message = document.getElementById("game-message");

    if (game.in_checkmate()) {
        status.textContent = "CHECKMATE!";

        message.textContent =
            (game.turn() === "w" ? "Black" : "White") + " wins!";

    } else if (game.in_stalemate()) {
        status.textContent = "STALEMATE";
        message.textContent = "The game is a draw.";

    } else if (game.in_draw()) {
        status.textContent = "DRAW";
        message.textContent = "The game ended in a draw.";

    } else {
        status.textContent =
            (game.turn() === "w" ? "White" : "Black") + " to move";

        message.textContent = game.in_check()
            ? "CHECK! Your king is under attack."
            : aiThinking
                ? "Computer is thinking..."
                : "Select a piece to see its legal moves.";
    }
}


// =========================================
// MATCH HISTORY - FIXED
// =========================================

const defaultStats = {
    wins: 0,
    losses: 0,
    draws: 0
};

function readStats() {
    try {
        const saved = JSON.parse(
            localStorage.getItem("75games_stats")
        );

        if (
            saved &&
            Number.isFinite(saved.wins) &&
            Number.isFinite(saved.losses) &&
            Number.isFinite(saved.draws)
        ) {
            return saved;
        }
    } catch (error) {
        console.error("Stats read error:", error);
    }

    return { ...defaultStats };
}

function readMatchHistory() {
    try {
        const saved = JSON.parse(
            localStorage.getItem("75games_history") || "[]"
        );

        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        console.error("History read error:", error);
        return [];
    }
}

function showStats() {
    const stats = readStats();

    document.getElementById("wins").textContent = stats.wins;
    document.getElementById("losses").textContent = stats.losses;
    document.getElementById("draws").textContent = stats.draws;
}

function recordResult(result) {
    if (resultRecorded) return;

    if (!["win", "loss", "draw"].includes(result)) return;

    resultRecorded = true;

    try {
        const stats = readStats();
        const history = readMatchHistory();

        if (result === "win") stats.wins++;
        if (result === "loss") stats.losses++;
        if (result === "draw") stats.draws++;

        history.unshift({
            result: result,
            mode: currentMode,
            date: new Date().toLocaleString()
        });

        localStorage.setItem(
            "75games_stats",
            JSON.stringify(stats)
        );

        localStorage.setItem(
            "75games_history",
            JSON.stringify(history.slice(0, 50))
        );

        showStats();
        renderMatchHistory();

        console.log("Match saved:", result);

    } catch (error) {
        console.error("Match save error:", error);

        document.getElementById("game-message").textContent =
            "Could not save history. Check browser storage.";
    }
}

function renderMatchHistory() {
    const box = document.getElementById("match-history");
    if (!box) return;

    const history = readMatchHistory();

    if (history.length === 0) {
        box.textContent = "No matches played yet";
        return;
    }

    box.innerHTML = "";

    history.forEach((match, index) => {
        const row = document.createElement("div");
        row.className = "match-record";

        const number = document.createElement("span");
        number.textContent = "#" + (index + 1);

        const result = document.createElement("strong");
        result.textContent =
            String(match.result || "unknown").toUpperCase();

        result.className =
            match.result === "win" ? "match-win" :
            match.result === "loss" ? "match-loss" :
            "match-draw";

        const date = document.createElement("small");
        date.textContent =
            (match.mode || "Game") + " | " + (match.date || "");

        row.append(number, result, date);
        box.appendChild(row);
    });
}


// =========================================
// RESET STATS
// =========================================

document.getElementById("reset-stats").onclick = () => {
    try {
        localStorage.removeItem("75games_stats");
        localStorage.removeItem("75games_history");
    } catch (error) {
        console.error("Reset error:", error);
    }

    showStats();
    renderMatchHistory();
};


// =========================================
// MOVE HISTORY
// =========================================

function renderMoveHistory() {
    const historyBox = document.getElementById("move-history");
    const moves = game.history();

    if (moves.length === 0) {
        historyBox.textContent = "No moves yet";
        return;
    }

    historyBox.innerHTML = "";

    for (let i = 0; i < moves.length; i += 2) {
        const row = document.createElement("div");
        row.className = "history-row";

        const number = document.createElement("span");
        number.textContent = (i / 2 + 1) + ".";

        const white = document.createElement("span");
        white.textContent = moves[i];

        const black = document.createElement("span");
        black.textContent = moves[i + 1] || "...";

        row.append(number, white, black);
        historyBox.appendChild(row);
    }

    historyBox.scrollTop = historyBox.scrollHeight;
}


// =========================================
// GAME END
// =========================================

function checkGameEnd() {
    if (gameFinished || !game.game_over()) return;

    gameFinished = true;
    stopTimer();

    document.getElementById("reset-board").textContent =
        "▶ Play Again";

    if (game.in_checkmate()) {
        const winner =
            game.turn() === "w" ? "Black" : "White";

        // White is the local player's side in both modes.
        recordResult(winner === "White" ? "win" : "loss");

    } else {
        recordResult("draw");
    }

    playSound("finish");
    drawBoard();
}


// =========================================
// UNDO
// =========================================

document.getElementById("undo-btn").onclick = () => {
    if (
        aiThinking ||
        gameFinished ||
        game.history().length === 0
    ) return;

    syncClock();

    if (gameFinished) return;

    game.undo();

    if (
        currentMode === "Computer" &&
        game.turn() === "b" &&
        game.history().length > 0
    ) {
        game.undo();
    }

    selectedSquare = null;
    legalMoves = [];

    lastClockUpdate = Date.now();

    drawBoard();
};


// =========================================
// RESTART / PLAY AGAIN
// =========================================

function resetGame() {
    stopTimer();

    game.reset();

    selectedSquare = null;
    legalMoves = [];

    aiThinking = false;
    gameFinished = false;
    resultRecorded = false;
    timerStarted = false;

    lastClockUpdate = 0;

    loadTimerSetting();

    document.getElementById("timer-setting").disabled = false;

    document.getElementById("reset-board").textContent =
        "🔄 Restart Game";

    drawBoard();
}

document.getElementById("reset-board").onclick = resetGame;


// =========================================
// START
// =========================================

loadTimerSetting();
showStats();
renderMatchHistory();
drawBoard();

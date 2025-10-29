document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('tetris-canvas');
    const context = canvas.getContext('2d');
    const nextCanvas = document.getElementById('next-canvas');
    const nextContext = nextCanvas.getContext('2d');
    const holdCanvas = document.getElementById('hold-canvas');
    const holdContext = holdCanvas.getContext('2d');

    const scoreElement = document.getElementById('score');
    const linesElement = document.getElementById('lines');
    const levelElement = document.getElementById('level');
    const usernameElement = document.getElementById('username');
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const restartButton = document.getElementById('restart-button');
    const shareButton = document.getElementById('share-button');

    // Game Constants
    const COLS = 10;
    const ROWS = 20;
    const HIDDEN_ROWS = 2;
    const BLOCK_SIZE = 32;
    const NEXT_CANVAS_SIZE = 4 * BLOCK_SIZE;
    const HOLD_CANVAS_SIZE = 4 * BLOCK_SIZE;

    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;
    nextCanvas.width = NEXT_CANVAS_SIZE;
    nextCanvas.height = NEXT_CANVAS_SIZE;
    holdCanvas.width = HOLD_CANVAS_SIZE;
    holdCanvas.height = HOLD_CANVAS_SIZE;

    const COLORS = {
        I: '#00ffff', // Cyan
        O: '#ff0000', // Red
        T: '#800080', // Purple
        S: '#00ff00', // Green
        Z: '#ffff00', // Yellow
        J: '#0000ff', // Blue
        L: '#ffa500'  // Orange
    };

    const SHAPES = {
        'I': [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
        'O': [[1,1], [1,1]],
        'T': [[0,1,0], [1,1,1], [0,0,0]],
        'S': [[0,1,1], [1,1,0], [0,0,0]],
        'Z': [[1,1,0], [0,1,1], [0,0,0]],
        'J': [[1,0,0], [1,1,1], [0,0,0]],
        'L': [[0,0,1], [1,1,1], [0,0,0]]
    };

    // Super Rotation System (SRS) Wall Kick Data
    // [rotation_state_from][rotation_state_to] -> array of [x, y] kick translations
    const WALL_KICK_DATA = {
        'I': {
            '01': [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
            '10': [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
            '12': [[0,0], [-1,0], [2,0], [-1,2], [2,-1]],
            '21': [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
            '23': [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
            '32': [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
            '30': [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
            '03': [[0,0], [-1,0], [2,0], [-1,2], [2,-1]]
        },
        'JLSTZ': { // For all other pieces
            '01': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
            '10': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
            '12': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
            '21': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
            '23': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
            '32': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
            '30': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
            '03': [[0,0], [1,0], [1,1], [0,-2], [1,-2]]
        }
    };

    // Game State
    let board = Array.from({ length: ROWS + HIDDEN_ROWS }, () => Array(COLS).fill(0));
    let score = 0;
    let lines = 0;
    let level = 1;
    let gameOver = false;
    let paused = false;

    let currentPiece;
    let nextPieces = [];
    let heldPiece = null;
    let canHold = true;

    let dropCounter = 0;
    let dropInterval = 1000; // ms

    let lastTime = 0;

    // Web Audio API for sounds
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const sounds = {
        drop: createSound(0.5, 440, 0.1, 'sine'),
        clear: createSound(0.8, 880, 0.2, 'triangle'),
        gameOver: createSound(0.7, 220, 0.5, 'sawtooth')
    };

    function createSound(volume, frequency, duration, type) {
        return () => {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            oscillator.type = type;
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        };
    }

    class Piece {
        constructor(shape, context) {
            this.shape = shape;
            this.color = COLORS[shape];
            this.matrix = SHAPES[shape];
            this.context = context;
            this.x = Math.floor(COLS / 2) - Math.ceil(this.matrix[0].length / 2);
            this.y = 0;
            this.rotation = 0;
        }

        draw() {
            this.context.fillStyle = this.color;
            this.context.shadowColor = this.color;
            this.context.shadowBlur = 10;
            this.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value > 0) {
                        this.context.fillRect((this.x + x) * BLOCK_SIZE, (this.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    }
                });
            });
            this.context.shadowBlur = 0;
        }
    }

    function generateNewPiece() {
        if (nextPieces.length === 0) {
            const bag = Object.keys(SHAPES);
            while (bag.length) {
                const rand = Math.floor(Math.random() * bag.length);
                nextPieces.push(bag.splice(rand, 1)[0]);
            }
        }
        const shape = nextPieces.shift();
        return new Piece(shape, context);
    }

    function isValidMove(matrix, newX, newY) {
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x] && (
                    board[newY + y] && board[newY + y][newX + x]) !== 0) {
                    return false;
                }
                if (matrix[y][x] && (newX + x < 0 || newX + x >= COLS || newY + y >= ROWS + HIDDEN_ROWS)) {
                    return false;
                }
            }
        }
        return true;
    }
    
    function update(time = 0) {
        if (gameOver || paused) {
            return;
        }

        const deltaTime = time - lastTime;
        lastTime = time;

        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
        }

        draw();
        requestAnimationFrame(update);
    }

    function draw() {
        // Clear main canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid lines
        context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < COLS; i++) {
            context.beginPath();
            context.moveTo(i * BLOCK_SIZE, 0);
            context.lineTo(i * BLOCK_SIZE, canvas.height);
            context.stroke();
        }
        for (let i = 0; i < ROWS; i++) {
            context.beginPath();
            context.moveTo(0, i * BLOCK_SIZE);
            context.lineTo(canvas.width, i * BLOCK_SIZE);
            context.stroke();
        }

        // Draw board
        board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    context.fillStyle = COLORS[value];
                    context.shadowColor = COLORS[value];
                    context.shadowBlur = 10;
                    context.fillRect(x * BLOCK_SIZE, (y - HIDDEN_ROWS) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    context.shadowBlur = 0;
                }
            });
        });

        if (currentPiece) {
            currentPiece.draw();
            drawGhostPiece();
        }

        drawNextPiece();
        drawHeldPiece();
    }

    function drawGhostPiece() {
        if (!currentPiece) return;
        const ghost = { ...currentPiece };
        ghost.matrix = currentPiece.matrix;
        ghost.y = currentPiece.y;
        while (isValidMove(ghost.matrix, ghost.x, ghost.y + 1)) {
            ghost.y++;
        }

        context.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ghost.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    context.fillRect((ghost.x + x) * BLOCK_SIZE, (ghost.y + y - HIDDEN_ROWS) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }

    function drawNextPiece() {
        nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        if (nextPieces.length > 0) {
            const nextShape = nextPieces[0];
            const piece = new Piece(nextShape, nextContext);
            const matrix = piece.matrix;
            const size = matrix.length;
            const offsetX = (nextCanvas.width - size * BLOCK_SIZE) / 2;
            const offsetY = (nextCanvas.height - size * BLOCK_SIZE) / 2;

            nextContext.fillStyle = piece.color;
            nextContext.shadowColor = piece.color;
            nextContext.shadowBlur = 8;
            matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        nextContext.fillRect(offsetX + x * BLOCK_SIZE, offsetY + y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    }
                });
            });
            nextContext.shadowBlur = 0;
        }
    }

    function drawHeldPiece() {
        holdContext.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
        if (heldPiece) {
            const piece = new Piece(heldPiece, holdContext);
            const matrix = piece.matrix;
            const size = matrix.length;
            const offsetX = (holdCanvas.width - size * BLOCK_SIZE) / 2;
            const offsetY = (holdCanvas.height - size * BLOCK_SIZE) / 2;

            holdContext.fillStyle = piece.color;
            holdContext.shadowColor = piece.color;
            holdContext.shadowBlur = 8;
            matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        holdContext.fillRect(offsetX + x * BLOCK_SIZE, offsetY + y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    }
                });
            });
            holdContext.shadowBlur = 0;
        }
    }

    function playerMove(dir) {
        if (!currentPiece || gameOver) return;
        if (isValidMove(currentPiece.matrix, currentPiece.x + dir, currentPiece.y)) {
            currentPiece.x += dir;
        }
    }

    function playerRotate(dir) {
        if (!currentPiece || gameOver) return;
        const originalMatrix = currentPiece.matrix;
        const rotated = [];
        for (let y = 0; y < originalMatrix.length; y++) {
            rotated.push([]);
            for (let x = 0; x < originalMatrix[y].length; x++) {
                if (dir > 0) { // Clockwise
                    rotated[y][x] = originalMatrix[originalMatrix.length - 1 - x][y];
                } else { // Counter-clockwise
                    rotated[y][x] = originalMatrix[x][originalMatrix.length - 1 - y];
                }
            }
        }

        const kickData = (currentPiece.shape === 'I' ? WALL_KICK_DATA.I : WALL_KICK_DATA.JLSTZ);
        const fromState = currentPiece.rotation;
        const toState = (fromState + (dir > 0 ? 1 : 3)) % 4;
        const kickTests = kickData[`${fromState}${toState}`];

        for (const test of kickTests) {
            const [kickX, kickY] = test;
            if (isValidMove(rotated, currentPiece.x + kickX, currentPiece.y - kickY)) { // SRS y-axis is inverted
                currentPiece.matrix = rotated;
                currentPiece.x += kickX;
                currentPiece.y -= kickY;
                currentPiece.rotation = toState;
                return;
            }
        }
    }

    function hardDrop() {
        if (!currentPiece || gameOver) return;
        let dropCount = 0;
        while (isValidMove(currentPiece.matrix, currentPiece.x, currentPiece.y + 1)) {
            currentPiece.y++;
            dropCount++;
        }
        score += dropCount * 2; // Add points for hard drop
        solidifyPiece();
    }

    function holdPiece() {
        if (!canHold || gameOver) return;
        canHold = false;
        if (heldPiece) {
            const temp = heldPiece;
            heldPiece = currentPiece.shape;
            currentPiece = new Piece(temp, context);
        } else {
            heldPiece = currentPiece.shape;
            currentPiece = generateNewPiece();
        }
    }

    function solidifyPiece() {
        if (!currentPiece) return;

        currentPiece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    board[currentPiece.y + y][currentPiece.x + x] = currentPiece.shape;
                }
            });
        });

        clearLines();
        currentPiece = generateNewPiece();

        if (!isValidMove(currentPiece.matrix, currentPiece.x, currentPiece.y)) {
            endGame();
        }
    }

    function clearLines() {
        let linesCleared = 0;
        for (let y = board.length - 1; y >= 0; y--) {
            if (board[y].every(value => value !== 0)) {
                linesCleared++;
                board.splice(y, 1);
                board.unshift(Array(COLS).fill(0));
            }
        }
        if (linesCleared > 0) {
            sounds.clear();
            lines += linesCleared;
            // Scoring: Single (100), Double (300), Triple (500), Tetris (800)
            switch (linesCleared) {
                case 1:
                    score += 100;
                    break;
                case 2:
                    score += 300;
                    break;
                case 3:
                    score += 500;
                    break;
                case 4:
                    score += 800;
                    break;
            }
            if (lines >= level * 10) {
                level++;
                dropInterval = Math.max(100, dropInterval * 0.9); // Increase speed
            }
        }
    }

    function endGame() {
        gameOverOverlay.classList.remove('hidden');
        sounds.gameOver();
        // In a real scenario, you'd send the score to a leaderboard
        const highScore = localStorage.getItem('neonTetrisHighScore') || 0;
        if (score > highScore) {
            localStorage.setItem('neonTetrisHighScore', score);
        }
    }

    function resetGame() {
        board.forEach(row => row.fill(0));
        score = 0;
        lines = 0;
        level = 1;
        dropInterval = 1000;
        gameOver = false;
        paused = false;
        nextPieces = [];
        heldPiece = null;
        canHold = true;
        currentPiece = generateNewPiece();
        updateUI();
        gameOverOverlay.classList.add('hidden');
        update();
    }

    restartButton.addEventListener('click', resetGame);

    // Controls
    document.addEventListener('keydown', event => {
        if (gameOver) return;

        switch (event.code) {
            case 'ArrowLeft':
                playerMove(-1);
                break;
            case 'ArrowRight':
                playerMove(1);
                break;
            case 'ArrowDown':
                playerDrop();
                score += 1; // Soft drop score
                break;
            case 'ArrowUp':
            case 'KeyX':
                playerRotate(1); // Clockwise
                break;
            case 'ControlLeft':
            case 'KeyZ':
                playerRotate(-1); // Counter-clockwise
                break;
            case 'Space':
                hardDrop();
                break;
            case 'ShiftLeft':
            case 'KeyC':
                holdPiece();
                break;
            case 'KeyP':
                paused = !paused;
                if (!paused) update();
                break;
        }
    });

    // Touch Controls
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoveX = 0;
    let touchMoveY = 0;
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        touchMoveX = e.touches[0].clientX;
        touchMoveY = e.touches[0].clientY;
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
        const diffX = touchMoveX - touchStartX;
        const diffY = touchMoveY - touchStartY;

        if (Math.abs(diffX) > Math.abs(diffY)) { // Horizontal swipe
            if (Math.abs(diffX) > BLOCK_SIZE / 2) {
                playerMove(diffX > 0 ? 1 : -1);
            }
        } else { // Vertical swipe or tap
            if (diffY > BLOCK_SIZE) { // Swipe down
                playerDrop();
            } else if (diffY < -BLOCK_SIZE * 2) { // Swipe up for hard drop
                hardDrop();
            } else { // Tap to rotate
                playerRotate(1);
            }
        }
        // Reset touch coordinates
        touchStartX = 0;
        touchStartY = 0;
        touchMoveX = 0;
        touchMoveY = 0;
    });

    // Initialize Telegram Web App
    try {
        const tg = window.Telegram.WebApp;
        tg.ready();
        const user = tg.initDataUnsafe.user;
        if (user) {
            usernameElement.textContent = user.username || `${user.first_name} ${user.last_name || ''}`.trim();
        }
        
        shareButton.addEventListener('click', () => {
            const text = `I scored ${score} points in Neon Tetris! Can you beat my high score?`;
            tg.switchInlineQuery(text);
        });

    } catch (e) {
        console.error("Telegram Web App script not loaded or failed.", e);
    }

    // Start the game
    resetGame();
    
});
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const mainMenu = document.getElementById('main-menu');
    const startGameBtn = document.getElementById('start-game-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const gameContainer = document.getElementById('game-container');
    const gameBoard = document.getElementById('game-board');
    const scoreList = document.getElementById('score-list');
    const usePowerupBtn = document.getElementById('use-powerup-btn');

    // Mobile Controls
    const mobileJumpBtn = document.getElementById('mobile-jump-btn');

    // --- Game State Variables ---
    let player = {};
    let bots = [];
    let platforms = [];
    let powerUps = []; // Store power-up objects
    let gameInterval;
    let gameSpeed = 100; // Lower is faster
    let score = 0;
    let points = 0;
    let availablePowerUp = null; // The power-up the player has
    let botDifficulty = 'medium';
    let playerColor = 'blue';

    // Controller Variables
    let gamepads = {}; // To keep track of connected gamepads
    let isJumpPressed = false; // For keyboard/gamepad jump
    let isJumpPressedMobile = false; // For mobile jump button

    // --- Game Configuration ---
    const BOARD_WIDTH = 600;
    const BOARD_HEIGHT = 400;
    const PLAYER_WIDTH = 30;
    const PLAYER_HEIGHT = 40;
    const BOT_WIDTH = 30;
    const BOT_HEIGHT = 40;
    const GRAVITY = 1;
    const JUMP_FORCE = 15;

    // --- Initialization ---
    settingsBtn.addEventListener('click', () => {
        settingsMenu.style.display = settingsMenu.style.display === 'none' ? 'block' : 'none';
    });

    saveSettingsBtn.addEventListener('click', () => {
        const difficulty = document.getElementById('bot-difficulty').value;
        const color = document.getElementById('player-color').value;
        botDifficulty = difficulty;
        playerColor = color;
        settingsMenu.style.display = 'none';
        console.log(`Settings saved: Difficulty=${botDifficulty}, Color=${playerColor}`);
    });

    startGameBtn.addEventListener('click', () => {
        mainMenu.style.display = 'none';
        gameContainer.style.display = 'flex';
        startGame();
    });

    usePowerupBtn.addEventListener('click', () => {
        if (availablePowerUp) {
            applyPowerUp(availablePowerUp);
            availablePowerUp = null;
            usePowerupBtn.disabled = true;
            usePowerupBtn.textContent = 'Use Power-up';
        }
    });

    // Mobile Jump Button Listener
    if (mobileJumpBtn) {
        mobileJumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent default touch behavior
            isJumpPressedMobile = true;
        });
        mobileJumpBtn.addEventListener('touchend', () => {
            isJumpPressedMobile = false;
        });
    }

    // --- Game Logic ---

    function startGame() {
        // Reset game state
        score = 0;
        points = 0;
        player = {};
        bots = [];
        platforms = [];
        availablePowerUp = null;
        gameBoard.innerHTML = ''; // Clear previous game elements
        scoreList.innerHTML = ''; // Clear scoreboard

        createPlayer();
        createBots();
        createPlatforms();
        updateScoreboard();

        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, gameSpeed);

        // Start gamepad polling
        startGamepadSupport();
    }

    function gameLoop() {
        handlePlayerInput(); // Check for jumps from keyboard/controller/mobile
        movePlayer();
        moveBots();
        checkCollisions();
        generatePowerUps();
        updateGameElements();
        score++;
        updateScoreboard();

        // Randomly give bots power-ups
        bots.forEach(bot => {
            if (Math.random() < 0.01 && !bot.powerUp) { // Small chance to get a power-up
                bot.powerUp = getRandomPowerUp();
                console.log("Bot got a power-up!");
            }
            if (bot.powerUp) {
                applyBotPowerUp(bot);
            }
        });

        if (score % 1000 === 0) { // Increase speed slightly over time
            gameSpeed = Math.max(50, gameSpeed - 5);
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, gameSpeed);
        }
    }

    function createPlayer() {
        const playerElement = document.createElement('div');
        playerElement.classList.add('player');
        playerElement.style.backgroundColor = playerColor;
        playerElement.style.left = '50px';
        playerElement.style.bottom = '50px'; // Start position
        gameBoard.appendChild(playerElement);

        player = {
            element: playerElement,
            x: 50,
            y: BOARD_HEIGHT - 50 - PLAYER_HEIGHT,
            width: PLAYER_WIDTH,
            height: PLAYER_HEIGHT,
            isJumping: false,
            velocityY: 0,
            speed: 5 // Base horizontal speed
        };
    }

    function createBots() {
        const numBots = 3; // Number of bots
        for (let i = 0; i < numBots; i++) {
            const botElement = document.createElement('div');
            botElement.classList.add('bot');
            botElement.style.backgroundColor = getRandomColor(); // Assign a random color to bots
            botElement.style.left = `${100 + i * 50}px`;
            botElement.style.bottom = '50px';
            gameBoard.appendChild(botElement);

            bots.push({
                element: botElement,
                x: 100 + i * 50,
                y: BOARD_HEIGHT - 50 - BOT_HEIGHT,
                width: BOT_WIDTH,
                height: BOT_HEIGHT,
                isJumping: false,
                velocityY: 0,
                speed: getBotSpeed(botDifficulty),
                powerUp: null
            });
        }
    }

    function getBotSpeed(difficulty) {
        switch (difficulty) {
            case 'easy': return 1;
            case 'medium': return 2;
            case 'hard': return 3;
            default: return 2;
        }
    }

    function createPlatforms() {
        const platformData = [
            { x: 0, y: BOARD_HEIGHT - 100, width: 200, height: 20 },
            { x: 250, y: BOARD_HEIGHT - 150, width: 150, height: 20 },
            { x: 450, y: BOARD_HEIGHT - 200, width: 100, height: 20 },
            { x: 50, y: BOARD_HEIGHT - 250, width: 180, height: 20 },
            { x: 350, y: BOARD_HEIGHT - 300, width: 120, height: 20 },
        ];

        platformData.forEach(p => {
            const platformElement = document.createElement('div');
            platformElement.classList.add('platform');
            platformElement.style.left = `${p.x}px`;
            // Adjust 'bottom' style based on BOARD_HEIGHT for correct rendering
            platformElement.style.bottom = `${BOARD_HEIGHT - p.y - p.height}px`;
            platformElement.style.width = `${p.width}px`;
            platformElement.style.height = `${p.height}px`;
            gameBoard.appendChild(platformElement);

            platforms.push({
                element: platformElement,
                x: p.x,
                y: p.y, // Store y relative to the bottom of the board for easier calculation
                width: p.width,
                height: p.height
            });
        });
    }

    function handlePlayerInput() {
        // Check for jump input
        if ((isJumpPressed || isJumpPressedMobile) && !player.isJumping) {
            player.velocityY = JUMP_FORCE;
            player.isJumping = true;
        }

        // Horizontal movement based on controller/keyboard input
        let moveX = 0;
        if (player.controller) {
            // Check horizontal axis (usually index 0 for left stick)
            if (player.controller.axes[0] > 0.5) moveX = player.speed;
            else if (player.controller.axes[0] < -0.5) moveX = -player.speed;
        } else {
            // Keyboard input for movement (if no controller or prefer keyboard)
            if (keysPressed['ArrowRight']) moveX = player.speed;
            else if (keysPressed['ArrowLeft']) moveX = -player.speed;
        }
        player.x += moveX;
    }

    // Player horizontal movement is handled by handlePlayerInput() now.
    // movePlayer() only handles vertical movement (gravity, jumping).
    function movePlayer() {
        player.velocityY -= GRAVITY;
        player.y -= player.velocityY;

        // Prevent falling through the bottom
        if (player.y <= 0) {
            player.y = 0;
            player.velocityY = 0;
            player.isJumping = false;
        }

        // Check platform collisions
        let landedOnPlatform = false;
        platforms.forEach(platform => {
            // Check for collision from above
            if (
                player.x < platform.x + platform.width &&
                player.x + player.width > platform.x &&
                player.y < platform.y + platform.height && // Player's top is below platform's bottom
                player.y + player.height > platform.y &&  // Player's bottom is above platform's top
                player.velocityY <= 0 // Player is falling
            ) {
                player.y = platform.y + platform.height; // Position player on top of platform
                player.velocityY = 0;
                player.isJumping = false;
                landedOnPlatform = true;
            }
        });
        // If player didn't land on a platform, ensure they are not stuck in the ground
        if (!landedOnPlatform && player.y <= 0) {
             player.y = 0;
             player.velocityY = 0;
             player.isJumping = false;
        }


        player.element.style.left = `${player.x}px`;
        player.element.style.bottom = `${player.y}px`;
    }


    function moveBots() {
        bots.forEach(bot => {
            bot.velocityY -= GRAVITY;
            bot.y -= bot.velocityY;

            // Simple AI: move towards player or randomly
            let moveX = 0;
            // Basic AI: try to stay roughly aligned with player horizontally or move randomly
            const playerCenterX = player.x + player.width / 2;
            const botCenterX = bot.x + bot.width / 2;

            if (Math.abs(playerCenterX - botCenterX) < 50 && Math.random() > 0.5) {
                 // If player is nearby, sometimes try to match their horizontal position
                 if (playerCenterX > botCenterX) moveX = bot.speed;
                 else if (playerCenterX < botCenterX) moveX = -bot.speed;
            } else {
                // Otherwise, move randomly
                moveX = (Math.random() > 0.5 ? 1 : -1) * bot.speed;
            }

            bot.x += moveX;

            // Keep bots within bounds
            if (bot.x < 0) bot.x = 0;
            if (bot.x + bot.width > BOARD_WIDTH) bot.x = BOARD_WIDTH - bot.width;

            // Prevent falling through the bottom
            if (bot.y <= 0) {
                bot.y = 0;
                bot.velocityY = 0;
                bot.isJumping = false;
            }

            // Check platform collisions for bots
            let landedOnPlatform = false;
            platforms.forEach(platform => {
                if (
                    bot.x < platform.x + platform.width &&
                    bot.x + bot.width > platform.x &&
                    bot.y < platform.y + platform.height &&
                    bot.y + bot.height > platform.y &&
                    bot.velocityY <= 0
                ) {
                    bot.y = platform.y + platform.height;
                    bot.velocityY = 0;
                    bot.isJumping = false;
                    landedOnPlatform = true;
                }
            });
            if (!landedOnPlatform && bot.y <= 0) {
                bot.y = 0;
                bot.velocityY = 0;
                bot.isJumping = false;
            }

            bot.element.style.left = `${bot.x}px`;
            bot.element.style.bottom = `${bot.y}px`;
        });
    }

    function checkCollisions() {
        // Collision detection between player and bots
        bots.forEach(bot => {
            if (
                player.x < bot.x + bot.width &&
                player.x + player.width > bot.x &&
                player.y < bot.y + bot.height &&
                player.y + player.height > bot.y
            ) {
                if (player.isInvincible) {
                    // Player is invincible, can ignore bot collision for now
                    return;
                }
                if (bot.isInvincible) {
                    // Bot is invincible, player bounces off or takes damage
                    // For simplicity, let's just prevent movement overlap for now
                    return;
                }

                // Player landed on bot (from above)
                if (player.y >= bot.y + bot.height - 5) {
                    points += 10;
                    if (!availablePowerUp) {
                        availablePowerUp = getRandomPowerUp();
                        usePowerupBtn.disabled = false;
                        usePowerupBtn.textContent = `Use ${availablePowerUp.name}`;
                    }
                    // Make the bot "bounce" or get temporarily stunned
                    bot.velocityY = JUMP_FORCE / 2;
                } else {
                    // Collision from sides or player hit from below
                    // Implement penalty or game over logic here
                    console.log("Collision with bot!");
                    // Simple penalty: reset player position or lose points
                }
            }
        });

        // Collision with power-up items on the board
        powerUps.forEach((pUp, index) => {
            if (
                player.x < pUp.x + pUp.width &&
                player.x + player.width > pUp.x &&
                player.y < pUp.y + pUp.height &&
                player.y + player.height > pUp.y
            ) {
                if (!availablePowerUp) {
                    availablePowerUp = pUp;
                    usePowerupBtn.disabled = false;
                    usePowerupBtn.textContent = `Use ${pUp.name}`;
                    pUp.element.remove(); // Remove from board
                    powerUps.splice(index, 1); // Remove from array
                }
            }
        });
    }

    function generatePowerUps() {
        if (Math.random() < 0.005 && platforms.length > 0) { // Lower spawn rate for clarity
            const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
            const pUp = getRandomPowerUp();
            const pUpElement = document.createElement('div');
            pUpElement.classList.add('power-up');
            pUpElement.style.left = `${randomPlatform.x + randomPlatform.width / 2 - 15}px`;
            pUpElement.style.bottom = `${randomPlatform.y + randomPlatform.height + 5}px`;
            pUpElement.style.width = '30px';
            pUpElement.style.height = '30px';
            pUpElement.style.backgroundColor = pUp.color;
            pUpElement.textContent = pUp.symbol;
            pUpElement.style.display = 'flex';
            pUpElement.style.justifyContent = 'center';
            pUpElement.style.alignItems = 'center';
            pUpElement.style.fontWeight = 'bold';
            pUpElement.style.borderRadius = '50%';
            gameBoard.appendChild(pUpElement);

            powerUps.push({
                ...pUp,
                element: pUpElement,
                x: parseFloat(pUpElement.style.left),
                y: parseFloat(pUpElement.style.bottom) - (BOARD_HEIGHT - pUpElement.style.bottom) // y relative to bottom
            });
        }
    }

    function getRandomPowerUp() {
        const possiblePowerUps = [
            { name: 'Speed Boost', effect: 'speedBoost', symbol: '⚡', color: 'gold' },
            { name: 'Invincibility', effect: 'invincible', symbol: '🛡️', color: 'silver' },
            { name: 'Extra Points', effect: 'extraPoints', symbol: '+', color: 'lime' }
        ];
        return possiblePowerUps[Math.floor(Math.random() * possiblePowerUps.length)];
    }

    function applyPowerUp(powerUp) {
        console.log(`Applying power-up: ${powerUp.name}`);
        switch (powerUp.effect) {
            case 'speedBoost':
                const originalSpeed = player.speed;
                player.speed *= 1.5; // Increase speed by 50%
                setTimeout(() => {
                    player.speed = originalSpeed; // Revert speed
                    console.log('Speed boost ended.');
                }, 5000);
                break;
            case 'invincible':
                player.isInvincible = true;
                player.element.style.opacity = '0.5';
                setTimeout(() => {
                    player.isInvincible = false;
                    player.element.style.opacity = '1';
                    console.log('Invincibility ended.');
                }, 5000);
                break;
            case 'extraPoints':
                points += 50;
                console.log('Extra points awarded!');
                break;
        }
    }

    function applyBotPowerUp(bot) {
        console.log(`Applying power-up to bot: ${bot.powerUp.name}`);
        switch (bot.powerUp.effect) {
            case 'speedBoost':
                const originalBotSpeed = bot.speed;
                bot.speed *= 1.5;
                setTimeout(() => {
                    bot.speed = originalBotSpeed;
                    bot.powerUp = null;
                    console.log('Bot speed boost ended.');
                }, 5000);
                break;
            case 'invincible':
                bot.isInvincible = true;
                bot.element.style.opacity = '0.5';
                setTimeout(() => {
                    bot.isInvincible = false;
                    bot.element.style.opacity = '1';
                    bot.powerUp = null;
                    console.log('Bot invincibility ended.');
                }, 5000);
                break;
            case 'extraPoints':
                points += 25;
                setTimeout(() => {
                    bot.powerUp = null;
                    console.log('Bot extra points consumed.');
                }, 1000);
                break;
        }
    }

    function updateGameElements() {
        player.element.style.left = `${player.x}px`;
        player.element.style.bottom = `${player.y}px`;
    }

    function updateScoreboard() {
        scoreList.innerHTML = '';
        const playerScoreItem = document.createElement('li');
        playerScoreItem.textContent = `Sigma (You): ${points}`;
        scoreList.appendChild(playerScoreItem);

        bots.forEach((bot, index) => {
            const botScoreItem = document.createElement('li');
            botScoreItem.textContent = `Bot ${index + 1}: ${Math.floor(bot.x / 10)}`;
            scoreList.appendChild(botScoreItem);
        });
    }

    function getRandomColor() {
        const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF', '#FFC300'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // --- Input Handling ---

    // Keyboard Input Tracking
    const keysPressed = {};
    document.addEventListener('keydown', (event) => {
        keysPressed[event.key] = true;
        if (event.key === 'ArrowUp' || event.key === ' ') { // Spacebar for jump
            isJumpPressed = true;
        }
        // For testing power-up usage
        if (event.key === 'p' && availablePowerUp) {
            applyPowerUp(availablePowerUp);
            availablePowerUp = null;
            usePowerupBtn.disabled = true;
            usePowerupBtn.textContent = 'Use Power-up';
        }
    });

    document.addEventListener('keyup', (event) => {
        keysPressed[event.key] = false;
        if (event.key === 'ArrowUp' || event.key === ' ') {
            isJumpPressed = false;
        }
    });

    // Gamepad API Support
    function startGamepadSupport() {
        window.addEventListener("gamepadconnected", handleGamepadConnect);
        window.addEventListener("gamepaddisconnected", handleGamepadDisconnect);
    }

    function handleGamepadConnect(e) {
        console.log("Gamepad connected:", e.gamepad);
        gamepads[e.gamepad.index] = e.gamepad;
        // Assign the first connected gamepad to the player
        if (Object.keys(gamepads).length === 1) {
            player.controller = gamepads[e.gamepad.index];
            // Add a visual indicator if needed
            const gamepadIndicator = document.createElement('span');
            gamepadIndicator.classList.add('gamepad-indicator');
            gamepadIndicator.textContent = '🎮';
            // Append to a visible element, e.g., the start button's parent
            if(startGameBtn && startGameBtn.parentNode) {
                startGameBtn.parentNode.appendChild(gamepadIndicator);
            }
        }
    }

    function handleGamepadDisconnect(e) {
        console.log("Gamepad disconnected:", e.gamepad);
        delete gamepads[e.gamepad.index];
        if (player.controller && player.controller.index === e.gamepad.index) {
            player.controller = null;
            // Remove the indicator
            const indicator = document.querySelector('.gamepad-indicator');
            if (indicator) indicator.remove();
        }
    }

    // Poll gamepads periodically to check their state
    // Use requestAnimationFrame for smoother integration with the game loop if possible,
    // or a simple setInterval for polling.
    setInterval(() => {
        if (!gameInterval) return; // Only poll if game is running

        const gp = navigator.getGamepads()[0]; // Get the first available gamepad
        if (gp) {
            // Jump Button (e.g., South button - A on Xbox, B on PlayStation)
            // Button mappings can vary, common indices: 0 (A/X), 1 (B/O), 2 (X/Square), 3 (Y/Triangle)
            // Let's assume button 0 is jump
            if (gp.buttons[0].pressed) {
                isJumpPressed = true;
            } else {
                isJumpPressed = false;
            }

            // Horizontal movement (Left Stick X-axis)
            const xAxis = gp.axes[0];
            if (Math.abs(xAxis) > 0.5) { // Dead zone
                player.x += xAxis * player.speed;
                // Keep player within bounds
                if (player.x < 0) player.x = 0;
                if (player.x + player.width > BOARD_WIDTH) player.x = BOARD_WIDTH - player.width;
            }

            // Update player controller reference if it changed or is missing
            if (!player.controller || player.controller.index !== gp.index) {
                player.controller = gp;
            }
        } else {
            // No gamepad connected or available
            player.controller = null;
        }
    }, 50); // Poll every 50ms


    // --- Initial Setup ---
    settingsMenu.style.display = 'none'; // Ensure settings are hidden initially

});

// Import Three.js library
import * as THREE from 'three';
import GameEngine from './core/GameEngine.js';
import './services/aiScoring.js'; // loads DEV-only `[aiScoring dev test]` log (see RUN_AI_SMOKE_TEST)

// Initialize and start the game
async function startGame() {
    try {
        console.log('Starting Get Outta My Room...');
        
        const gameEngine = new GameEngine();
        await gameEngine.initialize();
        
        console.log('Game started successfully!');
        
        // Make game engine globally accessible for debugging
        window.gameEngine = gameEngine;
        
    } catch (error) {
        console.error('Failed to start game:', error);
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 1000;
        `;
        errorDiv.innerHTML = `
            <h2>Failed to load game</h2>
            <p>Please refresh the page and try again.</p>
            <p style="font-size: 12px; color: #ccc;">Error: ${error.message}</p>
        `;
        document.body.appendChild(errorDiv);
    }
}

// Start the game when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGame);
} else {
    startGame();
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.gameEngine) {
        if (document.hidden) {
            // Game is hidden, pause if needed
            console.log('Game paused');
        } else {
            // Game is visible again, resume if needed
            console.log('Game resumed');
        }
    }
});
# Neon Tetris - Telegram Mini-App

This repository contains the source code for "Neon Tetris," a classic Tetris game designed as a Telegram Mini-App. It's built with vanilla JavaScript, HTML5 Canvas, and CSS, and is optimized for mobile devices.

## Architecture Overview

The game is a single-page application with three main files:
- `index.html`: The main HTML file that structures the game page.
- `style.css`: Contains all the styles for the game, including the neon theme and responsive design.
- `app.js`: The core of the game, containing all the logic for gameplay, rendering, controls, and Telegram integration.

The architecture is kept simple and lightweight, with no external frameworks, to ensure fast loading times and performance on mobile devices. Game state is managed in memory, and high scores are persisted using the browser's Local Storage.

## Key Decisions

- **Vanilla JavaScript:** Chosen to keep the project lightweight and avoid dependencies. This is ideal for a small game where performance is key.
- **HTML5 Canvas:** Used for rendering the game board, pieces, and animations. Canvas provides the flexibility needed for a dynamic game like Tetris and allows for cool visual effects like the neon glow.
- **Super Rotation System (SRS):** Implemented for piece rotation to provide a familiar, standard Tetris experience.
- **7-Bag Randomizer:** Ensures a fair distribution of tetrominoes, preventing long droughts of a particular piece.
- **Telegram Web App API:** Integrated for user authentication (displaying the player's Telegram username) and sharing scores directly to a chat.

## How to Run the Game Locally

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  **Serve the files:**
    Since the game uses JavaScript modules, you need to serve the files using a local web server. The easiest way is with Python's built-in server.
    ```bash
    python3 -m http.server 8000
    ```
3.  **Open in your browser:**
    Navigate to `http://localhost:8000` in your web browser.

## Deployment

You can deploy this game to any static hosting service. Here are instructions for GitHub Pages.

### Deploying to GitHub Pages

1.  **Push your code to a GitHub repository.**
2.  **Go to your repository's settings.**
3.  **Navigate to the "Pages" section.**
4.  **Under "Source," select the `main` branch and the `/root` directory.**
5.  **Click "Save."** Your game will be deployed to `https://<your-username>.github.io/<your-repo-name>/`.

## Telegram Bot Setup

To run this game inside Telegram, you need to create a Telegram Bot and link the web app to it.

1.  **Create a new bot:**
    - Talk to the `@BotFather` on Telegram.
    - Use the `/newbot` command and follow the instructions.
    - You will receive a bot token. Keep it safe.

2.  **Set up the Mini App:**
    - With `@BotFather`, use the `/mybots` command, select your bot, and go to "Bot Settings" -> "Menu Button".
    - Configure the menu button to launch a web app.
    - You will be asked for a URL. Provide the URL where you deployed your game (e.g., your GitHub Pages URL).

3.  **Play the game:**
    - Open a chat with your bot in Telegram.
    - Click the menu button you configured, and the game will launch!

## Testing

-   **Desktop:** Use the keyboard controls (arrow keys, space, etc.) to play.
-   **Mobile:** Use touch controls (swipe and tap) to play.
-   **Telegram Integration:** Test the "Share Score" button within the Telegram app to ensure it opens the chat selection.

## Potential Improvements

-   **Leaderboard:** Implement a global leaderboard using a backend service or by leveraging the Telegram Bot API to store scores.
-   **Themes:** Add in-app purchases (via Telegram Payments) to unlock new visual themes.
-   **Sound Effects:** Add more varied and higher-quality sound effects.
-   **Offline Mode:** Implement a service worker to cache game assets for offline play.

## Troubleshooting

-   **Game not loading in Telegram:** Make sure your deployment URL is correct and uses `https`. Telegram requires web apps to be served over HTTPS.
-   **Telegram features not working:** The `Telegram.WebApp` object is only available when the game is running inside the Telegram app. Features like username display and sharing will not work in a standard browser.
-   **Rendering glitches:** Ensure your browser is up-to-date. If you experience performance issues, you can try simplifying the neon glow effects in `style.css` and `app.js`.

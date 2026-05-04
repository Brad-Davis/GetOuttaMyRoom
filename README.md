# Get Outta My Room

## Instructions to play locally

1. Install [Node.js](https://nodejs.org/) (LTS is fine).
2. Get the code: clone the repo or download the ZIP from GitHub and unzip it.
3. In the project folder (where `package.json` lives):

```bash
npm install
npm run dev
```

4. Open **http://127.0.0.1:5173** (or the URL Vite prints). Keep the terminal open; `Ctrl+C` stops the server.

## IMPORTANT!!! OpenAI API key (`.env`)

Parts of the game call OpenAI for scoring. Create a **`.env`** file in the project root (same folder as `package.json`).

Add:

```bash
OPENAI_API_KEY=sk-your-key-here
```
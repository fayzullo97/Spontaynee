# Spontaynee

Spontaynee is a small Telegram Mini App that asks playful, thought-provoking questions for couples.

This repository is a static site with three files:

- `index.html` — app entry (use lowercase `index.html` for static hosting compatibility)
- `style.css` — styling
- `app.js` — application logic (Telegram Web App integration, language support, question flow)

---

## Quick deploy to Vercel (for beginners)

1. Push this repository to GitHub (already done).
2. Create a free account at https://vercel.com and connect your GitHub account.
3. In Vercel: click **New Project** → import the `Spontaynee` repository.
   - Framework Preset: choose `Other` or `Static Site`.
   - Build Command: leave empty.
   - Output Directory: leave empty (root).
4. Click **Deploy**. After a minute you'll get a secure HTTPS URL like `https://spontaynee.vercel.app`.

Notes:
- Use the Vercel URL as the Web App URL in BotFather (HTTPS required).
- Vercel automatically redeploys when you push new commits.

---

## Set the Mini App URL in @BotFather (Telegram)

1. Open Telegram and start a chat with @BotFather.
2. Create a bot if you haven't: send `/newbot` and follow prompts. Save the bot token.
3. Open your bot's settings in BotFather: `/mybots` → select your bot → **Edit Bot**.
4. Look for a **Web App** or **Edit Web App** / **Add Web App** option. Add the Vercel HTTPS URL as the Web App URL. If BotFather UI differs, use the **Edit Bot** flow and look for options to add a web app.

Alternative: you can test the Mini App directly using the link:

```
https://t.me/YourBot?startapp
```

Replace `YourBot` with your bot's username (without `@`).

---

## Important notes for Telegram Mini Apps

- The Web App must be served via HTTPS.
- The client receives `initData` from Telegram. Do NOT trust it on the client alone — validate it on your backend using HMAC-SHA-256 as documented here:
  https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
- This project is intentionally serverless/static. If you later add a backend, validate `initData` there.

---

# Local testing

To preview locally (no Telegram features like MainButton or Haptic):

```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

The Telegram Web App features (MainButton, BackButton, haptics) will only work inside the Telegram client.

---

## Cleanup: remove the temporary SSH key (optional)

If you added the SSH key I created and want to remove it later:

1. On this machine, remove the key files:
```bash
rm ~/.ssh/id_ed25519_spontaynee ~/.ssh/id_ed25519_spontaynee.pub
```
2. On GitHub: Settings → SSH and GPG keys → delete the key titled `Spontaynee-dev` (or the title you used).

---

If you want, I can also deploy the project to Vercel for you (requires Vercel login). Tell me if you want me to attempt a Vercel deploy from this environment and I’ll run the CLI flow.

---

## Whisper proxy server (local development)

This repo now includes a minimal Node/Express proxy `server.js` which accepts audio uploads and forwards them to OpenAI's Whisper transcription endpoint. Use this for local testing of speech-to-text.

Quick steps:

1. Install dependencies:

```bash
cd /Users/fayzullodavronov/Desktop/Spontaynee
npm install
```

2. Set your OpenAI API key and start the server:

```bash
export OPENAI_API_KEY=your_openai_api_key_here
npm start
```

3. Start a static file server for the frontend (if needed):

```bash
python3 -m http.server 8000
# open http://localhost:8000/index.html
```

The frontend `app.js` includes a simple recorder that sends audio to `/api/whisper`. The server will return a JSON object with the transcription in the `text` field.

Security reminder: keep your OpenAI API key on the server only. This server is a demo—add auth, rate limits and HTTPS before using in production.

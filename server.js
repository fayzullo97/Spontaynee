// Minimal Express server to proxy audio files to OpenAI Whisper
// This server is for local development and demonstration only.
// It expects an environment variable OPENAI_API_KEY to be set.

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const upload = multer({ dest: 'uploads/' });
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the repository root so the same server can host
// the frontend (index.html, style.css, app.js). This simplifies local testing
// and avoids CORS when the frontend calls /api/whisper.
app.use(express.static(path.join(__dirname)));

// POST /api/whisper - accepts multipart/form-data with 'audio' field
app.post('/api/whisper', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('No audio file uploaded');

    // Read file to buffer
    const audioPath = path.resolve(req.file.path);
    const fileStream = fs.createReadStream(audioPath);

    // Call OpenAI Whisper /v1/audio/transcriptions endpoint
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) return res.status(500).send('Missing OPENAI_API_KEY');

    // Build form-data for the OpenAI request
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fileStream, {
      filename: 'speech.webm'
    });
    form.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: form
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).send(text);
    }

    const data = await response.json();

    // Clean up uploaded file
    fs.unlink(audioPath, () => {});

    // Whisper returns { text: '...' }
    res.json({ text: data.text });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.listen(PORT, () => {
  console.log(`Whisper proxy server listening on http://localhost:${PORT}`);
  console.log('Ensure OPENAI_API_KEY is set in your environment.');
});


// ...existing code...

/*
  app.js
  - Simple, beginner-friendly logic for Spontaynee Telegram Mini App
  - Uses Telegram Web App JS API: window.Telegram.WebApp
  - UI text is in Uzbek.
*/

/* ======= Telegram WebApp init ======= */
const tg = window.Telegram.WebApp; // Telegram Web App object

// Make the web app ready and expand UI to use full height on mobile.
tg.ready();          // signal to Telegram that app is ready
tg.expand();         // ask Telegram to expand web view

// Apply Telegram theme params to CSS variables if present (dark/light)
if (tg.themeParams) {
  // Map a few Telegram theme params to CSS variables used in style.css
  const root = document.documentElement;
  if (tg.themeParams.bg_color) root.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color);
  if (tg.themeParams.button_color) root.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color);
  if (tg.themeParams.text_color) root.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color);
}

/* ======= Basic app state ======= */
const state = {
  players: [],               // players' names
  currentPlayerIdx: 0,       // 0 or 1
  questionIdx: 0,            // 0..9 per player
  skipped: [false, false],   // skip used per player (only one skip each)
  // Hardcoded 10 questions in Uzbek
  questions: [
    "Hech kim bilan bo‘lmagan orzuingiz nima?",
    "Sizni eng baxtli qilgan kichik xotira qaysi?",
    "Biror romantik qilmishingiz qachon edi?",
    "Birinchi uchrashuvni qanday xayol qilasiz?",
    "Sizning sevimli qo‘shig‘ingiz qaysi va nega?",
    "Agar bir kun uchun kechirim so‘rasangiz, kimga va nima uchun?",
    "Qaysi odatni o‘zgartirishni xohlardingiz?",
    "Sizni kuldiradigan eng yaxshi hazil qaysi?",
    "Ajoyib romantik taomni tayyorlashni xohlaysizmi? Qaysi taom?",
    "Kelajakdagi kichik sarguzashtingiz qanday bo‘lishini xohlaysiz?"
  ],
  // store responses in-memory; can be extended to persist later
  responses: [ [], [] ] // responses[playerIdx][questionIdx]
};

/* ======= DOM references ======= */
const screens = {
  welcome: document.getElementById('welcome'),
  setup: document.getElementById('setup'),
  game: document.getElementById('game'),
  end: document.getElementById('end')
};
const nameInput = document.getElementById('name-input');
const nameLabel = document.getElementById('name-label');
const nameFeedback = document.getElementById('name-feedback');

const progressEl = document.getElementById('progress');
const questionEl = document.getElementById('question');
const answerInput = document.getElementById('answer-input');
const speakBtn = document.getElementById('speak-btn');
const aiReplyEl = document.getElementById('ai-reply');

// A small helper element to show live transcription state (we reuse aiReplyEl
// for accessibility but keep a small helper API below to format messages).

function setTranscriptUI(state, text) {
  // state: 'idle' | 'recording' | 'uploading' | 'ready' | 'error'
  switch (state) {
    case 'recording':
      aiReplyEl.style.opacity = '1';
      aiReplyEl.textContent = 'Yozilmoqda… Iltimos gapiring.'; // Uzbek
      break;
    case 'uploading':
      aiReplyEl.style.opacity = '0.95';
      aiReplyEl.textContent = 'Transkript olinmoqda… Iltimos kuting.';
      break;
    case 'ready':
      aiReplyEl.style.opacity = '1';
      aiReplyEl.textContent = text ? `Transkript: ${text}` : 'Transkript topilmadi.';
      break;
    case 'error':
      aiReplyEl.style.opacity = '1';
      aiReplyEl.textContent = text || 'Xato: transkriptsiya amalga oshmadi.';
      break;
    default:
      aiReplyEl.style.opacity = '0.9';
      aiReplyEl.textContent = '';
  }
}

const endMessageNames = document.getElementById('end-names');

/* ======= Telegram buttons setup ======= */
// Use Telegram MainButton for primary actions (Start, Submit, Restart)
const MainButton = tg.MainButton;
MainButton.setText("Boshlash"); // initial label for start
MainButton.show(); // show the Telegram main button on welcome

// BackButton will be used as Skip. It is not visible by default.
const BackButton = tg.BackButton;

/* ======= Helper functions ======= */

// Show screen by id and hide others
function showScreen(name) {
  Object.keys(screens).forEach(k => {
    if (k === name) screens[k].classList.add('screen--visible');
    else screens[k].classList.remove('screen--visible');
  });
}

// Save players to localStorage (simple persistence)
function savePlayersToLocalStorage(players) {
  try {
    localStorage.setItem('spontaynee_players', JSON.stringify(players));
  } catch (e) {
    console.warn("localStorage error:", e);
  }
}

// Load players if previously saved
function loadPlayersFromLocalStorage() {
  try {
    const raw = localStorage.getItem('spontaynee_players');
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}

/* ======= Welcome -> Setup flow ======= */

// Handle MainButton click events
MainButton.onClick(() => {
  // Determine which screen we are on by checking visibility
  if (screens.welcome.classList.contains('screen--visible')) {
    // From welcome -> show setup and ask first player's name
    startSetup();
  } else if (screens.setup.classList.contains('screen--visible')) {
    // From setup: save the current name then move forward
    handleNameSubmit();
  } else if (screens.game.classList.contains('screen--visible')) {
    // From game: submit an answer
    handleAnswerSubmit();
  } else if (screens.end.classList.contains('screen--visible')) {
    // From end: restart
    handleRestart();
  }
});

// Fallback in-page start button (for browsers or testing outside Telegram)
const fallbackStartBtn = document.getElementById('fallback-start');
if (fallbackStartBtn) {
  fallbackStartBtn.addEventListener('click', () => {
    // Mirror what MainButton would do on welcome
    if (screens.welcome.classList.contains('screen--visible')) startSetup();
  });
}

// If Telegram's MainButton is available, hide the fallback start to avoid UI confusion
try {
  if (tg && tg.MainButton) {
    if (fallbackStartBtn) fallbackStartBtn.style.display = 'none';
  }
} catch (e) {
  // tg may be undefined in non-Telegram environments; ignore
}

/* ======= Setup logic ======= */
function startSetup() {
  // Try to load saved players
  const prevPlayers = loadPlayersFromLocalStorage();
  if (prevPlayers && prevPlayers.length === 2) {
    // If names exist, show a greeting and continue to game quickly
    state.players = prevPlayers;
    nameFeedback.textContent = `Yaxshi tanishganimdan xursandman, ${state.players[0]} va ${state.players[1]}!`;
    // Move to game after brief delay so user sees saved names
    setTimeout(() => {
      showGameForPlayer(0);
    }, 800);
  } else {
    // Clear any prior state and ask for first name
    state.players = [];
    nameInput.value = "";
    nameLabel.textContent = "Birinchi o’yinchi ismi nima?";
    nameFeedback.textContent = "";
    MainButton.setText("Keyingi"); // Next for entering names
    MainButton.show();
    showScreen('setup');
    nameInput.focus();
  }
}

function handleNameSubmit() {
  const name = (nameInput.value || "").trim();
  if (!name) {
    nameFeedback.textContent = "Iltimos, ism kiriting (masalan: Dilshod).";
    nameInput.focus();
    return;
  }
  // Save name and show friendly greeting
  state.players.push(name);
  savePlayersToLocalStorage(state.players);
  nameFeedback.textContent = `Yaxshi tanishganimdan xursandman, ${name}!`;

  // If first player saved, ask second player's name
  if (state.players.length === 1) {
    nameInput.value = "";
    nameLabel.textContent = "Ikkinchi o’yinchi ismi nima?";
    nameInput.focus();
    return;
  }

  // Both names provided -> proceed to game
  if (state.players.length >= 2) {
    // Reset game indices and show first player's turn
    state.currentPlayerIdx = 0;
    state.questionIdx = 0;
    state.responses = [ [], [] ];
    state.skipped = [false, false];
    MainButton.setText("Yuborish"); // change MainButton to 'Submit' for game
    MainButton.show();
    showGameForPlayer(0);
  }
}

/* ======= Gameplay logic ======= */

function showGameForPlayer(playerIdx) {
  // Set UI for given player and current question
  showScreen('game');
  updateQuestionUI(playerIdx, state.questionIdx);

  // Show Skip (Back) button only if skip not yet used for this player
  if (!state.skipped[playerIdx]) {
    BackButton.show();
  } else {
    BackButton.hide();
  }

  // Ensure Telegram main button is visible with submit label
  MainButton.setText("Yuborish");
  MainButton.show();

  // Clear AI reply placeholder and answer input
  aiReplyEl.textContent = "";
  answerInput.value = "";
  answerInput.focus();
}

// Update question and progress texts
function updateQuestionUI(playerIdx, qIdx) {
  const total = state.questions.length;
  progressEl.textContent = `Savol ${qIdx + 1}/${total}`;
  const name = state.players[playerIdx] || "Do'stim";
  questionEl.textContent = `Yaxshi, ${name}, sizdan boshlaymiz! ${state.questions[qIdx]}`;
}

/* Handle answer submission */
function handleAnswerSubmit() {
  const text = (answerInput.value || "").trim();
  // For accessibility, allow empty answers but encourage content
  // Store the answer (even if empty)
  state.responses[state.currentPlayerIdx].push(text);

  // Simulate AI reply placeholder (witty comment)
  const name = state.players[state.currentPlayerIdx];
  const reply = `Oh, ${name}, bu juda qiziq!`; // Uzbek placeholder
  aiReplyEl.textContent = reply;

  // Haptic feedback (mobile) to indicate success
  try {
    tg.HapticFeedback.impactOccurred('medium');
  } catch (e) {
    // Not all clients support haptic; ignore errors
  }

  // Move to next question or switch player
  advanceTurn();
}

/* BackButton (skip) handling - one skip per player */
BackButton.onClick(() => {
  // Only allow skip if not yet used
  const p = state.currentPlayerIdx;
  if (state.skipped[p]) {
    // Do nothing; skip already used
    return;
  }
  state.skipped[p] = true; // mark skip used
  // Record a skipped answer as special marker
  state.responses[p].push("[o‘tkazildi]");

  // Show a small feedback in UI
  aiReplyEl.textContent = `Siz o‘tkazdingiz. Bu sizning bitta o‘tkazishingiz edi.`;

  // Provide haptic feedback
  try { tg.HapticFeedback.impactOccurred('medium'); } catch (e) {}

  // Advance after a short pause so user sees message
  setTimeout(() => advanceTurn(), 700);
});

/* Advance turn logic */
function advanceTurn() {
  // Increase question index for current player
  state.questionIdx += 1;

  if (state.questionIdx >= state.questions.length) {
    // Current player finished 10 questions
    if (state.currentPlayerIdx === 0) {
      // Switch to second player
      state.currentPlayerIdx = 1;
      state.questionIdx = 0;
      // Update UI for second player
      showGameForPlayer(state.currentPlayerIdx);
      return;
    } else {
      // Both players done -> finish session
      finishSession();
      return;
    }
  } else {
    // Same player, next question
    updateQuestionUI(state.currentPlayerIdx, state.questionIdx);
    answerInput.value = "";
    aiReplyEl.textContent = "";
    answerInput.focus();

    // Update skip button visibility for this player
    if (!state.skipped[state.currentPlayerIdx]) BackButton.show();
    else BackButton.hide();
  }
}

/* Finish session */
function finishSession() {
  showScreen('end');
  MainButton.setText("Qayta boshlash");
  MainButton.show();
  BackButton.hide();

  // Display both names
  endMessageNames.textContent = `${state.players[0]} va ${state.players[1]}`;

  // Optionally, here you could send collected responses to a backend or save them.
}

/* Handle restart */
function handleRestart() {
  // Confirmation popup (native)
  const confirmRestart = confirm("Rostdan ham qayta boshlamoqchimisiz? Barcha javoblar o‘chadi.");
  if (!confirmRestart) return;

  // Reset state and go back to welcome
  state.players = [];
  state.currentPlayerIdx = 0;
  state.questionIdx = 0;
  state.skipped = [false, false];
  state.responses = [ [], [] ];
  savePlayersToLocalStorage([]); // clear stored names

  // Reset UI
  MainButton.setText("Boshlash");
  showScreen('welcome');
}

/* ======= Voice placeholders ======= */

/*
  Speak button is a placeholder for integrating Whisper (speech-to-text).
  Real implementation steps (not implemented here):
  - Capture microphone using getUserMedia()
  - Send audio to Whisper API (server-side proxy is required for API keys and security)
  - Receive transcript and place into answerInput.value
  - Optionally send text to ChatGPT for witty analysis and then to TTS (OpenAI TTS)
*/
speakBtn.addEventListener('click', () => {
  // Start a simple in-browser recorder and send audio to the server
  // This implementation records audio using MediaRecorder, sends it as
  // multipart/form-data to the backend endpoint `/api/whisper`, and
  // inserts the returned transcript into the answer input.
  // NOTE: You must run the example backend (server.js) which forwards
  // audio to OpenAI Whisper. Do NOT put your OpenAI API key in client-side code.
  handleSpeakClick();
});

// Recording state
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

async function handleSpeakClick() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Mikrofonga kirish mavjud emas. Iltimos zamonaviy brauzer ishlating.');
    return;
  }

  // Toggle recording on/off
  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorder.addEventListener('dataavailable', (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      });

      mediaRecorder.addEventListener('stop', async () => {
        // Stop tracks
        stream.getTracks().forEach(t => t.stop());

        // Build a Blob from recorded chunks
        const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });

        // UI: show uploading
        setTranscriptUI('uploading');
        speakBtn.disabled = true;
        speakBtn.textContent = 'Yuklanmoqda...';

        try {
          const form = new FormData();
          // The server expects field name 'audio'
          form.append('audio', audioBlob, 'speech.webm');

          const resp = await fetch('/api/whisper', {
            method: 'POST',
            body: form
          });

          if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(txt || 'Server transcription xatosi');
          }

          const data = await resp.json();

          // The backend returns an object with the transcription text.
          // For OpenAI Whisper the shape is typically { text: '...' }
          const transcript = (data && (data.text || data.transcript)) || '';
          if (transcript) {
            // Insert transcript into the answer input so user can edit before submit
            answerInput.value = transcript;
            setTranscriptUI('ready', transcript);
            // Focus answer input so user can continue quickly
            answerInput.focus();
          } else {
            setTranscriptUI('ready', '');
          }
        } catch (err) {
          console.error('Whisper API error:', err);
          setTranscriptUI('error', 'Xato: audioni transkriptsiya qilish mumkin emas.');
        } finally {
          speakBtn.disabled = false;
          speakBtn.textContent = 'Speak (mikrofon)';
        }
      });

      mediaRecorder.start();
      isRecording = true;
      speakBtn.textContent = 'To\'xtatish';
      speakBtn.setAttribute('aria-pressed', 'true');
    } catch (err) {
      console.error('getUserMedia error', err);
      alert('Mikrofonga ruxsat berilmadi yoki xato yuz berdi.');
    }
  } else {
    // Stop recording
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    isRecording = false;
    speakBtn.textContent = 'Speak (mikrofon)';
    speakBtn.setAttribute('aria-pressed', 'false');
  }
}

/* ======= Keyboard enter to submit in text areas (accessibility) ======= */
answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    // Ctrl/Cmd+Enter to submit (avoid capturing plain Enter which inserts newline)
    e.preventDefault();
    handleAnswerSubmit();
  }
});

/* ======= Security note ======= */
/*
  IMPORTANT SECURITY NOTE:
  The Telegram Web App provides `tg.initData` and `tg.initDataUnsafe`.
  initData must be validated on your backend using the bot token and HMAC-SHA-256
  as described in Telegram docs to ensure requests are authentic.
  Do NOT trust initData on the client alone; perform server-side validation.
*/

/* ======= On load: ensure welcome screen shown ======= */
showScreen('welcome');

/* Set initial focus for accessibility after a tiny delay */
setTimeout(() => {
  document.getElementById('main').focus();
}, 300);
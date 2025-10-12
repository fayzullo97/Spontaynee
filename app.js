// All app logic for Spontaynee (Telegram Mini App)
// - Simple vanilla JS
// - Uses Telegram Web App JS API
// - Stores minimal state in localStorage to persist across reloads

// === Telegram WebApp initialization ===
const tg = window.Telegram?.WebApp || null;

if (!tg) {
  console.warn('Telegram WebApp API not found. Some features (MainButton, Haptics) will be disabled for local testing.');
}

// Helper to safely call a Telegram method if present
const safeCall = (fn) => { try { if (fn) fn(); } catch (e) { console.warn(e); } };

if (tg) {
  // Inform Telegram that the web app is ready and expand for better UX
  safeCall(() => tg.ready());
  safeCall(() => tg.expand());
}

// === Theme: copy Telegram theme params into CSS variables ===
function applyTheme() {
  if (!tg || !tg.themeParams) return;
  const p = tg.themeParams;
  const doc = document.documentElement.style;
  if (p.bg_color) doc.setProperty('--tg-theme-bg-color', p.bg_color);
  if (p.hint_color) doc.setProperty('--tg-theme-hint-color', p.hint_color);
  if (p.button_color) doc.setProperty('--tg-theme-button-color', p.button_color);
  if (p.button_text_color) doc.setProperty('--tg-theme-button-text-color', p.button_text_color);
  if (p.text_color) doc.setProperty('--tg-theme-text-color', p.text_color);
  // card background: slightly different on dark themes
  // keep simple fallback
  // adapt card background for contrast
  const darkBg = ['#000000','#000','##000000'].includes((p.bg_color || '').toLowerCase());
  doc.setProperty('--card-bg', darkBg ? '#111827' : '#FFFFFF');
  // Map theme text color to input text color, but ensure good contrast: if text_color is very light, use deep-blue fallback
  if (p.text_color){
    const tc = p.text_color.trim().toLowerCase();
    // simple contrast heuristic: if text color is white-ish, fallback to deep-blue for inputs
    if (tc === '#ffffff' || tc === 'white' || tc === '#fff'){
      doc.setProperty('--input-text-color', '#1E3A8A');
    } else {
      doc.setProperty('--input-text-color', p.text_color);
    }
  }
}
applyTheme();

// === Translations & Questions ===
// Translation object containing UI strings and two lists of 10 questions per player.
const T = {
  uz: {
    greeting: "Spontaynee ga xush kelibsiz! Keling suhbatni qizdiramiz.",
    maleLabel: "Erkak",
    femaleLabel: "Ayol",
    placeholderAnswer: "Javobingizni yozing...",
    submitBtn: "Yuborish",
    restartBtn: "Qayta boshla",
    skipUsed: "Siz allaqachon bitta savatni o'tkazib yubordingiz.",
    skipMsg: "Bu savoldan uyalmaysizmi, $NAME? Mayli, keyingi!",
    playful1: "Oah, $NAME, bu juda qizg'in!",
    playful2: "Haha, yaxshi javob!",
    summary: "Voy, $MALE va $FEMALE, siz juda ko'p narsani bo'lishdingiz! Yana o'ynaysizmi?",
    startBtn: "Boshlash",
    questions_male: [
      "Hayotingizda hech kim bilmagan bir orzuingiz nima?",
      "Sizni eng ko‘p hayajonlantiradigan xotira qaysi?",
      "Siz uchun ideal romantik kecha qanday bo‘ladi?",
      "Sizni ko‘nglini egadigan kichik ishorangiz nima?",
      "Eng quvnoq, ozgina xafsalasizlik tug‘dirgan uchrashuvingiz haqida so‘zlab bering.",
      "Sizni romantikasi bilan hayratga solgan film qaysi?",
      "Sizni jalb qiladigan eng kichik odat nima?",
      "Agar biror joyga ketib qolsa, siz nimani birinchi olib chiqasiz?",
      "Sizning yashirin romantik qobiliyatingiz nima deb o‘ylaysiz?",
      "Ranglar orasida qaysi biri sizni sevgi bilan bog‘laydi va nega?"
    ],
    questions_female: [
      "Nimani xayolingizdan o‘tkazganingizda qizarib qolishingiz mumkin?",
      "Sizni eng ko‘proq qoyil qoldirgan san’at yoki musiqa nima?",
      "Birinchi uchrashuvingizni ideal qilsak, u qanday kechardi?",
      "Kimning ko‘ziga qarab jimgina tabassum qilasiz?",
      "Sizni xayolingizdagidek o‘zgartiradigan kichik zavq nima?",
      "Hayotingizdagi eng kulgili sevgi xotirasi qaysi?",
      "Siz uchun mukammal sarguzasht nima ko‘rinishda?",
      "Qanday sirli xatti-harakat sizni xursand qiladi?",
      "Agar sirli sovg'a olsangiz, qanday bo‘lishini xohlaysiz?",
      "Sizni xayolingizdagi romantika bilan bog‘laydigan joy qayer?"
    ]
  },
  ru: {
    greeting: "Добро пожаловать в Spontaynee! Давайте разожгём интересный разговор.",
    maleLabel: "Мужчина",
    femaleLabel: "Женщина",
    placeholderAnswer: "Напишите ваш ответ...",
    submitBtn: "Отправить",
    restartBtn: "Начать заново",
    skipUsed: "Вы уже использовали один пропуск.",
    skipMsg: "Слишком стесняешься для этого, $NAME? Ладно, следующий!",
    playful1: "Ох, $NAME, это пикантно!",
    playful2: "Ха-ха, отличный ответ!",
    summary: "Вау, $MALE и $FEMALE, вы столько поделились! Сыграть ещё?",
    startBtn: "Начать",
    questions_male: [
      "Какая мечта у вас есть, о которой никто не знает?",
      "Какое воспоминание заставляет вас особенно трепетать?",
      "Какой идеальный романтический вечер для вас?",
      "Какой маленький жест заставит ваше сердце биться чаще?",
      "Расскажите о самом смешном, слегка неловком свидании.",
      "Какой фильм заставил вас влюбиться в романтику?",
      "Какая мелочь в человеке моментально привлекает вас?",
      "Если бы нужно было уехать прямо сейчас, что бы вы взяли первым?",
      "В чем ваш тайный романтический талант?",
      "Какой цвет ассоциируется у вас с любовью и почему?"
    ],
    questions_female: [
      "Что заставляет вас слегка покраснеть?",
      "Какая музыка или искусство вас особенно трогает?",
      "Как бы выглядело ваше идеальное первое свидание?",
      "На чей взгляд вы невольно улыбнетесь?",
      "Какая небольшая слабость делает вас счастливой?",
      "Какое самое смешное воспоминание о любви у вас есть?",
      "Какое приключение было бы для вас идеальным?",
      "Какой загадочный поступок заставляет вас улыбаться?",
      "Если получить загадочный подарок, каким бы вы его хотели?",
      "Какое место ассоциируется у вас с романтикой?"
    ]
  }
};

// === DOM Elements ===
const startScreen = document.getElementById('start-screen');
const questionScreen = document.getElementById('question-screen');
const summaryScreen = document.getElementById('summary-screen');

const langSelect = document.getElementById('lang-select');
const greetingEl = document.getElementById('greeting');
const maleNameInput = document.getElementById('male-name');
const femaleNameInput = document.getElementById('female-name');
const startBtn = document.getElementById('start-btn');

const whoLabel = document.getElementById('current-player');
const questionText = document.getElementById('question-text');
const answerInput = document.getElementById('answer-input');
const reactionEl = document.getElementById('reaction');
const progressText = document.getElementById('progress-text');
const progressFill = document.getElementById('progress-fill');

const skipBtn = document.getElementById('skip-btn');
const summaryText = document.getElementById('summary-text');
const restartBtn = document.getElementById('restart-btn');

const confirmModal = document.getElementById('confirm-modal');
const confirmYes = document.getElementById('confirm-yes');
const confirmNo = document.getElementById('confirm-no');

const reconnectOverlay = document.getElementById('reconnect');
const reconnectRetry = document.getElementById('reconnect-retry');

// === State keys in localStorage ===
const LS = {
  lang: 'sp_lang',
  maleName: 'sp_male',
  femaleName: 'sp_female',
  idx: 'sp_index',
  maleSkips: 'sp_mskips',
  femaleSkips: 'sp_fskips',
  answers: 'sp_answers' // optional store of answers
};

// === Utility state helpers ===
function getLang(){ return localStorage.getItem(LS.lang) || langSelect.value || 'uz'; }
function setLang(v){ localStorage.setItem(LS.lang, v); }
function getMaleName(){ return localStorage.getItem(LS.maleName) || ''; }
function getFemaleName(){ return localStorage.getItem(LS.femaleName) || ''; }
function setNames(m, f){
  localStorage.setItem(LS.maleName, m || '');
  localStorage.setItem(LS.femaleName, f || '');
}
function getIndex(){ return parseInt(localStorage.getItem(LS.idx) || '0', 10); }
function setIndex(i){ localStorage.setItem(LS.idx, String(i)); }
function getSkips(type){ return parseInt(localStorage.getItem(type === 'male' ? LS.maleSkips : LS.femaleSkips) || '0', 10); }
function incrementSkips(type){ const key = type === 'male' ? LS.maleSkips : LS.femaleSkips; localStorage.setItem(key, String(getSkips(type) + 1)); }
function resetSession(){
  localStorage.removeItem(LS.idx);
  localStorage.removeItem(LS.maleSkips);
  localStorage.removeItem(LS.femaleSkips);
  localStorage.removeItem(LS.answers);
  // keep language & names so user doesn't retype
}

// initialize UI from stored values
function initUIFromStorage(){
  const lang = getLang();
  langSelect.value = lang;
  const m = getMaleName();
  const f = getFemaleName();
  if (m) maleNameInput.value = m;
  if (f) femaleNameInput.value = f;
  // set greeting text from translations
  greetingEl.textContent = T[lang].greeting;
  startBtn.textContent = T[lang].startBtn || 'Start';
  skipBtn.textContent = lang === 'ru' ? 'Пропустить' : 'O`tkazib yuborish';
  restartBtn.textContent = T[lang].restartBtn;

  // initial MainButton state: disabled until both names are present
  updateMainButtonState();
}
initUIFromStorage();

// update MainButton enabled state when inputs change
function updateMainButtonState(){
  const lang = getLang();
  const m = maleNameInput.value.trim();
  const f = femaleNameInput.value.trim();
  const enabled = m.length > 0 && f.length > 0;
  safeCall(() => {
    if (!tg) return;
    if (enabled){
      tg.MainButton.setText(T[lang].startBtn || 'Start');
      tg.MainButton.show();
      tg.MainButton.enable();
    } else {
      tg.MainButton.hide();
      try { tg.MainButton.disable(); } catch(e) {}
    }
  });

  // Fallback: on-page start button for non-Telegram environments or when MainButton is hidden.
  // Ensure it's visible and enabled when both names are present.
  if (!tg){
    startBtn.style.display = enabled ? 'inline-block' : 'none';
    startBtn.disabled = !enabled;
  } else {
    // When tg exists but MainButton may be hidden (e.g., theme reasons), keep on-page Start as lower-priority fallback
    startBtn.style.display = 'none';
  }
}

// wire input events to update MainButton
langSelect.addEventListener('change', () => { setLang(langSelect.value); initUIFromStorage(); updateMainButtonState(); });
maleNameInput.addEventListener('input', updateMainButtonState);
femaleNameInput.addEventListener('input', updateMainButtonState);

// === Main flow logic ===

// Build the unified 20-question sequence using alternation
function getQuestionForIndex(i){
  const lang = getLang();
  const mList = T[lang].questions_male;
  const fList = T[lang].questions_female;
  // even index -> male, odd -> female
  if (i % 2 === 0){
    const qIdx = Math.floor(i/2);
    return { player: 'male', text: mList[qIdx] || '' };
  } else {
    const qIdx = Math.floor(i/2);
    return { player: 'female', text: fList[qIdx] || '' };
  }
}

// Show start screen or resume to question screen if mid-session
function startApp(){
  const idx = getIndex();
  if (isNaN(idx) || idx < 0) setIndex(0);
  if (idx >= 20){
    // session finished previously, show summary
    showSummary();
  } else {
    showQuestion();
  }
}

// Show a question based on current index
function showQuestion(){
  const idx = getIndex();
  if (idx >= 20){
    return showSummary();
  }

  const { player, text } = getQuestionForIndex(idx);
  const lang = getLang();

  // Show appropriate screen
  startScreen.classList.add('hidden');
  summaryScreen.classList.add('hidden');
  questionScreen.classList.remove('hidden');

  // Fill UI
  const name = (player === 'male' ? getMaleName() : getFemaleName()) || (player === 'male' ? T[lang].maleLabel : T[lang].femaleLabel);
  whoLabel.textContent = `${name}'s turn`;
  questionText.textContent = text;
  answerInput.value = '';
  answerInput.placeholder = T[lang].placeholderAnswer;
  reactionEl.textContent = '';

  // progress
  progressText.textContent = `Question ${idx+1}/20`;
  const pct = Math.round(((idx)/20)*100);
  progressFill.style.width = `${pct}%`;

  // Setup skip button visible
  safeCall(() => {
    if (tg) tg.BackButton.show();
  });
  // Local skip btn for browsers (in addition to using tg.BackButton)
  skipBtn.disabled = false;

  // Configure Telegram MainButton as Submit
  safeCall(() => {
    if (!tg) return;
    tg.MainButton.setText(T[lang].submitBtn);
    tg.MainButton.show();
    try { tg.MainButton.enable(); } catch(e) {}
    // Remove previous click handlers by reassigning; in some environments onClick stacks, so
    // we try to set a single handler variable:
    if (window._sp_main_click) {
      try { tg.MainButton.offClick(window._sp_main_click); } catch(e) { /* graceful */ }
    }
    window._sp_main_click = onSubmit;
    tg.MainButton.onClick(window._sp_main_click);
  });

  // For non-Telegram browser testing, also enable the on-page start/submit button as fallback
  if (!tg) {
    startBtn.style.display = 'inline-block';
    startBtn.disabled = false;
  } else {
    startBtn.style.display = 'none';
  }
}

// Called when user submits an answer
function onSubmit(){
  const idx = getIndex();
  if (idx >= 20) return showSummary();

  const { player } = getQuestionForIndex(idx);
  const lang = getLang();
  const name = (player === 'male' ? getMaleName() : getFemaleName()) || (player === 'male' ? T[lang].maleLabel : T[lang].femaleLabel);
  const answer = answerInput.value.trim();

  // Store answer in localStorage (optional)
  const store = JSON.parse(localStorage.getItem(LS.answers) || '[]');
  store.push({ idx, player, name, answer, q: questionText.textContent, ts: Date.now() });
  localStorage.setItem(LS.answers, JSON.stringify(store));

  // Provide playful response
  reactionEl.textContent = (Math.random() > 0.5) ? T[lang].playful1.replace('$NAME', name) : T[lang].playful2;
  // Haptic feedback (if available)
  safeCall(() => { if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium'); });

  // Move to next question after a short delay so user reads the playful response
  setTimeout(() => {
    setIndex(idx + 1);
    if (getIndex() >= 20) showSummary();
    else showQuestion();
  }, 900);
}

// Skip handling
function onSkip(){
  const idx = getIndex();
  if (idx >= 20) return showSummary();

  const { player } = getQuestionForIndex(idx);
  const lang = getLang();
  const name = (player === 'male' ? getMaleName() : getFemaleName()) || (player === 'male' ? T[lang].maleLabel : T[lang].femaleLabel);

  if (getSkips(player) >= 1){
    reactionEl.textContent = T[lang].skipUsed;
    return;
  }

  // Register skip and show lighthearted skip message
  incrementSkips(player);
  reactionEl.textContent = T[lang].skipMsg.replace('$NAME', name);
  safeCall(() => { if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium'); });

  // Advance after a short delay
  setTimeout(() => {
    setIndex(idx + 1);
    if (getIndex() >= 20) showSummary();
    else showQuestion();
  }, 700);
}

// Show final summary and restart option
function showSummary(){
  const lang = getLang();
  const m = getMaleName() || T[lang].maleLabel;
  const f = getFemaleName() || T[lang].femaleLabel;

  startScreen.classList.add('hidden');
  questionScreen.classList.add('hidden');
  summaryScreen.classList.remove('hidden');

  summaryText.textContent = T[lang].summary.replace('$MALE', m).replace('$FEMALE', f);

  // Configure Telegram MainButton to be Restart
  safeCall(() => {
    if (!tg) return;
    tg.MainButton.setText(T[lang].restartBtn);
    // remove previous handler
    if (window._sp_main_click) {
      try { tg.MainButton.offClick(window._sp_main_click); } catch(e) {}
    }
    window._sp_main_click = onRestart;
    tg.MainButton.onClick(window._sp_main_click);
  });

  // Also show BackButton hidden in summary
  safeCall(() => { if (tg) tg.BackButton.hide(); });
}

// Restart app by clearing session-specific keys
function onRestart(){
  // confirm with modal
  confirmModal.classList.remove('hidden');
}

confirmNo.addEventListener('click', () => { confirmModal.classList.add('hidden'); });
confirmYes.addEventListener('click', () => {
  confirmModal.classList.add('hidden');
  resetSession();
  setIndex(0);
  initUIFromStorage();
  // show start screen
  startScreen.classList.remove('hidden');
  questionScreen.classList.add('hidden');
  summaryScreen.classList.add('hidden');
  // Hide Telegram main button until we start again
  safeCall(() => { if (tg) tg.MainButton.hide(); });
});

// === Event bindings ===
startBtn.addEventListener('click', () => {
  // Save language and names
  const lang = langSelect.value;
  setLang(lang);
  const m = maleNameInput.value.trim();
  const f = femaleNameInput.value.trim();
  setNames(m, f);

  // initialize skip counters and index if not present
  if (!localStorage.getItem(LS.idx)) setIndex(0);
  if (!localStorage.getItem(LS.maleSkips)) localStorage.setItem(LS.maleSkips, '0');
  if (!localStorage.getItem(LS.femaleSkips)) localStorage.setItem(LS.femaleSkips, '0');

  // Start the Q&A flow
  // Hide start screen and begin
  safeCall(() => { if (tg) tg.MainButton.hide(); });
  // Ensure on-page button is disabled to avoid double starts
  startBtn.disabled = true;
  startApp();
});

restartBtn.addEventListener('click', onRestart);

// Skip click (on-page fallback)
skipBtn.addEventListener('click', onSkip);

// Telegram BackButton also used for skip
if (tg && tg.BackButton){
  try {
    // remove previous handler if present
    if (window._sp_back_click) tg.BackButton.offClick(window._sp_back_click);
  } catch (e) {}
  window._sp_back_click = onSkip;
  safeCall(() => { if (tg) tg.BackButton.onClick(window._sp_back_click); });
}

// For safety: expose some functions for debugging in browser console
window._sp = {
  getIndex,
  setIndex,
  getSkips,
  resetSession
};

/*
  SECURITY NOTE:
  The Telegram Web App provides an `initData` string (tg.initData) to identify the user and the context.
  This data MUST be validated on your backend using HMAC-SHA-256 with your bot token (or bot's secret)
  before trusting user identity or performing sensitive actions. Do NOT rely solely on client-side
  checks; validate initData on server-side as documented in:
  https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
*/

// Start: if there is an ongoing session, jump in
(function autoStartIfNeeded(){
  const idx = getIndex();
  if (idx && idx > 0 && idx < 20){
    // restore UI language values
    initUIFromStorage();
    startApp();
  } else {
    // ensure MainButton hidden until we need it (clean UX)
    safeCall(() => { if (tg) tg.MainButton.hide(); });
  }
})();
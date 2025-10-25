// ...existing code...
/*
  app.js
  - Initializes Telegram WebApp SDK
  - Sets up MainButton (Start) and BackButton (Back)
  - Displays a swipeable card with a random question from a hardcoded list of 100 questions
  - Handles touch and mouse gestures for swipe-left / swipe-right to get a new random question
*/

/* ========== Telegram initialization ========== */
const tg = window.Telegram.WebApp; // Telegram WebApp SDK object

// Make the webapp ready and expand available area in chat (best for full-screen)
tg.ready();
tg.expand(); // ask Telegram to expand the WebApp view for more vertical space

// Apply Telegram theme parameters (if provided) to CSS variables for consistent look
if (tg.themeParams) {
  const root = document.documentElement;
  // Map a few theme params into our CSS variables (safe defaults already in CSS)
  if (tg.themeParams.bg_color) root.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color);
  if (tg.themeParams.text_color) root.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color);
  // You can map more themeParams if needed
}

/* ========== UI elements ========== */
const mainButton = tg.MainButton; // Telegram MainButton for "Start"
const backButton = tg.BackButton; // Telegram BackButton for in-app "Back"

const questionCard = document.getElementById('question-card');
const questionText = document.getElementById('question-text');
const notesField = document.getElementById('notes');
const localBackButton = document.getElementById('back-button'); // in-page button as fallback

// Show the Telegram MainButton labeled "Start"
mainButton.setText('Start');
mainButton.show();

// When main button is clicked, start the app
mainButton.onClick(() => {
  startApp();
});

/* Back button behavior:
   - Telegram BackButton will close the Web App or go back depending on host (we just show it)
   - Also wire the in-page Back button as a fallback for environments without Telegram SDK
*/
try { backButton.show(); } catch (e) { /* ignore if not supported */ }

// In-page Back button (fallback)
localBackButton.addEventListener('click', () => {
  // If Telegram supports close, use it
  if (tg.close) tg.close();
  else alert('Back: close the app or navigate back in Telegram.');
});

/* ========== Questions data (100 hardcoded questions) ========== */
/* These are playful, flirty, and thought-provoking prompts for couples. */
const QUESTIONS = [
  "What’s the first thing you noticed about me?",
  "What’s your favorite way to spend a lazy Sunday together?",
  "If we met again, how would you flirt with me?",
  "What’s one small thing I do that makes you smile?",
  "What memory of us makes you laugh out loud?",
  "What’s a secret hobby you’d like us to try together?",
  "Describe our perfect cozy night in.",
  "What’s the nicest compliment you’ve ever received from me?",
  "What’s one dream you hope we share in the future?",
  "If our relationship had a theme song, what would it be?",
  "What’s a question you’ve always wanted to ask me but never did?",
  "What’s a smell that reminds you of me?",
  "What’s one adventurous date you’d like to go on?",
  "What do you think my superpower is in our relationship?",
  "If we could teleport for a weekend, where would we go?",
  "What’s one habit I have that you secretly adore?",
  "When do you feel the most connected to me?",
  "What’s a silly nickname you think I should have?",
  "What’s the most romantic thing you imagine us doing someday?",
  "If you had to cook one meal for me forever, what would it be?",
  "What’s a movie that reminds you of us?",
  "What’s a playful dare you'd give me right now?",
  "What’s the kindest thing someone has done for you that you want me to know about?",
  "What small ritual would you like us to start together?",
  "Which of my quirks makes you smile the most?",
  "What’s a fantasy vacation just for us?",
  "If you drew our relationship as a picture, what colors would you choose?",
  "What’s an embarrassing moment we can laugh about together?",
  "When do you feel most proud of us?",
  "What’s one thing you want to learn from me?",
  "What was your first impression of my sense of humor?",
  "What is one word that sums up us?",
  "If you could give our future self one piece of advice, what would it be?",
  "What little detail about me do you wish you had noticed earlier?",
  "What’s one question that would surprise me if you asked it?",
  "What scent or place instantly brings back thoughts of us?",
  "What’s a tradition you’d like to create together?",
  "What everyday thing with me feels like an adventure?",
  "Which trait of mine do you find most comforting?",
  "What hobby would you want us to master together?",
  "What’s a romantic gesture that doesn’t involve money?",
  "If we starred in a book, what would the title be?",
  "What’s something brave you’d love to try together?",
  "What’s a childhood memory you’d like to share with me?",
  "What’s one thing you’d keep private between just us?",
  "What’s the sweetest thing I’ve ever done for you?",
  "What would you whisper to me on a quiet morning?",
  "What's a question you'd like to answer honestly right now?",
  "How do you want to feel when you think about us in 10 years?",
  "What’s one little surprise I could do that would make your day?",
  "If we could learn one language together, which would it be and why?",
  "What’s a hobby you think would bring us closer?",
  "What’s the funniest thing we’ve done together?",
  "What’s one challenge you want to face together?",
  "What’s a scent you’d like to recreate for a special night?",
  "What’s a small daily habit that would strengthen us?",
  "What’s a secret talent you haven’t told me about?",
  "What’s one place that feels like ‘our spot’?",
  "What do you think our grand adventure would look like?",
  "What’s the most thoughtful gift I could give you?",
  "If we re-created our first date, what would we change?",
  "What’s something you admire about how I handle problems?",
  "What question would make you blush if I asked it?",
  "What childhood dream would you like us to explore together?",
  "What’s a playful rule we could invent for our relationship?",
  "What’s the kindest thing you’d like me to do without asking?",
  "What’s one truth about us that makes you smile?",
  "What’s the most romantic sunset scenario you imagine for us?",
  "What habit of mine makes life easier for you?",
  "If we could time-travel together, what era would we visit and why?",
  "What style of date makes you feel most loved?",
  "What’s a compliment you want to hear more from me?",
  "What is a fear you’d like us to face together?",
  "What is a secret you trust me with?",
  "What is one silly debate we should have just for fun?",
  "What’s the best way I can support your day-to-day life?",
  "What imaginary pet would we have and what would we name it?",
  "What’s the one question that always sparks great conversation between us?",
  "What gift could I give that would be meaningful because of the memory behind it?",
  "What’s a quiet activity you enjoy most with me?",
  "If we built a tiny house, what would be the most important feature?",
  "What's the funniest way to cheer you up after a long day?",
  "If we made a pact for a year, what playful rule would you choose?",
  "What’s a story about you that I should know by heart?",
  "What’s one way we can celebrate small wins together?",
  "If we created a secret handshake, what move would you add?",
  "What’s a question about love you think we should explore together?",
  "What’s the most romantic rainy-day plan you can imagine for us?"
];

/* ========== Utility: get random question but avoid immediate repeats ========== */
let previousIndex = -1;
function getRandomQuestion() {
  if (QUESTIONS.length === 0) return "No questions available.";
  let idx;
  do {
    idx = Math.floor(Math.random() * QUESTIONS.length);
  } while (QUESTIONS.length > 1 && idx === previousIndex);
  previousIndex = idx;
  return QUESTIONS[idx];
}

/* ========== App state and gesture handling ========== */
let isStarted = false;
let startX = 0;
let currentX = 0;
let isDragging = false;

// Threshold in px to trigger a swipe (mobile-friendly)
const SWIPE_THRESHOLD = 80;

// Start the app: hide MainButton, show first question, set focus
function startApp() {
  isStarted = true;
  try { mainButton.hide(); } catch (e) { /* ignore if not supported */ }

  // Show the first random question, with small enter animation
  displayNewQuestion(getRandomQuestion(), {enter: true});

  // Ensure the card can be focused for accessibility
  questionCard.focus();
}

/* Display question and manage enter animation */
function displayNewQuestion(text, opts = {}) {
  // Remove transitional classes
  questionCard.classList.remove('out-left', 'out-right', 'enter', 'enter-active');
  // Temporarily set opacity to 0 for enter animation if needed
  if (opts.enter) {
    questionCard.classList.add('enter');
    // allow styles to apply before activating transition
    requestAnimationFrame(() => {
      questionText.textContent = text;
      questionCard.classList.add('enter-active');
    });
    // remove enter classes after animation
    setTimeout(() => {
      questionCard.classList.remove('enter', 'enter-active');
    }, 300);
  } else {
    // Normal replace
    questionText.textContent = text;
  }
}

/* Animate card out (direction: 'left' or 'right') and then show new question */
function swipeToNext(direction) {
  // Add out class to animate away
  if (direction === 'left') questionCard.classList.add('out-left');
  else questionCard.classList.add('out-right');

  // After animation completes, reset transform and show new question
  setTimeout(() => {
    // Reset transform (so new card appears centered)
    questionCard.style.transform = '';
    questionCard.classList.remove('out-left', 'out-right');

    // Show next random question
    displayNewQuestion(getRandomQuestion(), {enter: true});
    // restore focus
    questionCard.focus();
  }, 320);
}

/* ========== Touch and Mouse event handlers for swipe ========== */
function onPointerDown(clientX) {
  isDragging = true;
  startX = clientX;
  currentX = 0;
  // Stop any ongoing transitions
  questionCard.style.transition = 'none';
}

function onPointerMove(clientX) {
  if (!isDragging) return;
  currentX = clientX - startX;
  // Slight rotation based on movement for a playful effect
  const rotate = Math.max(-15, Math.min(15, (currentX / 20)));
  questionCard.style.transform = `translateX(${currentX}px) rotate(${rotate}deg)`;
}

function onPointerUp() {
  if (!isDragging) return;
  isDragging = false;
  // restore smooth transition
  questionCard.style.transition = '';
  if (Math.abs(currentX) > SWIPE_THRESHOLD) {
    // Determine direction and animate out
    const dir = currentX < 0 ? 'left' : 'right';
    swipeToNext(dir);
  } else {
    // Not far enough: spring back to center
    questionCard.style.transform = '';
  }
  startX = 0;
  currentX = 0;
}

/* Touch events (mobile) */
questionCard.addEventListener('touchstart', (e) => {
  if (!isStarted) return;
  if (e.touches.length === 1) onPointerDown(e.touches[0].clientX);
});
questionCard.addEventListener('touchmove', (e) => {
  if (!isStarted) return;
  if (e.touches.length === 1) {
    onPointerMove(e.touches[0].clientX);
    e.preventDefault(); // prevent scrolling while swiping
  }
}, { passive: false });
questionCard.addEventListener('touchend', () => {
  if (!isStarted) return;
  onPointerUp();
});

/* Mouse events for desktop users */
questionCard.addEventListener('mousedown', (e) => {
  if (!isStarted) return;
  onPointerDown(e.clientX);
});
window.addEventListener('mousemove', (e) => {
  if (!isStarted) return;
  onPointerMove(e.clientX);
});
window.addEventListener('mouseup', () => {
  if (!isStarted) return;
  onPointerUp();
});

/* Keyboard support: Left/Right arrows or Enter for accessibility */
questionCard.addEventListener('keydown', (e) => {
  if (!isStarted) {
    // If not started, pressing Enter starts the app
    if (e.key === 'Enter' || e.key === ' ') startApp();
    return;
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    swipeToNext(e.key === 'ArrowLeft' ? 'left' : 'right');
  }
});

/* Quick tap to show a new question (optional behavior) */
questionCard.addEventListener('click', () => {
  if (!isStarted) return;
  // Quick tap shows next question (non-committal)
  displayNewQuestion(getRandomQuestion(), {enter: true});
});

/* ========== Start prompt for users who haven't pressed MainButton (safety) ========== */
// If app isn't started after 5 seconds, show a subtle hint in the card
setTimeout(() => {
  if (!isStarted) questionText.textContent = "Tap 'Start' (or press Enter) to begin Randomee.";
}, 5000);

/* ========== Security Note ==========
  The Telegram WebApp may provide initData (tg.initData) for identifying the user.
  IMPORTANT: initData must be validated on your server using HMAC-SHA-256 according to
  Telegram docs. Do NOT trust initData on the client for authentication or sensitive logic.
  Validate it on the backend with your bot token as described in:
  https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
*/

/* ========== Optional: Use tg.initData if available (read-only on client) ========== */
if (tg.initData) {
  // We simply log it for debugging — don't rely on it for secure decisions on client-side
  console.log('Telegram initData (client-side):', tg.initData);
}

/* End of app.js */
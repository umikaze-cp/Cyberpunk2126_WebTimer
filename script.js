let remaining = 10 * 60;
let initialRemaining = remaining;

const messages = [
  { lang: "ja", text: "お前は絶対戻ってくるって信じてた！" },
  { lang: "en", text: "I knew you'd come back" }
];

const APP_STATE = {
  IDLE: "idle",
  LAUNCHING: "launching",
  RUNNING: "running",
  PAUSED: "paused",
  FINISHED: "finished"
};

const clockEl = document.getElementById("clock");
const startOverlay = document.getElementById("startOverlay");
const panelEl = document.getElementById("panel");
const launchFlash = document.getElementById("launchFlash");

const timeDisplay = document.getElementById("timeDisplay");
const msgJa = document.getElementById("msgJa");
const msgEn = document.getElementById("msgEn");

const minInput = document.getElementById("minInput");
const secInput = document.getElementById("secInput");
const startBtn = document.getElementById("startBtn");

const bgmSwitch = document.getElementById("bgmSwitch");
const seSwitch = document.getElementById("seSwitch");
const bgmToggleInput = document.getElementById("bgmToggleInput");
const seToggleInput = document.getElementById("seToggleInput");

const pauseToggleBtn = document.getElementById("pauseToggleBtn");
const resetBtn = document.getElementById("resetBtn");
const runtimeDock = document.getElementById("runtimeDock");

const soundA = document.getElementById("soundA");
const soundB = document.getElementById("soundB");
const soundC = document.getElementById("soundC");

let bgmEnabled = true;
let seEnabled = true;

let countdownTimerId = null;
let messageTimerId = null;

let messageIndex = 0;
let engineLoopsLeft = 2;
let cycleMode = false;
let appState = APP_STATE.IDLE;

let pausedAudioSnapshot = [];
let pausedFinishSequenceActive = false;

function showTime(mmss) {
  clockEl.classList.remove("message-mode");

  timeDisplay.style.display = "inline";
  msgJa.style.display = "none";
  msgEn.style.display = "none";
  timeDisplay.textContent = mmss;
}

function showMessage(lang, text) {
  clockEl.classList.add("message-mode");

  timeDisplay.style.display = "none";
  msgJa.style.display = "none";
  msgEn.style.display = "none";

  if (lang === "ja") {
    msgJa.textContent = text;
    msgJa.style.display = "inline";
  } else {
    msgEn.textContent = text;
    msgEn.style.display = "inline";
  }

  clockEl.classList.remove("fade-message");
  void clockEl.offsetWidth;
  clockEl.classList.add("fade-message");
}

function updateSwitchUI() {
  bgmToggleInput.checked = bgmEnabled;
  seToggleInput.checked = seEnabled;

  bgmSwitch.classList.toggle("is-on", bgmEnabled);
  seSwitch.classList.toggle("is-on", seEnabled);
}

function updateRuntimeDockUI() {
  const isVisible = appState !== APP_STATE.IDLE && appState !== APP_STATE.LAUNCHING;
  runtimeDock.classList.toggle("hidden", !isVisible);

  const isPaused = appState === APP_STATE.PAUSED;
  pauseToggleBtn.textContent = isPaused ? "▶" : "❚❚";
  pauseToggleBtn.classList.toggle("is-paused", isPaused);
  clockEl.classList.toggle("paused", isPaused);
}

function setAppState(nextState) {
  appState = nextState;
  updateRuntimeDockUI();
}

function clampInt(v, min, max) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function formatTime(m, s) {
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${mm}:${ss}`;
}

function syncInputsFromRemaining() {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  minInput.value = String(m);
  secInput.value = String(s).padStart(2, "0");
}

function setRemainingFromInputs({ normalizeUI = true } = {}) {
  const m = clampInt(minInput.value || "0", 0, 99);
  const s = clampInt(secInput.value || "0", 0, 59);

  if (normalizeUI) {
    minInput.value = String(m);
    secInput.value = String(s).padStart(2, "0");
  }

  remaining = m * 60 + s;
  initialRemaining = remaining;
  showTime(formatTime(m, s));
}

function onTimeInput() {
  if (appState !== APP_STATE.IDLE) return;

  const m = clampInt(minInput.value || "0", 0, 99);
  const s = clampInt(secInput.value || "0", 0, 59);

  remaining = m * 60 + s;
  initialRemaining = remaining;
  showTime(formatTime(m, s));
}

function onTimeChange() {
  if (appState !== APP_STATE.IDLE) return;
  setRemainingFromInputs({ normalizeUI: true });
}

function clearClockMessageClasses() {
  clockEl.classList.remove("fade-message", "message-mode");
}

function resetMessageState() {
  clearClockMessageClasses();
  timeDisplay.style.display = "inline";
  msgJa.style.display = "none";
  msgEn.style.display = "none";
  messageIndex = 0;
}

function resetFinishSoundState() {
  engineLoopsLeft = 2;
  cycleMode = false;
  pausedFinishSequenceActive = false;
}

function stopAllSounds({ resetTime = true } = {}) {
  [soundA, soundB, soundC].forEach(audio => {
    audio.pause();
    if (resetTime) audio.currentTime = 0;
  });
}

function stopTimers() {
  if (countdownTimerId) clearInterval(countdownTimerId);
  if (messageTimerId) clearInterval(messageTimerId);
  countdownTimerId = null;
  messageTimerId = null;
}

function startMessageSequence() {
  function tickMessage() {
    const m = messages[messageIndex];
    messageIndex = (messageIndex + 1) % messages.length;
    showMessage(m.lang, m.text);
  }

  tickMessage();
  messageTimerId = setInterval(tickMessage, 3000);
}

function startFinishSoundSequence() {
  if (!seEnabled) return;

  resetFinishSoundState();

  soundB.currentTime = 0;
  soundB.play().catch(() => {});
}

function capturePlayingAudio() {
  pausedAudioSnapshot = [soundA, soundB, soundC].map(audio => ({
    audio,
    wasPlaying: !audio.paused && !audio.ended,
    currentTime: audio.currentTime
  }));
}

function resumeCapturedAudio() {
  pausedAudioSnapshot.forEach(({ audio, wasPlaying, currentTime }) => {
    if (!wasPlaying) return;
    audio.currentTime = currentTime;
    audio.play().catch(() => {});
  });
  pausedAudioSnapshot = [];
}

function updateCountdown() {
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");
  showTime(`${minutes}:${seconds}`);

  if (remaining > 0) {
    remaining--;
    return;
  }

  clearInterval(countdownTimerId);
  countdownTimerId = null;
  setAppState(APP_STATE.FINISHED);

  if (bgmEnabled) soundA.volume = 0.25;

  startMessageSequence();
  startFinishSoundSequence();
}

function startCountdownInterval() {
  if (countdownTimerId) clearInterval(countdownTimerId);
  countdownTimerId = setInterval(updateCountdown, 1000);
  updateCountdown();
}

function startAll() {
  resetMessageState();
  resetFinishSoundState();

  if (bgmEnabled) {
    soundA.volume = 0.6;
    soundA.play().catch(() => {});
  }

  setAppState(APP_STATE.RUNNING);
  startCountdownInterval();
}

function beginOverlayReset() {
  startOverlay.classList.remove("launch-sequence");
  startOverlay.style.display = "flex";
  startOverlay.style.opacity = "1";
  startOverlay.style.visibility = "visible";

  panelEl.classList.remove("launch-pulse");
  launchFlash.classList.remove("active");
  startBtn.classList.remove("engaged");

  clockEl.classList.add("prelaunch-hidden");
  clockEl.classList.remove("launching-in");
}

function hardReset() {
  stopTimers();
  stopAllSounds({ resetTime: true });
  resetMessageState();
  resetFinishSoundState();
  pausedAudioSnapshot = [];

  remaining = initialRemaining;
  syncInputsFromRemaining();
  showTime(formatTime(Math.floor(remaining / 60), remaining % 60));

  beginOverlayReset();
  setAppState(APP_STATE.IDLE);
}

function pauseAllSystems() {
  if (appState !== APP_STATE.RUNNING && appState !== APP_STATE.FINISHED) return;

  capturePlayingAudio();
  pausedFinishSequenceActive = appState === APP_STATE.FINISHED;

  stopTimers();
  stopAllSounds({ resetTime: false });
  setAppState(APP_STATE.PAUSED);
}

function resumeAllSystems() {
  if (appState !== APP_STATE.PAUSED) return;

  if (pausedFinishSequenceActive) {
    setAppState(APP_STATE.FINISHED);
    startMessageSequence();
    resumeCapturedAudio();
  } else {
    setAppState(APP_STATE.RUNNING);
    resumeCapturedAudio();
    startCountdownInterval();
  }

  pausedFinishSequenceActive = false;
}

function togglePauseResume() {
  if (appState === APP_STATE.RUNNING || appState === APP_STATE.FINISHED) {
    pauseAllSystems();
  } else if (appState === APP_STATE.PAUSED) {
    resumeAllSystems();
  }
}

function runLaunchSequence() {
  setAppState(APP_STATE.LAUNCHING);

  startBtn.classList.add("engaged");
  panelEl.classList.add("launch-pulse");
  launchFlash.classList.add("active");
  startOverlay.classList.add("launch-sequence");

  setTimeout(() => {
    clockEl.classList.remove("prelaunch-hidden");
    clockEl.classList.add("launching-in");
  }, 130);

  setTimeout(() => {
    startOverlay.style.display = "none";
    clockEl.classList.remove("launching-in");
    startAll();
  }, 520);
}

function startFromPanel() {
  if (appState === APP_STATE.LAUNCHING) return;

  stopTimers();
  stopAllSounds({ resetTime: true });
  resetMessageState();
  resetFinishSoundState();
  pausedAudioSnapshot = [];

  setRemainingFromInputs({ normalizeUI: true });
  runLaunchSequence();
}

function setBgmEnabled(nextValue) {
  bgmEnabled = nextValue;

  if (!bgmEnabled) {
    soundA.pause();
    soundA.currentTime = 0;
  } else if ((appState === APP_STATE.RUNNING || appState === APP_STATE.FINISHED) && soundA.paused) {
    soundA.volume = appState === APP_STATE.FINISHED ? 0.25 : 0.6;
    soundA.play().catch(() => {});
  }

  updateSwitchUI();
}

function setSeEnabled(nextValue) {
  seEnabled = nextValue;

  if (!seEnabled) {
    soundB.pause();
    soundB.currentTime = 0;
    soundC.pause();
    soundC.currentTime = 0;
  }

  updateSwitchUI();
}

bgmToggleInput.addEventListener("change", () => {
  setBgmEnabled(bgmToggleInput.checked);
});

seToggleInput.addEventListener("change", () => {
  setSeEnabled(seToggleInput.checked);
});

minInput.addEventListener("input", onTimeInput);
secInput.addEventListener("input", onTimeInput);
minInput.addEventListener("change", onTimeChange);
secInput.addEventListener("change", onTimeChange);

[minInput, secInput].forEach(el => {
  el.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      startFromPanel();
    }
  });
});

document.addEventListener("keydown", e => {
  if (startOverlay.style.display !== "none" && e.key === "Enter") {
    startFromPanel();
  }
});

startBtn.addEventListener("click", startFromPanel);
pauseToggleBtn.addEventListener("click", togglePauseResume);
resetBtn.addEventListener("click", hardReset);

soundB.addEventListener("ended", () => {
  if (!seEnabled || appState === APP_STATE.PAUSED) return;

  if (!cycleMode) {
    engineLoopsLeft--;
    if (engineLoopsLeft > 0) {
      soundB.currentTime = 0;
      soundB.play().catch(() => {});
    } else {
      soundC.currentTime = 0;
      soundC.play().catch(() => {});
    }
  } else {
    soundC.currentTime = 0;
    soundC.play().catch(() => {});
  }
});

soundC.addEventListener("ended", () => {
  if (!seEnabled || appState === APP_STATE.PAUSED) return;

  cycleMode = true;
  soundB.currentTime = 0;
  soundB.play().catch(() => {});
});

updateSwitchUI();
setRemainingFromInputs({ normalizeUI: true });
setAppState(APP_STATE.IDLE);
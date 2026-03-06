let remaining = 10 * 60;

const messages = [
  { lang: "ja", text: "お前は絶対戻ってくるって信じてた！" },
  { lang: "en", text: "I knew you'd come back" }
];

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
let isLaunching = false;

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

function setRemainingFromInputs({ normalizeUI = true } = {}) {
  const m = clampInt(minInput.value || "0", 0, 99);
  const s = clampInt(secInput.value || "0", 0, 59);

  if (normalizeUI) {
    minInput.value = String(m);
    secInput.value = String(s).padStart(2, "0");
  }

  remaining = m * 60 + s;
  showTime(formatTime(m, s));
}

function onTimeInput() {
  const m = clampInt(minInput.value || "0", 0, 99);
  const s = clampInt(secInput.value || "0", 0, 59);

  remaining = m * 60 + s;
  showTime(formatTime(m, s));
}

function onTimeChange() {
  setRemainingFromInputs({ normalizeUI: true });
}

function stopAllSounds() {
  [soundA, soundB, soundC].forEach(a => {
    a.pause();
    a.currentTime = 0;
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

  engineLoopsLeft = 2;
  cycleMode = false;

  soundB.currentTime = 0;
  soundB.play().catch(() => {});
}

function updateCountdown() {
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");
  showTime(`${minutes}:${seconds}`);

  if (remaining > 0) {
    remaining--;
  } else {
    clearInterval(countdownTimerId);
    countdownTimerId = null;

    if (bgmEnabled) soundA.volume = 0.25;

    startMessageSequence();
    startFinishSoundSequence();
  }
}

function startAll() {
  if (bgmEnabled) {
    soundA.volume = 0.6;
    soundA.play().catch(() => {});
  }

  countdownTimerId = setInterval(updateCountdown, 1000);
  updateCountdown();
}

function runLaunchSequence() {
  isLaunching = true;
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
    isLaunching = false;
    startAll();
  }, 520);
}

function startFromPanel() {
  if (isLaunching) return;

  stopTimers();
  stopAllSounds();
  setRemainingFromInputs({ normalizeUI: true });
  runLaunchSequence();
}

function setBgmEnabled(nextValue) {
  bgmEnabled = nextValue;

  if (!bgmEnabled) {
    soundA.pause();
    soundA.currentTime = 0;
  } else {
    if (startOverlay.style.display === "none" && countdownTimerId) {
      soundA.volume = 0.6;
      soundA.play().catch(() => {});
    }
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
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      startFromPanel();
    }
  });
});

document.addEventListener("keydown", (e) => {
  if (startOverlay.style.display !== "none" && e.key === "Enter") {
    startFromPanel();
  }
});

startBtn.addEventListener("click", startFromPanel);

soundB.addEventListener("ended", () => {
  if (!seEnabled) return;

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
  if (!seEnabled) return;

  cycleMode = true;
  soundB.currentTime = 0;
  soundB.play().catch(() => {});
});

updateSwitchUI();
setRemainingFromInputs({ normalizeUI: true });
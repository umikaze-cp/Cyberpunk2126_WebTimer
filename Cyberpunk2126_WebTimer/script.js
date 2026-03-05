// ====== 設定 ======
let remaining = 10 * 60; // 初期 10分
const messages = [
  { lang: "ja", text: "お前は絶対戻ってくるって信じてた！" },
  { lang: "en", text: "I knew you'd come back" }
];

// ====== 要素 ======
const clockEl = document.getElementById("clock");
const startOverlay = document.getElementById("startOverlay");

const timeDisplay = document.getElementById("timeDisplay");
const msgJa = document.getElementById("msgJa");
const msgEn = document.getElementById("msgEn");

const minInput = document.getElementById("minInput");
const secInput = document.getElementById("secInput");
const applyBtn = document.getElementById("applyBtn");
const resetBtn = document.getElementById("resetBtn");
const startBtn = document.getElementById("startBtn");

const bgmToggleBtn = document.getElementById("bgmToggleBtn");
const seToggleBtn = document.getElementById("seToggleBtn");

const soundA = document.getElementById("soundA");
const soundB = document.getElementById("soundB");
const soundC = document.getElementById("soundC");

// ====== 表示切り替え ======
function showTime(mmss) {
  timeDisplay.style.display = "inline";
  msgJa.style.display = "none";
  msgEn.style.display = "none";
  timeDisplay.textContent = mmss;
}

function showMessage(lang, text) {
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

// ====== ON/OFF状態 ======
let bgmEnabled = true; // soundA
let seEnabled = true;  // soundB + soundC

function updateSoundButtons() {
  bgmToggleBtn.textContent = `BGM: ${bgmEnabled ? "ON" : "OFF"}`;
  seToggleBtn.textContent = `効果音: ${seEnabled ? "ON" : "OFF"}`;
}

bgmToggleBtn.addEventListener("click", () => {
  bgmEnabled = !bgmEnabled;

  if (!bgmEnabled) {
    soundA.pause();
    soundA.currentTime = 0;
  } else {
    if (startOverlay.style.display === "none" && countdownTimerId) {
      soundA.volume = 0.6;
      soundA.play().catch(() => {});
    }
  }
  updateSoundButtons();
});

seToggleBtn.addEventListener("click", () => {
  seEnabled = !seEnabled;

  if (!seEnabled) {
    soundB.pause(); soundB.currentTime = 0;
    soundC.pause(); soundC.currentTime = 0;
  }
  updateSoundButtons();
});

updateSoundButtons();

// ====== タイマー ======
let countdownTimerId = null;
let messageTimerId = null;

// ====== メッセージ ======
let messageIndex = 0;

function startMessageSequence() {
  function tickMessage() {
    const m = messages[messageIndex];
    messageIndex = (messageIndex + 1) % messages.length;
    showMessage(m.lang, m.text);
  }

  tickMessage();
  messageTimerId = setInterval(tickMessage, 3000);
}

// ====== 音のシーケンス制御 ======
let engineLoopsLeft = 2;
let cycleMode = false;

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

function setRemainingFromInputs() {
  const m = Math.max(0, Math.min(99, parseInt(minInput.value || "0", 10)));
  const s = Math.max(0, Math.min(59, parseInt(secInput.value || "0", 10)));

  minInput.value = String(m);
  secInput.value = String(s);

  remaining = m * 60 + s;

  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  showTime(`${mm}:${ss}`);
}

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

function startFinishSoundSequence() {
  if (!seEnabled) return;

  engineLoopsLeft = 2;
  cycleMode = false;

  soundB.currentTime = 0;
  soundB.play().catch(() => {});
}

// ====== カウントダウン ======
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
  startOverlay.style.display = "none";

  if (bgmEnabled) {
    soundA.volume = 0.6;
    soundA.play().catch(() => {});
  }

  countdownTimerId = setInterval(updateCountdown, 1000);
  updateCountdown();
}

// ====== パネル操作 ======
setRemainingFromInputs();

applyBtn.addEventListener("click", () => {
  setRemainingFromInputs();
});

resetBtn.addEventListener("click", () => {
  // 元コードは 1:00 に戻していたので、その挙動を維持
  minInput.value = "1";
  secInput.value = "0";
  setRemainingFromInputs();
});

[minInput, secInput].forEach(el => {
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") setRemainingFromInputs();
  });
});

startBtn.addEventListener("click", () => {
  stopTimers();
  stopAllSounds();

  setRemainingFromInputs();
  startAll();
});
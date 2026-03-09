(() => {
  "use strict";

  // =========================
  // Asset paths
  // =========================
  const ASSETS = {
    backgroundImage: "assets/images/CP_image.jpg",
    favicon: "assets/images/CP_favicon_3.png",
    bgm: "assets/sounds/BGM.mp3",
    sfxA: "assets/sounds/bike_A.mp3",
    sfxB: "assets/sounds/bike_B.mp3",
  };

  // =========================
  // Messages
  // =========================
  const messages = [
    { lang: "ja", text: "お前は絶対戻ってくるって信じてた！" },
    { lang: "en", text: "I knew you'd come back" }
  ];

  // =========================
  // DOM refs
  // =========================
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

  // =========================
  // State
  // =========================
  let remaining = 10 * 60;
  let bgmEnabled = true;
  let seEnabled = true;

  let countdownTimerId = null;
  let messageTimerId = null;

  let messageIndex = 0;
  let engineLoopsLeft = 2;
  let cycleMode = false;
  let isLaunching = false;

  // =========================
  // Utility
  // =========================
  function clampInt(value, min, max) {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function formatTime(m, s) {
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function safePlay(audioEl) {
    if (!audioEl) return;
    const playPromise = audioEl.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((error) => {
        console.warn("Audio play failed:", audioEl.id, error);
      });
    }
  }

  function stopAudio(audioEl) {
    if (!audioEl) return;
    audioEl.pause();
    audioEl.currentTime = 0;
  }

  function stopAllSounds() {
    [soundA, soundB, soundC].forEach(stopAudio);
  }

  function stopTimers() {
    if (countdownTimerId !== null) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
    }
    if (messageTimerId !== null) {
      clearInterval(messageTimerId);
      messageTimerId = null;
    }
  }

  function resetMessageState() {
    messageIndex = 0;
    msgJa.textContent = "";
    msgEn.textContent = "";
    clockEl.classList.remove("fade-message", "message-mode");
  }

  function resetFinishSoundState() {
    engineLoopsLeft = 2;
    cycleMode = false;
  }

  function isOverlayHidden() {
    return startOverlay.style.display === "none";
  }

  // =========================
  // UI
  // =========================
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

  // =========================
  // Asset check
  // =========================
  function checkBackgroundImage() {
    const img = new Image();
    img.onload = () => {
      document.body.classList.remove("image-fallback");
    };
    img.onerror = () => {
      console.warn("Background image not found:", ASSETS.backgroundImage);
      document.body.classList.add("image-fallback");
    };
    img.src = ASSETS.backgroundImage;
  }

  function bindAudioErrorLogs() {
    [soundA, soundB, soundC].forEach((audio) => {
      audio.addEventListener("error", () => {
        console.warn(`Audio load error: ${audio.id}`, audio.currentSrc || audio.src);
      });
    });
  }

  // =========================
  // Sequences
  // =========================
  function startMessageSequence() {
    function tickMessage() {
      const current = messages[messageIndex];
      messageIndex = (messageIndex + 1) % messages.length;
      showMessage(current.lang, current.text);
    }

    tickMessage();
    messageTimerId = window.setInterval(tickMessage, 3000);
  }

  function startFinishSoundSequence() {
    if (!seEnabled) return;

    resetFinishSoundState();
    soundB.currentTime = 0;
    safePlay(soundB);
  }

  function finishCountdown() {
    if (countdownTimerId !== null) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
    }

    if (bgmEnabled) {
      soundA.volume = 0.25;
    }

    startMessageSequence();
    startFinishSoundSequence();
  }

  function updateCountdown() {
    const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
    const seconds = String(remaining % 60).padStart(2, "0");
    showTime(`${minutes}:${seconds}`);

    if (remaining > 0) {
      remaining -= 1;
      return;
    }

    finishCountdown();
  }

  function startAll() {
    resetMessageState();

    if (bgmEnabled) {
      soundA.volume = 0.6;
      safePlay(soundA);
    }

    countdownTimerId = window.setInterval(updateCountdown, 1000);
    updateCountdown();
  }

  function runLaunchSequence() {
    isLaunching = true;
    startBtn.classList.add("engaged");
    panelEl.classList.add("launch-pulse");
    launchFlash.classList.add("active");
    startOverlay.classList.add("launch-sequence");

    window.setTimeout(() => {
      clockEl.classList.remove("prelaunch-hidden");
      clockEl.classList.add("launching-in");
    }, 130);

    window.setTimeout(() => {
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
    resetMessageState();
    resetFinishSoundState();
    setRemainingFromInputs({ normalizeUI: true });
    runLaunchSequence();
  }

  // =========================
  // Switches
  // =========================
  function setBgmEnabled(nextValue) {
    bgmEnabled = Boolean(nextValue);

    if (!bgmEnabled) {
      stopAudio(soundA);
    } else {
      if (isOverlayHidden() && countdownTimerId !== null) {
        soundA.volume = 0.6;
        safePlay(soundA);
      }
    }

    updateSwitchUI();
  }

  function setSeEnabled(nextValue) {
    seEnabled = Boolean(nextValue);

    if (!seEnabled) {
      stopAudio(soundB);
      stopAudio(soundC);
    }

    updateSwitchUI();
  }

  // =========================
  // Events
  // =========================
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

  [minInput, secInput].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        startFromPanel();
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (!isOverlayHidden() && e.key === "Enter") {
      startFromPanel();
    }
  });

  startBtn.addEventListener("click", startFromPanel);

  soundB.addEventListener("ended", () => {
    if (!seEnabled) return;

    if (!cycleMode) {
      engineLoopsLeft -= 1;

      if (engineLoopsLeft > 0) {
        soundB.currentTime = 0;
        safePlay(soundB);
      } else {
        soundC.currentTime = 0;
        safePlay(soundC);
      }
    } else {
      soundC.currentTime = 0;
      safePlay(soundC);
    }
  });

  soundC.addEventListener("ended", () => {
    if (!seEnabled) return;

    cycleMode = true;
    soundB.currentTime = 0;
    safePlay(soundB);
  });

  // =========================
  // Init
  // =========================
  function init() {
    bindAudioErrorLogs();
    checkBackgroundImage();
    updateSwitchUI();
    setRemainingFromInputs({ normalizeUI: true });
  }

  init();
})();
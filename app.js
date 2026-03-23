// ========== DOM ELEMENTS ==========
const connectBtn = document.getElementById("connectBtn");
const flowValue = document.getElementById("flowValue");
const statusValue = document.getElementById("statusValue");
const rawOutput = document.getElementById("rawOutput");
const portInfo = document.getElementById("portInfo");
const statusCard = document.getElementById("statusCard");
const themeBtn = document.getElementById("themeBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const clockDisplay = document.getElementById("clockDisplay");
const userSelect = document.getElementById("userSelect");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.getElementById("closeSettings");

// Water Drop
const waterDrop = document.getElementById("waterDrop");
const waterFill = document.getElementById("waterFill");
const dropValue = document.getElementById("dropValue");

// Session
const sessionTime = document.getElementById("sessionTime");
const sessionStart = document.getElementById("sessionStart");
const sessionDuration = document.getElementById("sessionDuration");
const sessionLiters = document.getElementById("sessionLiters");
const sessionAvgFlow = document.getElementById("sessionAvgFlow");

// Budget
const budgetProgress = document.getElementById("budgetProgress");
const budgetText = document.getElementById("budgetText");
const budgetStatus = document.getElementById("budgetStatus");

// Stats
const streakValue = document.getElementById("streakValue");
const co2Saved = document.getElementById("co2Saved");
const moneySaved = document.getElementById("moneySaved");
const waterSaved = document.getElementById("waterSaved");

// Settings inputs
const dailyLimitInput = document.getElementById("dailyLimitInput");
const calibrationInput = document.getElementById("calibrationInput");
const waterCostInput = document.getElementById("waterCostInput");
const avgShowerInput = document.getElementById("avgShowerInput");
const soundEnabled = document.getElementById("soundEnabled");
const voiceEnabled = document.getElementById("voiceEnabled");
const notificationsEnabled = document.getElementById("notificationsEnabled");
const resetTodayBtn = document.getElementById("resetTodayBtn");
const resetAllBtn = document.getElementById("resetAllBtn");
const exportBtn = document.getElementById("exportBtn");

// Audio
const alertSound = document.getElementById("alertSound");

// ========== STATE ==========
let port;
let reader;
let settings = {
  dailyLimit: 50,
  calibration: 450,
  waterCost: 0.05,
  avgShower: 50,
  soundEnabled: true,
  voiceEnabled: true,
  notificationsEnabled: false
};

let currentSession = {
  startTime: null,
  totalLiters: 0,
  flowReadings: [],
  active: false
};

let flowChartData = [];
let flowChart = null;
let historyChart = null;

// ========== LOCAL STORAGE ==========
function loadData() {
  const savedSettings = localStorage.getItem("waterMonitorSettings");
  if (savedSettings) {
    settings = { ...settings, ...JSON.parse(savedSettings) };
  }
  applySettings();
}

function saveSettings() {
  localStorage.setItem("waterMonitorSettings", JSON.stringify(settings));
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function getUsageData() {
  const data = localStorage.getItem("waterUsageData");
  return data ? JSON.parse(data) : {};
}

function saveUsageData(data) {
  localStorage.setItem("waterUsageData", JSON.stringify(data));
}

function addUsage(user, liters, duration) {
  const data = getUsageData();
  const today = getTodayKey();
  if (!data[today]) data[today] = {};
  if (!data[today][user]) data[today][user] = { sessions: [], total: 0 };
  data[today][user].sessions.push({ liters, duration, time: Date.now() });
  data[today][user].total += liters;
  saveUsageData(data);
  updateLeaderboard();
  updateHistoryChart();
  checkAchievements(user, liters, duration);
}

function getTodayTotal(user) {
  const data = getUsageData();
  const today = getTodayKey();
  return data[today]?.[user]?.total || 0;
}

function getStreak(user) {
  const data = getUsageData();
  const dates = Object.keys(data).sort().reverse();
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < dates.length; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const key = checkDate.toISOString().split("T")[0];
    
    if (data[key]?.[user]?.total <= settings.dailyLimit) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ========== ACHIEVEMENTS ==========
function getAchievements() {
  const data = localStorage.getItem("waterAchievements");
  return data ? JSON.parse(data) : {};
}

function saveAchievements(achievements) {
  localStorage.setItem("waterAchievements", JSON.stringify(achievements));
}

function unlockAchievement(badge) {
  const achievements = getAchievements();
  if (!achievements[badge]) {
    achievements[badge] = Date.now();
    saveAchievements(achievements);
    
    const el = document.querySelector(`[data-badge="${badge}"]`);
    if (el) {
      el.classList.remove("locked");
      el.classList.add("unlocked");
    }
    
    if (settings.soundEnabled) {
      playAlert();
    }
    if (settings.voiceEnabled) {
      speak(`Achievement unlocked: ${el?.title || badge}`);
    }
  }
}

function checkAchievements(user, liters, duration) {
  unlockAchievement("first-shower");
  
  if (liters <= 20) unlockAchievement("eco-warrior");
  if (duration <= 300) unlockAchievement("speed-demon"); // 5 min
  
  const streak = getStreak(user);
  if (streak >= 7) unlockAchievement("week-streak");
  if (streak >= 30) unlockAchievement("month-streak");
  
  const totalSaved = calculateTotalWaterSaved();
  if (totalSaved >= 100) unlockAchievement("water-saver");
  
  const moneySavedTotal = calculateMoneySaved();
  if (moneySavedTotal >= 100) unlockAchievement("money-saver");
  
  const co2Total = calculateCO2Saved();
  if (co2Total >= 1) unlockAchievement("green-hero");
}

function renderAchievements() {
  const achievements = getAchievements();
  document.querySelectorAll(".badge").forEach(el => {
    const badge = el.dataset.badge;
    if (achievements[badge]) {
      el.classList.remove("locked");
      el.classList.add("unlocked");
    }
  });
}

// ========== CALCULATIONS ==========
function calculateTotalWaterSaved() {
  const data = getUsageData();
  let totalUsed = 0;
  let showerCount = 0;
  
  Object.values(data).forEach(day => {
    Object.values(day).forEach(user => {
      user.sessions.forEach(s => {
        totalUsed += s.liters;
        showerCount++;
      });
    });
  });
  
  const avgUsage = settings.avgShower * showerCount;
  return Math.max(0, avgUsage - totalUsed);
}

function calculateMoneySaved() {
  return calculateTotalWaterSaved() * settings.waterCost;
}

function calculateCO2Saved() {
  // Approx 0.001 kg CO2 per liter for water heating
  return calculateTotalWaterSaved() * 0.001;
}

function updateEcoStats() {
  const saved = calculateTotalWaterSaved();
  waterSaved.textContent = saved.toFixed(0);
  moneySaved.textContent = `₹${calculateMoneySaved().toFixed(2)}`;
  co2Saved.textContent = calculateCO2Saved().toFixed(2);
}

// ========== LEADERBOARD ==========
function updateLeaderboard() {
  const data = getUsageData();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const userStats = {};
  
  Object.entries(data).forEach(([dateStr, dayData]) => {
    const date = new Date(dateStr);
    if (date >= weekAgo) {
      Object.entries(dayData).forEach(([user, userData]) => {
        if (!userStats[user]) userStats[user] = { total: 0, count: 0 };
        userStats[user].total += userData.total;
        userStats[user].count += userData.sessions.length;
      });
    }
  });
  
  const sorted = Object.entries(userStats)
    .map(([user, stats]) => ({
      user,
      avg: stats.count > 0 ? stats.total / stats.count : 0,
      count: stats.count
    }))
    .sort((a, b) => a.avg - b.avg);
  
  const leaderboard = document.getElementById("leaderboard");
  leaderboard.innerHTML = `
    <div class="leader-row header">
      <span>Rank</span>
      <span>User</span>
      <span>Avg L/Shower</span>
      <span>Showers</span>
    </div>
  `;
  
  sorted.forEach((entry, i) => {
    const row = document.createElement("div");
    row.className = "leader-row";
    row.innerHTML = `
      <span>${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span>
      <span>${entry.user}</span>
      <span>${entry.avg.toFixed(1)} L</span>
      <span>${entry.count}</span>
    `;
    leaderboard.appendChild(row);
  });
}

// ========== CHARTS ==========
let lastChartUpdate = 0;
const CHART_UPDATE_INTERVAL = 500; // Update chart max every 500ms

function initFlowChart() {
  const ctx = document.getElementById("flowChart").getContext("2d");
  flowChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Flow Rate (L/min)",
        data: [],
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, max: 15 },
        x: { display: false }
      },
      plugins: { legend: { display: false } },
      animation: false,
      elements: { line: { borderWidth: 2 } }
    }
  });
}

function updateFlowChart(flowRate) {
  const now = Date.now();
  if (now - lastChartUpdate < CHART_UPDATE_INTERVAL) return;
  lastChartUpdate = now;
  
  const timeLabel = new Date().toLocaleTimeString();
  flowChart.data.labels.push(timeLabel);
  flowChart.data.datasets[0].data.push(flowRate);
  
  // Keep only last 30 points for performance
  if (flowChart.data.labels.length > 30) {
    flowChart.data.labels.shift();
    flowChart.data.datasets[0].data.shift();
  }
  
  flowChart.update("none");
}

function initHistoryChart() {
  const ctx = document.getElementById("historyChart").getContext("2d");
  historyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [{
        label: "Water Used (L)",
        data: [],
        backgroundColor: "#3b82f6"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { display: false } }
    }
  });
  updateHistoryChart("daily");
}

function updateHistoryChart(period = "daily") {
  const data = getUsageData();
  const user = userSelect.value;
  let labels = [];
  let values = [];
  
  if (period === "daily") {
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      labels.push(d.toLocaleDateString("en", { weekday: "short" }));
      values.push(data[key]?.[user]?.total || 0);
    }
  } else if (period === "weekly") {
    // Last 4 weeks
    for (let w = 3; w >= 0; w--) {
      let total = 0;
      for (let d = 0; d < 7; d++) {
        const date = new Date();
        date.setDate(date.getDate() - (w * 7 + d));
        const key = date.toISOString().split("T")[0];
        total += data[key]?.[user]?.total || 0;
      }
      labels.push(`Week ${4 - w}`);
      values.push(total);
    }
  } else if (period === "monthly") {
    // Last 6 months
    for (let m = 5; m >= 0; m--) {
      const date = new Date();
      date.setMonth(date.getMonth() - m);
      const monthKey = date.toISOString().slice(0, 7);
      let total = 0;
      Object.entries(data).forEach(([key, dayData]) => {
        if (key.startsWith(monthKey)) {
          total += dayData[user]?.total || 0;
        }
      });
      labels.push(date.toLocaleDateString("en", { month: "short" }));
      values.push(total);
    }
  }
  
  historyChart.data.labels = labels;
  historyChart.data.datasets[0].data = values;
  historyChart.update();
}

// ========== BUDGET & STATUS ==========
function updateBudget(totalLiters) {
  const user = userSelect.value;
  const todayTotal = getTodayTotal(user) + totalLiters;
  const percent = Math.min(100, (todayTotal / settings.dailyLimit) * 100);
  
  budgetProgress.style.width = `${percent}%`;
  budgetText.textContent = `${todayTotal.toFixed(1)} / ${settings.dailyLimit} L`;
  
  budgetProgress.classList.remove("warning", "danger");
  budgetStatus.classList.remove("warning", "danger");
  
  if (percent >= 100) {
    budgetProgress.classList.add("danger");
    budgetStatus.textContent = "⚠️ Daily limit exceeded!";
    budgetStatus.classList.add("danger");
  } else if (percent >= 75) {
    budgetProgress.classList.add("warning");
    budgetStatus.textContent = "⚠️ Approaching limit";
    budgetStatus.classList.add("warning");
  } else {
    budgetStatus.textContent = "Within limit ✓";
  }
}

function updateWaterDrop(totalLiters) {
  const percent = Math.min(100, (totalLiters / settings.dailyLimit) * 100);
  waterFill.style.height = `${percent}%`;
  dropValue.textContent = `${totalLiters.toFixed(2)} L`;
  
  waterDrop.classList.remove("warning", "danger");
  if (percent >= 100) {
    waterDrop.classList.add("danger");
  } else if (percent >= 75) {
    waterDrop.classList.add("warning");
  }
}

function setStatus(text, mode) {
  statusValue.textContent = text;
  statusCard.classList.remove("ok", "warn", "danger");
  if (mode) {
    statusCard.classList.add(mode);
  }
}

// ========== SESSION TRACKING ==========
function startSession() {
  currentSession = {
    startTime: Date.now(),
    totalLiters: 0,
    flowReadings: [],
    active: true
  };
  sessionStart.textContent = new Date().toLocaleTimeString();
}

function updateSession(flowRate, totalLiters) {
  if (!currentSession.active) {
    startSession();
  }
  
  currentSession.totalLiters = totalLiters;
  currentSession.flowReadings.push(flowRate);
  
  const elapsed = Math.floor((Date.now() - currentSession.startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  
  sessionTime.textContent = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  sessionDuration.textContent = sessionTime.textContent;
  sessionLiters.textContent = `${totalLiters.toFixed(2)} L`;
  
  const avgFlow = currentSession.flowReadings.reduce((a, b) => a + b, 0) / currentSession.flowReadings.length;
  sessionAvgFlow.textContent = `${avgFlow.toFixed(1)} L/min`;
}

function endSession() {
  if (currentSession.active && currentSession.totalLiters > 0.1) {
    const duration = (Date.now() - currentSession.startTime) / 1000;
    addUsage(userSelect.value, currentSession.totalLiters, duration);
    updateEcoStats();
  }
  currentSession.active = false;
}

// ========== ALERTS ==========
let lastVoiceAnnouncement = 0;
let audioContext = null;
let currentOscillator = null;
let beepInterval = null;
const stopBeepBtn = document.getElementById("stopBeepBtn");

function playAlert() {
  if (!settings.soundEnabled) return;
  
  // Create loud beep using Web Audio API
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Clear any existing beep
    stopBeep();
    
    // Repeating beep pattern
    let beepCount = 0;
    const maxBeeps = 10;
    
    beepInterval = setInterval(() => {
      if (beepCount >= maxBeeps) {
        stopBeep();
        return;
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880;
      oscillator.type = "square";
      gainNode.gain.value = 0.5;
      
      currentOscillator = oscillator;
      oscillator.start();
      
      setTimeout(() => {
        try { oscillator.stop(); } catch(e) {}
      }, 150);
      
      beepCount++;
    }, 300);
    
  } catch (e) {
    console.log("Audio error:", e);
  }
}

function stopBeep() {
  if (beepInterval) {
    clearInterval(beepInterval);
    beepInterval = null;
  }
  if (currentOscillator) {
    try { currentOscillator.stop(); } catch(e) {}
    currentOscillator = null;
  }
  // Also stop any speech
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }
}

stopBeepBtn.addEventListener("click", stopBeep);

function speak(text) {
  if (settings.voiceEnabled && "speechSynthesis" in window) {
    const now = Date.now();
    if (now - lastVoiceAnnouncement > 3000) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      speechSynthesis.speak(utterance);
      lastVoiceAnnouncement = now;
    }
  }
}

let lastAnnouncedLiter = 0;
let limitExceededAnnounced = false;

function checkVoiceAnnouncements(totalLiters, limitExceeded) {
  // Announce every 1 liter
  const litersFloor = Math.floor(totalLiters);
  if (litersFloor > 0 && litersFloor !== lastAnnouncedLiter) {
    speak(`You've used ${litersFloor} liter${litersFloor > 1 ? 's' : ''}`);
    lastAnnouncedLiter = litersFloor;
  }
  
  // Announce when limit is exceeded (only once)
  if (limitExceeded && !limitExceededAnnounced) {
    speak("Warning! Water usage limit exceeded!");
    limitExceededAnnounced = true;
  }
}

// ========== SERIAL CONNECTION ==========
async function connect() {
  if (!navigator.serial) {
    setStatus("Web Serial not supported", "danger");
    return;
  }

  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    portInfo.textContent = "Connected";
    setStatus("Connected", "ok");

    const textDecoder = new TextDecoderStream();
    port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    readLoop();
  } catch (err) {
    setStatus("Connection failed", "danger");
    rawOutput.textContent = err?.message || "Failed to connect";
  }
}

let idleTimeout = null;

async function readLoop() {
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      setStatus("Disconnected", "warn");
      endSession();
      break;
    }

    if (value) {
      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        rawOutput.textContent = trimmed;

        try {
          const data = JSON.parse(trimmed);
          const flowRate = Number(data.flowLpm);
          const totalLiters = Number(data.totalLitres);
          
          flowValue.textContent = flowRate.toFixed(2);
          
          updateWaterDrop(totalLiters);
          updateBudget(totalLiters);
          updateFlowChart(flowRate);
          
          if (flowRate > 0) {
            updateSession(flowRate, totalLiters);
            clearTimeout(idleTimeout);
            idleTimeout = setTimeout(() => endSession(), 30000);
          }
          
          checkVoiceAnnouncements(totalLiters, data.limitExceeded);
          
          if (data.limitExceeded) {
            setStatus("⚠️ Limit exceeded!", "danger");
            playAlert();
          } else if (data.motorIdle) {
            setStatus("Motor idle", "ok");
          } else {
            setStatus("Flow detected 💧", "ok");
          }
          
        } catch (err) {
          rawOutput.textContent = `Parse error: ${trimmed}`;
        }
      }
    }
  }
}

// ========== CLOCK ==========
function updateClock() {
  const now = new Date();
  clockDisplay.textContent = now.toLocaleString("en", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

// ========== THEME ==========
function toggleTheme() {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  themeBtn.textContent = isLight ? "☀️" : "🌙";
  localStorage.setItem("theme", isLight ? "light" : "dark");
}

function loadTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light") {
    document.body.classList.add("light");
    themeBtn.textContent = "☀️";
  }
}

// ========== FULLSCREEN ==========
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

// ========== SETTINGS ==========
function applySettings() {
  dailyLimitInput.value = settings.dailyLimit;
  calibrationInput.value = settings.calibration;
  waterCostInput.value = settings.waterCost;
  avgShowerInput.value = settings.avgShower;
  soundEnabled.checked = settings.soundEnabled;
  voiceEnabled.checked = settings.voiceEnabled;
  notificationsEnabled.checked = settings.notificationsEnabled;
}

function saveCurrentSettings() {
  settings.dailyLimit = Number(dailyLimitInput.value);
  settings.calibration = Number(calibrationInput.value);
  settings.waterCost = Number(waterCostInput.value);
  settings.avgShower = Number(avgShowerInput.value);
  settings.soundEnabled = soundEnabled.checked;
  settings.voiceEnabled = voiceEnabled.checked;
  settings.notificationsEnabled = notificationsEnabled.checked;
  saveSettings();
}

function exportCSV() {
  const data = getUsageData();
  let csv = "Date,User,Sessions,Total Liters\n";
  
  Object.entries(data).forEach(([date, users]) => {
    Object.entries(users).forEach(([user, userData]) => {
      csv += `${date},${user},${userData.sessions.length},${userData.total.toFixed(2)}\n`;
    });
  });
  
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `water-usage-${getTodayKey()}.csv`;
  a.click();
}

// ========== EVENT LISTENERS ==========
connectBtn.addEventListener("click", connect);
themeBtn.addEventListener("click", toggleTheme);
fullscreenBtn.addEventListener("click", toggleFullscreen);

settingsBtn.addEventListener("click", () => settingsModal.classList.add("show"));
closeSettings.addEventListener("click", () => {
  saveCurrentSettings();
  settingsModal.classList.remove("show");
});

settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) {
    saveCurrentSettings();
    settingsModal.classList.remove("show");
  }
});

resetTodayBtn.addEventListener("click", () => {
  if (confirm("Reset today's usage data?")) {
    const data = getUsageData();
    delete data[getTodayKey()];
    saveUsageData(data);
    updateHistoryChart();
    updateLeaderboard();
  }
});

resetAllBtn.addEventListener("click", () => {
  if (confirm("Reset ALL usage data and achievements? This cannot be undone.")) {
    localStorage.removeItem("waterUsageData");
    localStorage.removeItem("waterAchievements");
    location.reload();
  }
});

exportBtn.addEventListener("click", exportCSV);

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    updateHistoryChart(btn.dataset.tab);
  });
});

userSelect.addEventListener("change", () => {
  updateHistoryChart();
  updateLeaderboard();
  streakValue.textContent = getStreak(userSelect.value);
});

// ========== INIT ==========
function init() {
  loadTheme();
  loadData();
  updateClock();
  setInterval(updateClock, 1000);
  
  initFlowChart();
  initHistoryChart();
  renderAchievements();
  updateLeaderboard();
  updateEcoStats();
  
  streakValue.textContent = getStreak(userSelect.value);
  
  // Request notification permission
  if (settings.notificationsEnabled && "Notification" in window) {
    Notification.requestPermission();
  }
}

init();

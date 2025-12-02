/* ========================= */
/* SIDEBAR TOGGLE            */
/* ========================= */

const sidebar = document.getElementById("sidebar");
const pageContent = document.getElementById("pageContent");
const menuToggle = document.getElementById("menuToggle");

menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");

    pageContent.style.marginLeft = sidebar.classList.contains("open")
        ? "260px"
        : "0px";
});

/* ========================= */
/* TIMER SYSTEM              */
/* ========================= */

let timer = null;
let running = false;
let timeLeft = 0;

const timerDisplay = document.getElementById("timerDisplay");
const startBtn = document.getElementById("startBtn");
const exerciseText = document.getElementById("exerciseText");

function formatTime(t) {
    const m = Math.floor(t / 60).toString().padStart(2, "0");
    const s = (t % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

function startSession() {
    running = true;
    startBtn.textContent = "Stop Session";

    timer = setInterval(() => {
        if (timeLeft <= 0) {
            stopSession();
            exerciseText.textContent = "Session Complete";
            return;
        }

        timeLeft--;
        timerDisplay.textContent = formatTime(timeLeft);
    }, 1000);
}

function stopSession() {
    running = false;
    clearInterval(timer);
    startBtn.textContent = "Start Session";
}

startBtn.addEventListener("click", () => {
    if (!running) {
        let custom = Number(document.getElementById("customMin").value);
        if (custom > 15) custom = 15;
        if (custom < 1 || isNaN(custom)) custom = selectedMin;

        timeLeft = custom * 60;
        timerDisplay.textContent = formatTime(timeLeft);

        exerciseText.textContent = "Breathe & Relax";
        startSession();
    } else {
        stopSession();
        exerciseText.textContent = "Relax & Be Present";
    }
});

/* ========================= */
/* PRESET TIME SELECTION     */
/* ========================= */

let selectedMin = 2;

document.querySelectorAll(".time-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        selectedMin = Number(btn.dataset.min);
        timeLeft = selectedMin * 60;
        timerDisplay.textContent = formatTime(timeLeft);
    });
});

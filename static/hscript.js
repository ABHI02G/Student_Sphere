/* ---------------------------------------------
      HOMEWORK CHAT + ASSIGNMENT SYSTEM
---------------------------------------------- */

// SIDEBAR TOGGLE
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");

menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    menuToggle.textContent = sidebar.classList.contains("open") ? "×" : "☰";
});

// ---------------------------------------------
// CHAT SYSTEM
// ---------------------------------------------

const chatWindow = document.getElementById("chatWindow");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const attachBtn = document.getElementById("attachBtn");
const fileInput = document.getElementById("fileInput");

// typing indicator bubble
const typingBubble = document.getElementById("typingBubble");

// chat array
let chat = [];

/* Show typing bubble */
function showTyping() {
    typingBubble.style.display = "flex";
    chatWindow.appendChild(typingBubble);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Hide typing bubble */
function hideTyping() {
    typingBubble.style.display = "none";
}

/* Render chat messages */
function renderChat() {
    chatWindow.innerHTML = "";

    chat.forEach(msg => {
        const bubble = document.createElement("div");
        bubble.className = "bubble " + (msg.role === "user" ? "user" : "assistant");
        bubble.innerHTML = msg.content;
        chatWindow.appendChild(bubble);
    });

    chatWindow.appendChild(typingBubble);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Send chat message to backend AI */
async function sendChat() {
    const text = chatInput.value.trim();
    if (!text) return;

    // push user message
    chat.push({ role: "user", content: text });
    renderChat();
    chatInput.value = "";

    // show typing dots
    showTyping();

    try {
        const response = await fetch("/api/homework", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();

        hideTyping();

        if (data.reply) {
            chat.push({ role: "assistant", content: data.reply });
        } else {
            chat.push({ role: "assistant", content: "⚠️ Error: " + (data.error || "Unknown error") });
        }

    } catch (err) {
        hideTyping();
        chat.push({ role: "assistant", content: "⚠️ Network error" });
    }

    renderChat();
}

sendBtn.addEventListener("click", sendChat);
chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey) sendChat();
});

// ---------------------------------------------
// IMAGE UPLOAD
// ---------------------------------------------
attachBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    chat.push({
        role: "user",
        content: `Image:<br><img src="${url}" style="max-width:240px;border-radius:10px;margin-top:8px;">`
    });

    renderChat();
});

// ---------------------------------------------
// ASSIGNMENTS SYSTEM
// ---------------------------------------------

const TASKS_KEY = "homework_tasks";
let tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");

const tasksList = document.getElementById("tasksList");
const addTaskBtn = document.getElementById("addTask");
const newTitle = document.getElementById("newTitle");
const newDate = document.getElementById("newDate");
const newSubject = document.getElementById("newSubject");

const overallBar = document.getElementById("overallBar");
const overallPct = document.getElementById("overallPct");

function saveTasks() {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function updateOverall() {
    const avg = tasks.length
        ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length)
        : 0;

    overallBar.style.width = avg + "%";
    overallPct.textContent = avg + "%";
}

function renderTasks() {
    tasksList.innerHTML = "";

    tasks.forEach(task => {
        const li = document.createElement("li");
        li.className = "task-item";

        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.checked = task.done;

        chk.onchange = () => {
            task.done = chk.checked;
            task.progress = task.done ? 100 : 0;
            saveTasks();
            renderTasks();
            updateOverall();
        };

        const meta = document.createElement("div");
        meta.style.flex = "1";
        meta.innerHTML = `
            <div class="task-title">${task.title}</div>
            <div class="task-sub">${task.subject} • ${task.due}</div>
        `;

        const controls = document.createElement("div");
        controls.className = "task-controls";

        const bar = document.createElement("div");
        bar.className = "progress-track";

        const fill = document.createElement("div");
        fill.className = "progress-fill";
        fill.style.width = task.progress + "%";

        bar.appendChild(fill);
        controls.append(bar);

        li.append(chk, meta, controls);
        tasksList.appendChild(li);
    });
}

addTaskBtn.onclick = () => {
    const title = newTitle.value.trim();
    const due = newDate.value;
    const subject = newSubject.value.trim() || "General";

    if (!title || !due) {
        alert("Please enter title & date");
        return;
    }

    tasks.push({
        id: Date.now(),
        title,
        due,
        subject,
        progress: 0,
        done: false
    });

    newTitle.value = "";
    newDate.value = "";
    newSubject.value = "";

    saveTasks();
    renderTasks();
    updateOverall();
};

// INIT
renderChat();
renderTasks();
updateOverall();

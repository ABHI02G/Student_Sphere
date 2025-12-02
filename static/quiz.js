/* =========================
   QUIZ & ASSIGNMENT LOGIC
   ========================= */

/* INITIAL SETUP */
const sidebar = document.getElementById("sidebar");
const pageContent = document.getElementById("pageContent");
const menuToggle = document.getElementById("menuToggle");

menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    // Adjust margin based on sidebar state
    pageContent.style.marginLeft = sidebar.classList.contains("open") ? "260px" : "0px";
});


/* INPUT & GENERATION ELEMENTS */
const formContainer = document.getElementById('quizInputForm');
const generateBtn = document.getElementById('generateContentBtn');
const selectContent = document.getElementById('selectContent');
const selectClass = document.getElementById('selectClass');
const inputSubject = document.getElementById('inputSubject');
const inputLanguage = document.getElementById('inputLanguage');
const inputTopic = document.getElementById('inputTopic');

/* QUIZ ELEMENTS */
const quizSection = document.getElementById('quizSection');
const assignmentSection = document.getElementById('assignmentSection');
const circlesContainer = document.getElementById("questionCircles");
const quizQuestionText = document.getElementById("quizQuestion");
const optionsGrid = document.querySelector(".options-grid");
const submitQuizBtn = document.getElementById("submitQuizBtn");
const prevQBtn = document.getElementById("prevQBtn");
const nextQBtn = document.getElementById("nextQBtn");

/* ASSIGNMENT ELEMENTS */
const assignmentAIBox = document.getElementById("assignmentAI");
const submitAssignBtn = document.getElementById("submitAssignBtn");
const fileUpload = document.getElementById("fileUpload");

/* XP & TIMER */
const xpValue = document.getElementById("xpValue");
// xpFill is not strictly used here, but kept for context.
let xp = 0; // Local XP state
let quizData = [];
let userAnswers = {}; // {1: 'option A', 2: 'option B', ...}
let currentQ = 1; 
let timerInterval;

// Create and place the timer display right below the main XP bar
const mainXPBox = document.querySelector(".main-xp");
const timerDisplay = document.createElement('p');
timerDisplay.id = 'quizTimer';
timerDisplay.style.fontWeight = 'bold';
timerDisplay.style.color = '#8570f2';
timerDisplay.style.marginTop = '10px';
mainXPBox.appendChild(timerDisplay);


// --- XP Update Function (For Profile Integration) ---
// This function assumes a global function exists in pscript.js/profile.js to update the profile DB/UI
function updateProfileXP(xp_gained) {
    // In a real app, this would be an API call to /update_xp
    // Since we don't have the full profile DB integration, we'll update the local display
    xp += xp_gained;
    xpValue.textContent = xp;
    // Assuming a function like this is globally defined in the profile page script
    if (typeof window.updateXPAndBadges === 'function') {
         // You'd pass the new total XP, or the amount gained
         window.updateXPAndBadges(xp_gained); 
    }
}
// --------------------------------------------------

// --- TIMER FUNCTIONS ---
function startTimer(durationMinutes, timerId = 'quiz') {
    let time = durationMinutes * 60;
    
    function updateTimerDisplay() {
        const minutes = String(Math.floor(time / 60)).padStart(2, '0');
        const seconds = String(time % 60).padStart(2, '0');
        timerDisplay.textContent = `${timerId === 'quiz' ? 'Quiz' : 'Assignment'} Time Remaining: ${minutes}:${seconds}`;
        
        if (time <= 0) {
            clearInterval(timerInterval);
            timerDisplay.textContent = "Time's up!";
            if (timerId === 'quiz') {
                submitQuizAnswers(); // Auto-submit on time up
            }
            return;
        }
        time--;
    }

    clearInterval(timerInterval);
    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 1000);
}


// quiz.js (Inside the generateBtn event listener)

generateBtn.addEventListener('click', async () => {
    const contentType = selectContent.value;
    const classLevel = selectClass.value;
    const subject = inputSubject.value;
    const language = inputLanguage.value;
    const topic = inputTopic.value;
    
    // --- SAFETY FIX HERE ---
    // Try to get the element. If missing, default to "15".
    const qCountEl = document.getElementById('questionCount');
    const qCount = qCountEl ? qCountEl.value : "15"; 
    // -----------------------

    if (!contentType || !classLevel || !subject || !language || !topic) {
        alert("Please fill in all criteria.");
        return;
    }

    formContainer.style.opacity = '0.5';
    generateBtn.disabled = true;
    
    // Update button text based on what we are doing
    if (contentType === 'Quiz') {
        generateBtn.textContent = `Generating ${qCount} Questions...`;
    } else {
        generateBtn.textContent = `Generating Assignment...`;
    }

    try {
        const response = await fetch('/generate_quiz_assignment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content_type: contentType,
                class: classLevel,
                subject: subject,
                language: language,
                topic: topic,
                question_count: qCount // Send the safe value
            })
        });

        const data = await response.json();
        
        if (data.success) {
            formContainer.style.display = 'none';

            if (data.type === 'Quiz') {
                quizData = data.quiz_data.questions;
                setupQuizUI(quizData);
                
                // Adjust timer: 100 mins for 15/30 Qs, more for 60? 
                // Or keep 100 as requested.
                startTimer(100, 'quiz'); 
                
                quizSection.style.display = 'block';
                assignmentSection.style.display = 'none';
                
            } else if (data.type === 'Assignment') {
                // Use the new render helper
                renderModularAssignment(data.assignment_data);
                
                assignmentSection.style.display = 'block';
                quizSection.style.display = 'none';
                startTimer(150, 'assignment');
            }
        } else {
            alert(`Error generating content: ${data.error || 'Unknown error'}`);
            formContainer.style.display = 'block';
        }
    } catch (error) {
        alert("A network error occurred. Check console.");
        console.error("Fetch error:", error);
        formContainer.style.display = 'block';
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Content';
        formContainer.style.opacity = '1';
    }
});;

// --- NEW HELPER: Render Modular Assignment ---
function renderModularAssignment(data) {
    const container = document.getElementById("assignmentAI");
    container.innerHTML = ''; // Clear old content
    
    // Title & Overview
    const header = document.createElement('div');
    header.innerHTML = `<h3 style="margin-bottom:10px;">${data.title}</h3><p style="color:#666; margin-bottom:20px;">${data.overview || ''}</p>`;
    container.appendChild(header);

    // Render Modules as Cards
    if(data.modules && Array.isArray(data.modules)) {
        data.modules.forEach((mod, index) => {
            const card = document.createElement('div');
            card.className = 'assign-module-card';
            // Inline styles for the modular look
            card.style.background = "#fff";
            card.style.border = "1px solid #eee";
            card.style.borderRadius = "12px";
            card.style.padding = "15px";
            card.style.marginBottom = "15px";
            card.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
            
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <strong style="color:#8570f2; font-size:1.1em;">Task ${index + 1}: ${mod.task_name}</strong>
                    <span style="background:#f0f0f0; padding:2px 8px; border-radius:6px; font-size:0.85em;">⏱ ${mod.estimated_time || 'Flexible'}</span>
                </div>
                <p style="color:#444; line-height:1.5;">${mod.instruction}</p>
            `;
            container.appendChild(card);
        });
    }
}

// --- QUIZ UI RENDER & NAVIGATION ---

function setupQuizUI(questions) {
    circlesContainer.innerHTML = '';
    optionsGrid.innerHTML = '';
    currentQ = 1;
    userAnswers = {};

    // 1. Setup Question Circles (Navigation)
    questions.forEach((q, index) => {
        const circle = document.createElement("div");
        circle.className = "q-circle";
        circle.textContent = index + 1;
        circle.setAttribute('data-q-num', index + 1); // Use 1-based index for navigation

        circle.addEventListener("click", () => {
            changeQuestion(index + 1);
        });
        circlesContainer.appendChild(circle);
    });
    
    // 2. Setup Options Click Listener (Record Answer)
    optionsGrid.innerHTML = ''; // Clear initial static buttons
    // The option buttons will be created in changeQuestion
    
    // Attach single listener to optionsGrid parent for delegation
    optionsGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('opt')) {
            recordAnswer(currentQ, e.target.textContent.trim());
        }
    });

    // 3. Setup Navigation Buttons
    prevQBtn.style.display = 'inline-block';
    nextQBtn.style.display = 'inline-block';
    prevQBtn.addEventListener('click', () => changeQuestion(currentQ - 1));
    nextQBtn.addEventListener('click', () => changeQuestion(currentQ + 1));
    
    // 4. Start at Q1
    changeQuestion(1);
}

function changeQuestion(qNum) {
    if (qNum < 1 || qNum > quizData.length) return;

    const qIndex = qNum - 1;
    const question = quizData[qIndex];
    currentQ = qNum;
    
    // Update active circle
    document.querySelectorAll(".q-circle").forEach(c => c.classList.remove("active"));
    const activeCircle = circlesContainer.querySelector(`[data-q-num="${qNum}"]`);
    activeCircle.classList.add("active");

    // Update question text
    quizQuestionText.textContent = `Q${qNum}. ${question.text}`;

    // Update options (re-render options to handle selected state)
    optionsGrid.innerHTML = '';
    question.options.forEach((optionText) => {
        const optBtn = document.createElement('button');
        optBtn.className = 'opt';
        optBtn.textContent = optionText;
        
        // Highlight if already answered
        if (userAnswers[qNum] && userAnswers[qNum] === optionText) {
            optBtn.classList.add('selected');
        }

        optionsGrid.appendChild(optBtn);
    });

    // Update navigation buttons visibility
    prevQBtn.style.visibility = (qNum === 1) ? 'hidden' : 'visible';
    nextQBtn.textContent = (qNum === quizData.length) ? 'Review' : 'Next';
}

function recordAnswer(qNum, answerText) {
    userAnswers[qNum] = answerText;
    
    // Visual feedback for answered question circle
    const circle = circlesContainer.querySelector(`[data-q-num="${qNum}"]`);
    if (circle) circle.classList.add('answered');
    
    // Visual feedback for selected option
    document.querySelectorAll('.opt').forEach(opt => opt.classList.remove('selected'));
    // Find the button with the matching text content and add 'selected'
    Array.from(optionsGrid.children).find(btn => btn.textContent.trim() === answerText)?.classList.add('selected');
}

/* --- ADD THIS LISTENER HERE --- */
// Ensure the button calls the robust submitQuizAnswers function when clicked
const btn = document.getElementById("submitQuizBtn");
if (btn) {
    btn.addEventListener("click", submitQuizAnswers);
}
/* ----------------------------- */

// quiz.js


// ... (previous functions) ...

async function submitQuizAnswers() {
    clearInterval(timerInterval); 
    if (submitQuizBtn.disabled) return; 
    
    submitQuizBtn.disabled = true;
    submitQuizBtn.textContent = 'Grading...';

    const answersToSend = {};
    quizData.forEach((q, index) => {
        const qNum = index + 1;
        answersToSend[`question_${q.id}`] = userAnswers[qNum] || "Not Answered";
    });
    
    // Check console for what is being sent!
    console.log("JSON payload sent to server:", answersToSend); 

    try {
        const response = await fetch('/submit_quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(answersToSend)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Server responded with HTTP error:", response.status, errorText);
            alert(`Submission FAILED (HTTP ${response.status}). Check console for details.`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            // Success logic
            // ... (alert, updateProfileXP, hide buttons) ...
            clearInterval(timerInterval); // Redundant but safe
            submitQuizBtn.style.display = 'none'; 
            prevQBtn.style.display = 'none';
            nextQBtn.style.display = 'none';
            optionsGrid.innerHTML = `<div style="text-align:center;">Quiz finished. Score: ${data.score}</div>`;
            timerDisplay.textContent = `Quiz Finished. XP Gained: ${data.xp_awarded}`;

        } else {
            alert(`Submission Error: ${data.message}`);
        }
    } catch (error) {
        alert("A critical network or parsing error occurred during quiz submission. Check console for details.");
        console.error("Critical Submission Error:", error);
    } finally {
        // This is the key to unsticking: it re-enables the button if the quiz wasn't successfully finalized.
        if (submitQuizBtn.style.display !== 'none') {
            submitQuizBtn.disabled = false;
            submitQuizBtn.textContent = 'Submit Quiz';
        }
    }
}
// Make sure the event listener calls this function:
// submitQuizBtn.addEventListener('click', submitQuizAnswers);

// --- ASSIGNMENT SUBMISSION (30 XP) ---

fileUpload.addEventListener("change", () => {
    if (fileUpload.files.length > 0) {
        alert("File attached: " + fileUpload.files[0].name);
    }
});

submitAssignBtn.addEventListener('click', async () => {
    // Basic check for file upload (you need a real upload endpoint for files)
    if (!fileUpload.files.length) {
        alert("Please attach your completed assignment file before submitting.");
        return;
    }

    if (!confirm("Are you sure you have completed the assignment and want to claim your 30 XP?")) {
        return;
    }

    submitAssignBtn.disabled = true;
    submitAssignBtn.textContent = 'Claiming XP...';

    try {
        const response = await fetch('/submit_assignment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();

        if (data.success) {
            alert(data.message);
            updateProfileXP(data.xp_awarded);
            submitAssignBtn.textContent = 'XP Claimed!';
            submitAssignBtn.style.opacity = 0.5; // Visually lock it
            clearInterval(timerInterval);
        } else {
            alert(`Submission Error: ${data.message}`);
        }
    } catch (error) {
        alert("Network error during assignment submission.");
    } finally {
        submitAssignBtn.disabled = false;
    }
});
if (submitQuizBtn) {
    submitQuizBtn.addEventListener('click', submitQuizAnswers);
}
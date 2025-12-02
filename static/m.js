// SIDEBAR + PUSH EFFECT
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const content = document.getElementById("content");

menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("active");

    if (sidebar.style.left === "0px") {
        sidebar.style.left = "-250px";
        content.style.marginLeft = "0px";
    } else {
        sidebar.style.left = "0px";
        content.style.marginLeft = "250px";
    }
});

// CHAT SEND SYSTEM (simple placeholder)
const chatInput = document.getElementById("chatInput");
const chatDisplay = document.getElementById("chatDisplay");
const sendBtn = document.getElementById("sendBtn");

sendBtn.addEventListener("click", sendMessage);

async function sendMessage() {
    const userQuestion = chatInput.value.trim();
    if (!userQuestion) return;

    // 1. Display the user's message immediately
    const userP = document.createElement("p");
    userP.textContent = "You: " + userQuestion;
    chatDisplay.appendChild(userP);

    chatInput.value = "";
    chatDisplay.scrollTop = chatDisplay.scrollHeight;

    // temporary loading message
    const loadingP = document.createElement("p");
    loadingP.className = "loading-message";
    loadingP.textContent = "...";
    chatDisplay.appendChild(loadingP);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;

    // 2. Fetch/AJAX call to the Flask backend
    try {
        const response = await fetch('/api/math_solver', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: userQuestion }),
        });

        // Find and remove loading message BEFORE processing results
        const loadingMessage = chatDisplay.querySelector('.loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
        
        const result = await response.json();


        // 3. Display the AI response
        const aiP = document.createElement("p");
        if (response.ok) {
            
            // --- FIX 1: Format the Main Answer Text (result.answer) ---
            let formattedAnswer = result.answer;

            // 1. Convert newlines
            formattedAnswer = formattedAnswer.replace(/\n/g, '<br>');

            // 2. **CRITICAL FIX: BOLDING MUST BE PROCESSED BEFORE ITALICS**
            formattedAnswer = formattedAnswer.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Handles **bold**

            // 3. Process Italics (single asterisks)
            formattedAnswer = formattedAnswer.replace(/\*(.*?)\*/g, '<em>$1</em>'); // Handles *italics*
            
            // This is the clean, formatted text answer
            aiP.innerHTML = formattedAnswer; 

            // --- FIX 2: Process and Clean the Dedicated LaTeX Output (result.latex_answer) ---
            if (result.latex_answer) {
                const latexDiv = document.createElement("div");
                
                let cleanLatex = result.latex_answer.trim();
                
                // Remove all surrounding dollar signs ($ or $$) from the string.
                cleanLatex = cleanLatex.replace(/^\s*\$+/g, ''); 
                cleanLatex = cleanLatex.replace(/\$+\s*$/g, ''); 

                // Remove common LaTeX text wrappers (e.g., \text{...})
                cleanLatex = cleanLatex.replace(/\\text\{(.+?)\}/g, '$1'); 
                
                // Wrap the now-clean LaTeX string in $$ for display mode rendering
                latexDiv.textContent = '$$' + cleanLatex.trim() + '$$';
                
                chatDisplay.appendChild(latexDiv);
            }

            // Add the main answer text
            chatDisplay.appendChild(aiP);


            // *** Manually trigger MathJax rendering ***
            if (window.MathJax) {
                MathJax.typesetPromise([chatDisplay]).catch((err) => {
                    console.log('MathJax Typeset Error: ' + err.message);
                });
            }

        } else {
            aiP.textContent = "AI Error: " + (result.error || "Could not get response.");
        }
        
        chatDisplay.scrollTop = chatDisplay.scrollHeight;

    } catch (error) {
        console.error('Fetch error:', error);
        
        // Ensure loading message is removed even on fetch error
        const loadingMessage = chatDisplay.querySelector('.loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }

        const errorP = document.createElement("p");
        errorP.textContent = "Network Error: Could not reach the server.";
        chatDisplay.appendChild(errorP);
    }
}

// + BUTTON → FILE UPLOAD
document.getElementById("addBtn").onclick = () => {
    document.getElementById("fileInput").click();
};
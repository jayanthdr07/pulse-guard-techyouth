(function() {
    // ── Feature Detection ──────────────────────────────────────────────────
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!window.SpeechRecognition || !window.speechSynthesis) {
        console.warn("Web Speech API not supported in this browser.");
        return; // Exit if not supported
    }

    // ── State & Config ──────────────────────────────────────────────────────
    let recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = localStorage.getItem('voice_lang') || 'en-IN';
    
    let isListening = false;
    let isSpeaking = false;
    let voiceEnabled = localStorage.getItem('voice_enabled') === 'true';
    let userName = "there"; // Ideally injected from backend
    
    // ── Create UI Elements ──────────────────────────────────────────────────
    const uiContainer = document.createElement('div');
    uiContainer.id = "voice-assistant-ui";
    uiContainer.style.position = "fixed";
    uiContainer.style.bottom = "20px";
    uiContainer.style.left = "20px";
    uiContainer.style.zIndex = "9999";
    uiContainer.style.display = "flex";
    uiContainer.style.flexDirection = "column";
    uiContainer.style.alignItems = "flex-start";
    
    const banner = document.createElement('div');
    banner.id = "voice-banner";
    banner.innerText = "Tap to enable voice assistant";
    banner.style.background = "#2ecc71";
    banner.style.color = "#fff";
    banner.style.padding = "8px 12px";
    banner.style.borderRadius = "8px";
    banner.style.marginBottom = "10px";
    banner.style.fontSize = "12px";
    banner.style.fontWeight = "bold";
    banner.style.cursor = "pointer";
    banner.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
    banner.style.display = voiceEnabled ? "none" : "block";

    const micBtn = document.createElement('button');
    micBtn.id = "voice-mic-btn";
    micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    micBtn.style.width = "50px";
    micBtn.style.height = "50px";
    micBtn.style.borderRadius = "50%";
    micBtn.style.background = voiceEnabled ? "#2ecc71" : "#555";
    micBtn.style.color = "#fff";
    micBtn.style.border = "none";
    micBtn.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
    micBtn.style.cursor = "pointer";
    micBtn.style.fontSize = "20px";
    micBtn.style.transition = "all 0.3s";
    
    const transcriptBubble = document.createElement('div');
    transcriptBubble.id = "voice-transcript";
    transcriptBubble.style.background = "rgba(0,0,0,0.8)";
    transcriptBubble.style.color = "#fff";
    transcriptBubble.style.padding = "10px 15px";
    transcriptBubble.style.borderRadius = "12px";
    transcriptBubble.style.marginTop = "10px";
    transcriptBubble.style.fontSize = "14px";
    transcriptBubble.style.maxWidth = "250px";
    transcriptBubble.style.display = "none";
    
    uiContainer.appendChild(banner);
    uiContainer.appendChild(micBtn);
    uiContainer.appendChild(transcriptBubble);
    document.body.appendChild(uiContainer);

    // ── Styles ──────────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes pulseMic {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(46, 204, 113, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
        }
        .mic-listening { animation: pulseMic 1.5s infinite; background: #e74c3c !important; }
    `;
    document.head.appendChild(style);

    // ── Speech Synthesis ────────────────────────────────────────────────────
    function speak(text, callback) {
        if (!window.speechSynthesis) return;
        isSpeaking = true;
        if (isListening) recognition.stop(); // pause hearing itself
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = recognition.lang;
        utterance.rate = parseFloat(localStorage.getItem('voice_rate')) || 1.0;
        
        utterance.onend = () => {
            isSpeaking = false;
            if (voiceEnabled && document.visibilityState === 'visible') {
                try { recognition.start(); } catch(e){}
            }
            if (callback) callback();
        };
        
        window.speechSynthesis.speak(utterance);
    }

    window.speakAssistant = speak; // expose globally

    // ── Greeting Logic ──────────────────────────────────────────────────────
    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    }

    // ── Interaction Logic ───────────────────────────────────────────────────
    let commandModeTimer = null;
    let inCommandMode = false;

    function enterCommandMode() {
        inCommandMode = true;
        micBtn.classList.add('mic-listening');
        transcriptBubble.style.display = "block";
        transcriptBubble.innerText = "Listening...";
        
        clearTimeout(commandModeTimer);
        commandModeTimer = setTimeout(() => {
            inCommandMode = false;
            micBtn.classList.remove('mic-listening');
            transcriptBubble.style.display = "none";
        }, 10000);
    }

    function processCommand(text) {
        text = text.toLowerCase().trim();
        transcriptBubble.innerText = text;
        
        // Navigation Commands
        if (text.includes("dashboard")) { speak("Going to dashboard"); window.location.href = "/dashboard"; return true; }
        if (text.includes("diet")) { speak("Opening diet AI"); window.location.href = "/diet"; return true; }
        if (text.includes("lifestyle")) { speak("Opening lifestyle tips"); window.location.href = "/lifestyle"; return true; }
        if (text.includes("heart rate") || text.includes("check my heart")) { speak("Opening heart rate monitor"); window.location.href = "/heartrate"; return true; }
        if (text.includes("chat")) { speak("Opening AI assistant"); window.location.href = "/chat"; return true; }
        
        // Actions
        if (text.includes("start prediction") || text.includes("check my risk")) {
            speak("Starting prediction. Please fill the details.");
            window.location.href = "/dashboard#prediction"; // or wherever it is
            return true;
        }
        
        if (text.includes("my last result") || text.includes("what is my risk") || text.includes("report")) {
            // Check if we are on reports page
            let rBtn = document.querySelector('button[onclick="emailRelative()"]');
            if (rBtn) {
                speak("I am sending your report to your relative right now.", () => rBtn.click());
                return true;
            }
            fetch('/api/me/last-prediction')
                .then(r => r.json())
                .then(data => {
                    if (data.score) {
                        speak(`Your last risk score was ${data.score} percent, ${data.level} risk.`);
                    } else {
                        speak("I couldn't find your last risk score. I will check your heart rate reports instead.");
                    }
                }).catch(() => speak("I am checking your recent reports."));
            return true;
        }
        
        if (text.includes("download report")) {
            speak("Downloading your report");
            return true;
        }
        
        if (text.includes("emergency") || text.includes("help me") || text.includes("chest pain")) {
            speak("Emergency detected. Please stay calm. Taking you to the emergency page.", () => {
                window.location.href = "/emergency";
            });
            return true;
        }
        
        if (text.includes("stop listening") || text.includes("mute")) {
            speak("Muting voice assistant.");
            voiceEnabled = false;
            localStorage.setItem('voice_enabled', 'false');
            micBtn.style.background = "#555";
            micBtn.classList.remove('mic-listening');
            transcriptBubble.style.display = "none";
            recognition.stop();
            banner.style.display = "block";
            return true;
        }
        
        if (text.includes("logout")) {
            speak("Logging out. Goodbye.", () => {
                window.location.href = "/logout";
            });
            return true;
        }
        
        // Form Filling Bonus Logic (Simple Keyword Matching)
        let filled = false;
        if (text.includes("age")) {
            let match = text.match(/age\s*(\d+)/);
            if (match && document.getElementById('age')) { document.getElementById('age').value = match[1]; filled = true; }
        }
        if (text.includes("weight")) {
            let match = text.match(/weight\s*(\d+)/);
            if (match && document.getElementById('weight')) { document.getElementById('weight').value = match[1]; filled = true; }
        }
        if (filled) {
            speak("I've updated the form. Shall I predict now?");
            return true;
        }

        // Fallback to chatbot (if not a local command)
        speak("I heard you say: " + text + ".");
        return true;
    }

    // ── Recognition Events ──────────────────────────────────────────────────
    recognition.onresult = (event) => {
        if (isSpeaking) return;
        
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        const currentText = (finalTranscript || interimTranscript).toLowerCase().trim();
        
        if (!inCommandMode) {
            // Wake words
            if (currentText.includes("hello") || currentText.includes("hi") || currentText.includes("hey cardio")) {
                speak(`${getGreeting()} ${userName}, welcome back to CardioSense. How can I help you?`, () => {
                    enterCommandMode();
                });
            }
        } else {
            transcriptBubble.innerText = currentText;
            if (finalTranscript) {
                let handled = processCommand(finalTranscript);
                if (handled) {
                    inCommandMode = false; // exit mode after successful command
                    setTimeout(() => transcriptBubble.style.display = "none", 2000);
                }
            }
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'not-allowed') {
            voiceEnabled = false;
            localStorage.setItem('voice_enabled', 'false');
            banner.style.display = "block";
            micBtn.style.background = "#555";
        }
    };

    recognition.onend = () => {
        isListening = false;
        // Auto-restart if still enabled, not speaking, and tab is visible
        if (voiceEnabled && !isSpeaking && document.visibilityState === 'visible') {
            try {
                recognition.start();
                isListening = true;
            } catch(e) {}
        }
    };

    // ── UI Listeners ────────────────────────────────────────────────────────
    const enableVoice = () => {
        voiceEnabled = !voiceEnabled;
        localStorage.setItem('voice_enabled', voiceEnabled.toString());
        if (voiceEnabled) {
            banner.style.display = "none";
            micBtn.style.background = "#2ecc71";
            try {
                recognition.start();
                isListening = true;
                speak("Voice assistant enabled.");
            } catch(e) {}
        } else {
            micBtn.style.background = "#555";
            micBtn.classList.remove('mic-listening');
            transcriptBubble.style.display = "none";
            inCommandMode = false;
            banner.style.display = "block";
            recognition.stop();
            isListening = false;
        }
    };

    banner.addEventListener('click', enableVoice);
    micBtn.addEventListener('click', () => {
        if (!voiceEnabled) enableVoice();
        else {
            // Manual wake
            enterCommandMode();
            speak("I am listening.");
        }
    });

    // ── Visibility API (Pause when tab hidden) ──────────────────────────────
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === 'hidden') {
            if (isListening) {
                recognition.stop();
                isListening = false;
            }
        } else {
            if (voiceEnabled && !isSpeaking) {
                try {
                    recognition.start();
                    isListening = true;
                } catch(e) {}
            }
        }
    });

    // ── Initial Start ───────────────────────────────────────────────────────
    if (voiceEnabled && document.visibilityState === 'visible') {
        try {
            recognition.start();
            isListening = true;
        } catch(e) {}
    }

})();

// State variables
let currentTab = 'quiz-tab';
let quizQuestions = [];
let currentQuestionIndex = 0;
let quizScore = 0;
let selectedOption = null;
let chatHistory = [];
let uploadedFile = null;

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const tabTitle = document.getElementById('tab-title');
const tabDesc = document.getElementById('tab-desc');

// Tab Configuration (header text helper)
const tabMeta = {
    'quiz-tab': {
        title: 'Quiz Generator',
        desc: 'Challenge yourself and test your knowledge on any topic.'
    },
    'pdf-tab': {
        title: 'PDF Summarizer',
        desc: 'Upload a PDF study guide, textbook chapter or research paper to summarize.'
    },
    'chat-tab': {
        title: 'AI Study Tutor',
        desc: 'Ask questions, clarify concepts, or brainstorm study topics.'
    }
};

// -------------------------------------------------------------
// TAB SWITCHING LOGIC
// -------------------------------------------------------------
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');
        
        // Update nav buttons
        navItems.forEach(btn => btn.classList.remove('active'));
        item.classList.add('active');
        
        // Update content panes
        tabContents.forEach(content => {
            if (content.id === targetTab) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        
        // Update headers
        tabTitle.textContent = tabMeta[targetTab].title;
        tabDesc.textContent = tabMeta[targetTab].desc;
        currentTab = targetTab;
    });
});

// -------------------------------------------------------------
// QUIZ GENERATOR LOGIC
// -------------------------------------------------------------
const btnGenerateQuiz = document.getElementById('btn-generate-quiz');
const quizTopicInput = document.getElementById('quiz-topic');
const quizCountSelect = document.getElementById('quiz-count');

const quizSetupSection = document.getElementById('quiz-setup');
const quizLoadingSection = document.getElementById('quiz-loading');
const quizPlaySection = document.getElementById('quiz-play');
const quizResultsSection = document.getElementById('quiz-results');

const progressFill = document.getElementById('quiz-progress-fill');
const questionNumText = document.getElementById('quiz-question-number');
const scoreText = document.getElementById('quiz-score');
const questionText = document.getElementById('quiz-question-text');
const optionsContainer = document.getElementById('quiz-options-container');

const btnNextQuestion = document.getElementById('btn-next-question');
const btnFinishQuiz = document.getElementById('btn-finish-quiz');
const btnRestartQuiz = document.getElementById('btn-restart-quiz');
const finalScorePercent = document.getElementById('final-score-percent');
const finalScoreText = document.getElementById('final-score-text');

btnGenerateQuiz.addEventListener('click', async () => {
    const topic = quizTopicInput.value.trim();
    if (!topic) {
        alert('Please enter a quiz topic.');
        return;
    }
    
    // Switch states
    quizSetupSection.classList.add('hidden');
    quizLoadingSection.classList.remove('hidden');
    
    try {
        const response = await fetch('http://localhost:8000/api/quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic: topic,
                num_questions: parseInt(quizCountSelect.value)
            })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to generate quiz');
        }
        
        quizQuestions = data.quiz;
        startQuiz();
    } catch (err) {
        alert(`Error: ${err.message}`);
        quizLoadingSection.classList.add('hidden');
        quizSetupSection.classList.remove('hidden');
    }
});

function startQuiz() {
    currentQuestionIndex = 0;
    quizScore = 0;
    selectedOption = null;
    
    quizLoadingSection.classList.add('hidden');
    quizPlaySection.classList.remove('hidden');
    
    renderQuestion();
}

function renderQuestion() {
    const question = quizQuestions[currentQuestionIndex];
    selectedOption = null;
    
    // Hide actions until option is clicked
    btnNextQuestion.classList.add('hidden');
    btnFinishQuiz.classList.add('hidden');
    
    // Update progress & metadata
    const percentage = ((currentQuestionIndex) / quizQuestions.length) * 100;
    progressFill.style.width = `${percentage}%`;
    questionNumText.textContent = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
    scoreText.textContent = `Score: ${quizScore}`;
    
    questionText.textContent = question.question;
    optionsContainer.innerHTML = '';
    
    question.choices.forEach(choice => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = choice;
        button.addEventListener('click', () => selectOption(button, choice));
        optionsContainer.appendChild(button);
    });
}

function selectOption(button, choice) {
    if (selectedOption !== null) return; // Prevent multiple answers
    
    selectedOption = choice;
    const question = quizQuestions[currentQuestionIndex];
    const isCorrect = choice === question.correct_answer;
    
    // Add visual feedback
    const optionButtons = optionsContainer.querySelectorAll('.option-btn');
    optionButtons.forEach(btn => {
        if (btn.textContent === question.correct_answer) {
            btn.classList.add('correct');
        } else if (btn === button && !isCorrect) {
            btn.classList.add('incorrect');
        }
    });
    
    if (isCorrect) {
        quizScore++;
        scoreText.textContent = `Score: ${quizScore}`;
    }
    
    // Show navigation button
    if (currentQuestionIndex < quizQuestions.length - 1) {
        btnNextQuestion.classList.remove('hidden');
    } else {
        btnFinishQuiz.classList.remove('hidden');
    }
}

btnNextQuestion.addEventListener('click', () => {
    currentQuestionIndex++;
    renderQuestion();
});

btnFinishQuiz.addEventListener('click', () => {
    quizPlaySection.classList.add('hidden');
    quizResultsSection.classList.remove('hidden');
    
    const percentage = Math.round((quizScore / quizQuestions.length) * 100);
    finalScorePercent.textContent = `${percentage}%`;
    finalScoreText.textContent = `You got ${quizScore} out of ${quizQuestions.length} questions correct.`;
});

btnRestartQuiz.addEventListener('click', () => {
    quizResultsSection.classList.add('hidden');
    quizSetupSection.classList.remove('hidden');
    quizTopicInput.value = '';
});

// -------------------------------------------------------------
// PDF SUMMARIZER LOGIC
// -------------------------------------------------------------
const pdfDropzone = document.getElementById('pdf-dropzone');
const pdfFileInput = document.getElementById('pdf-file-input');
const dropzoneContent = pdfDropzone.querySelector('.dropzone-content');
const selectedFileInfo = document.getElementById('selected-file-info');
const fileNameSpan = document.getElementById('file-name');
const btnRemoveFile = document.getElementById('btn-remove-file');
const btnSummarize = document.getElementById('btn-summarize');

const summaryPlaceholder = document.getElementById('summary-placeholder');
const summaryLoading = document.getElementById('summary-loading');
const summaryOutput = document.getElementById('summary-output');

// Dropzone Drag Events
pdfDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    pdfDropzone.classList.add('dragover');
});

pdfDropzone.addEventListener('dragleave', () => {
    pdfDropzone.classList.remove('dragover');
});

pdfDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    pdfDropzone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

pdfDropzone.addEventListener('click', () => {
    pdfFileInput.click();
});

pdfFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

function handleFileSelect(file) {
    if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
    }
    
    uploadedFile = file;
    fileNameSpan.textContent = file.name;
    
    dropzoneContent.classList.add('hidden');
    selectedFileInfo.classList.remove('hidden');
    btnSummarize.disabled = false;
}

btnRemoveFile.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent triggering dropzone click
    resetFileSelection();
});

function resetFileSelection() {
    uploadedFile = null;
    pdfFileInput.value = '';
    
    dropzoneContent.classList.remove('hidden');
    selectedFileInfo.classList.add('hidden');
    btnSummarize.disabled = true;
}

btnSummarize.addEventListener('click', async () => {
    if (!uploadedFile) return;
    
    summaryPlaceholder.classList.add('hidden');
    summaryOutput.classList.add('hidden');
    summaryLoading.classList.remove('hidden');
    
    const formData = new FormData();
    formData.append('file', uploadedFile);
    
    try {
        const response = await fetch('http://localhost:8000/api/summarize', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to summarize document');
        }
        
        // Render Markdown content
        summaryOutput.innerHTML = marked.parse(data.summary);
        summaryLoading.classList.add('hidden');
        summaryOutput.classList.remove('hidden');
    } catch (err) {
        alert(`Error: ${err.message}`);
        summaryLoading.classList.add('hidden');
        summaryPlaceholder.classList.remove('hidden');
    }
});

// -------------------------------------------------------------
// CHATBOT LOGIC
// -------------------------------------------------------------
const chatInput = document.getElementById('chat-input');
const btnSendChat = document.getElementById('btn-send-chat');
const chatMessagesContainer = document.getElementById('chat-messages');

// Auto-expand textarea
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${chatInput.scrollHeight - 16}px`;
});

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
    }
});

btnSendChat.addEventListener('click', sendChatMessage);

async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    // Add user message bubble
    addMessageBubble(text, 'user');
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    // Show typing/loading state
    const typingBubble = addMessageBubble('Thinking...', 'assistant', true);
    
    try {
        const response = await fetch('http://localhost:8000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: text,
                history: chatHistory
            })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to connect to assistant');
        }
        
        // Remove typing bubble
        typingBubble.remove();
        
        // Add actual response
        addMessageBubble(data.response, 'assistant');
        
        // Update history
        chatHistory.push({ role: 'user', parts: text });
        chatHistory.push({ role: 'model', parts: data.response });
        
    } catch (err) {
        typingBubble.remove();
        addMessageBubble(`Error: ${err.message}`, 'system');
    }
}

function addMessageBubble(text, role, isTyping = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    
    if (role === 'user' || isTyping || role === 'system') {
        bubble.textContent = text;
    } else {
        // Render Markdown for assistant responses
        bubble.innerHTML = marked.parse(text);
    }
    
    messageDiv.appendChild(bubble);
    chatMessagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    
    return messageDiv;
}

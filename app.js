// Wait for DOM and module loading
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Telegram WebApp
    const tg = window.Telegram.WebApp;
    tg.expand(); // Expand the WebApp to full height
    
    // Set the header color to match the bot's theme
    tg.setHeaderColor('#2196F3');
    tg.backgroundColor = '#1b3115';
    tg.headerColor = '#11874a';
    tg.bottomBarColor = '#11874a';
    // Get DOM elements
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');

    // Check if API key is configured
    if (!window.GOOGLE_API_KEY || window.GOOGLE_API_KEY === 'YOUR_API_KEY_HERE') {
        console.error('Please configure your Google API key in the script tag!');
        addMessage('⚠️ Error: API key not configured. Please set up your Google API key.', false);
        return;
    }

    // Initialize chat history
    let chatHistory = [];
    
    // Load chat history from localStorage
    loadChatHistory();

    // Initialize the Google Generative AI
    const ai = new window.GoogleGenerativeAI(window.GOOGLE_API_KEY);
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

    // System prompt
    const SYSTEM_PROMPT = `Ти досвідчений експерт з криптовалют та блокчейну. 
    Відповідай на українській мові, надавай корисні та вичерпні відповіді. 
    Використовуй Markdown для форматування. 
    Для виділення важливого тексту використовуй **жирний шрифт**. 
    Для всіх списків використовуй символ "⦾" як маркер списку. 
    Для посилань використовуй формат [текст посилання](URL).`;

    // Function to load chat history from localStorage
    function loadChatHistory() {
        try {
            const savedHistory = localStorage.getItem('bitsim_chat_history');
            if (savedHistory) {
                const parsedHistory = JSON.parse(savedHistory);
                // Clear the chat messages container
                chatMessages.innerHTML = '';
                // Add each message to the chat
                parsedHistory.forEach(msg => {
                    addMessage(msg.content, msg.isUser);
                });
                // Scroll to the bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    // Function to save chat history to localStorage
    function saveChatHistory() {
        try {
            const messages = Array.from(chatMessages.children).map(msg => {
                const content = msg.querySelector('.message-content').innerHTML;
                const isUser = msg.classList.contains('user');
                return { content, isUser };
            });
            localStorage.setItem('bitsim_chat_history', JSON.stringify(messages));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }

    // Function to clear chat history
    function clearChatHistory() {
        localStorage.removeItem('bitsim_chat_history');
        chatMessages.innerHTML = '';
        // Add welcome message
        addMessage('Вітаю! 👋 Я BitSim AI Helper - ваш особистий асистент у світі криптовалют! Запитайте мене про що завгодно, пов\'язане з криптовалютами та блокчейном. 🚀', false);
    }

    // Function to add a message to the chat
    function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Parse markdown if it's a bot message
        if (!isUser) {
            messageContent.innerHTML = marked.parse(content);
        } else {
            messageContent.textContent = content;
        }
        
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Save chat history after adding a message
        saveChatHistory();
    }

    // Function to show typing indicator
    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message bot';
        indicator.innerHTML = `
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        indicator.id = 'typingIndicator';
        chatMessages.appendChild(indicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Function to remove typing indicator
    function removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Function to handle user input
    async function handleUserInput() {
        const message = userInput.value.trim();
        if (!message) return;
        
        // Disable input and button while processing
        userInput.disabled = true;
        sendButton.disabled = true;
        
        // Add user message to chat
        addMessage(message, true);
        userInput.value = '';
        
        // Show typing indicator
        showTypingIndicator();
        
        try {
            let chat;
            // Initialize chat if it's the first message
            if (chatHistory.length === 0) {
                chat = model.startChat();
                // Send system prompt first
                await chat.sendMessage(SYSTEM_PROMPT);
                chatHistory.push(chat);
            } else {
                chat = chatHistory[0];
            }
            
            // Get response from AI
            const result = await chat.sendMessage(message);
            
            // Remove typing indicator and add bot response
            removeTypingIndicator();
            addMessage(result.response.text(), false);
            
        } catch (error) {
            console.error('Error:', error);
            removeTypingIndicator();
            addMessage('Вибачте, сталася помилка. Спробуйте повторити запит пізніше.', false);
        }
        
        // Re-enable input and button
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }

    // Add clear history button to header
    const header = document.querySelector('header');
    const clearButton = document.createElement('button');
    clearButton.className = 'clear-history-button';
    clearButton.innerHTML = '<span class="material-icons">delete</span>';
    clearButton.title = 'Очистити історію';
    clearButton.addEventListener('click', () => {
        if (confirm('Ви впевнені, що хочете очистити історію чату?')) {
            clearChatHistory();
        }
    });
    header.appendChild(clearButton);

    // Event listeners
    sendButton.addEventListener('click', handleUserInput);

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleUserInput();
        }
    });

    // Auto-resize textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
    });
    
    // Handle Telegram WebApp events
    tg.onEvent('viewportChanged', () => {
        // Adjust UI when viewport changes
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
    
    // Show the WebApp when it's ready
    tg.ready();
});

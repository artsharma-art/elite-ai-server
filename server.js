// Elite AI Chatbot Backend Server
// Run with: node server.js
// Make sure you have Node.js installed and run: npm install express cors

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for chats and sessions
const chats = {};
const sessions = {};

// Simple AI response generator (keyword-based)
function generateAIResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    // Greeting responses
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
        return "👋 Hey there! How can I help you today?";
    }
    
    // Help responses
    if (message.includes('help') || message.includes('how do i')) {
        return "I'm here to help! You can ask me about coding, writing, brainstorming, or anything else. What would you like to work on?";
    }
    
    // Code-related responses
    if (message.includes('code') || message.includes('javascript') || message.includes('python') || message.includes('html')) {
        return "Great! I can help with coding. What programming language or problem are you working with? Share some details and I'll assist! 💻";
    }
    
    // Writing responses
    if (message.includes('write') || message.includes('essay') || message.includes('story')) {
        return "I'd love to help with your writing! What kind of content are you working on? Let me know the topic and I can provide suggestions. ✍️";
    }
    
    // Project responses
    if (message.includes('project') || message.includes('build') || message.includes('create')) {
        return "Awesome! Building something cool? Tell me more about your project idea and I can help you plan it out! 🚀";
    }
    
    // Design responses
    if (message.includes('design') || message.includes('ui') || message.includes('ux')) {
        return "Design is awesome! Are you working on a website, app, or something else? I can help with layout ideas, color schemes, and user experience! 🎨";
    }
    
    // Feedback responses
    if (message.includes('feedback') || message.includes('review') || message.includes('check')) {
        return "I'd be happy to review your work! Share what you'd like feedback on and I'll give you constructive suggestions. 👀";
    }
    
    // Learning responses
    if (message.includes('learn') || message.includes('teach') || message.includes('explain')) {
        return "I love teaching! What topic would you like to learn about? I can break it down into easy-to-understand concepts. 📚";
    }
    
    // Brainstorming responses
    if (message.includes('idea') || message.includes('brainstorm') || message.includes('think')) {
        return "Let's brainstorm! What's the topic or problem you're thinking about? I can help you explore different angles and ideas. 💡";
    }
    
    // Debugging responses
    if (message.includes('bug') || message.includes('error') || message.includes('fix') || message.includes('debug')) {
        return "Debugging can be tricky! What error are you seeing? Share the error message or describe what's happening and I'll help you troubleshoot. 🔧";
    }
    
    // Default response
    return "That's interesting! Tell me more about what you're working on and I'll do my best to help. What would you like to explore? 🤔";
}

// Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Server is running! ✅' });
});

// Chat endpoint
app.post('/api/chat', (req, res) => {
    try {
        const { message, sessionId } = req.body;
        
        if (!message || !sessionId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Message and sessionId are required' 
            });
        }
        
        // Initialize session if it doesn't exist
        if (!sessions[sessionId]) {
            sessions[sessionId] = {
                messages: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }
        
        // Store user message
        sessions[sessionId].messages.push({
            role: 'user',
            content: message,
            timestamp: new Date()
        });
        
        // Generate AI response
        const aiResponse = generateAIResponse(message);
        
        // Store AI response
        sessions[sessionId].messages.push({
            role: 'ai',
            content: aiResponse,
            timestamp: new Date()
        });
        
        sessions[sessionId].updatedAt = new Date();
        
        res.json({
            success: true,
            reply: aiResponse,
            sessionId: sessionId,
            messageCount: sessions[sessionId].messages.length
        });
    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Clear chat endpoint
app.post('/api/clear-chat', (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ 
                success: false, 
                error: 'sessionId is required' 
            });
        }
        
        if (sessions[sessionId]) {
            sessions[sessionId].messages = [];
            sessions[sessionId].updatedAt = new Date();
        }
        
        res.json({
            success: true,
            message: 'Chat cleared successfully'
        });
    } catch (error) {
        console.error('Error in /api/clear-chat:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Export chat endpoint
app.get('/api/export/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!sessions[sessionId]) {
            return res.status(404).json({ 
                success: false, 
                error: 'Session not found' 
            });
        }
        
        res.json({
            success: true,
            sessionId: sessionId,
            messages: sessions[sessionId].messages,
            createdAt: sessions[sessionId].createdAt,
            updatedAt: sessions[sessionId].updatedAt
        });
    } catch (error) {
        console.error('Error in /api/export:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Get summary endpoint
app.get('/api/summary/:sessionId', (req, res) => {
    try {\n        const { sessionId } = req.params;
        
        if (!sessions[sessionId]) {
            return res.status(404).json({ 
                success: false, 
                error: 'Session not found' 
            });
        }
        
        const messages = sessions[sessionId].messages;
        const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
        const summary = userMessages.length > 0 
            ? `You discussed ${userMessages.length} topics: ${userMessages.slice(0, 3).join(', ')}${userMessages.length > 3 ? '...' : ''}`
            : 'No messages in this chat yet.';
        
        res.json({
            success: true,
            summary: summary,
            totalMessages: messages.length,
            userMessages: userMessages.length
        });
    } catch (error) {
        console.error('Error in /api/summary:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Get all sessions endpoint
app.get('/api/sessions', (req, res) => {
    try {
        const sessionList = Object.keys(sessions).map(id => ({
            id: id,
            messageCount: sessions[id].messages.length,
            createdAt: sessions[id].createdAt,
            updatedAt: sessions[id].updatedAt
        }));
        
        res.json({
            success: true,
            sessions: sessionList,
            totalSessions: sessionList.length
        });
    } catch (error) {
        console.error('Error in /api/sessions:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Endpoint not found' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║   Elite AI Chatbot Server Running! 🚀  ║
    ║   http://localhost:${PORT}              ║
    ║                                        ║
    ║   Available Endpoints:                 ║
    ║   POST   /api/chat                     ║
    ║   POST   /api/clear-chat               ║
    ║   GET    /api/export/:sessionId        ║
    ║   GET    /api/summary/:sessionId       ║
    ║   GET    /api/sessions                 ║
    ║   GET    /health                       ║
    ╚════════════════════════════════════════╝
    `);
});

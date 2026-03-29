const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const sessions = {};
const GEMINI_API_KEY = 'AIzaSyBmSJs'; // Your API key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

async function generateAIResponse(userMessage) {
    try {
        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        parts: [
                            {
                                text: userMessage
                            }
                        ]
                    }
                ]
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.candidates && response.data.candidates[0].content.parts[0].text) {
            return response.data.candidates[0].content.parts[0].text;
        } else {
            return "I couldn't generate a response. Please try again.";
        }
    } catch (error) {
        console.error('Gemini API Error:', error.message);
        return "Sorry, I encountered an error. Please try again later.";
    }
}

app.get('/health', (req, res) => {
    res.json({ status: 'Server is running! ✅' });
});

app.post('/api/chat', (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message || !sessionId) {
            return res.status(400).json({ success: false, error: 'Message and sessionId are required' });
        }

        if (!sessions[sessionId]) {
            sessions[sessionId] = {
                messages: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }

        sessions[sessionId].messages.push({
            role: 'user',
            content: message,
            timestamp: new Date()
        });

        generateAIResponse(message).then(aiResponse => {
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
        }).catch(error => {
            console.error('Error generating response:', error);
            res.status(500).json({ success: false, error: 'Failed to generate response' });
        });
    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.post('/api/clear-chat', (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'sessionId is required' });
        }

        if (sessions[sessionId]) {
            sessions[sessionId].messages = [];
            sessions[sessionId].updatedAt = new Date();
        }

        res.json({ success: true, message: 'Chat cleared successfully' });
    } catch (error) {
        console.error('Error in /api/clear-chat:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.get('/api/export/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessions[sessionId]) {
            return res.status(404).json({ success: false, error: 'Session not found' });
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
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.get('/api/summary/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessions[sessionId]) {
            return res.status(404).json({ success: false, error: 'Session not found' });
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
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

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
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});

app.listen(PORT, () => {
    console.log(`Elite AI Chatbot Server Running! 🚀`);
    console.log(`Server is live on port ${PORT}`);
    console.log(`Using Google Gemini API for AI responses`);
});

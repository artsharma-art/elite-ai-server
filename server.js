const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const sessions = {};
const OPENAI_API_KEY = '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';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

async function generateAIResponse(userMessage) {
    try {
        const response = await axios.post(
            OPENAI_API_URL,
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.choices && response.data.choices[0].message.content) {
            return response.data.choices[0].message.content;
        } else {
            return "I couldn't generate a response. Please try again.";
        }
    } catch (error) {
        console.error('OpenAI API Error:', error.response?.status, error.message);
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
    console.log(`Using OpenAI API for AI responses`);
});

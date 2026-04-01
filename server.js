const express = require('express');
const cors = require('cors');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const sessions = {};
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

if (!CLAUDE_API_KEY) {
    console.error('ERROR: CLAUDE_API_KEY environment variable is not set!');
    process.exit(1);
}

function makeClaudeRequest(userMessage) {
    return new Promise((resolve, reject) => {
        const requestBody = JSON.stringify({
            model: 'claude-opus-4-1',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: userMessage
                }
            ]
        });

        const options = {
            hostname: 'api.anthropic.com',
            port: 443,
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        };

        console.log('Making request to Claude API with model: claude-opus-4-1');
        
        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('Claude API Response Status:', res.statusCode);
                
                try {
                    const jsonData = JSON.parse(data);
                    
                    if (res.statusCode === 200 && jsonData.content && jsonData.content[0]) {
                        console.log('Success! Got response from Claude');
                        resolve(jsonData.content[0].text);
                    } else {
                        console.error('Claude API Error:', jsonData);
                        reject(new Error(jsonData.error?.message || 'Unknown error from Claude API'));
                    }
                } catch (e) {
                    console.error('Failed to parse Claude response:', data);
                    reject(new Error('Failed to parse Claude API response'));
                }
            });
        });

        req.on('error', (error) => {
            console.error('Request error:', error);
            reject(error);
        });

        req.write(requestBody);
        req.end();
    });
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

        makeClaudeRequest(message)
            .then(aiResponse => {
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
            })
            .catch(error => {
                console.error('Error generating response:', error.message);
                res.json({
                    success: true,
                    reply: 'Sorry, I encountered an error: ' + error.message,
                    sessionId: sessionId,
                    messageCount: sessions[sessionId].messages.length
                });
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
    console.log(`Using Claude API for AI responses`);
});

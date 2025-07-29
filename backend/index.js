const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const cors = require('cors');

const { streamSTT } = require('./services/serviceSTT');
const { streamLLM } = require('./services/serviceLLM');
const { streamTTS } = require('./services/serviceTTS');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const upload = multer({
  dest: 'temp/',
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(express.json());
app.use(express.static('public'));
app.use(cors());

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.post('/voice/process', upload.single('audio'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    const audioPath = req.file.path;
    const conversationHistory = req.body.history ? JSON.parse(req.body.history) : [];
    
    const sttStart = Date.now();
    const transcript = await streamSTT(audioPath);
    
    if (!transcript.trim()) {
      return res.json({ error: 'No speech detected' });
    }
    
    const llmStart = Date.now();
    const aiResponse = await streamLLM(transcript, conversationHistory);
    
    const ttsStart = Date.now();
    const audioBuffer = await streamTTS(aiResponse);
    
    fs.unlinkSync(audioPath);
    
    const totalTime = Date.now() - startTime;
    
    res.json({
      transcript,
      response: aiResponse,
      audio: audioBuffer.toString('base64'),
      timing: {
        total: totalTime,
        stt: Date.now() - sttStart,
        llm: Date.now() - llmStart,
        tts: Date.now() - ttsStart
      }
    });
    
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

io.on('connection', (socket) => {
  socket.on('voice-stream', async (data) => {
    try {
      const { audioChunk, isLast, conversationHistory } = data;
      
      if (isLast) {
        const audioBuffer = Buffer.from(audioChunk, 'base64');
        
        const [transcript, _] = await Promise.all([
          streamSTT(audioBuffer),
          new Promise(resolve => setTimeout(resolve, 0))
        ]);
        
        socket.emit('transcript', { text: transcript });
        
        const [aiResponse, __] = await Promise.all([
          streamLLM(transcript, conversationHistory),
          new Promise(resolve => setTimeout(resolve, 0))
        ]);
        
        socket.emit('ai-response', { text: aiResponse });
        
        const audioResponse = await streamTTS(aiResponse);
        socket.emit('audio-response', { 
          audio: audioResponse.toString('base64'),
          mimeType: 'audio/mpeg'
        });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Voice AI server running on port ${PORT}`);
});

module.exports = app;
# Wittify-Dev: Voice AI Assistant

A real-time voice AI assistant built with React Native (frontend) and Node.js (backend) that enables natural voice conversations with AI.

## 🎯 Features

- **Real-time voice processing** with 5-second recording cycles
- **Automatic conversation flow** - start once, continuous dialogue
- **Speech-to-Text** using AssemblyAI
- **AI responses** using Groq's Llama-3.1-8b-instant
- **Text-to-Speech** using ElevenLabs with OpenAI fallback
- **Conversation history** with scrollable chat interface
- **Cross-platform** - works on iOS and Android

## 🏗️ Architecture

### Frontend (React Native + Expo)
- **Voice recording** with optimized audio settings
- **Real-time UI updates** with status indicators
- **Automatic conversation cycling** - record → process → speak → repeat
- **Conversation management** - start/stop/clear chat

### Backend (Node.js + Express)
- **Voice processing pipeline** - STT → LLM → TTS
- **File upload handling** with multer
- **WebSocket support** for real-time streaming (commented out)
- **Service architecture** - modular STT, LLM, and TTS services

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- API keys for:
  - AssemblyAI (STT)
  - Groq (LLM)
  - ElevenLabs (TTS)
  - OpenAI (TTS fallback)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd wittify-dev
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   ```

3. **Create environment file**
   ```bash
   # Create .env file in backend directory
   ASSEMBLYAI_API_KEY=your_assemblyai_key
   GROQ_API_KEY=your_groq_key
   ELEVENLABS_API_KEY=your_elevenlabs_key
   ELEVENLABS_VOICE_ID=your_voice_id
   OPENAI_API_KEY=your_openai_key
   ```

4. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   ```

5. **Update IP address**
   - Edit `frontend/app/index.tsx`
   - Change `http://192.168.1.3:8000` to your backend IP

### Running the Application

1. **Start Backend**
   ```bash
   cd backend
   node index.js
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   expo start
   ```

3. **Use the App**
   - Tap "Start Conversation" to begin
   - Speak for 5 seconds (auto-records)
   - Wait for AI response
   - Conversation continues automatically
   - Tap "Stop Conversation" to end

## 🔧 Configuration

### Backend Configuration
- **Port**: Default 8000 (configurable via PORT env var)
- **Audio processing**: Optimized for speed and quality
- **File upload**: 10MB limit for audio files
- **CORS**: Enabled for all origins

### Frontend Configuration
- **Recording settings**: 16kHz, mono, 128kbps
- **Auto-stop**: 5-second recording cycles
- **Audio playback**: Optimized for voice responses
- **UI**: Clean, intuitive interface

## 📁 Project Structure

```
wittify-dev/
├── backend/
│   ├── index.js              # Main server file
│   ├── package.json          # Backend dependencies
│   └── services/
│       ├── serviceSTT.js     # Speech-to-Text service
│       ├── serviceLLM.js     # Language model service
│       ├── serviceTTS.js     # Text-to-Speech service
│       └── audioOptimizer.js # Audio optimization
├── frontend/
│   ├── app/
│   │   └── index.tsx         # Main React Native component
│   ├── package.json          # Frontend dependencies
│   └── app.json              # Expo configuration
└── README.md                 # This file
```

## 🎤 How It Works

1. **Start Conversation**: User taps "Start Conversation"
2. **Record Voice**: App records for 5 seconds automatically
3. **Process Audio**: Backend converts speech to text (STT)
4. **Generate Response**: AI generates response (LLM)
5. **Convert to Speech**: Response converted to audio (TTS)
6. **Play Response**: Audio plays through device speakers
7. **Repeat**: Automatically starts next recording cycle

## 🔑 API Keys Required

- **AssemblyAI**: For speech-to-text transcription
- **Groq**: For AI language model responses
- **ElevenLabs**: For text-to-speech (primary)
- **OpenAI**: For text-to-speech (fallback)

## 🛠️ Development

### Adding New Features
- **Frontend**: Edit `frontend/app/index.tsx`
- **Backend**: Modify services in `backend/services/`
- **API**: Add endpoints in `backend/index.js`

### Testing
- **Manual testing**: Use "Test Recording" button
- **Console logs**: Check browser/terminal for errors
- **Network**: Ensure backend is accessible from device

## 📱 Platform Support

- **iOS**: Full support with Expo
- **Android**: Full support with Expo
- **Web**: Limited support (audio recording restrictions)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues
- **Recording not starting**: Check microphone permissions
- **Network errors**: Verify backend IP address and connectivity
- **API errors**: Ensure all API keys are valid
- **Audio issues**: Check device audio settings

### Debug Mode
- Use "Test Recording" button for manual testing
- Check console logs for detailed error messages
- Verify all environment variables are set

---

**Built with ❤️ using React Native, Node.js, and AI services** 
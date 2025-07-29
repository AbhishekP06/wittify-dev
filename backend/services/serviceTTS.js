const axios = require('axios');

async function streamTTS(text) {
  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL/stream`,
      {
        text: text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.5,
          use_speaker_boost: false
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'User-Agent': 'Wittify-VoiceAI/1.0',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error('ElevenLabs TTS error:', error.response?.data || error.message);
    console.error('ElevenLabs API Key used:', process.env.ELEVENLABS_API_KEY ? 'Present' : 'Missing');
    console.error('ElevenLabs API Key length:', process.env.ELEVENLABS_API_KEY?.length || 0);
    
    try {
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_key_here') {
        throw new Error('OpenAI API key not configured');
      }
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: text,
        speed: 1.1
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      return buffer;
    } catch (fallbackError) {
      console.error('Fallback TTS error:', fallbackError);
      throw fallbackError;
    }
  }
}

module.exports = { streamTTS };
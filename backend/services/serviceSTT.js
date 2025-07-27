const axios = require('axios');
const fs = require('fs');

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

async function streamSTT(audioInput) {
  try {
    let audioBuffer;
    if (typeof audioInput === 'string') {
      audioBuffer = fs.readFileSync(audioInput);
    } else {
      audioBuffer = audioInput;
    }

    const uploadRes = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/upload',
      headers: {
        'authorization': ASSEMBLYAI_API_KEY,
        'transfer-encoding': 'chunked',
      },
      data: audioBuffer,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const audio_url = uploadRes.data.upload_url;

    const transcriptRes = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/transcript',
      headers: {
        'authorization': ASSEMBLYAI_API_KEY,
        'content-type': 'application/json',
      },
      data: {
        audio_url,
        punctuate: true,
        format_text: true,
      },
    });

    const transcriptId = transcriptRes.data.id;

    let transcriptText = '';
    let completed = false;
    while (!completed) {
      await new Promise(res => setTimeout(res, 3000));
      const pollingRes = await axios({
        method: 'get',
        url: `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        headers: { 'authorization': ASSEMBLYAI_API_KEY },
      });
      if (pollingRes.data.status === 'completed') {
        completed = true;
        transcriptText = pollingRes.data.text;
      } else if (pollingRes.data.status === 'failed') {
        throw new Error('Transcription failed');
      }
    }

    return transcriptText;
  } catch (error) {
    console.error('AssemblyAI STT error:', error);
    throw error;
  }
}

module.exports = { streamSTT };
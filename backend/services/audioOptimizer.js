const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

function optimizeAudioForSTT(inputPath) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join('temp', `optimized_${Date.now()}.wav`);
    
    ffmpeg(inputPath)
      .audioChannels(1)
      .audioFrequency(16000)
      .audioCodec('pcm_s16le')
      .format('wav')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}

async function preprocessAudio(audioPath) {
  try {
    const optimizedPath = await optimizeAudioForSTT(audioPath);
    return optimizedPath;
  } catch (error) {
    console.warn('Audio optimization failed, using original:', error.message);
    return audioPath;
  }
}

module.exports = { optimizeAudioForSTT, preprocessAudio };
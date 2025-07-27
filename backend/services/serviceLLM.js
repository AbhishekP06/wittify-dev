const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function streamLLM(userMessage, conversationHistory = []) {
  try {
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. Keep responses concise and conversational for voice interaction. Respond in 1-2 sentences max.'
      },
      ...conversationHistory.slice(-6),
      {
        role: 'user',
        content: userMessage
      }
    ];

    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 100,
      top_p: 0.9,
      stream: false
    });

    return completion.choices[0]?.message?.content || 'Sorry, I didn\'t understand that.';
  } catch (error) {
    console.error('Groq LLM error:', error);
    throw error;
  }
}

module.exports = { streamLLM };
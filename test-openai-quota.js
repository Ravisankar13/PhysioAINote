const OpenAI = require('openai');
require('dotenv').config();

async function checkOpenAIQuota() {
  try {
    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
    
    console.log('Testing OpenAI API connection...');
    
    // Make a minimal request to check quota
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 1
    });
    
    console.log('✅ OpenAI API is working!');
    console.log('Model:', response.model);
    console.log('Usage:', response.usage);
    console.log('Response ID:', response.id);
    
  } catch (error) {
    console.log('❌ OpenAI API Error:');
    console.log('Status:', error.status);
    console.log('Error:', error.message);
    
    if (error.status === 429) {
      console.log('🚫 Rate limit or quota exceeded');
    } else if (error.status === 401) {
      console.log('🔑 Invalid API key');
    } else if (error.status === 402) {
      console.log('💳 Payment required - quota exceeded');
    }
  }
}

checkOpenAIQuota();
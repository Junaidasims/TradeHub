require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key");
    return;
  }
  
  // Actually, GoogleGenerativeAI doesn't have a built-in listModels method easily accessible via the new client.
  // We can just fetch it directly via the REST API.
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await response.json();
  console.log("Available models:");
  if (data.models) {
    data.models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
  } else {
    console.log(data);
  }
}

listModels();

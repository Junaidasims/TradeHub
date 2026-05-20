require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  // let's try with model 'gemini-1.5-flash-latest' or just generate response from it
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'hello'
    });
    console.log(response.text);
  } catch (err) {}
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: 'hello'
    });
    console.log(response.text);
  } catch(e) { console.error(e.message); }
}

test();

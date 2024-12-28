import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('Google Gemini API key is not set. Please set NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY in your environment variables');
}

export const genAI = new GoogleGenerativeAI(apiKey);
export const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

export const defaultConfig = {
  temperature: 0.9,
  maxOutputTokens: 2048,
};

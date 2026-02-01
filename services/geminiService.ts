
import { GoogleGenAI } from "@google/genai";
import { Question, Language } from "../types";

export const geminiService = {
  getHint: async (description: string, currentCode: string, lang: Language): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Frontend Question Hint Request:
    Goal: ${description}
    Current Code: ${currentCode}
    Language preference: ${lang === 'zh' ? 'Chinese' : 'English'}
    Provide a concise hint (max 2 sentences) in the specified language.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      return response.text || (lang === 'zh' ? "继续加油！" : "Keep trying!");
    } catch (e) { return lang === 'zh' ? "请求提示出错" : "Check your console for errors!"; }
  },

  generateQuestion: async (topic: string, lang: Language): Promise<Question> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Generate a frontend hand-coding interview question about "${topic}". 
      All descriptive text (title, description, category) must be in ${lang === 'zh' ? 'Chinese' : 'English'}.
      Return the response in valid JSON format only, following this structure:
      {
        "title": "Short Title",
        "difficulty": "Easy" | "Medium" | "Hard",
        "description": "Clear requirements",
        "category": "e.g. Hooks, CSS",
        "tags": ["tag1", "tag2"],
        "react": { "initial": "starting code", "solution": "complete code" },
        "vue": { "initial": "starting template/script setup", "solution": "complete vue sfc code" }
      }`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("Failed to receive content from Gemini");
    
    const data = JSON.parse(text.trim());
    return {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      isStarred: false
    };
  }
};


import { GoogleGenAI } from "@google/genai";
import { Question, Language, AIModelConfig } from "../types";
import { storageService } from "./storageService";

export const aiService = {
  async getHint(description: string, currentCode: string, lang: Language): Promise<string> {
    const config = storageService.getStats().aiConfig;
    if (!config || !config.apiKey) {
      // Fallback to Gemini with system key if not configured manually
      return this.callGemini(description, currentCode, lang);
    }

    const prompt = `Frontend Question Hint Request:
    Goal: ${description}
    Current Code: ${currentCode}
    Language preference: ${lang === 'zh' ? 'Chinese' : 'English'}
    Provide a concise hint (max 2 sentences) in the specified language. Return ONLY the hint text.`;

    return this.callProvider(config, prompt);
  },

  async generateQuestion(topic: string, lang: Language): Promise<Question> {
    const config = storageService.getStats().aiConfig;
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

    let jsonResponse: string;
    // Use manual config if apiKey is provided, even for gemini
    if (config && config.apiKey) {
      jsonResponse = await this.callProvider(config, prompt);
    } else {
      // Fallback to default system gemini
      jsonResponse = await this.callGeminiJson(prompt);
    }

    try {
      const data = JSON.parse(jsonResponse.trim().replace(/```json|```/g, ''));
      return {
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
        isStarred: false
      };
    } catch (e) {
      console.error("AI Response parsing failed", e, jsonResponse);
      throw new Error("Failed to parse AI response");
    }
  },

  async callGemini(description: string, currentCode: string, lang: Language): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Hint for: ${description}. Code: ${currentCode}. Lang: ${lang}`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite-latest',
      contents: prompt,
    });
    return response.text || "Keep coding!";
  },

  async callGeminiJson(prompt: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return response.text || "";
  },

  async callProvider(config: AIModelConfig, prompt: string): Promise<string> {
    const { provider, model, apiKey, baseUrl } = config;

    // Default endpoints
    const endpoints: Record<string, string> = {
      openai: "https://api.openai.com/v1/chat/completions",
      anthropic: "https://api.anthropic.com/v1/messages",
      deepseek: "https://api.deepseek.com/chat/completions",
      groq: "https://api.groq.com/openai/v1/chat/completions",
      mistral: "https://api.mistral.ai/v1/chat/completions",
      moonshot: "https://api.moonshot.cn/v1/chat/completions",
      qianwen: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      hunyuan: "https://api.hunyuan.cloud.tencent.com/v1/chat/completions",
      gemini: "https://generativelanguage.googleapis.com/v1beta/models/" 
    };

    const url = baseUrl || endpoints[provider];

    if (provider === 'anthropic') {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await response.json();
      return data.content[0].text;
    }

    // OpenAI compatible providers (DeepSeek, Groq, Mistral, Moonshot, Qianwen, Hunyuan)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "API Request Failed");
    return data.choices[0].message.content;
  }
};

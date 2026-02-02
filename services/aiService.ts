import { GoogleGenAI } from "@google/genai";
import { Question, Language, AIModelConfig } from "../types";
import { storageService } from "./storageService";

export const aiService = {
  async getHint(description: string, currentCode: string, lang: Language): Promise<string> {
    const config = storageService.getStats().aiConfig;
    
    // Always use callGemini for Gemini provider to ensure correct API key and model usage
    if (config?.provider === 'gemini') {
      return this.callGemini(description, currentCode, lang);
    }

    if (!config || !config.apiKey) {
      return this.callGemini(description, currentCode, lang);
    }

    const prompt = `Frontend Question Hint Request:
    Goal: ${description}
    Current Code: ${currentCode}
    Language preference: ${lang === 'zh' ? 'Chinese' : 'English'}
    Provide a concise hint (max 2 sentences) in the specified language. Return ONLY the hint text.`;

    return this.callProvider(config, prompt);
  },

  async testConnection(config: AIModelConfig): Promise<boolean> {
    const prompt = "Please respond with exactly the word 'OK'.";
    try {
      // For Gemini, we use process.env.API_KEY and assumed to be valid if provided
      if (config.provider === 'gemini') {
        const result = await this.callGeminiJson(prompt);
        return typeof result === 'string' && result.toLowerCase().includes("ok");
      }

      if (!config.apiKey || !config.apiKey.trim()) {
        console.warn("Test connection failed: API Key is empty.");
        return false;
      }

      const result = await this.callProvider(config, prompt);
      console.log("Connection test response:", result);
      return typeof result === 'string' && result.toLowerCase().includes("ok");
    } catch (e: any) {
      console.error("Connectivity test failed details:", e.message || e);
      return false;
    }
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
    // For Gemini, we always ignore config.apiKey and use process.env.API_KEY
    if (config?.provider === 'gemini') {
      jsonResponse = await this.callGeminiJson(prompt);
    } else if (config && config.apiKey && config.apiKey.trim()) {
      jsonResponse = await this.callProvider(config, prompt);
    } else {
      jsonResponse = await this.callGeminiJson(prompt);
    }

    try {
      const cleaned = jsonResponse.trim().replace(/^```json/, '').replace(/```$/, '');
      const data = JSON.parse(cleaned);
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

  // Simplified helper for text content generation with Gemini
  async callGemini(description: string, currentCode: string, lang: Language): Promise<string> {
    // Initializing Gemini with process.env.API_KEY as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Hint for: ${description}. Code: ${currentCode}. Lang: ${lang}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Keep coding!";
  },

  // Simplified helper for JSON content generation with Gemini
  async callGeminiJson(prompt: string): Promise<string> {
    // Initializing Gemini with process.env.API_KEY as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return response.text || "";
  },

  async callProvider(config: AIModelConfig, prompt: string): Promise<string> {
    const provider = config.provider;
    const apiKey = (config.apiKey || "").trim();
    const model = (config.model || "").trim();
    const baseUrl = (config.baseUrl || "").trim();

    // Gemini logic for official SDK using mandatory process.env.API_KEY
    if (provider === 'gemini' && !baseUrl) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: model || 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "";
    }

    // Default API endpoints and fallback models for other providers
    const defaultModels: Record<string, string> = {
      openai: "gpt-3.5-turbo",
      anthropic: "claude-3-haiku-20240307",
      deepseek: "deepseek-chat",
      groq: "llama3-8b-8192",
      mistral: "mistral-tiny",
      moonshot: "moonshot-v1-8k",
      qianwen: "qwen-turbo",
      hunyuan: "hunyuan-lite"
    };

    const endpoints: Record<string, string> = {
      openai: "https://api.openai.com/v1/chat/completions",
      anthropic: "https://api.anthropic.com/v1/messages",
      deepseek: "https://api.deepseek.com/chat/completions",
      groq: "https://api.groq.com/openai/v1/chat/completions",
      mistral: "https://api.mistral.ai/v1/chat/completions",
      moonshot: "https://api.moonshot.cn/v1/chat/completions",
      qianwen: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      hunyuan: "https://api.hunyuan.cloud.tencent.com/v1/chat/completions"
    };

    // URL Resolution for standard chat completion endpoints
    let url = baseUrl || endpoints[provider] || endpoints['openai'];
    if (provider !== 'anthropic' && !url.toLowerCase().includes('/completions')) {
      url = url.replace(/\/+$/, '');
      if (!url.toLowerCase().includes('/v1') && provider !== 'qianwen') {
        url += '/v1';
      }
      url += '/chat/completions';
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let body: any;

    if (provider === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      headers['dangerously-allow-browser'] = 'true';
      body = {
        model: model || defaultModels.anthropic,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }]
      };
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model: model || defaultModels[provider] || 'gpt-3.5-turbo',
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      };
    }

    try {
      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!response.ok) {
        let errorDetail = "";
        try {
          const errorJson = await response.json();
          errorDetail = errorJson.error?.message || errorJson.message || JSON.stringify(errorJson);
        } catch (e) {
          const errorText = await response.text();
          errorDetail = errorText || `HTTP status ${response.status}`;
        }
        throw new Error(`API Error (${response.status}): ${errorDetail}`);
      }
      const data = await response.json();
      if (provider === 'anthropic') return data.content[0].text;
      if (data.choices && data.choices[0]?.message?.content) return data.choices[0].message.content;
      throw new Error("Unrecognized response format from the API provider.");
    } catch (e: any) {
      console.error(`[AI Provider ${provider} Failed]`, e.message || e);
      throw e;
    }
  }
};
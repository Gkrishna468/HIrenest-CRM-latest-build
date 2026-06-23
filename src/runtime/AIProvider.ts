import { GoogleGenAI } from "@google/genai";

export interface AIProviderConfig {
  provider: "gemini" | "openai" | "claude";
  model: string;
}

export class AIProvider {
  private static geminiClient = process.env.GEMINI_API_KEY 
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) 
    : null;

  static async generate(prompt: string, config: AIProviderConfig = { provider: "gemini", model: "gemini-2.5-flash" }): Promise<string> {
    if (config.provider === "gemini") {
      if (!this.geminiClient) {
        throw new Error("Gemini client not initialized. GEMINI_API_KEY missing.");
      }
      
      const response = await this.geminiClient.models.generateContent({
        model: config.model,
        contents: prompt,
      });

      return response.text || "";
    }

    throw new Error(`Provider ${config.provider} not supported yet.`);
  }

  static async generateWithSchema(prompt: string, schema: any, config: AIProviderConfig = { provider: "gemini", model: "gemini-2.5-flash" }): Promise<string> {
    if (config.provider === "gemini") {
      if (!this.geminiClient) {
        throw new Error("Gemini client not initialized. GEMINI_API_KEY missing.");
      }
      
      const response = await this.geminiClient.models.generateContent({
        model: config.model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.2
        }
      });

      return response.text || "";
    }

    throw new Error(`Provider ${config.provider} not supported yet.`);
  }
}

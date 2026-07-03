import { GoogleGenAI } from "@google/genai";
import { db } from "@/services/firebase/config";
import { addDoc, collection } from "firebase/firestore";

// Standardize on a single supported model configuration throughout the codebase.
export const DEFAULT_AI_MODEL = "gemini-2.5-flash";

// Get Ollama configuration from environment
const OLLAMA_API_URL = ((typeof process !== "undefined" ? process.env.OLLAMA_API_URL : import.meta.env.VITE_OLLAMA_API_URL) || "http://localhost:11434").replace(/^"|"$/g, "").replace(/^'|'$/g, "");
const OLLAMA_MODEL = ((typeof process !== "undefined" ? process.env.OLLAMA_MODEL : import.meta.env.VITE_OLLAMA_MODEL) || "llama3").replace(/^"|"$/g, "").replace(/^'|'$/g, "");

let aiClient: GoogleGenAI | null = null;

export function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = ((typeof process !== "undefined" ? process.env.GEMINI_API_KEY : import.meta.env.VITE_GEMINI_API_KEY) || "").replace(/^"|"$/g, "").replace(/^'|'$/g, "");
    if (!apiKey || apiKey === 'undefined') {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in your environment variables.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

interface AILogOptions {
  agentName: string;
  prompt: string;
  modelUsed?: string;
  metadata?: any;
}

// Helper to make a timed-out fetch request to Ollama
async function fetchOllama(prompt: string, formatJson: boolean = false, timeoutMs: number = 3000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.2,
        },
        ...(formatJson ? { format: "json" } : {}),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response || "";
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Executes a text generation model with central logging and audit trail of AI executions.
 * First tries Ollama, falls back to Gemini if Ollama fails/times out.
 */
export async function executeAITask(options: AILogOptions): Promise<string> {
  const startTime = Date.now();
  let result = "";
  let errorMsg = "";
  let providerUsed = "ollama";
  let finalModel = OLLAMA_MODEL;

  try {
    // 1. Try Ollama first
    result = await fetchOllama(options.prompt, false, 3000);
  } catch (ollamaErr: any) {
    console.warn(`[AI Gateway] Ollama execution failed, falling back to Gemini. Error: ${ollamaErr.message || ollamaErr}`);
    providerUsed = "gemini";
    finalModel = options.modelUsed || DEFAULT_AI_MODEL;

    // 2. Fallback to Gemini
    try {
      const client = getAIClient();
      const response = await client.models.generateContent({
        model: finalModel,
        contents: options.prompt,
      });
      result = response.text || "";
    } catch (geminiErr: any) {
      errorMsg = geminiErr?.message || String(geminiErr);
      throw geminiErr;
    }
  } finally {
    const latency = Date.now() - startTime;
    // central logging of AI audit trials to firestore 'agent_logs' & 'agent_executions'
    try {
      await addDoc(collection(db, 'agent_logs'), {
        type: 'AI_EXECUTION',
        level: errorMsg ? 'error' : 'info',
        message: `[AI Gateway] Executed ${options.agentName} with ${providerUsed} (model ${finalModel}). Latency: ${latency}ms.`,
        metadata: {
          agentName: options.agentName,
          provider: providerUsed,
          model: finalModel,
          latency,
          error: errorMsg || null,
          promptSnippet: options.prompt.slice(0, 200),
          resultSnippet: result.slice(0, 200),
          ...(options.metadata || {})
        },
        createdAt: new Date().toISOString()
      });
    } catch (logErr) {
      console.warn("Failed to write to agent_logs in Firestore:", logErr);
    }
  }
  return result;
}

/**
 * Executes a structured text generation model with responseSchema, central logging and audit trail.
 * First tries Ollama, falls back to Gemini if Ollama fails/times out.
 */
export async function executeAITaskWithSchema(options: AILogOptions & { responseSchema: any }): Promise<string> {
  const startTime = Date.now();
  let result = "";
  let errorMsg = "";
  let providerUsed = "ollama";
  let finalModel = OLLAMA_MODEL;

  try {
    // 1. Try Ollama first
    result = await fetchOllama(options.prompt, true, 3000);
  } catch (ollamaErr: any) {
    console.warn(`[AI Gateway] Structured Ollama execution failed, falling back to Gemini. Error: ${ollamaErr.message || ollamaErr}`);
    providerUsed = "gemini";
    finalModel = options.modelUsed || DEFAULT_AI_MODEL;

    // 2. Fallback to Gemini
    try {
      const client = getAIClient();
      const response = await client.models.generateContent({
        model: finalModel,
        contents: options.prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: options.responseSchema,
          temperature: 0.2
        }
      });
      result = response.text || "";
    } catch (geminiErr: any) {
      errorMsg = geminiErr?.message || String(geminiErr);
      throw geminiErr;
    }
  } finally {
    const latency = Date.now() - startTime;
    try {
      await addDoc(collection(db, 'agent_logs'), {
        type: 'AI_EXECUTION_SCHEMA',
        level: errorMsg ? 'error' : 'info',
        message: `[AI Gateway] Executed structured ${options.agentName} with ${providerUsed} (model ${finalModel}). Latency: ${latency}ms.`,
        metadata: {
          agentName: options.agentName,
          provider: providerUsed,
          model: finalModel,
          latency,
          error: errorMsg || null,
          promptSnippet: options.prompt.slice(0, 200),
          resultSnippet: result.slice(0, 200),
          ...(options.metadata || {})
        },
        createdAt: new Date().toISOString()
      });
    } catch (logErr) {
      console.warn("Failed to write to agent_logs in Firestore:", logErr);
    }
  }
  return result;
}

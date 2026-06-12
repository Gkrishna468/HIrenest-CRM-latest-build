/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { safeString, safeArray } from "@/utils/safe";
import { supabase } from "@/lib/supabase";

let aiClient: GoogleGenAI | null = null;

function getAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export interface BrainInsight {
  profile: {
    intent: 'hiring' | 'candidate' | 'vendor' | 'other';
    roles: string[];
    urgency: 'high' | 'medium' | 'low';
    budget: 'high' | 'mid' | 'low';
    sentiment: string;
  };
  pitch: string;
  followUp: {
    suggested: boolean;
    reason: string;
    timeline: string;
  };
}

/**
 * The Unified AI Brain: Processes any interaction and returns full intelligence
 */
export async function processInteraction(text: string, context?: any): Promise<BrainInsight> {
  const prompt = `
    Act as the "Unified Intelligence Brain" for HireNest Enterprise CRM.
    Analyze the following interaction (Email, WhatsApp, or JD) and generate a strategy.

    INTERACTION TEXT:
    "${text}"

    CONTEXT:
    ${JSON.stringify(context || {})}

    TASKS:
    1. PROFILE: Determine if they want to hire, apply for a job, or partner as a vendor. Extract roles/skills.
    2. PITCH: Generate a short, conversion-focused pitch (WhatsApp style).
    3. FOLLOW-UP: Decide if we should follow up and when.

    RETURN ONLY JSON:
    {
      "profile": {
        "intent": "hiring" | "candidate" | "vendor" | "other",
        "roles": ["Role 1", "Role 2"],
        "urgency": "high" | "medium" | "low",
        "budget": "high" | "mid" | "low",
        "sentiment": "string"
      },
      "pitch": "string",
      "followUp": {
        "suggested": boolean,
        "reason": "string",
        "timeline": "e.g. 24 hours"
      }
    }
  `;

  try {
    const ai = getAI();
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    const cleanText = (result.text || '').replace(/```json|```/g, "").trim();
    const insight = JSON.parse(cleanText);

    // Auto-log to Supabase for Memory Layer
    await supabase.from('agent_logs').insert({
      type: 'brain_process',
      message: `AI Brain processed interaction: ${insight.profile.intent}`,
      metadata: { text, insight }
    });

    return insight;
  } catch (error) {
    console.error("Brain execution failed:", error);
    return {
      profile: { intent: 'other', roles: [], urgency: 'low', budget: 'mid', sentiment: 'Neutral' },
      pitch: "I've received your message and will get back to you shortly.",
      followUp: { suggested: false, reason: "System processing issue", timeline: "N/A" }
    };
  }
}

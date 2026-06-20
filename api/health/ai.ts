import type { VercelRequest, VercelResponse } from "@vercel/node";
import dotenv from "dotenv";
dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return res.json({
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    googleConfigured: !!process.env.GOOGLE_API_KEY
  });
}

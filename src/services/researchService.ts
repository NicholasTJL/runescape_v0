import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function researchRuneScapeFeatures() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "List the core gameplay features of RuneScape that define its identity (skills, combat, economy, world interaction, UI). Provide a concise summary for a game developer building a clone.",
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  return response.text;
}

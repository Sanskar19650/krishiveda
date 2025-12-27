
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const verifyCropImage = async (base64Image: string, expectedCrop: string, category: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
        { text: `Does this image show a ${expectedCrop} which belongs to the ${category} category? Reply with a JSON object containing "match" (boolean) and "reason" (string).` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          match: { type: Type.BOOLEAN },
          reason: { type: Type.STRING }
        },
        required: ["match", "reason"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const getFertilizerRecommendation = async (reportData: string, totalArea: number) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on this soil test data: "${reportData}", provide specific fertilizer recommendations for a farm size of ${totalArea} acres. 
    1. Provide per-acre dosage.
    2. Provide total dosage for all ${totalArea} acres.
    3. Include N-P-K ratios, specific commercial products (like Urea, DAP, etc.), and timing of application.
    Return formatted markdown with clear sections.`
  });
  return response.text;
};

export const getMarketInsights = async (cropData: any[]) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this sowing data for the region: ${JSON.stringify(cropData)}. 
    Predict if there is a risk of overproduction for any specific crop. 
    Suggest ideal market timing. Return a professional analysis summary.`
  });
  return response.text;
};

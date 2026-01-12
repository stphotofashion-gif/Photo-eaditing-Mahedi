
import { GoogleGenAI } from "@google/genai";

export const processImageAI = async (
  base64Image: string, 
  instruction: string, 
  mode: 'bg_remove' | 'upscale' | 'dress_change' | 'face_retouch'
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash-image';
  
  const imagePart = {
    inlineData: {
      mimeType: 'image/png',
      data: base64Image.split(',')[1],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, { text: instruction }] },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error: any) {
    console.error("AI Process Error:", error);
    throw error;
  }
};

export const mergeTwoPhotos = async (photo1: string, photo2: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts = [
    { inlineData: { mimeType: 'image/png', data: photo1.split(',')[1] } },
    { inlineData: { mimeType: 'image/png', data: photo2.split(',')[1] } },
    { text: "ACT AS A MASTER PHOTO EDITOR. Take these two individual portrait photos and merge them into one single high-quality studio portrait. Place the two people SIDE-BY-SIDE. The background MUST be PURE WHITE. DO NOT CHANGE THE FACES; keep the original facial features 100% identical and recognizable. Adjust lighting to match both perfectly. Output must be in 4K resolution, crystal clear, sharp details." }
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error: any) {
    console.error("Merge Process Error:", error);
    throw error;
  }
};

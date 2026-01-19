
import { GoogleGenAI } from "@google/genai";
import { PhotoboothSettings } from "../types";

export const generateAIImage = async (base64Source: string, prompt: string, aspectRatio: '9:16' | '16:9' = '9:16') => {
  try {
    // 1. Dapatkan model terpilih dari Local Storage (Settings)
    const storedSettings = localStorage.getItem('pb_settings');
    let selectedModel = 'gemini-2.5-flash-image';
    
    if (storedSettings) {
      const parsedSettings: PhotoboothSettings = JSON.parse(storedSettings);
      if (parsedSettings.selectedModel) {
        selectedModel = parsedSettings.selectedModel;
      }
    }

    // 2. Gunakan Environment Variable (Vercel)
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      throw new Error("Server Environment Error: API Key is missing. Please check Vercel settings.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const mimeType = base64Source.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
    const cleanBase64 = base64Source.split(',')[1];

    // Function untuk memanggil model dengan konfigurasi dinamis
    const executeGenAI = async (model: string, useProConfig: boolean) => {
      const imageConfig: any = {
        aspectRatio: aspectRatio,
      };

      // Hanya Gemini 3 Pro yang support parameter 'imageSize'
      if (useProConfig) {
        imageConfig.imageSize = '1K';
      }

      return await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType,
              },
            },
            {
              text: `${prompt}. High resolution, ${aspectRatio} aspect ratio, cinematic lighting, photorealistic, maintaining person's facial features and identity. No text, no watermark.`,
            },
          ],
        },
        config: {
          imageConfig: imageConfig
        }
      });
    };

    let response;
    
    try {
      // PRIORITY 1: Coba model pilihan User (Admin)
      if (selectedModel.includes('pro')) {
         console.log("Attempting generation with selected model: Gemini 3 Pro...");
         response = await executeGenAI('gemini-3-pro-image-preview', true);
      } else {
         console.log("Attempting generation with selected model: Gemini 2.5 Flash...");
         response = await executeGenAI('gemini-2.5-flash-image', false);
      }
      
    } catch (err: any) {
      console.warn(`Model ${selectedModel} failed. Reason:`, err.message);
      
      // FALLBACK LOGIC
      // Jika user memilih Pro tapi gagal karena Billing/Permission (403), otomatis turun ke Flash
      if (
        selectedModel.includes('pro') &&
        (err.toString().includes('403') || 
         err.toString().includes('Permission denied') ||
         err.toString().includes('404') ||
         err.toString().includes('not found'))
      ) {
        console.log("Falling back to Gemini 2.5 Flash (Free Tier Compatible)...");
        response = await executeGenAI('gemini-2.5-flash-image', false);
      } else {
        // Jika errornya bukan karena permission (misal safety, atau Flash sendiri yang error), lempar error asli
        throw err;
      }
    }

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString: string = part.inlineData.data;
          return `data:image/png;base64,${base64EncodeString}`;
        }
      }
    }
    
    throw new Error("No image data returned from Gemini");
    
  } catch (error: any) {
    console.error("Gemini Generation Final Error:", error);
    if (error.message?.includes("403") || error.toString().includes("Permission denied")) {
      throw new Error("API Key Permission Denied. Ensure your Google Cloud Project has Billing Enabled for Pro models.");
    }
    throw error;
  }
};

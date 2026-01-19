import { GoogleGenAI } from "@google/genai";
import { PhotoboothSettings } from "../types";

type AspectRatio = "9:16" | "16:9";

export const generateAIImage = async (
  base64Source: string,
  prompt: string,
  aspectRatio: AspectRatio = "9:16"
) => {
  try {
    // 1) Ambil model terpilih dari Local Storage (Settings)
    let selectedModel = "gemini-2.5-flash-image";

    const storedSettings = localStorage.getItem("pb_settings");
    if (storedSettings) {
      try {
        const parsedSettings: PhotoboothSettings = JSON.parse(storedSettings);
        if (parsedSettings?.selectedModel) {
          selectedModel = parsedSettings.selectedModel;
        }
      } catch {
        // kalau JSON rusak, abaikan dan pakai default
      }
    }

    // 2) Env Vite (akan di-inject saat build di Vercel)
    const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || "";

    if (!apiKey) {
      throw new Error(
        "VITE_GEMINI_API_KEY is missing. Set it in Vercel Environment Variables then redeploy."
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // 3) Validasi base64
    if (!base64Source || !base64Source.includes(",")) {
      throw new Error("Invalid base64Source format. Expected data:<mime>;base64,<data>.");
    }

    const mimeType = base64Source.startsWith("data:image/png")
      ? "image/png"
      : "image/jpeg";

    const cleanBase64 = base64Source.split(",")[1];
    if (!cleanBase64) {
      throw new Error("Invalid base64Source: missing base64 data.");
    }

    // Helper: panggil model dengan konfigurasi dinamis
    const executeGenAI = async (model: string, useProConfig: boolean) => {
      const imageConfig: any = { aspectRatio };

      // Hanya Pro (sesuai logika kamu) yang butuh imageSize
      if (useProConfig) {
        imageConfig.imageSize = "1K";
      }

      return await ai.models.generateContent({
        model,
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType,
              },
            },
            {
              text: `${prompt}. High resolution, ${aspectRatio} aspect ratio, cinematic lighting, photorealistic, maintaining person's facial features and identity. No text, no watermark.`,
            },
          ],
        },
        config: {
          imageConfig,
        },
      });
    };

    // 4) Decide model berdasarkan settings
    const wantsPro = selectedModel.toLowerCase().includes("pro");

    let response: any;

    try {
      if (wantsPro) {
        console.log("Attempting generation with selected model: Gemini 3 Pro...");
        response = await executeGenAI("gemini-3-pro-image-preview", true);
      } else {
        console.log("Attempting generation with selected model: Gemini 2.5 Flash...");
        response = await executeGenAI("gemini-2.5-flash-image", false);
      }
    } catch (err: any) {
      const errText = String(err?.message ?? err);

      console.warn(`Model ${selectedModel} failed. Reason:`, errText);

      // FALLBACK: pro -> flash untuk kasus permission/model not found
      const shouldFallback =
        wantsPro &&
        (errText.includes("403") ||
          errText.toLowerCase().includes("permission denied") ||
          errText.includes("404") ||
          errText.toLowerCase().includes("not found"));

      if (shouldFallback) {
        console.log("Falling back to Gemini 2.5 Flash (Free Tier Compatible)...");
        response = await executeGenAI("gemini-2.5-flash-image", false);
      } else {
        throw err;
      }
    }

    // 5) Ambil hasil gambar
    const candidates = response?.candidates;
    if (candidates?.length > 0) {
      const parts = candidates[0]?.content?.parts || [];
      for (const part of parts) {
        const data = part?.inlineData?.data;
        if (data) {
          return `data:image/png;base64,${data}`;
        }
      }
    }

    throw new Error("No image data returned from Gemini.");
  } catch (error: any) {
    const msg = String(error?.message ?? error);
    console.error("Gemini Generation Final Error:", msg);

    // Pesan yang lebih jelas untuk kasus permission
    if (msg.includes("403") || msg.toLowerCase().includes("permission denied")) {
      throw new Error(
        "API Key Permission Denied (403). If using Pro model, ensure Billing/permission enabled. Otherwise use Flash."
      );
    }

    throw error;
  }
};

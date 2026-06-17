/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Google GenAI client lazily to avoid crashing on start if API key is missing
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined in the environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY_FOR_BUILD",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST Endpoint: AI Lyric Sheet & Translation Generator
app.post("/api/gemini/lyrics", async (req, res) => {
  try {
    const { songTitle, artistName, prompt, targetLanguage = "Indonesian" } = req.body;
    const ai = getGenAI();

    // Check if key exists
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY to your secrets.",
        isMock: true,
        lyrics: [
          { text: "This is a demo lyric line 1", sub: "Ini baris lirik demo 1" },
          { text: "Walking under the midnight neon lights", sub: "Berjalan di bawah lampu neon tengah malam" },
          { text: "Synthesizing the frequencies of sound", sub: "Mensintesis frekuensi suara" },
          { text: "We create the future with digital visions", sub: "Kita menciptakan masa depan dengan visi digital" }
        ]
      });
    }

    let userInstruction = `Generate lyrics for a original song or reproduce matching lyrics.
Song details: Title: "${songTitle || "Untitled"}", Artist: "${artistName || "Unknown"}"`;
    if (prompt) {
      userInstruction += `\nCreative Direction / Theme: ${prompt}`;
    }
    userInstruction += `\nProvide Indonesian translation subtitles for each line. Provide between 6 to 12 elegant lines of lyrics. Keep lines short.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: userInstruction,
      config: {
        systemInstruction: "You are an expert songwriter, music lyricist, and translator. Return clean, correctly matched line-by-line lyrics with translations in JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lyrics: {
              type: Type.ARRAY,
              description: "Array of lyric lines with their original text and Indonesian translation subtitles",
              items: {
                type: Type.OBJECT,
                properties: {
                  text: {
                    type: Type.STRING,
                    description: "Original English or source lyric line text"
                  },
                  sub: {
                    type: Type.STRING,
                    description: "High-quality translations or subtitles (Bahasa Indonesia)"
                  }
                },
                required: ["text", "sub"]
              }
            }
          },
          required: ["lyrics"]
        }
      }
    });

    const bodyText = response.text;
    if (!bodyText) {
      throw new Error("Empty response from Gemini API");
    }

    const data = JSON.parse(bodyText);
    res.json(data);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({
      error: error.message || "Failed to process lyrics using Gemini AI.",
      lyrics: [
        { text: "Walking in the neon rain tonight", sub: "Berjalan di tengah hujan neon malam ini" },
        { text: "Analog heartbeats pulsing through the wires", sub: "Detak jantung analog berdenyut melalui kabel" },
        { text: "Singing melodies for digital souls", sub: "Menyanyikan melodi untuk jiwa-jiwa digital" },
        { text: "This is our synthetic dream", sub: "Ini adalah mimpi sintetis kita" }
      ]
    });
  }
});

// REST Endpoint: Quick Subtitle Translator
app.post("/api/gemini/translate", async (req, res) => {
  try {
    const { lines, targetLanguage = "Indonesian" } = req.body;
    if (!lines || !Array.isArray(lines)) {
      return res.status(400).json({ error: "Invalid lines array submitted" });
    }

    const ai = getGenAI();

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY in the secrets list.",
        translations: lines.map(line => `[Translated] ${line}`)
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Translate the following lyric lines into clean ${targetLanguage}. Keep poetic matching and concise layout.
Lines to translate:
${JSON.stringify(lines)}`,
      config: {
        systemInstruction: "Translate lyric lines and output clean JSON containing translated subtitles matching each input index.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["translations"]
        }
      }
    });

    const bodyText = response.text;
    if (!bodyText) throw new Error("Empty translation output");

    const data = JSON.parse(bodyText);
    res.json(data);
  } catch (error: any) {
    console.error("Gemini Translation Error:", error);
    res.status(500).json({
      error: error.message || "Failed to translate lyrics using Gemini AI.",
      translations: (req.body.lines || []).map((line: string) => `Sub: ${line}`)
    });
  }
});

// Integrate Vite Middleware for live development, or static fallback in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite server middleware in Development...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Setting up static file serving from /dist folder in Production...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NDK.VSpecs Server actively listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

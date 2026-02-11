import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AnalysisResult } from "../types";
import { decodeBase64, decodeAudioData, playAudioBuffer } from "./audioUtils";

const API_KEY = process.env.API_KEY || '';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Constants for models
const VISION_MODEL = 'gemini-3-flash-preview';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

export type EmotionIntensity = 'Low' | 'Medium' | 'High';

/**
 * Helper to wait for a specified duration.
 */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retries an operation with exponential backoff if a rate limit error occurs.
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delay: number = 2000
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (retries <= 0) throw error;

    // Check for 429 (Rate Limit) or 503 (Server Overloaded)
    // The error might be an object or a JSON string in the message
    const errString = error?.message || JSON.stringify(error);
    const isRateLimit = 
      errString.includes("429") || 
      errString.includes("RESOURCE_EXHAUSTED") ||
      errString.includes("503") ||
      errString.includes("Overloaded");

    if (isRateLimit) {
      console.warn(`API Rate Limit hit (429/503). Retrying in ${delay}ms...`);
      await wait(delay);
      return retryWithBackoff(operation, retries - 1, delay * 2);
    }

    throw error;
  }
}

/**
 * Step 1: Analyze the screen content.
 */
export const analyzeScreen = async (
  fullScreenshotBase64: string,
  croppedDialogBase64: string,
  gameScriptContext: string = ""
): Promise<AnalysisResult> => {
  if (!API_KEY) throw new Error("API Key is missing");

  const prompt = `
    You are an AI assistant for a Visual Novel player.
    
    Attached are two images:
    1. A cropped image (Target) containing ONLY the dialogue text. This is the PRIMARY source for text.
    2. A downscaled full game screenshot showing the character and scene. This is ONLY for context (character name, emotion).

    Your task:
    1. Read the dialogue text accurately from the FIRST image (cropped). Ignore UI elements like "Auto", "Skip", "Save".
    2. Identify the character speaking by looking at the SECOND image (full screen). If the name is in the dialogue box (first image), use that.
    3. Analyze the character's facial expression, eyes, and body language in the SECOND image to determine their exact emotion (e.g., happy, sad, angry, surprised, shy, playful). If no character is visible, infer the emotion from the dialogue text.
    
    ${gameScriptContext ? `Here is a snippet of the game script to help you match the text: ${gameScriptContext.slice(0, 1000)}` : ''}

    Return JSON format.
  `;

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: VISION_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: croppedDialogBase64
            }
          },
          {
            inlineData: {
              mimeType: 'image/jpeg', // Full frame is likely resized jpeg now
              data: fullScreenshotBase64
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            character: { type: Type.STRING },
            emotion: { type: Type.STRING },
          },
          required: ['text', 'character', 'emotion']
        }
      }
    }));

    const textResponse = response.text;
    if (!textResponse) throw new Error("No response from Vision model");
    
    // Sometimes the model might wrap JSON in markdown code blocks, strip them if present.
    const cleanText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanText) as AnalysisResult;

  } catch (error) {
    console.error("Vision Analysis Error:", error);
    throw error;
  }
};

/**
 * Step 2: Generate Audio based on the analysis.
 * Supports Gemini TTS or a generic Third-Party (OpenAI-compatible) endpoint.
 */
export const generateSpeech = async (
  text: string,
  character: string,
  emotion: string,
  existingContext: AudioContext,
  voiceName: string = 'Auto',
  thirdPartyConfig?: { apiKey: string, endpoint: string, model?: string },
  options: { speed?: number, intensity?: EmotionIntensity } = {}
): Promise<AudioBufferSourceNode> => {
  
  const { speed = 1.0, intensity = 'Medium' } = options;

  // Validate input
  if (!text || !text.trim()) {
     throw new Error("Cannot generate speech for empty text");
  }

  // 1. Third Party Path (OpenAI Compatible)
  if (thirdPartyConfig) {
    try {
      // Use provided voice name directly (allows for OpenAI names 'alloy' or ElevenLabs IDs)
      // If voiceName is 'Auto' or 'ThirdParty', default to 'alloy'.
      const tpVoice = (voiceName === 'Auto' || voiceName === 'ThirdParty') ? 'alloy' : voiceName;
      
      const headers: Record<string, string> = {
          'Content-Type': 'application/json'
      };

      if (thirdPartyConfig.apiKey) {
          headers['Authorization'] = `Bearer ${thirdPartyConfig.apiKey}`;
      }
      
      const response = await fetch(thirdPartyConfig.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: thirdPartyConfig.model || 'tts-1',
          input: text,
          voice: tpVoice,
          speed: speed 
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Third-party TTS failed: ${response.status} ${errText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      // Use native decode for standard formats (mp3, etc)
      const audioBuffer = await existingContext.decodeAudioData(arrayBuffer);
      return playAudioBuffer(existingContext, audioBuffer, 1.0); // Speed applied by API

    } catch (e) {
      console.error("Third Party TTS Error", e);
      throw e;
    }
  }

  // 2. Gemini TTS Path
  if (!API_KEY) throw new Error("Gemini API Key is missing");

  // Determine Gemini Voice
  let actualVoiceName = voiceName;
  if (actualVoiceName === 'Auto') {
     const isFemale = !['Dad', 'Grandpa', 'Boy', 'Man', 'Kyle', 'Protagonist'].includes(character); 
     actualVoiceName = isFemale ? 'Kore' : 'Fenrir';
  }

  // Map intensity to adjectives for prompt engineering
  const intensityAdjectives = {
    'Low': 'subtle, restrained',
    'Medium': 'clear, distinct',
    'High': 'strong, intense, exaggerated'
  };

  const toneInstruction = intensityAdjectives[intensity] || intensityAdjectives['Medium'];

  // Cleaner prompt structure to handle quotes in text
  const ttsPrompt = `
    Character: ${character}
    Emotion: ${emotion} (Intensity: ${toneInstruction})
    
    Please say the following line:
    ${text}
  `;

  try {
    // Wrapped in retryWithBackoff
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: ttsPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: actualVoiceName },
          },
        },
      },
    }));

    // Check all parts for audio data
    let base64Audio: string | undefined;
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
                base64Audio = part.inlineData.data;
                break;
            }
        }
    }
    
    if (!base64Audio) {
      // If we got text back instead of audio, log it
      const textPart = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textPart) {
          console.warn("TTS Model returned text instead of audio:", textPart);
      }
      throw new Error("No audio data returned. The model may have refused the request or returned text.");
    }

    const audioBytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, existingContext);
    
    // Play with playbackRate adjustment
    return playAudioBuffer(existingContext, audioBuffer, speed);

  } catch (error) {
    console.error("TTS Generation Error:", error);
    throw error;
  }
};
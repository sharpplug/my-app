'use server';

/**
 * @fileOverview A multimodal AI call flow for Naya.
 * 
 * - nayaCallResponse - Handles video frame analysis and generates a spoken AI response.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/google-genai';
// @ts-expect-error - 'wav' has no published type declarations
import wav from 'wav';

const NayaCallInputSchema = z.object({
  photoDataUri: z.string().optional().describe("A base64 encoded frame from the user's camera."),
  userMessage: z.string().describe("The user's spoken or typed message."),
});
export type NayaCallInput = z.infer<typeof NayaCallInputSchema>;

const NayaCallOutputSchema = z.object({
  textResponse: z.string().describe("The text version of Naya's response."),
  audioDataUri: z.string().describe("The audio version of Naya's response as a WAV data URI."),
});
export type NayaCallOutput = z.infer<typeof NayaCallOutputSchema>;

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d: Buffer) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

export async function nayaCallResponse(input: NayaCallInput): Promise<NayaCallOutput> {
  return nayaCallFlow(input);
}

const nayaCallFlow = ai.defineFlow(
  {
    name: 'nayaCallFlow',
    inputSchema: NayaCallInputSchema,
    outputSchema: NayaCallOutputSchema,
  },
  async (input) => {
    // 1. Get Text Response with Vision Context
    const { text: nayaText } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: "You are Naya, a friendly and wise AI assistant for the Moood app. You are currently on a video call with the user. Keep your responses short, conversational, and helpful. If an image is provided, reference what you see briefly.",
      prompt: [
        { text: input.userMessage },
        ...(input.photoDataUri ? [{ media: { url: input.photoDataUri, contentType: 'image/jpeg' } }] : [])
      ],
    });

    // 2. Convert Text to Speech
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.0-flash-exp'), // Using flash for fast TTS if available or fallback
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' }, // Warm, helpful voice
          },
        },
      },
      prompt: nayaText,
    });

    if (!media?.url) {
      throw new Error('TTS generation failed');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    const wavBase64 = await toWav(audioBuffer);

    return {
      textResponse: nayaText,
      audioDataUri: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);

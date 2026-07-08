
'use server';

/**
 * @fileOverview A flow that generates a video from a text prompt or animates a static photo with a prompt.
 *
 * - generateVibeVideo - A function that handles the video generation process.
 * - GenerateVibeVideoInput - The input type for the generateVibeVideo function.
 * - GenerateVibeVideoOutput - The return type for the generateVibeVideo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateVibeVideoInputSchema = z.object({
  textPrompt: z.string().describe('The text prompt to generate the video from.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "A photo to animate, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateVibeVideoInput = z.infer<typeof GenerateVibeVideoInputSchema>;

const GenerateVibeVideoOutputSchema = z.object({
  videoDataUri: z.string().describe('The generated video as a data URI.'),
});
export type GenerateVibeVideoOutput = z.infer<typeof GenerateVibeVideoOutputSchema>;

export async function generateVibeVideo(input: GenerateVibeVideoInput): Promise<GenerateVibeVideoOutput> {
  return generateVibeVideoFlow(input);
}

const generateVibeVideoFlow = ai.defineFlow(
  {
    name: 'generateVibeVideoFlow',
    inputSchema: GenerateVibeVideoInputSchema,
    outputSchema: GenerateVibeVideoOutputSchema,
  },
  async input => {
    let operation;
    if (input.photoDataUri) {
      let {operation: imageToVideoOperation} = await ai.generate({
        model: 'googleai/veo-2.0-generate-001',
        prompt: [
          {text: input.textPrompt},
          {
            media: {
              contentType: 'image/jpeg', // Assuming jpeg, adjust if needed
              url: input.photoDataUri,
            },
          },
        ],
        config: {
          durationSeconds: 5,
          aspectRatio: '9:16',
          personGeneration: 'allow_adult',
        },
      });
      operation = imageToVideoOperation;
    } else {
      let {operation: textToVideoOperation} = await ai.generate({
        model: 'googleai/veo-2.0-generate-001',
        prompt: input.textPrompt,
        config: {
          durationSeconds: 5,
          aspectRatio: '16:9',
        },
      });
      operation = textToVideoOperation;
    }

    if (!operation) {
      throw new Error('Expected the model to return an operation');
    }

    // Wait until the operation completes.
    while (!operation.done) {
      operation = await ai.checkOperation(operation);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (operation.error) {
      console.error('Video generation operation failed:', operation.error);
      throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const video = operation.output?.message?.content.find(p => !!p.media);
    if (!video?.media?.url) {
      throw new Error('Failed to find the generated video in the operation output.');
    }
    
    const videoDataUri = await downloadVideo(video.media);

    return {videoDataUri};
  }
);

async function downloadVideo(media: { url: string; contentType?: string }): Promise<string> {
    const fetch = (await import('node-fetch')).default;
    
    // Add API key before fetching the video.
    const videoDownloadUrl = `${media.url}&key=${process.env.GEMINI_API_KEY}`;

    const videoDownloadResponse = await fetch(videoDownloadUrl);

    if (!videoDownloadResponse.ok) {
        const errorBody = await videoDownloadResponse.text();
        console.error(`Failed to fetch video. Status: ${videoDownloadResponse.status}, Body: ${errorBody}`);
        throw new Error(`Failed to download video file. Status: ${videoDownloadResponse.status}`);
    }

    const buffer = await videoDownloadResponse.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = media.contentType || 'video/mp4';
    return `data:${contentType};base64,${base64}`;
}

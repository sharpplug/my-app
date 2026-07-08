
'use server';

/**
 * @fileOverview A flow that generates a video with an anti-gravity effect from a text prompt.
 *
 * - generateAntiGravityVibe - A function that handles the video generation process.
 * - GenerateAntiGravityVibeInput - The input type for the function.
 * - GenerateAntiGravityVibeOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAntiGravityVibeInputSchema = z.object({
  textPrompt: z.string().describe('The text prompt describing the object or scene to make float.'),
});
export type GenerateAntiGravityVibeInput = z.infer<typeof GenerateAntiGravityVibeInputSchema>;

const GenerateAntiGravityVibeOutputSchema = z.object({
  videoDataUri: z.string().describe('The generated video with an anti-gravity effect, as a data URI.'),
});
export type GenerateAntiGravityVibeOutput = z.infer<typeof GenerateAntiGravityVibeOutputSchema>;

export async function generateAntiGravityVibe(input: GenerateAntiGravityVibeInput): Promise<GenerateAntiGravityVibeOutput> {
  return generateAntiGravityVibeFlow(input);
}

const generateAntiGravityVibeFlow = ai.defineFlow(
  {
    name: 'generateAntiGravityVibeFlow',
    inputSchema: GenerateAntiGravityVibeInputSchema,
    outputSchema: GenerateAntiGravityVibeOutputSchema,
  },
  async input => {
    const antiGravityPrompt = `A video of ${input.textPrompt}, floating gracefully in mid-air as if there is no gravity. The object should drift slowly and rotate gently. Cinematic, high-definition, surreal.`;
    
    let {operation} = await ai.generate({
        model: 'googleai/veo-2.0-generate-001',
        prompt: antiGravityPrompt,
        config: {
          durationSeconds: 5,
          aspectRatio: '16:9',
        },
      });

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

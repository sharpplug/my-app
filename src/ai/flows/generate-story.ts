'use server';

/**
 * @fileOverview A flow that generates a short story and an accompanying image from a text prompt.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStoryInputSchema = z.object({
  prompt: z.string().describe('The text prompt describing the story to generate.'),
});
export type GenerateStoryInput = z.infer<typeof GenerateStoryInputSchema>;

const GenerateStoryOutputSchema = z.object({
  storyText: z.string().describe('The generated short story text.'),
  imageDataUri: z.string().describe('The generated image for the story, as a data URI.'),
});
export type GenerateStoryOutput = z.infer<typeof GenerateStoryOutputSchema>;


const storyPrompt = ai.definePrompt({
    name: 'storyPrompt',
    input: { schema: z.object({ prompt: z.string() }) },
    output: { schema: z.object({ story: z.string().describe("A short, imaginative, two-paragraph story based on the prompt."), imagePrompt: z.string().describe("A detailed, vibrant, cinematic image prompt for an AI image generator, based on the story.") }) },
    prompt: `Based on the prompt "{{prompt}}", write a short, imaginative, two-paragraph story. Then, create a detailed, vibrant, and cinematic image prompt that an AI image generator could use to create a cover image for that story.`,
});


const generateStoryFlow = ai.defineFlow(
  {
    name: 'generateStoryFlow',
    inputSchema: GenerateStoryInputSchema,
    outputSchema: GenerateStoryOutputSchema,
  },
  async (input) => {
    const { output: storyOutput } = await storyPrompt({ prompt: input.prompt });

    if (!storyOutput) {
        throw new Error('Failed to generate story and image prompt.');
    }

    const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: storyOutput.imagePrompt,
    });
    
    if (!media.url) {
        throw new Error('Image generation failed.');
    }

    return {
      storyText: storyOutput.story,
      imageDataUri: media.url,
    };
  }
);


export async function generateStory(input: GenerateStoryInput): Promise<GenerateStoryOutput> {
    return generateStoryFlow(input);
}

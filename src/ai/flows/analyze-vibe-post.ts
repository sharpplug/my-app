'use server';
/**
 * @fileOverview An AI flow to analyze a Vibe post.
 *
 * - analyzeVibePost - A function that explains a post and suggests related searches.
 * - AnalyzeVibePostInput - The input type.
 * - AnalyzeVibePostOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeVibePostInputSchema = z.object({
  postText: z.string().optional().describe('The text content of the post.'),
  mediaHint: z.string().optional().describe('A hint about the media content of the post.'),
});
export type AnalyzeVibePostInput = z.infer<typeof AnalyzeVibePostInputSchema>;

const AnalyzeVibePostOutputSchema = z.object({
  explanation: z.string().describe("A concise, one-sentence explanation of what the post is about."),
  suggestedSearches: z.array(z.string()).describe("A list of 2-3 related search terms for the app's marketplace or event pages."),
});
export type AnalyzeVibePostOutput = z.infer<typeof AnalyzeVibePostOutputSchema>;

export async function analyzeVibePost(input: AnalyzeVibePostInput): Promise<AnalyzeVibePostOutput> {
  return analyzeVibePostFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeVibePostPrompt',
  input: {schema: AnalyzeVibePostInputSchema},
  output: {schema: AnalyzeVibePostOutputSchema},
  prompt: `You are an AI assistant for a social app called "Moood". Your task is to analyze a post and provide a simple explanation and related search terms.

  Post Details:
  - Text: "{{postText}}"
  - Media Hint: "{{mediaHint}}"

  Based on these details:
  1.  Provide a single, concise sentence explaining what this post is about.
  2.  Suggest 2-3 relevant search keywords that a user could use to find similar items or events in the app's marketplace (e.g., "handmade crafts", "yoga class", "live music").
  `,
});

const analyzeVibePostFlow = ai.defineFlow(
  {
    name: 'analyzeVibePostFlow',
    inputSchema: AnalyzeVibePostInputSchema,
    outputSchema: AnalyzeVibePostOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

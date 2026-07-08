
'use server';

/**
 * @fileOverview An AI flow for recommending "Vibes" content to users.
 *
 * - recommendVibes - A function that re-ranks vibes based on user preferences.
 * - RecommendVibesInput - The input type for the recommendVibes function.
 * - RecommendVibesOutput - The return type for the recommendVibes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VibeInfoSchema = z.object({
  id: z.any().describe('The unique identifier for the vibe.'),
  text: z.string().optional().describe('The text content of the vibe.'),
  hint: z.string().optional().describe('A hint about the media content.'),
});

const RecommendVibesInputSchema = z.object({
  userPreferences: z.string().describe("A summary of the user's interests based on their past interactions (e.g., likes, saves)."),
  availableVibes: z.array(VibeInfoSchema).describe('The list of all available vibes that need to be ranked.'),
});
export type RecommendVibesInput = z.infer<typeof RecommendVibesInputSchema>;

const RecommendVibesOutputSchema = z.object({
  recommendedVibeIds: z.array(z.any()).describe('An array of vibe IDs, sorted in the recommended order for the user.'),
});
export type RecommendVibesOutput = z.infer<typeof RecommendVibesOutputSchema>;

export async function recommendVibes(input: RecommendVibesInput): Promise<RecommendVibesOutput> {
  return recommendVibesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendVibesPrompt',
  input: {schema: RecommendVibesInputSchema},
  output: {schema: RecommendVibesOutputSchema},
  prompt: `You are an AI content curator for a social app called "Moood". Your task is to create a personalized feed for a user by ranking available posts (called "vibes") based on their preferences.

User Preferences:
"{{userPreferences}}"

Based on these preferences, analyze the following available vibes and return an array of their IDs, sorted from most to least recommended. Only return the IDs in the desired order.

Available Vibes:
---
{{#each availableVibes}}
ID: {{this.id}}
Content: {{this.text}}
Media Hint: {{this.hint}}
---
{{/each}}
`,
});

const recommendVibesFlow = ai.defineFlow(
  {
    name: 'recommendVibesFlow',
    inputSchema: RecommendVibesInputSchema,
    outputSchema: RecommendVibesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

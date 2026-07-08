
'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing user mood based on a selfie or text description.
 *
 * It uses the Google Gemini model to determine the user's mood, provide a confidence score,
 * and offer personalized recommendations for products, services, foods, and a color palette.
 *
 * - analyzeUserMood - An async function that accepts user input (photo or text) and returns mood analysis results.
 * - AnalyzeUserMoodInput - The input type for the analyzeUserMood function.
 * - AnalyzeUserMoodOutput - The return type for the analyzeUserMood function, including mood, confidence, and recommendations.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeUserMoodInputSchema = z.object({
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "A photo of the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  textDescription: z.string().optional().describe('A text description of the user\'s mood.'),
});
export type AnalyzeUserMoodInput = z.infer<typeof AnalyzeUserMoodInputSchema>;

const AnalyzeUserMoodOutputSchema = z.object({
  mood: z.string().describe('The detected mood of the user.'),
  confidence: z.number().describe('The confidence score of the mood detection (0-1).'),
  recommendedProducts: z.array(z.string()).describe('A list of recommended products to boost the user\'s mood.'),
  recommendedServices: z.array(z.string()).describe('A list of recommended services to boost the user\'s mood.'),
  recommendedFoods: z.array(z.string()).describe('A list of recommended foods to boost the user\'s mood.'),
  recommendedThemeColors: z
    .array(z.string())
    .describe('A color palette (array of color hex codes) to match and boost the user\'s mood.'),
});
export type AnalyzeUserMoodOutput = z.infer<typeof AnalyzeUserMoodOutputSchema>;

export async function analyzeUserMood(input: AnalyzeUserMoodInput): Promise<AnalyzeUserMoodOutput> {
  return analyzeUserMoodFlow(input);
}

const analyzeUserMoodPrompt = ai.definePrompt({
  name: 'analyzeUserMoodPrompt',
  input: {schema: AnalyzeUserMoodInputSchema},
  output: {schema: AnalyzeUserMoodOutputSchema},
  prompt: `You are an AI mood analyst. Analyze the user's mood based on the following information.

  {{#if photoDataUri}}
  Photo: {{media url=photoDataUri}}
  {{/if}}

  {{#if textDescription}}
  Description: {{{textDescription}}}
  {{/if}}

  Based on the user's mood, recommend products, services, and foods to improve their mood. Also, create a color palette to match their mood.
  Give a confidence score between 0 and 1 for how sure you are of the mood.

  Format your output as a JSON object with the following keys:
  - mood: string (e.g., "Happy", "Tired", "Stressed")
  - confidence: number (0-1)
  - recommendedProducts: string[]
  - recommendedServices: string[]
  - recommendedFoods: string[]
  - recommendedThemeColors: string[]
  `,
});

const analyzeUserMoodFlow = ai.defineFlow(
  {
    name: 'analyzeUserMoodFlow',
    inputSchema: AnalyzeUserMoodInputSchema,
    outputSchema: AnalyzeUserMoodOutputSchema,
  },
  async input => {
    const {output} = await analyzeUserMoodPrompt(input);
    return output!;
  }
);

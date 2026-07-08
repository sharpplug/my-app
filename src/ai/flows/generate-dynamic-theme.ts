'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a dynamic theme based on the user's mood.
 *
 * - generateDynamicTheme - A function that takes a mood as input and returns a theme name and color palette.
 * - GenerateDynamicThemeInput - The input type for the generateDynamicTheme function.
 * - GenerateDynamicThemeOutput - The return type for the generateDynamicTheme function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDynamicThemeInputSchema = z.object({
  mood: z.string().describe('The detected mood of the user (e.g., Tired, Happy, Stressed).'),
});
export type GenerateDynamicThemeInput = z.infer<typeof GenerateDynamicThemeInputSchema>;

const GenerateDynamicThemeOutputSchema = z.object({
  themeName: z.string().describe('A creative name for the generated theme (e.g., Calm Dusk).'),
  colorPalette: z
    .array(z.string())
    .describe(
      'An array of HSL color values (strings) representing the color palette for the theme.'
    ),
});
export type GenerateDynamicThemeOutput = z.infer<typeof GenerateDynamicThemeOutputSchema>;

export async function generateDynamicTheme(input: GenerateDynamicThemeInput): Promise<GenerateDynamicThemeOutput> {
  return generateDynamicThemeFlow(input);
}

const generateDynamicThemePrompt = ai.definePrompt({
  name: 'generateDynamicThemePrompt',
  input: {schema: GenerateDynamicThemeInputSchema},
  output: {schema: GenerateDynamicThemeOutputSchema},
  prompt: `You are a theme designer for a mobile application. Given the user's mood, generate a theme name and a color palette of HSL color values.

Mood: {{{mood}}}

Respond in JSON format.
Consider the following color guidelines:
* Desaturated grayish blue (#D0DCE2) evokes tranquility.
* Soft lavender (#B19CD9) suggests serenity and healing.
* Pale peach (#FFDAB9) represents comfort and lightheartedness.

{
  "themeName": "Theme Name",
  "colorPalette": ["hsl(0, 0%, 0%)", "hsl(0, 0%, 100%)"]
}
`,
});

const generateDynamicThemeFlow = ai.defineFlow(
  {
    name: 'generateDynamicThemeFlow',
    inputSchema: GenerateDynamicThemeInputSchema,
    outputSchema: GenerateDynamicThemeOutputSchema,
  },
  async input => {
    const {output} = await generateDynamicThemePrompt(input);
    return output!;
  }
);

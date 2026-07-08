'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating event descriptions.
 *
 * - generateEventDescription - A function that generates a compelling event description.
 * - GenerateEventDescriptionInput - The input type for the generateEventDescription function.
 * - GenerateEventDescriptionOutput - The return type for the generateEventDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateEventDescriptionInputSchema = z.object({
  title: z.string().describe('The title of the event.'),
  category: z.string().describe('The category of the event (e.g., music, art, food).'),
  targetAudience: z.string().describe('The target audience for the event (e.g., families, adults, students).'),
  details: z.string().describe('Additional details about the event, such as the location, date, and time.'),
});
export type GenerateEventDescriptionInput = z.infer<typeof GenerateEventDescriptionInputSchema>;

const GenerateEventDescriptionOutputSchema = z.object({
  description: z.string().describe('A compelling and professional description of the event.'),
});
export type GenerateEventDescriptionOutput = z.infer<typeof GenerateEventDescriptionOutputSchema>;

export async function generateEventDescription(
  input: GenerateEventDescriptionInput
): Promise<GenerateEventDescriptionOutput> {
  return generateEventDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateEventDescriptionPrompt',
  input: {schema: GenerateEventDescriptionInputSchema},
  output: {schema: GenerateEventDescriptionOutputSchema},
  prompt: `You are a professional copywriter specializing in creating event descriptions.

  Based on the following information, write a compelling and engaging description for the event.

  Title: {{{title}}}
  Category: {{{category}}}
  Target Audience: {{{targetAudience}}}
  Details: {{{details}}}

  The description should be concise, persuasive, and highlight the key benefits of attending the event.
`,
});

const generateEventDescriptionFlow = ai.defineFlow(
  {
    name: 'generateEventDescriptionFlow',
    inputSchema: GenerateEventDescriptionInputSchema,
    outputSchema: GenerateEventDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

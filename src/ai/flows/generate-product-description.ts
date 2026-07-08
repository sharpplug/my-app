
'use server';

/**
 * @fileOverview A Genkit flow for generating compelling product descriptions for the marketplace.
 *
 * - generateProductDescription - A function that creates a product description.
 * - GenerateProductDescriptionInput - The input type for the function.
 * - GenerateProductDescriptionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProductDescriptionInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  features: z.string().describe('A list or description of the product\'s key features.'),
  targetAudience: z.string().describe('The intended audience for the product.'),
  photoDataUri: z.string().optional().describe(
    "An optional photo of the product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type GenerateProductDescriptionInput = z.infer<typeof GenerateProductDescriptionInputSchema>;

const GenerateProductDescriptionOutputSchema = z.object({
  description: z.string().describe('A compelling, professional, and enticing description of the product, suitable for a marketplace listing.'),
});
export type GenerateProductDescriptionOutput = z.infer<typeof GenerateProductDescriptionOutputSchema>;

export async function generateProductDescription(
  input: GenerateProductDescriptionInput
): Promise<GenerateProductDescriptionOutput> {
  return generateProductDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProductDescriptionPrompt',
  input: {schema: GenerateProductDescriptionInputSchema},
  output: {schema: GenerateProductDescriptionOutputSchema},
  prompt: `You are an expert e-commerce copywriter specializing in the MEA region. Your task is to write a compelling product description based on the provided details.

  Product Name: {{{productName}}}
  Key Features: {{{features}}}
  Target Audience: {{{targetAudience}}}
  {{#if photoDataUri}}
  Product Photo: {{media url=photoDataUri}}
  {{/if}}

  The description should be persuasive, highlight the key benefits, and be formatted for easy reading in a marketplace app.
`,
});

const generateProductDescriptionFlow = ai.defineFlow(
  {
    name: 'generateProductDescriptionFlow',
    inputSchema: GenerateProductDescriptionInputSchema,
    outputSchema: GenerateProductDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

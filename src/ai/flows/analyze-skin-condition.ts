
'use server';

/**
 * @fileOverview A skin condition analysis AI agent.
 *
 * - analyzeSkinCondition - A function that handles the skin condition analysis process.
 * - AnalyzeSkinConditionInput - The input type for the analyzeSkinCondition function.
 * - AnalyzeSkinConditionOutput - The return type for the analyzeSkinCondition function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeSkinConditionInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A selfie of the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z.string().optional().describe('The description of the user.'),
});
export type AnalyzeSkinConditionInput = z.infer<typeof AnalyzeSkinConditionInputSchema>;

const AnalyzeSkinConditionOutputSchema = z.object({
  skinType: z.string().describe('The identified skin type (e.g., Dry, Oily, Combination).'),
  keyConcerns: z.array(z.string()).describe('A summary list of key skin concerns identified (e.g., Dehydration, Puffiness, Acne).'),
  detailedAnalysis: z.array(z.object({
    concern: z.string().describe("The specific skin concern identified (e.g., Dark Circles, Acne, Uneven Texture)."),
    observation: z.string().describe("A detailed observation and explanation of the concern and its likely causes."),
  })).describe("A systematic analysis of each identified skin issue, explaining the observation and potential underlying causes."),
  recommendedProducts: z.array(z.string()).describe('Recommended skincare products (e.g., Hyaluronic Acid Serum).'),
  professionalTreatments: z.array(z.string()).describe('Recommended professional treatments (e.g., HydraFacial).'),
  dailyRoutine: z.string().describe('A suggested daily skincare routine (e.g., Cleanse -> Tone -> Serum -> Moisturize).'),
  skinFriendlyFoods: z.array(z.string()).describe('Recommended skin-friendly foods (e.g., Avocado, Walnuts).'),
});
export type AnalyzeSkinConditionOutput = z.infer<typeof AnalyzeSkinConditionOutputSchema>;

export async function analyzeSkinCondition(input: AnalyzeSkinConditionInput): Promise<AnalyzeSkinConditionOutput> {
  return analyzeSkinConditionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSkinConditionPrompt',
  input: {schema: AnalyzeSkinConditionInputSchema},
  output: {schema: AnalyzeSkinConditionOutputSchema},
  prompt: `You are an expert dermatologist. Your task is to perform a serious and systematic analysis of a user's skin based on a selfie and optional description.

First, analyze the user's photo for specific skin concerns like dark spots, acne, pimples, rashes, uneven texture, signs of aging, dehydration, or dark circles around the eyes. For each concern, provide a detailed observation and explain the likely underlying causes (e.g., dark spots from sun exposure, dark circles from lack of sleep, acne from hormonal changes or bacteria).

After providing the detailed analysis, then provide the recommendations.

Analyze the following information:

Description: {{{description}}}
Photo: {{media url=photoDataUri}}

Output the analysis in a structured JSON format. The detailedAnalysis should be an array of objects, each explaining a specific concern.
`,
});

const analyzeSkinConditionFlow = ai.defineFlow(
  {
    name: 'analyzeSkinConditionFlow',
    inputSchema: AnalyzeSkinConditionInputSchema,
    outputSchema: AnalyzeSkinConditionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

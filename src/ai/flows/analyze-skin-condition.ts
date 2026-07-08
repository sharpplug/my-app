
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
  keyConcerns: z.array(z.string()).describe('A summary list of key cosmetic skin observations (e.g., Dehydration, Puffiness, Uneven Texture). Phrase these as appearance observations, not diagnoses.'),
  detailedAnalysis: z.array(z.object({
    concern: z.string().describe("The specific cosmetic observation (e.g., Dark Circles, Uneven Texture)."),
    observation: z.string().describe("A hedged, non-diagnostic observation (e.g., 'may indicate...', 'can be associated with...'), explaining common lifestyle-related contributors. Never state a cause as certain, and never name a medical condition or disease."),
  })).describe("A gentle, systematic walkthrough of each cosmetic observation. This is skincare guidance, not a clinical assessment."),
  recommendedProducts: z.array(z.string()).describe('Recommended skincare products (e.g., Hyaluronic Acid Serum).'),
  professionalTreatments: z.array(z.string()).describe('Recommended professional treatments (e.g., HydraFacial).'),
  dailyRoutine: z.string().describe('A suggested daily skincare routine (e.g., Cleanse -> Tone -> Serum -> Moisturize).'),
  skinFriendlyFoods: z.array(z.string()).describe('Recommended skin-friendly foods (e.g., Avocado, Walnuts).'),
  disclaimer: z.string().describe("A short, friendly reminder that this is cosmetic/wellness guidance from an AI, not a medical diagnosis, and that a dermatologist should be consulted for anything persistent, painful, or concerning."),
});
export type AnalyzeSkinConditionOutput = z.infer<typeof AnalyzeSkinConditionOutputSchema>;

export async function analyzeSkinCondition(input: AnalyzeSkinConditionInput): Promise<AnalyzeSkinConditionOutput> {
  return analyzeSkinConditionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSkinConditionPrompt',
  input: {schema: AnalyzeSkinConditionInputSchema},
  output: {schema: AnalyzeSkinConditionOutputSchema},
  prompt: `You are Moood's friendly AI skincare assistant. You give cosmetic, wellness-oriented skincare guidance based on a selfie and optional description - you are NOT a dermatologist and you must never present yourself as one, diagnose a medical condition, or name a disease.

Look at the user's photo for general cosmetic, appearance-level observations: things like visible dryness, shine/oiliness, uneven texture, puffiness, or dark circles. For each observation:
- Use hedged, non-diagnostic language ("may indicate", "can be associated with", "often related to") - never state a cause as certain.
- Only reference common lifestyle factors (sleep, hydration, sun exposure, skincare routine) as possible contributors - never suggest a medical condition, hormonal disorder, infection, or disease, even tentatively.
- If the photo shows anything that could be a medical concern rather than a cosmetic one (e.g. a rash, a mole that looks irregular, a wound, unusual bleeding, or anything painful/persistent), do not analyze or speculate about it - instead say so plainly in that observation and recommend seeing a doctor or dermatologist.

After the observations, give the lighter recommendations (products, routine, foods) as usual.

Always fill in the "disclaimer" field with a short, warm reminder that this is AI-generated cosmetic guidance, not a medical diagnosis, and that a dermatologist should be consulted for anything persistent, painful, or concerning.

Analyze the following information:

Description: {{{description}}}
Photo: {{media url=photoDataUri}}

Output the analysis in a structured JSON format. The detailedAnalysis should be an array of objects, each covering one cosmetic observation.
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

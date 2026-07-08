'use server';

/**
 * @fileOverview AI Career Coach for business partners.
 *
 * - aiCareerCoach - A function that provides personalized advice on how to grow a business and meet local market demand.
 * - AiCareerCoachInput - The input type for the aiCareerCoach function.
 * - AiCareerCoachOutput - The return type for the aiCareerCoach function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiCareerCoachInputSchema = z.object({
  skills: z.string().describe('Description of the partner\'s skills and expertise.'),
  marketDemand: z.string().describe('Description of the market demand and opportunities.'),
});
export type AiCareerCoachInput = z.infer<typeof AiCareerCoachInputSchema>;

const AiCareerCoachOutputSchema = z.object({
  advice: z.string().describe('Personalized advice on how to grow the business and meet market demand.'),
});
export type AiCareerCoachOutput = z.infer<typeof AiCareerCoachOutputSchema>;

export async function aiCareerCoach(input: AiCareerCoachInput): Promise<AiCareerCoachOutput> {
  return aiCareerCoachFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiCareerCoachPrompt',
  input: {schema: AiCareerCoachInputSchema},
  output: {schema: AiCareerCoachOutputSchema},
  prompt: `You are an AI career coach specializing in advising small business owners and service providers in the MEA (Middle East and Africa) region.

  Based on the partner's skills and the market demand, provide actionable and personalized recommendations on how to grow their business and meet local market demand. Be specific and practical.

  Skills: {{{skills}}}
  Market Demand: {{{marketDemand}}}

  Advice:`,
});

const aiCareerCoachFlow = ai.defineFlow(
  {
    name: 'aiCareerCoachFlow',
    inputSchema: AiCareerCoachInputSchema,
    outputSchema: AiCareerCoachOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

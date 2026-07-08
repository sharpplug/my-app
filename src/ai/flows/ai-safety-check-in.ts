
'use server';

/**
 * @fileOverview An AI flow for generating a safety check-in message during a ride.
 *
 * - aiSafetyCheckIn - A function that creates a reassuring status message.
 * - AiSafetyCheckInInput - The input type for the function.
 * - AiSafetyCheckInOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiSafetyCheckInInputSchema = z.object({
  rideDetails: z.string().describe('Details about the current ride, including driver name and current location.'),
});
export type AiSafetyCheckInInput = z.infer<typeof AiSafetyCheckInInputSchema>;

const AiSafetyCheckInOutputSchema = z.object({
  statusMessage: z.string().describe('A concise and reassuring message to send to a contact, confirming the user is safe.'),
});
export type AiSafetyCheckInOutput = z.infer<typeof AiSafetyCheckInOutputSchema>;

export async function aiSafetyCheckIn(input: AiSafetyCheckInInput): Promise<AiSafetyCheckInOutput> {
  return aiSafetyCheckInFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiSafetyCheckInPrompt',
  input: {schema: AiSafetyCheckInInputSchema},
  output: {schema: AiSafetyCheckInOutputSchema},
  prompt: `You are a helpful safety assistant. Based on the user's ride details, create a short, reassuring message (under 160 characters) that they can send to a friend or family member. The message should sound natural and confirm they are safe.

  Ride Details: {{{rideDetails}}}

  Example output message: "Hey! Just checking in. I'm in my ride with Hassan near Dubai Mall, everything is great! Will be there soon."
`,
});

const aiSafetyCheckInFlow = ai.defineFlow(
  {
    name: 'aiSafetyCheckInFlow',
    inputSchema: AiSafetyCheckInInputSchema,
    outputSchema: AiSafetyCheckInOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

    
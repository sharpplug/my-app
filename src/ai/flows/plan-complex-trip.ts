'use server';

/**
 * @fileOverview An AI flow for planning a complex, multi-stop chauffeured trip.
 *
 * - planComplexTrip - A function that takes a natural language request and generates a detailed itinerary.
 * - PlanComplexTripInput - The input type for the function.
 * - PlanComplexTripOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PlanComplexTripInputSchema = z.object({
  request: z.string().describe('A natural language description of the desired multi-stop trip.'),
});
export type PlanComplexTripInput = z.infer<typeof PlanComplexTripInputSchema>;

const ItineraryStopSchema = z.object({
    location: z.string().describe("The name or address of the stop."),
    activity: z.string().describe("The purpose of the stop (e.g., 'Work', 'Lunch', 'Pick up package')."),
    estimated_time: z.string().describe("The estimated time of arrival or duration at this stop (e.g., '9:00 AM', '1:00 PM - 2:30 PM')."),
    waiting_time: z.string().optional().describe("The duration the chauffeur should wait at this location (e.g., '1 hour', '30 minutes')."),
});

const PlanComplexTripOutputSchema = z.object({
  stops: z.array(ItineraryStopSchema).describe('A chronological list of all the stops in the itinerary.'),
  route_summary: z.string().describe('A summary of the suggested route, including advice on traffic, best times to travel, and areas to avoid.'),
  suggested_restaurants: z.array(z.string()).optional().describe('A list of suggested restaurant names if the user requested a meal stop.'),
  estimated_fare: z.string().describe("The total estimated fare for the entire chauffeured trip, including waiting times. Should be in Dirhams (Dhs.)."),
});
export type PlanComplexTripOutput = z.infer<typeof PlanComplexTripOutputSchema>;

export async function planComplexTrip(input: PlanComplexTripInput): Promise<PlanComplexTripOutput> {
  return planComplexTripFlow(input);
}

const prompt = ai.definePrompt({
  name: 'planComplexTripPrompt',
  input: {schema: PlanComplexTripInputSchema},
  output: {schema: PlanComplexTripOutputSchema},
  prompt: `You are an expert trip planner and dispatcher for a luxury chauffeur service called SKIP in the UAE.
Your task is to take a user's complex, natural language request and turn it into a structured, logical, and efficient itinerary.

User's Request:
"{{{request}}}"

Based on this request, create a complete itinerary.

1.  **Stops:** Break down the request into a clear sequence of stops. For each stop, define the location, the activity, the estimated time, and any required waiting time for the chauffeur.
2.  **Restaurants:** If the user mentions a meal (like lunch or dinner) but doesn't specify a place, suggest 3-4 suitable, popular restaurants in the relevant area.
3.  **Route & Traffic:** Provide a concise summary of the best route. Mention key roads (e.g., "Sheikh Zayed Road," "Al Khail Road"). Give practical advice on traffic, like "avoid Downtown Dubai between 5-7 PM" or "use the Business Bay crossing to save time in the morning."
4.  **Pricing:** Calculate a fair and comprehensive estimated price for the entire service, including travel time, distance, and waiting time. Present it as a single figure in UAE Dirhams (e.g., "Dhs. 450"). Be realistic; a full-day service with multiple stops and waiting would be several hundred Dirhams.

Structure the entire output as a single JSON object.
`,
});

const planComplexTripFlow = ai.defineFlow(
  {
    name: 'planComplexTripFlow',
    inputSchema: PlanComplexTripInputSchema,
    outputSchema: PlanComplexTripOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

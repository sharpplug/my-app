
'use server';

/**
 * @fileOverview A comprehensive AI daily planner that integrates multiple app features.
 *
 * - planMyDay - A function that takes a natural language request and generates a detailed daily plan.
 */

import {ai} from '@/ai/genkit';
import { PlanMyDayInputSchema, PlanMyDayOutputSchema, PlanMyDayInput, PlanMyDayOutput } from './plan-my-day.types';

export async function planMyDay(input: PlanMyDayInput): Promise<PlanMyDayOutput> {
  return planMyDayFlow(input);
}

const prompt = ai.definePrompt({
  name: 'planMyDayPrompt',
  input: {schema: PlanMyDayInputSchema},
  output: {schema: PlanMyDayOutputSchema},
  prompt: `You are Naya, the master AI planner for the Moood app. Your goal is to take a user's freeform request and structure their entire day, integrating all of the app's features.

User's Request: "{{request}}"
{{#if currentLocation}}Current Location: {{currentLocation}}{{/if}}

Analyze the request and generate a comprehensive plan.

1.  **Day Summary & Energy:** Write a short, encouraging summary of the day. Predict the user's energy level or mood based on their plans.
2.  **Event Suggestions:** If the user's plan is flexible, suggest relevant events or services from the marketplace. Think about what fits their schedule and vibe.
3.  **Food Recommendations:** Suggest meals for the day. If they mention eating out, specify if the venue should be indoors or outdoors. If they seem busy, suggest delivery. This can also include ordering specific food products.
4.  **SKIP Trip Plan:** If the request involves multiple stops, travel, package pickups/dropoffs, or needing a car for a period, construct a detailed itinerary for the SKIP chauffeur service. This MUST include a sequence of stops with activities and times, a route summary with traffic advice, and a single estimated fare for the entire trip in Dirhams (Dhs.).
5.  **Stay Booking:** If the request mentions needing a place to stay (e.g., "find me a place for the weekend", "book a villa for my party"), identify the type of stay, duration, and generate a booking plan. This should include the location, check-in/out dates, and an estimated cost. Populate the 'stayBooking' field in the output. For example, a request for a party might result in a "Party Villa in Jumeirah".
6.  **Product Deliveries:** If the user requests specific products from the shop, list them out as part of the plan.

Be insightful and proactive. If they want to go to a party, suggest a high-energy vibe. If they have a business meeting, suggest a focused and productive day.

Structure the entire output as a single JSON object.
`,
});

const planMyDayFlow = ai.defineFlow(
  {
    name: 'planMyDayFlow',
    inputSchema: PlanMyDayInputSchema,
    outputSchema: PlanMyDayOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

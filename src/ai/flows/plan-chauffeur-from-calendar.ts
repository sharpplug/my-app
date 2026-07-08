'use server';

/**
 * @fileOverview An AI flow for planning a VIP chauffeur service from a user's calendar schedule.
 *
 * - planChauffeurFromCalendar - A function that takes a calendar schedule and generates a detailed itinerary.
 * - PlanChauffeurFromCalendarInput - The input type for the function.
 * - PlanChauffeurFromCalendarOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DailyTripSchema = z.object({
    activity: z.string().describe("The purpose of this trip segment (e.g., 'Team Meeting', 'Lunch with client')."),
    location: z.string().describe("The destination for this segment."),
    pickup_time: z.string().describe("The estimated pickup time for this trip."),
    waiting_time: z.string().optional().describe("The duration the chauffeur should wait at this location (e.g., '1 hour', '30 minutes')."),
});

const DailyPlanSchema = z.object({
    date: z.string().describe("The date for this daily plan (e.g., 'Monday, Oct 28')."),
    trips: z.array(DailyTripSchema).describe("A chronological list of chauffeured trips for the day."),
});

const PlanChauffeurFromCalendarInputSchema = z.object({
  calendarSchedule: z.string().describe('A text-based daily or monthly calendar schedule provided by the user.'),
});
export type PlanChauffeurFromCalendarInput = z.infer<typeof PlanChauffeurFromCalendarInputSchema>;

const PlanChauffeurFromCalendarOutputSchema = z.object({
  itineraryTitle: z.string().describe("A summary title for the entire itinerary (e.g., 'Your VIP Chauffeur Plan for the Week')."),
  daily_plans: z.array(DailyPlanSchema).describe('A list of daily chauffeur plans.'),
  route_summary: z.string().describe('A general summary of routing and traffic advice for the entire period.'),
  estimated_fare: z.string().describe("The total estimated fare for the entire chauffeured service, including all trips and waiting times. Should be in Dirhams (Dhs.)."),
  notification_summary: z.string().describe("A confirmation message about notifications, e.g., 'You will receive a message 15 minutes before each scheduled departure.'"),
});
export type PlanChauffeurFromCalendarOutput = z.infer<typeof PlanChauffeurFromCalendarOutputSchema>;


export async function planChauffeurFromCalendar(input: PlanChauffeurFromCalendarInput): Promise<PlanChauffeurFromCalendarOutput> {
  return planChauffeurFromCalendarFlow(input);
}

const prompt = ai.definePrompt({
  name: 'planChauffeurFromCalendarPrompt',
  input: {schema: PlanChauffeurFromCalendarInputSchema},
  output: {schema: PlanChauffeurFromCalendarOutputSchema},
  prompt: `You are an expert dispatcher for a luxury VIP chauffeur service called SKIP in the UAE.
Your task is to take a user's pasted calendar schedule and create a comprehensive, multi-day chauffeur service plan.

User's Schedule:
"{{{calendarSchedule}}}"

Based on this schedule, create a complete VIP service plan.

1.  **Itinerary Title:** Create a concise title for the overall plan.
2.  **Daily Plans:** Group the events by date. For each day, create a list of chauffeured "trips". A trip consists of an activity, location, a calculated pickup time (assume travel time between events), and any necessary waiting time. Be logical. A user needs to be picked up *before* their event time.
3.  **Route & Traffic:** Provide a general summary of the best routes for the common locations and overall traffic advice for the period.
4.  **Pricing:** Calculate a fair and comprehensive estimated price for the entire service period. A full day with multiple trips and waiting should be several hundred Dirhams per day. Sum it up for a total estimate.
5.  **Notifications:** Include a standard message confirming that the user will receive automated notifications before each trip.

Structure the entire output as a single JSON object.
`,
});

const planChauffeurFromCalendarFlow = ai.defineFlow(
  {
    name: 'planChauffeurFromCalendarFlow',
    inputSchema: PlanChauffeurFromCalendarInputSchema,
    outputSchema: PlanChauffeurFromCalendarOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

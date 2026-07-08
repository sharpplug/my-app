
import { z } from 'zod';

export const EventSuggestionSchema = z.object({
  title: z.string().describe("The title of the suggested event or service."),
  time: z.string().describe("The suggested time for the event."),
  location: z.string().describe("The location of the event."),
  reason: z.string().describe("A brief reason why this event is recommended based on the user's request."),
});

export const FoodRecommendationSchema = z.object({
  meal: z.string().describe("The meal type (e.g., Breakfast, Lunch, Dinner)."),
  suggestion: z.string().describe("The specific food or restaurant suggestion."),
  venue_type: z.enum(['indoor', 'outdoor', 'delivery']).describe("Whether the venue is indoor, outdoor, or for delivery."),
});

export const TripSegmentSchema = z.object({
    activity: z.string().describe("The purpose of this trip segment (e.g., 'Go to office', 'Pick up package')."),
    location: z.string().describe("The destination for this segment."),
    time: z.string().describe("The estimated time for this activity."),
});

export const StayBookingSchema = z.object({
    location: z.string().describe("The type or name of the accommodation booked (e.g., 'Party Villa in Jumeirah', 'Desert Camping Setup')."),
    checkIn: z.string().describe("The check-in date (e.g., 'Friday, Nov 3')."),
    checkOut: z.string().describe("The check-out date (e.g., 'Sunday, Nov 5')."),
    estimatedCost: z.string().describe("The total estimated cost for the stay in Dirhams (Dhs.)."),
});

export const PlanMyDayInputSchema = z.object({
  request: z.string().describe('A natural language description of the desired day plan.'),
  currentLocation: z.string().optional().describe('The user\'s current location for better routing.'),
});
export type PlanMyDayInput = z.infer<typeof PlanMyDayInputSchema>;

export const PlanMyDayOutputSchema = z.object({
  daySummary: z.string().describe("A one-paragraph summary of the user's planned day and overall vibe."),
  energyLevel: z.string().describe("The predicted energy level or mood for the day (e.g., 'Productive & Focused', 'Relaxed & Social')."),
  suggestedEvents: z.array(EventSuggestionSchema).optional().describe("A list of recommended events or services that fit the user's plan."),
  foodRecommendations: z.array(FoodRecommendationSchema).optional().describe("A list of food recommendations for the day."),
  tripPlan: z.object({
      summary: z.string().describe("A summary of the complex trip, including routing advice."),
      stops: z.array(TripSegmentSchema).describe("A chronological list of stops for the chauffeured ride."),
      estimatedFare: z.string().describe("The estimated total fare for all transportation."),
  }).optional().describe("A detailed plan for a multi-stop chauffeured trip, if mentioned in the request."),
  stayBooking: StayBookingSchema.optional().describe("Details of a booked stay if the user's request included accommodation."),
});
export type PlanMyDayOutput = z.infer<typeof PlanMyDayOutputSchema>;

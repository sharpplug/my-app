
'use server';

/**
 * @fileOverview A health and wellness AI agent tailored to the MEA region, with vision capabilities.
 *
 * - analyzeNayaHealth - A function that handles the health analysis process using text and images.
 * - AnalyzeNayaHealthInput - The input type for the analyzeNayaHealth function.
 * - AnalyzeNayaHealthOutput - The return type for the analyzeNayaHealth function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeNayaHealthInputSchema = z.object({
  gender: z.string().describe('The user\'s gender.'),
  lifeStage: z.string().describe('The user\'s current life stage (e.g., Pregnant, Postpartum, Menopause, New Dad, Performance).'),
  concerns: z.string().describe('The user\'s specific health and wellness concerns, described in a conversational chat message.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo of the user's concern (e.g., skin rash, food item), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeNayaHealthInput = z.infer<typeof AnalyzeNayaHealthInputSchema>;

const AnalyzeNayaHealthOutputSchema = z.object({
  advice: z.string().describe('A detailed paragraph of personalized health and wellness advice, written in an empathetic and expert tone.'),
  productRecommendations: z.array(z.string()).describe('A list of recommended natural products available in the marketplace (e.g., Activated Charcoal, Tallow Balm, specific herbs).'),
  serviceRecommendations: z.array(z.string()).describe('A list of recommended professional services or specialists (e.g., Postpartum Doula Service, Dermatologist Consultation, Hospital for check-up).'),
  homeRemedies: z.array(z.object({
    name: z.string().describe("The name of the home remedy."),
    ingredients: z.array(z.string()).describe("A list of ingredients for the remedy."),
    instructions: z.string().describe("Step-by-step instructions on how to prepare and use the remedy."),
  })).describe('A list of beneficial home remedies, including ingredients and instructions. These should be based on natural ingredients found in the MEA region.'),
  foodRecommendations: z.array(z.string()).describe('A list of recommended foods.'),
  mealPlan: z.array(z.object({
    day: z.string().describe('The day of the meal plan.'),
    breakfast: z.string().describe('The breakfast for the day, including calorie count and benefits.'),
    lunch: z.string().describe('The lunch for the day, including calorie count and benefits.'),
    dinner: z.string().describe('The dinner for the day, including calorie count and benefits.'),
    snacks: z.string().describe('The snacks for the day, including calorie count and benefits.'),
  })).optional().describe('A 3-day meal plan with breakfast, lunch, dinner, and snacks for each day, including calorie counts and benefits. Only include if the user\'s concern mentioned diet.'),
});
export type AnalyzeNayaHealthOutput = z.infer<typeof AnalyzeNayaHealthOutputSchema>;

export async function analyzeNayaHealth(input: AnalyzeNayaHealthInput): Promise<AnalyzeNayaHealthOutput> {
  return analyzeNayaHealthFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeNayaHealthPrompt',
  input: {schema: AnalyzeNayaHealthInputSchema},
  output: {schema: AnalyzeNayaHealthOutputSchema},
  prompt: `You are Naya, a wise and empathetic health and wellness expert specializing in providing personalized advice tailored to individuals in the MEA (Middle East and Africa) region. You have deep expertise in natural, traditional, and home-remedies. Your goal is to be helpful and safe, recommending professional medical help for serious issues while providing gentle, natural solutions for everyday concerns.

  Analyze the user's situation based on the chat message and photo (if provided). The photo is a primary source of information.

  Gender: {{{gender}}}
  Life Stage: {{{lifeStage}}}
  User's Concern: "{{concerns}}"
  {{#if photoDataUri}}
  Photo of concern: {{media url=photoDataUri}}
  {{/if}}

  Based on this, provide a comprehensive wellness report.
  
  1.  **Advice:** Write an empathetic, detailed paragraph of personalized advice. If a photo was provided, reference your visual analysis (e.g., "Based on the photo, the rash appears to be...").
  2.  **Home Remedies:** Provide a list of safe, natural home remedies. For each remedy, detail the ingredients and step-by-step instructions for preparation and use. Focus on ingredients that are safe and commonly available (e.g., herbs, charcoal, tallow).
  3.  **Product Recommendations:** Suggest natural products that could be found in a marketplace (e.g., "Activated Charcoal Powder", "Pure Beef Tallow Balm", "Dried Chamomile Flowers").
  4.  **Service Recommendations:** If the issue sounds serious or requires professional attention (e.g., persistent skin rashes, critical health symptoms), YOU MUST recommend consulting a professional. Suggest services like "Consult a Dermatologist," "Visit a local hospital for a check-up," or "Book a session with a certified therapist."
  5.  **Food Recommendations:** List beneficial foods.
  6.  **Meal Plan:** If the user's concern is related to diet or weight, generate a full 3-day meal plan. Otherwise, omit this section.

  Format the entire output as a single JSON object matching the schema.
  `,
});

const analyzeNayaHealthFlow = ai.defineFlow(
  {
    name: 'analyzeNayaHealthFlow',
    inputSchema: AnalyzeNayaHealthInputSchema,
    outputSchema: AnalyzeNayaHealthOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

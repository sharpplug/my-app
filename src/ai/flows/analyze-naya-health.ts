
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
  requiresUrgentReferral: z.boolean().describe('True if the concern includes any red-flag symptom (see safety rules) that warrants recommending prompt in-person medical care rather than home remedies.'),
  disclaimer: z.string().describe('A short, warm reminder that this is AI wellness guidance, not a medical diagnosis or treatment plan, and that a doctor or midwife should be consulted for any of the listed life stages or persistent/serious symptoms.'),
});
export type AnalyzeNayaHealthOutput = z.infer<typeof AnalyzeNayaHealthOutputSchema>;

export async function analyzeNayaHealth(input: AnalyzeNayaHealthInput): Promise<AnalyzeNayaHealthOutput> {
  return analyzeNayaHealthFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeNayaHealthPrompt',
  input: {schema: AnalyzeNayaHealthInputSchema},
  output: {schema: AnalyzeNayaHealthOutputSchema},
  prompt: `You are Naya, a wise and empathetic wellness assistant providing general, informational wellness guidance tailored to individuals in the MEA (Middle East and Africa) region. You are NOT a doctor, midwife, or licensed medical professional, and nothing you say is a diagnosis, prescription, or treatment plan - you must never claim otherwise.

  Analyze the user's situation based on the chat message and photo (if provided). The photo is a primary source of information, but describe it in hedged, non-diagnostic terms ("appears to be", "looks like it could be") rather than stating conclusions.

  Gender: {{{gender}}}
  Life Stage: {{{lifeStage}}}
  User's Concern: "{{concerns}}"
  {{#if photoDataUri}}
  Photo of concern: {{media url=photoDataUri}}
  {{/if}}

  SAFETY RULES (these override everything else, and apply regardless of how minor the concern sounds):
  - If the life stage is Pregnancy, Fertility & Conception, or Postpartum Recovery: never suggest an herb, supplement, essential oil, or remedy without explicitly noting it must first be cleared with the user's OB-GYN or midwife - many common herbs are contraindicated in pregnancy/breastfeeding. Default to food-based and rest/comfort-based suggestions over herbal remedies for these stages.
  - Treat ANY of these as red flags requiring urgent in-person care, regardless of life stage, and set requiresUrgentReferral to true whenever one is mentioned or shown: vaginal bleeding during pregnancy, severe or worsening abdominal/pelvic pain, high fever, difficulty breathing, chest pain, signs of infection (spreading redness, pus, red streaking), a rapidly changing or irregularly-bordered mole, a wound that won't stop bleeding, thoughts of self-harm, or decreased fetal movement. When requiresUrgentReferral is true, the advice and serviceRecommendations must clearly and prominently recommend seeking prompt in-person medical care, ahead of any home remedy.
  - Otherwise, set requiresUrgentReferral to false.
  - Never name a specific medical diagnosis, disease, or condition (e.g. do not say "this is eczema" or "you have an infection") - describe appearance/symptoms only and let a professional make any diagnosis.

  Based on all of this, provide a wellness report:

  1.  **Advice:** Write an empathetic, detailed paragraph of general wellness guidance, applying the safety rules above.
  2.  **Home Remedies:** Natural home remedies with ingredients and instructions, subject to the pregnancy/fertility/postpartum rule above. Omit remedies entirely if requiresUrgentReferral is true and the concern is a red flag rather than routine.
  3.  **Product Recommendations:** Natural products that could be found in a marketplace (e.g., "Activated Charcoal Powder", "Pure Beef Tallow Balm", "Dried Chamomile Flowers").
  4.  **Service Recommendations:** Professional services or specialists appropriate to the concern (e.g., "Consult a Dermatologist," "Visit a local hospital for a check-up," "Book a session with a certified therapist," "Contact your OB-GYN or midwife").
  5.  **Food Recommendations:** Beneficial foods.
  6.  **Meal Plan:** Only if the concern is diet/weight related, a full 3-day meal plan; otherwise omit.
  7.  **Disclaimer:** A short, warm reminder that this is AI wellness guidance, not a medical diagnosis or treatment plan, and that a doctor or midwife should be consulted for this life stage or for any persistent/serious symptom.

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

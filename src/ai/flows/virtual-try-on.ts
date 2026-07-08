
'use server';

/**
 * @fileOverview A Genkit flow for virtual try-on of makeup and fashion items.
 *
 * - virtualTryOn - A function that handles the virtual try-on process.
 * - VirtualTryOnInput - The input type for the virtualTryOn function.
 * - VirtualTryOnOutput - The return type for the virtualTryOn function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VirtualTryOnInputSchema = z.object({
  userPhotoDataUri: z.string().describe(
    "A photo of the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  productPhotoDataUri: z.string().describe(
    "A photo of the product (e.g., lipstick, eyeshadow, dress), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  category: z.string().describe('A text description of the product category (e.g., "lipstick", "sunglasses", "evening dress", "shoes").'),
  userMeasurements: z.string().optional().describe("An optional string describing the user's measurements (e.g., 'Height: 175cm, Waist: 70cm'). This helps in fitting the item correctly.")
});
export type VirtualTryOnInput = z.infer<typeof VirtualTryOnInputSchema>;

const VirtualTryOnOutputSchema = z.object({
  generatedImageUri: z.string().describe('The generated image showing the virtual try-on, as a data URI.'),
});
export type VirtualTryOnOutput = z.infer<typeof VirtualTryOnOutputSchema>;

export async function virtualTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnOutput> {
  return virtualTryOnFlow(input);
}

const virtualTryOnFlow = ai.defineFlow(
  {
    name: 'virtualTryOnFlow',
    inputSchema: VirtualTryOnInputSchema,
    outputSchema: VirtualTryOnOutputSchema,
  },
  async (input) => {
    const promptText = `Apply the product from the product photo onto the user in the user photo. The product is a '${input.category}'.
    The result should look natural and realistic.
    ${input.userMeasurements ? `Consider the user's measurements for a better fit: ${input.userMeasurements}` : ''}`;
    
    const {media} = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image-preview',
        prompt: [
            {text: promptText},
            {media: {url: input.userPhotoDataUri}},
            {media: {url: input.productPhotoDataUri}},
        ],
        config: {
            responseModalities: ['TEXT', 'IMAGE'],
        },
    });

    const imageUrl = Array.isArray(media) ? media.find(m => !!m.url)?.url : media?.url;

    if (!imageUrl) {
      throw new Error('Image generation failed.');
    }

    return { generatedImageUri: imageUrl };
  }
);

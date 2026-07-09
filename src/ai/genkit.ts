import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// `model` here is load-bearing: ai.definePrompt()/ai.generate() calls that
// don't specify their own `model` resolve to this one, and Genkit throws
// ("Must supply a `model` to `generate()` calls.") if neither is set. Most
// flows in src/ai/flows/ (mood/skin analysis, product/event descriptions,
// career coaching, trip planning, vibe recommendations, etc.) rely on this
// default rather than setting their own - gemini-2.5-flash handles both
// text and image input, which Aura's photo-based mood/skin analysis needs.
export const ai = genkit({
  plugins: [
    googleAI({apiKey: process.env.GEMINI_API_KEY}),
  ],
  model: googleAI.model('gemini-2.5-flash'),
});

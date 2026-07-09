
"use server";

import {
  analyzeUserMood,
  AnalyzeUserMoodInput,
  AnalyzeUserMoodOutput,
} from "@/ai/flows/analyze-user-mood";
import {
  analyzeSkinCondition,
  AnalyzeSkinConditionInput,
  AnalyzeSkinConditionOutput,
} from "@/ai/flows/analyze-skin-condition";
import {
  generateDynamicTheme as generateDynamicThemeFlow,
  GenerateDynamicThemeInput,
  GenerateDynamicThemeOutput,
} from "@/ai/flows/generate-dynamic-theme";
import {
  analyzeNayaHealth,
  AnalyzeNayaHealthInput,
  AnalyzeNayaHealthOutput,
} from "@/ai/flows/analyze-naya-health";
import {
  virtualTryOn as virtualTryOnFlow,
  VirtualTryOnInput,
  VirtualTryOnOutput,
} from "@/ai/flows/virtual-try-on";
import {
  generateProductDescription as generateProductDescriptionFlow,
  GenerateProductDescriptionInput,
  GenerateProductDescriptionOutput,
} from "@/ai/flows/generate-product-description";
import {
  generateVibeVideo,
  GenerateVibeVideoInput,
  GenerateVibeVideoOutput
} from "@/ai/flows/generate-vibe-video";
import {
  aiCareerCoach as aiCareerCoachFlow,
  AiCareerCoachInput,
  AiCareerCoachOutput,
} from "@/ai/flows/ai-career-coach";
import {
  generateEventDescription as generateEventDescriptionFlow,
  GenerateEventDescriptionInput,
  GenerateEventDescriptionOutput,
} from "@/ai/flows/generate-event-description";
import {
    recommendVibes as recommendVibesFlow,
    RecommendVibesInput,
    RecommendVibesOutput,
} from "@/ai/flows/recommend-vibes";
import {
  aiSafetyCheckIn as aiSafetyCheckInFlow,
  AiSafetyCheckInInput,
  AiSafetyCheckInOutput,
} from "@/ai/flows/ai-safety-check-in";
import {
    planComplexTrip as planComplexTripFlow,
    PlanComplexTripInput,
    PlanComplexTripOutput,
} from "@/ai/flows/plan-complex-trip";
import {
    planMyDay as planMyDayFlow,
    PlanMyDayInput,
    PlanMyDayOutput,
} from "@/ai/flows/plan-my-day";
import {
  generateStory,
  GenerateStoryInput,
  GenerateStoryOutput
} from "@/ai/flows/generate-story";
import {
  planChauffeurFromCalendar as planChauffeurFromCalendarFlow,
  PlanChauffeurFromCalendarInput,
  PlanChauffeurFromCalendarOutput,
} from "@/ai/flows/plan-chauffeur-from-calendar";
import {
  analyzeVibePost as analyzeVibePostFlow,
  AnalyzeVibePostInput,
  AnalyzeVibePostOutput,
} from "@/ai/flows/analyze-vibe-post";
import {
  nayaCallResponse as nayaCallResponseFlow,
  NayaCallInput,
  NayaCallOutput
} from "@/ai/flows/naya-call-response";
import { requireAuth } from "@/lib/verify-auth";
import { enforceRateLimit } from "@/lib/rate-limit";

// Tighter limits for flows that generate images/video or touch health
// content (expensive Gemini calls, and the ones most worth throttling
// against abuse); a more generous default for lightweight text flows.
const TIGHT = { max: 5, windowMs: 60_000 };
const GENEROUS = { max: 20, windowMs: 60_000 };

export type AuraAnalysisResult = {
  mood: AnalyzeUserMoodOutput;
  skin: AnalyzeSkinConditionOutput | null;
};

export async function getAuraAnalysis(
  idToken: string,
  input: AnalyzeUserMoodInput & Partial<AnalyzeSkinConditionInput>
): Promise<AuraAnalysisResult> {
  const uid = await requireAuth(idToken);
  await enforceRateLimit(uid, "getAuraAnalysis", TIGHT);
  try {
    // Mood and skin analysis are independent Gemini calls on the same
    // photo - they used to run one after the other, roughly doubling the
    // wait for a photo-based Aura analysis. Running them concurrently
    // keeps this to the slower of the two calls instead of their sum.
    const [moodResult, skinResult] = await Promise.all([
      analyzeUserMood({
        photoDataUri: input.photoDataUri,
        textDescription: input.textDescription,
      }),
      input.photoDataUri
        ? analyzeSkinCondition({ photoDataUri: input.photoDataUri, description: input.description }).catch(
            (): AnalyzeSkinConditionOutput | null => null
          )
        : Promise.resolve(null),
    ]);

    return { mood: moodResult, skin: skinResult };
  } catch (error) {
    if (error instanceof Error) {
        if (error.message.includes('API_KEY_SERVICE_BLOCKED') || error.message.includes('403 Forbidden')) {
            return {
                mood: {
                    mood: "CONFIG_ERROR",
                    confidence: 1,
                    recommendedProducts: [],
                    recommendedServices: [],
                    recommendedFoods: [],
                    recommendedThemeColors: [],
                },
                skin: null
            };
        }
    }
    throw error;
  }
}

export async function generateDynamicTheme(idToken: string, input: GenerateDynamicThemeInput): Promise<GenerateDynamicThemeOutput> {
  const uid = await requireAuth(idToken);
  await enforceRateLimit(uid, "generateDynamicTheme", GENEROUS);
  return generateDynamicThemeFlow(input);
}

export async function getNayaHealth(idToken: string, input: AnalyzeNayaHealthInput): Promise<AnalyzeNayaHealthOutput> {
  const uid = await requireAuth(idToken);
  await enforceRateLimit(uid, "getNayaHealth", TIGHT);
  return analyzeNayaHealth(input);
}

export async function generateProductDescription(idToken: string, input: GenerateProductDescriptionInput): Promise<GenerateProductDescriptionOutput> {
  const uid = await requireAuth(idToken);
  await enforceRateLimit(uid, "generateProductDescription", GENEROUS);
  return generateProductDescriptionFlow(input);
}

export async function generateEventDescription(idToken: string, input: GenerateEventDescriptionInput): Promise<GenerateEventDescriptionOutput> {
  const uid = await requireAuth(idToken);
  await enforceRateLimit(uid, "generateEventDescription", GENEROUS);
  return generateEventDescriptionFlow(input);
}

export async function aiCareerCoach(idToken: string, input: AiCareerCoachInput): Promise<AiCareerCoachOutput> {
  const uid = await requireAuth(idToken);
  await enforceRateLimit(uid, "aiCareerCoach", GENEROUS);
  return aiCareerCoachFlow(input);
}

export async function recommendVibes(idToken: string, input: RecommendVibesInput): Promise<RecommendVibesOutput> {
  const uid = await requireAuth(idToken);
  await enforceRateLimit(uid, "recommendVibes", GENEROUS);
  return recommendVibesFlow(input);
}

export async function aiSafetyCheckIn(idToken: string, input: AiSafetyCheckInInput): Promise<AiSafetyCheckInOutput> {
  const uid = await requireAuth(idToken);
  await enforceRateLimit(uid, "aiSafetyCheckIn", GENEROUS);
  return aiSafetyCheckInFlow(input);
}

export async function planComplexTrip(idToken: string, input: PlanComplexTripInput): Promise<PlanComplexTripOutput> {
  const uid = await requireAuth(idToken);
  await enforceRateLimit(uid, "planComplexTrip", GENEROUS);
  return planComplexTripFlow(input);
}

export async function planMyDay(idToken: string, input: PlanMyDayInput): Promise<PlanMyDayOutput> {
  const uid = await requireAuth(idToken);
  await enforceRateLimit(uid, "planMyDay", GENEROUS);
  return planMyDayFlow(input);
}

export async function virtualTryOn(idToken: string, input: VirtualTryOnInput): Promise<VirtualTryOnOutput> {
  const uid = await requireAuth(idToken);
  await enforceRateLimit(uid, "virtualTryOn", TIGHT);
  return virtualTryOnFlow(input);
}

export async function planChauffeurFromCalendar(idToken: string, input: PlanChauffeurFromCalendarInput): Promise<PlanChauffeurFromCalendarOutput> {
  const uid = await requireAuth(idToken);
  await enforceRateLimit(uid, "planChauffeurFromCalendar", GENEROUS);
  return planChauffeurFromCalendarFlow(input);
}

export async function analyzeVibePost(idToken: string, input: AnalyzeVibePostInput): Promise<AnalyzeVibePostOutput> {
  const uid = await requireAuth(idToken);
  await enforceRateLimit(uid, "analyzeVibePost", GENEROUS);
  return analyzeVibePostFlow(input);
}

export async function nayaCallResponse(idToken: string, input: NayaCallInput): Promise<NayaCallOutput> {
  const uid = await requireAuth(idToken);
  await enforceRateLimit(uid, "nayaCallResponse", GENEROUS);
  return nayaCallResponseFlow(input);
}

export async function generateVibeVideoAction(idToken: string, input: GenerateVibeVideoInput): Promise<GenerateVibeVideoOutput> {
  const uid = await requireAuth(idToken);
  await enforceRateLimit(uid, "generateVibeVideoAction", { max: 3, windowMs: 60_000 });
  return generateVibeVideo(input);
}

export async function generateStoryAction(idToken: string, input: GenerateStoryInput): Promise<GenerateStoryOutput> {
  const uid = await requireAuth(idToken);
  await enforceRateLimit(uid, "generateStoryAction", TIGHT);
  return generateStory(input);
}

export type {
  GenerateDynamicThemeInput, GenerateDynamicThemeOutput,
  AnalyzeNayaHealthInput, AnalyzeNayaHealthOutput,
  GenerateProductDescriptionInput, GenerateProductDescriptionOutput,
  GenerateEventDescriptionInput, GenerateEventDescriptionOutput,
  AiCareerCoachInput, AiCareerCoachOutput,
  GenerateVibeVideoInput, GenerateVibeVideoOutput,
  RecommendVibesInput, RecommendVibesOutput,
  AiSafetyCheckInInput, AiSafetyCheckInOutput,
  PlanComplexTripInput, PlanComplexTripOutput,
  PlanMyDayInput, PlanMyDayOutput,
  GenerateStoryInput, GenerateStoryOutput,
  VirtualTryOnInput, VirtualTryOnOutput,
  PlanChauffeurFromCalendarInput, PlanChauffeurFromCalendarOutput,
  AnalyzeVibePostInput, AnalyzeVibePostOutput,
  NayaCallInput, NayaCallOutput
};

export type {
  EventSuggestionSchema,
  FoodRecommendationSchema,
  TripSegmentSchema,
  StayBookingSchema,
} from '@/ai/flows/plan-my-day.types';


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

export type AuraAnalysisResult = {
  mood: AnalyzeUserMoodOutput;
  skin: AnalyzeSkinConditionOutput | null;
};

export async function getAuraAnalysis(
  idToken: string,
  input: AnalyzeUserMoodInput & Partial<AnalyzeSkinConditionInput>
): Promise<AuraAnalysisResult> {
  await requireAuth(idToken);
  try {
    const moodResult = await analyzeUserMood({
      photoDataUri: input.photoDataUri,
      textDescription: input.textDescription,
    });

    let skinResult: AnalyzeSkinConditionOutput | null = null;
    if (input.photoDataUri) {
       try {
        skinResult = await analyzeSkinCondition({ photoDataUri: input.photoDataUri, description: input.description });
       } catch (err) {
          // Gracefully fail, skinResult is already null
       }
    }

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
  await requireAuth(idToken);
  return generateDynamicThemeFlow(input);
}

export async function getNayaHealth(idToken: string, input: AnalyzeNayaHealthInput): Promise<AnalyzeNayaHealthOutput> {
  await requireAuth(idToken);
  return analyzeNayaHealth(input);
}

export async function generateProductDescription(idToken: string, input: GenerateProductDescriptionInput): Promise<GenerateProductDescriptionOutput> {
  await requireAuth(idToken);
  return generateProductDescriptionFlow(input);
}

export async function generateEventDescription(idToken: string, input: GenerateEventDescriptionInput): Promise<GenerateEventDescriptionOutput> {
  await requireAuth(idToken);
  return generateEventDescriptionFlow(input);
}

export async function aiCareerCoach(idToken: string, input: AiCareerCoachInput): Promise<AiCareerCoachOutput> {
  await requireAuth(idToken);
  return aiCareerCoachFlow(input);
}

export async function recommendVibes(idToken: string, input: RecommendVibesInput): Promise<RecommendVibesOutput> {
  await requireAuth(idToken);
  return recommendVibesFlow(input);
}

export async function aiSafetyCheckIn(idToken: string, input: AiSafetyCheckInInput): Promise<AiSafetyCheckInOutput> {
  await requireAuth(idToken);
  return aiSafetyCheckInFlow(input);
}

export async function planComplexTrip(idToken: string, input: PlanComplexTripInput): Promise<PlanComplexTripOutput> {
  await requireAuth(idToken);
  return planComplexTripFlow(input);
}

export async function planMyDay(idToken: string, input: PlanMyDayInput): Promise<PlanMyDayOutput> {
  await requireAuth(idToken);
  return planMyDayFlow(input);
}

export async function virtualTryOn(idToken: string, input: VirtualTryOnInput): Promise<VirtualTryOnOutput> {
  await requireAuth(idToken);
  return virtualTryOnFlow(input);
}

export async function planChauffeurFromCalendar(idToken: string, input: PlanChauffeurFromCalendarInput): Promise<PlanChauffeurFromCalendarOutput> {
  await requireAuth(idToken);
  return planChauffeurFromCalendarFlow(input);
}

export async function analyzeVibePost(idToken: string, input: AnalyzeVibePostInput): Promise<AnalyzeVibePostOutput> {
  await requireAuth(idToken);
  return analyzeVibePostFlow(input);
}

export async function nayaCallResponse(idToken: string, input: NayaCallInput): Promise<NayaCallOutput> {
  await requireAuth(idToken);
  return nayaCallResponseFlow(input);
}

export async function generateVibeVideoAction(idToken: string, input: GenerateVibeVideoInput): Promise<GenerateVibeVideoOutput> {
  await requireAuth(idToken);
  return generateVibeVideo(input);
}

export async function generateStoryAction(idToken: string, input: GenerateStoryInput): Promise<GenerateStoryOutput> {
  await requireAuth(idToken);
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

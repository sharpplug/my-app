
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
  generateDynamicTheme,
  GenerateDynamicThemeInput,
  GenerateDynamicThemeOutput,
} from "@/ai/flows/generate-dynamic-theme";
import {
  analyzeNayaHealth,
  AnalyzeNayaHealthInput,
  AnalyzeNayaHealthOutput,
} from "@/ai/flows/analyze-naya-health";
import {
  virtualTryOn,
  VirtualTryOnInput,
  VirtualTryOnOutput,
} from "@/ai/flows/virtual-try-on";
import {
  generateProductDescription,
  GenerateProductDescriptionInput,
  GenerateProductDescriptionOutput,
} from "@/ai/flows/generate-product-description";
import { 
  generateVibeVideo,
  GenerateVibeVideoInput,
  GenerateVibeVideoOutput 
} from "@/ai/flows/generate-vibe-video";
import { 
  aiCareerCoach,
  AiCareerCoachInput,
  AiCareerCoachOutput,
} from "@/ai/flows/ai-career-coach";
import {
  generateEventDescription,
  GenerateEventDescriptionInput,
  GenerateEventDescriptionOutput,
} from "@/ai/flows/generate-event-description";
import {
    recommendVibes,
    RecommendVibesInput,
    RecommendVibesOutput,
} from "@/ai/flows/recommend-vibes";
import {
  aiSafetyCheckIn,
  AiSafetyCheckInInput,
  AiSafetyCheckInOutput,
} from "@/ai/flows/ai-safety-check-in";
import {
    planComplexTrip,
    PlanComplexTripInput,
    PlanComplexTripOutput,
} from "@/ai/flows/plan-complex-trip";
import {
    planMyDay,
    PlanMyDayInput,
    PlanMyDayOutput,
} from "@/ai/flows/plan-my-day";
import { 
  generateStory, 
  GenerateStoryInput, 
  GenerateStoryOutput 
} from "@/ai/flows/generate-story";
import {
  planChauffeurFromCalendar,
  PlanChauffeurFromCalendarInput,
  PlanChauffeurFromCalendarOutput,
} from "@/ai/flows/plan-chauffeur-from-calendar";
import {
  analyzeVibePost,
  AnalyzeVibePostInput,
  AnalyzeVibePostOutput,
} from "@/ai/flows/analyze-vibe-post";
import {
  nayaCallResponse,
  NayaCallInput,
  NayaCallOutput
} from "@/ai/flows/naya-call-response";


export type AuraAnalysisResult = {
  mood: AnalyzeUserMoodOutput;
  skin: AnalyzeSkinConditionOutput | null;
};

export async function getAuraAnalysis(
  input: AnalyzeUserMoodInput & Partial<AnalyzeSkinConditionInput>
): Promise<AuraAnalysisResult> {
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

export { 
  generateDynamicTheme,
  analyzeNayaHealth as getNayaHealth,
  generateProductDescription,
  generateEventDescription,
  aiCareerCoach,
  recommendVibes,
  aiSafetyCheckIn,
  planComplexTrip,
  planMyDay,
  virtualTryOn,
  planChauffeurFromCalendar,
  analyzeVibePost,
  nayaCallResponse
};

export { generateVibeVideo as generateVibeVideoAction };
export { generateStory as generateStoryAction };

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

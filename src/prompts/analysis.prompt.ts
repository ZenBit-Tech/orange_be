import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';
import { formatMarkersExampleStructure } from 'utils/analysisPrompt/markerFormatters';
import { formatMarkersList } from 'utils/analysisPrompt/markersList';
import { formatPrecalculatedStatuses } from 'utils/analysisPrompt/precalculatedStatuses';
import { formatUserQuestionSection } from 'utils/analysisPrompt/questionSection';
import { formatRecommendationsSection } from 'utils/analysisPrompt/recommendationSection';

export type SingleMarkerDto = CreateReviewDataDto['markersData'][number];

export function getSummaryAndRecsPrompt(data: CreateReviewDataDto): string {
  const age = new Date().getFullYear() - data.birthYear;

  const recsSection = formatRecommendationsSection(data);
  const questionsSection = formatUserQuestionSection(data.additionalQuestions);
  const markersList = formatMarkersList(data.markersData);
  const statuses = formatPrecalculatedStatuses(data.markersData);

  return `
      ROLE: Chief Medical Analyst.
      TASK: Analyze data. Provide Summary AND Recommendations.
      
      PATIENT: Age ${age}, Gender ${data.gender}, Pregnancy ${data.pregnancy || 'none'}.


      SCORING RULES (Base: 100):
    Scan the provided "Status" for each marker:

    1. FILTER EXCEPTIONS (Penalty = 0):
       - IF PREGNANT: Ignore "High"/"Slightly High" in [Cholesterol, Lipids, WBC, ALP] & "Low" in [HGB, HCT, RBC].
       - IF MALE: No physiologic exceptions.

    2. APPLY PENALTIES (For non-ignored):
       - "Critical": -20 pts.
       - "High" / "Low": -10 pts.
       - "Slightly High" / "Slightly Low": -3 pts.

    3. ADJUSTMENTS:
       - Age > 50: Multiply penalty by 1.5 for Glucose/Lipids.
       - PREGNANT: Strict penalty (-10) for High BP/Protein/Liver.

      MARKERS SUMMARY (For context only):
      ${markersList}
      ${statuses}
      
      OUTPUT FORMAT (JSON):
      {
        "bloodTestSummary": {
           "overallWellnessScore": <0-100>,
           "overallSummary": "Summary text (max 60 words)",
           "detailedFindings": ["Point 1", "Point 2"],
           "conclusionStatement": "Conclusion"
        },
        "markersInterpretations": [] 
        ${recsSection}  
        ${questionsSection}
      }

      INSTRUCTIONS:
      1. Leave "markersInterpretations" EMPTY []. 
      2. Recommendations Style: 
         - Use prefix "Discuss with your doctor..." ONLY if recommending specific medications or heavy supplements.
         - For lifestyle, diet, or general habits, give direct advice WITHOUT the prefix.
    `;
}

export function getMarkersChunkPrompt(chunkMarkers: SingleMarkerDto[]): string {
  const markersList = formatMarkersList(chunkMarkers);
  const statuses = formatPrecalculatedStatuses(chunkMarkers);
  const example = formatMarkersExampleStructure(chunkMarkers);

  return `
      ROLE: Lab Technician.
      TASK: Describe ONLY these markers.
      
      DATA:
      ${markersList}
      ${statuses}
      
      OUTPUT JSON:
      {
        "markersInterpretations": [
           ${example}
        ]
      }
      
      CONSTRAINT:
      - If Status "Normal": Write "Within normal range."
      - If Warning/Critical: Max 1 sentence explanation.
    `;
}

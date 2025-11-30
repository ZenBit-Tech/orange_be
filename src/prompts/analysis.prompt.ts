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
      
      PATIENT: Age ${age}, Gender ${data.gender}.
      
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
      2.Scoring Logic: Determine "overallWellnessScore" by categorizing the patient into one of these tiers based on "statuses":
         - 90-100 (Optimal): All markers Normal, or 1-2 minor variations.
         - 75-89 (Good): Several Warnings, but NO Critical issues.
         - 60-74 (Caution): Many Warnings OR 1 Critical issue.
         - Below 60 (Attention Needed): Multiple Critical issues or systemic imbalance.      
    3. Recommendations Style: 
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

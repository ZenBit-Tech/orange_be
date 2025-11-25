import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';
import { formatMarkersExampleStructure } from 'utils/analysisPrompt/markerFormatters';
import { formatMarkersList } from 'utils/analysisPrompt/markersList';
import { formatPrecalculatedStatuses } from 'utils/analysisPrompt/precalculatedStatuses';
import { formatUserQuestionSection } from 'utils/analysisPrompt/questionSection';
import { formatRecommendationsSection } from 'utils/analysisPrompt/recommendationSection';

export function getBloodTestAnalysisPrompt(data: CreateReviewDataDto): string {
  const age = new Date().getFullYear() - data.birthYear;

  const recommendationsSection: string = formatRecommendationsSection(data);

  const userQuestionSection: string = formatUserQuestionSection(
    data.additionalQuestions,
  );

  const markersList: string = formatMarkersList(data.markersData);

  const precalculatedStatuses: string = formatPrecalculatedStatuses(
    data.markersData,
  );

  const markersExampleStructure: string = formatMarkersExampleStructure(
    data.markersData,
  );

  return `You are providing EDUCATIONAL INFORMATION ONLY, not medical advice.

MANDATORY REQUIREMENT - READ CAREFULLY:
EVERY SINGLE recommendation MUST include phrases like:
- "Discuss with your doctor about..."
- "Consult your healthcare provider before..."
- "Your doctor may recommend..."
- "Ask your physician about..."

NEVER write direct instructions like "Take X daily" or "Start doing Y"
ALWAYS frame as "Discuss taking X with your doctor" or "Your doctor may suggest Y"

PATIENT INFO:
- Age: ${age} years old
- Gender: ${data.gender}
${data.pregnancy ? `- Pregnancy status: ${data.pregnancy}` : ''}

BLOOD TEST MARKERS (TOTAL: ${data.markersData.length} markers):
${markersList}

PRE-CALCULATED STATUSES (USE THESE EXACT VALUES - DO NOT RECALCULATE):
${precalculatedStatuses}

CRITICAL: The statuses above have been mathematically calculated using the correct algorithm.
You MUST use these exact status values in your JSON response.
DO NOT recalculate or override these values based on medical interpretation.
Simply copy the STATUS value for each marker into your JSON.

${data.additionalQuestions ? `USER QUESTION: "${data.additionalQuestions}"` : ''}

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON with no markdown
2. Use the PRE-CALCULATED STATUSES exactly as provided above
3. Each "descriptions" array must have 3-5 strings
4. EVERY recommendation MUST start with "Discuss with your doctor" or similar phrase
5. Use educational, cautious language throughout
6. MANDATORY: Include ALL ${data.markersData.length} markers in "markersInterpretations" array


Supplements - CORRECT:
"Discuss with your doctor about Omega-3 Fish Oil supplementation (1000-2000mg EPA+DHA daily). Your healthcare provider can determine if this is appropriate for your situation and check for any medication interactions. Studies suggest omega-3s may support cardiovascular health when used under medical supervision."

Supplements - WRONG (DO NOT DO THIS):
"Take Omega-3 Fish Oil 1000mg daily. Reduces inflammation and supports heart health. Choose high-quality brands."

Nutrition - CORRECT:
"Consider discussing with a nutritionist or your doctor about increasing leafy green vegetables like spinach and kale. These foods are rich in antioxidants that may support liver function. Your healthcare provider can help you develop a personalized meal plan."

Nutrition - WRONG (DO NOT DO THIS):
"Increase leafy green vegetables. They support liver health. Add them to smoothies."

Exercise - CORRECT:
"Consult your healthcare provider before starting any exercise program, but they may recommend 30 minutes of moderate aerobic activity 5 times weekly. Your doctor can determine what level of activity is safe based on your current health status and any underlying conditions."

Exercise - WRONG (DO NOT DO THIS):
"Do moderate aerobic exercise 30 minutes, 5 times weekly. Improves cardiovascular health. Try brisk walking."

Medications - CORRECT:
"Your hepatologist may consider prescribing hepatoprotective agents after thorough evaluation of your liver function. These prescription medications require medical supervision and can only be obtained through your doctor. Discuss this treatment option during your consultation."

Medications - WRONG (DO NOT DO THIS):
"Hepatoprotective agents (High priority). These medications help protect the liver. For fatty liver disease."
JSON STRUCTURE (use the pre-calculated status values):
{
  "bloodTestSummary": {
    "overallWellnessScore": 60,
    "overallSummary": "Your results show a few noticeable imbalances that might indicate temporary stress on certain body systems.",
    "detailedFindings": [
      "Describe specific elevated or low markers and what they might indicate",
      "Mention other notable findings with context",
      "Include any positive findings"
    ],
    "conclusionStatement": "Overall conclusion about the results."
  },
  "markersInterpretations": [
${markersExampleStructure}
  ]${recommendationsSection}${userQuestionSection}
}

FINAL REMINDER:
- Use the PRE-CALCULATED STATUS for each marker - they are already correct
- Every recommendation MUST include "Discuss with your doctor" or similar phrase
- Return ONLY the JSON object with NO markdown formatting

Return ONLY the JSON object.`;
}

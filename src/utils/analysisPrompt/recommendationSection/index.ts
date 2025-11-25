import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';

export function formatRecommendationsSection(
  data: CreateReviewDataDto,
): string {
  const recommendationBlocks: string[] = [];

  if (data.supplementRecommendations) {
    recommendationBlocks.push(`"supplementsRecommendations": {
    "descriptions": [
      "Supplement recommendation 1",
      "Supplement recommendation 2",
      "Supplement recommendation 3"
    ]
  }`);
  }

  if (data.nutritionAdvice) {
    recommendationBlocks.push(`"nutritionRecommendations": {
    "descriptions": [
      "Nutrition advice 1",
      "Nutrition advice 2",
      "Nutrition advice 3"
    ]
  }`);
  }

  if (data.medicationGuidance) {
    recommendationBlocks.push(`"drugsRecommendations": {
    "descriptions": [
      "Medication guidance 1",
      "Medication guidance 2",
      "Medication guidance 3"
    ]
  }`);
  }

  if (data.exerciseGuidelines) {
    recommendationBlocks.push(`"exerciseRecommendations": {
    "descriptions": [
      "Exercise guideline 1",
      "Exercise guideline 2",
      "Exercise guideline 3"
    ]
  }`);
  }

  const recommendationsSection =
    recommendationBlocks.length > 0
      ? ',\n  ' + recommendationBlocks.join(',\n  ')
      : '';

  return recommendationsSection;
}

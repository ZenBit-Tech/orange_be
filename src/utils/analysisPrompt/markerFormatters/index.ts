import { MarkerData } from '@common/interfaces/review-analysis-data.interface';
import { calculateStatus } from 'utils/calculateStatus';

export function formatMarkersExampleStructure(
  markersData: MarkerData[],
): string {
  const markersExampleStructure = markersData
    .map((m, index) => {
      const safeRange = m.normalRange || '';
      const rangeMatch = safeRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
      const referenceMin = rangeMatch ? rangeMatch[1] : 'N/A';
      const referenceMax = rangeMatch ? rangeMatch[2] : 'N/A';

      let calculatedStatus = '"Normal"';
      if (rangeMatch) {
        const min = parseFloat(rangeMatch[1]);
        const max = parseFloat(rangeMatch[2]);
        const val = parseFloat(m.value);
        calculatedStatus = `"${calculateStatus(val, min, max)}"`;
      }

      return `  {
    "markerId": ${index + 1},
    "markerName": "${m.name}",
    "value": "${m.value}",
    "unit": "${m.unit}",
    "referenceMin": "${referenceMin}",
    "referenceMax": "${referenceMax}",
    "status": ${calculatedStatus},
    "interpretation": {
      "about": "Brief explanation of what this marker measures",
      "whyImportant": "Why this marker is important for health",
      "contextualNote": "Any relevant context based on the value"
    }
  }`;
    })
    .join(',\n');

  return markersExampleStructure;
}

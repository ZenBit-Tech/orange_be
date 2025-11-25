import { MarkerData } from '@common/interfaces/review-analysis-data.interface';
import { calculateStatus } from 'utils/calculateStatus';

export function formatPrecalculatedStatuses(markersData: MarkerData[]): string {
  const precalculatedStatuses = markersData
    .map((m, index) => {
      const safeRange = m.normalRange || '';
      const rangeMatch = safeRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
      if (!rangeMatch) return null;

      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      const val = parseFloat(m.value);

      const status = calculateStatus(val, min, max);
      const threshold = val > max ? max * 1.5 : min * 0.5;

      return `Marker ${index + 1} (${m.name}): value=${val}, range=${min}-${max}, threshold=${threshold.toFixed(2)}, STATUS="${status}"`;
    })
    .filter(Boolean)
    .join('\n');

  return precalculatedStatuses;
}

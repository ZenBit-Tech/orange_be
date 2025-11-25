import { MarkerData } from '@common/interfaces/review-analysis-data.interface';

export function formatMarkersList(markersData: MarkerData[]): string {
  const markersList = markersData
    .map(
      (m, index) =>
        `${index + 1}. ${m.name}: ${m.value} ${m.unit} (Normal: ${m.normalRange})`,
    )
    .join('\n');

  return markersList;
}

export const calculateStatus = (
  value: number,
  min: number,
  max: number,
): string => {
  if (value >= min && value <= max) return 'Normal';
  if (value < min) {
    const slightlyLowThreshold = min * 0.5;
    const criticalLowThreshold = min * 0.3;
    if (value < criticalLowThreshold) return 'Critical';
    if (value < slightlyLowThreshold) return 'Low';
    return 'Slightly Low';
  }
  if (value > max) {
    const slightlyHighThreshold = max * 1.5;
    const criticalHighThreshold = max * 2.0;

    if (value > criticalHighThreshold) return 'Critical';
    if (value > slightlyHighThreshold) return 'High';
    return 'Slightly High';
  }
  return 'Normal';
};

/**
 * Calculates the severity status of a value based on a specific range.
 *
 * **Before (Inputs):**
 * - `value`: The raw number to be evaluated.
 * - `min`: The minimum threshold for the 'Normal' range.
 * - `max`: The maximum threshold for the 'Normal' range.
 *
 * **After (Output):**
 * - Returns a specific string label describing where the value falls relative to the range:
 * - 'Normal': The value is safe (between min and max).
 * - 'Slightly Low' / 'Low' / 'Critical': The value is below min (based on 50% and 30% thresholds).
 * - 'Slightly High' / 'High' / 'Critical': The value is above max (based on 150% and 200% thresholds).
 */
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

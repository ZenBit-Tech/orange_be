export interface MarkerValue {
  id: string;
  name: string;
  value: number;
  unit: string;
  referenceMin: number;
  referenceMax: number;
}

export type BloodTestData = MarkerValue[];

export interface BloodTestValidation {
  isBloodTest: boolean;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
}

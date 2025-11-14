export interface MarkerValue {
  value: number;
  unit: string;
  referenceMin: number;
  referenceMax: number;
}

export interface BloodTestData {
  wbc?: MarkerValue;
  rbc?: MarkerValue;
  hemoglobin?: MarkerValue;
  hematocrit?: MarkerValue;
  mcv?: MarkerValue;
  mch?: MarkerValue;
  mchc?: MarkerValue;
  plt?: MarkerValue;
  rdwsd?: MarkerValue;
  rdwcv?: MarkerValue;
  pdw?: MarkerValue;
  mpv?: MarkerValue;
  neutrophils?: MarkerValue;
  lymphocytes?: MarkerValue;
  monocytes?: MarkerValue;
  eosinophils?: MarkerValue;
  basophils?: MarkerValue;
  triglycerides?: MarkerValue;
  cholesterol?: MarkerValue;
  hdl?: MarkerValue;
  ldl?: MarkerValue;
  vldl?: MarkerValue;
  atherogenicCoeff?: MarkerValue;
  totalBilirubin?: MarkerValue;
  directBilirubin?: MarkerValue;
  alt?: MarkerValue;
  ast?: MarkerValue;
  ggt?: MarkerValue;
  alp?: MarkerValue;
  glucose?: MarkerValue;
  albumin?: MarkerValue;
  creatinine?: MarkerValue;
  uricAcid?: MarkerValue;
}

export interface Marker {
  id: number;
  key: string;
  pattern: string;
  language: string;
  category: string;
  unit: string;
  normalRange: string;
}

export interface BloodTestValidation {
  isBloodTest: boolean;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
}

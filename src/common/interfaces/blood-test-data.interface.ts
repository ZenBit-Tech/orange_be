export interface BloodTestData {
  patientInfo: PatientInfo;
  lipids: LipidProfile;
  bloodAll: BloodCount;
  liverFunction: LiverFunction;
  kidneyFunction: KidneyFunction;
}

export interface PatientInfo {
  age?: number;
  sex?: string;
  dob?: string;
}

export interface LipidProfile {
  triglycerides?: number;
  cholesterol?: number;
  hdl?: number;
  ldl?: number;
  vldl?: number;
  atherogenicCoeff?: number;
}

export interface BloodCount {
  wbc?: number;
  rbc?: number;
  hemoglobin?: number;
  hematocrit?: number;
  mcv?: number;
  mch?: number;
  mchc?: number;
  plt?: number;
  rdwsd?: number;
  rdwcv?: number;
  pdw?: number;
  mpv?: number;
  neutrophils?: number;
  lymphocytes?: number;
  monocytes?: number;
  eosinophils?: number;
  basophils?: number;
}

export interface LiverFunction {
  totalBilirubin?: number;
  directBilirubin?: number;
  alt?: number;
  ast?: number;
  ggt?: number;
  alp?: number;
  glucose?: number;
  albumin?: number;
}

export interface KidneyFunction {
  creatinine?: number;
  uricAcid?: number;
}

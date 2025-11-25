export interface BloodTestSummary {
  overallWellnessScore: number;
  overallSummary: string;
  detailedFindings: string[];
  conclusionStatement: string;
}

export interface MarkerInterpretationDetail {
  about: string;
  whyImportant: string;
  contextualNote: string;
}

export interface MarkerInterpretation {
  markerId: number;
  markerName: string;
  value: string;
  unit: string;
  referenceMin: string;
  referenceMax: string;
  status:
    | 'Normal'
    | 'Slightly Low'
    | 'Slightly High'
    | 'High'
    | 'Low'
    | 'Critical';
  interpretation: MarkerInterpretationDetail;
}

export interface RecommendationWrapper {
  descriptions: string[];
}

export interface UserQuestionResponse {
  question: string;
  answer: string;
}

export interface AiAnalysisResult {
  bloodTestSummary: BloodTestSummary;
  markersInterpretations: MarkerInterpretation[];
  supplementsRecommendations?: RecommendationWrapper;
  nutritionRecommendations?: RecommendationWrapper;
  drugsRecommendations?: RecommendationWrapper;
  exerciseRecommendations?: RecommendationWrapper;
  userQuestionResponse?: UserQuestionResponse;
  pdfJobId: string;
}

export enum PdfJobStatusEnum {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ValidationConfidence {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface PdfJobStatus {
  status: PdfJobStatusEnum;
  filename?: string;
  error?: string;
  createdAt: Date;
}

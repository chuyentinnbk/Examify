import { CognitiveLevel, ExamType, QuestionType } from '@prisma/client';

export interface CurriculumContext {
  level: string;     // e.g. "Upper Secondary"
  grade: string;     // e.g. "Grade 10"
  subject: string;   // e.g. "Mathematics"
  semester: string;  // e.g. "Semester 1"
  topic?: string;    // e.g. "Quadratic Functions"
  lesson?: string;   // e.g. "Graphing Parabolas and Vertex Calculation"
}

export interface CognitiveDistribution {
  knowledge: number;        // Percentage, e.g., 40%
  comprehension: number;    // Percentage, e.g., 30%
  application: number;      // Percentage, e.g., 20%
  highApplication: number;  // Percentage, e.g., 10%
}

export interface ExamGenerationPayload {
  curriculum: CurriculumContext;
  examType: ExamType;
  durationMinutes: number;
  totalPoints: number;
  totalQuestions: number;
  cognitiveMatrix?: CognitiveDistribution;
  customPrompt?: string;
  language?: string; // default "Vietnamese" or "English"
}

export interface GeneratedQuestion {
  questionNumber: number;
  type: QuestionType;
  cognitiveLevel: CognitiveLevel;
  content: string;
  options?: string[]; // Required for MULTIPLE_CHOICE (A, B, C, D)
  correctAnswer: string;
  explanation: string;
  points: number;
}

export interface GeneratedExamData {
  title: string;
  curriculumSummary: string;
  examType: ExamType;
  durationMinutes: number;
  totalPoints: number;
  totalQuestions: number;
  instructions: string[];
  questions: GeneratedQuestion[];
}

export interface ExamGenerationResult {
  success: boolean;
  examData?: GeneratedExamData;
  rawResponse?: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  error?: string;
}

export interface IAIProvider {
  readonly providerName: string;
  readonly modelName: string;

  /**
   * Generates a complete structured exam from the given payload.
   */
  generateExam(payload: ExamGenerationPayload): Promise<ExamGenerationResult>;

  /**
   * Validates API connectivity with the AI backend.
   */
  validateConnection(): Promise<boolean>;
}

export interface ProviderConfig {
  apiKey?: string;
  model?: string;
  baseURL?: string;
  timeoutMs?: number;
}

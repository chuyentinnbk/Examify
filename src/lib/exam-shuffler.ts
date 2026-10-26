/**
 * Exam Shuffler Utility
 * Generates multiple exam codes (e.g. 101, 102, 103, 104) with:
 * 1. Question order & option shuffling (within sections, respecting MoET standard order)
 * 2. Safe number/parameter variation without breaking SVG or LaTeX formulas
 */

import { ExamQuestion, QuestionOption } from '@/lib/store/app-store';
import { normalizeQuestionType, reconcileTrueFalseQuestion } from './exam-sections';

export type ExamOption = QuestionOption;
export type BaseQuestion = ExamQuestion;

export interface ShuffledVariant {
  code: string;
  title: string;
  questions: ExamQuestion[];
}

export interface ShuffleConfig {
  codeCount: number; // e.g. 1, 2, 4, 8
  shuffleOrder: boolean; // Shuffle question positions & option choices
  shuffleValues: boolean; // Permute numeric values/variables
  baseCode?: number; // default 101
}

const STANDARD_SECTION_ORDER = ['multiple_choice', 'true_false', 'short_answer', 'essay'];

/**
 * Pseudo-random seeded number generator
 */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Shuffles an array in place with a seeded random function
 */
function shuffleArray<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generates N shuffled variants of an exam according to official MoET regulations.
 * Ensures 100% mathematical integrity: Question and option choices are shuffled within sections,
 * and correct answers are dynamically updated. Problem numbers and statements are strictly preserved
 * (numeric variation is delegated to the AI Isomorphic engine to guarantee mathematical correctness).
 */
export function generateExamVariants(
  baseQuestions: BaseQuestion[],
  baseTitle: string,
  config: ShuffleConfig
): ShuffledVariant[] {
  const { codeCount = 4, shuffleOrder = true, shuffleValues = false, baseCode = 101 } = config;

  if (shuffleValues && process.env.NODE_ENV !== 'production') {
    console.warn(
      '[ExamShuffler] Offline numeric permutation is intentionally disabled to protect mathematical accuracy. ' +
      'Use the AI Isomorphic Engine (/api/v1/exams/isomorphic-variants) to generate variants with newly calculated parameters.'
    );
  }

  if (codeCount <= 1 && !shuffleOrder) {
    return [
      {
        code: String(baseCode),
        title: `${baseTitle} - Mã đề ${baseCode}`,
        questions: baseQuestions,
      },
    ];
  }

  const variants: ShuffledVariant[] = [];

  for (let c = 0; c < codeCount; c++) {
    const code = String(baseCode + c);
    const rng = seededRandom((baseCode + c) * 31337 + 7);

    // Deep clone questions
    const clonedQuestions: BaseQuestion[] = JSON.parse(JSON.stringify(baseQuestions));

    // Group by section using official MoET normalization
    const sectionGroups: Record<string, BaseQuestion[]> = {};
    clonedQuestions.forEach((q) => {
      const normType = normalizeQuestionType(q.type || q.section);
      if (!sectionGroups[normType]) {
        sectionGroups[normType] = [];
      }
      sectionGroups[normType].push(q);
    });

    // Enforce official MoET section order (Phần I -> Phần II -> Phần III -> Phần IV)
    const existingSectionKeys = Object.keys(sectionGroups);
    const sortedSectionKeys = existingSectionKeys.sort((a, b) => {
      const orderA = STANDARD_SECTION_ORDER.indexOf(a);
      const orderB = STANDARD_SECTION_ORDER.indexOf(b);
      const rankA = orderA === -1 ? 99 : orderA;
      const rankB = orderB === -1 ? 99 : orderB;
      return rankA - rankB;
    });

    const assembledQuestions: BaseQuestion[] = [];

    sortedSectionKeys.forEach((secKey) => {
      let group = sectionGroups[secKey];

      // 1. Shuffle question order within the section (only for variant codes c > 0)
      if (shuffleOrder && c > 0) {
        group = shuffleArray(group, rng);
      }

      // Process each question
      group.forEach((q) => {
        const normType = normalizeQuestionType(q.type || q.section);
        const isMC = normType === 'multiple_choice';
        const isTF = normType === 'true_false';

        // 2. Shuffle multiple choice options safely
        if (shuffleOrder && isMC && Array.isArray(q.options) && q.options.length === 4 && c > 0) {
          const originalCorrectKey = (q.correctAnswer || 'A').trim().toUpperCase();
          let correctIndex = q.options.findIndex(
            (o) => (o.key || '').trim().toUpperCase() === originalCorrectKey
          );
          if (correctIndex === -1) {
            correctIndex = q.options.findIndex((o) => o.isCorrect === true);
          }
          if (correctIndex === -1) {
            correctIndex = 0;
          }

          // Tag each option with a stable boolean flag before shuffling
          const taggedOptions = q.options.map((opt, idx) => ({
            text: opt.text,
            wasCorrect: idx === correctIndex,
          }));

          const shuffledOpts = shuffleArray(taggedOptions, rng);
          const newKeys = ['A', 'B', 'C', 'D'];

          q.options = shuffledOpts.map((opt, i) => ({
            key: newKeys[i],
            text: opt.text,
            isCorrect: opt.wasCorrect,
          }));

          const newCorrect = q.options.find((o) => o.isCorrect);
          q.correctAnswer = newCorrect ? newCorrect.key : 'A';
        }

        // 3. True/False sub-items (a, b, c, d) are NOT shuffled internally to maintain pedagogical
        // dependency (e.g. part a computes derivative, part b computes extremum) and ensure 100%
        // alignment with step-by-step detailed explanations.
        // The True/False questions themselves are already shuffled within the section!
        if (isTF) {
          const rec = reconcileTrueFalseQuestion(q, true);
          q.options = rec.options;
          q.correctAnswer = rec.correctAnswer;
          q.explanation = rec.explanation;
        } else if (normType === 'essay') {
          q.correctAnswer = 'Xem hướng dẫn chấm và barem điểm';
        }

        // 4. Mathematical integrity guarantee:
        // Do NOT mutate numbers in question statements offline. Mutating numbers without
        // recalculating options, answers, and explanations breaks mathematical veracity.
        // Number variations must be performed via AI isomorphic generation (/api/v1/exams/isomorphic-variants).

        assembledQuestions.push(q);
      });
    });

    // Re-index question orders
    assembledQuestions.forEach((q, idx) => {
      q.order = `Câu ${String(idx + 1).padStart(2, '0')}`;
    });

    variants.push({
      code,
      title: `${baseTitle} - Mã đề ${code}`,
      questions: assembledQuestions,
    });
  }

  return variants;
}

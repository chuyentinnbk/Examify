/**
 * Exam Shuffler Utility
 * Generates multiple exam codes (e.g. 101, 102, 103, 104) with:
 * 1. Question order & option shuffling (within sections)
 * 2. Number/parameter variation
 */

import { ExamQuestion, QuestionOption } from '@/lib/store/app-store';

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
 * Slightly permutes numeric constants in question statement and options
 * while keeping mathematical sense (e.g. scaling by +1, -1, or +2).
 */
function permuteNumericalValues(content: string, delta: number): string {
  if (delta === 0) return content;
  // Look for numbers like = 10, = 5, or standalone integers
  return content.replace(/\b([1-9]\d*)\b/g, (match) => {
    const val = parseInt(match, 10);
    // Only permute small arbitrary numbers, avoid year-like numbers or large numbers
    if (val >= 2 && val <= 50 && val !== 10 && val !== 15 && val !== 45 && val !== 90) {
      const newVal = Math.max(1, val + (delta % 3 === 0 ? 1 : delta % 2 === 0 ? 2 : -1));
      return String(newVal);
    }
    return match;
  });
}

/**
 * Generates N shuffled variants of an exam.
 */
export function generateExamVariants(
  baseQuestions: BaseQuestion[],
  baseTitle: string,
  config: ShuffleConfig
): ShuffledVariant[] {
  const { codeCount = 4, shuffleOrder = true, shuffleValues = false, baseCode = 101 } = config;

  if (codeCount <= 1 && !shuffleOrder && !shuffleValues) {
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

    // Group by section so questions don't jump between Section I, II, III, IV
    const sectionGroups: Record<string, BaseQuestion[]> = {};
    const sectionOrder: string[] = [];

    clonedQuestions.forEach((q) => {
      const secKey = (q.type || q.section || 'multiple_choice').toLowerCase();
      if (!sectionGroups[secKey]) {
        sectionGroups[secKey] = [];
        sectionOrder.push(secKey);
      }
      sectionGroups[secKey].push(q);
    });

    const assembledQuestions: BaseQuestion[] = [];

    sectionOrder.forEach((secKey) => {
      let group = sectionGroups[secKey];

      // 1. Shuffle question order within the section
      if (shuffleOrder && c > 0) {
        group = shuffleArray(group, rng);
      }

      // Process each question
      group.forEach((q) => {
        const isMC = String(q.type).toLowerCase().includes('multiple') || (!q.type && q.options && q.options.length === 4);
        const isTF = String(q.type).toLowerCase().includes('true');

        // 2. Shuffle multiple choice options
        if (shuffleOrder && isMC && Array.isArray(q.options) && q.options.length === 4 && c > 0) {
          const originalCorrectKey = (q.correctAnswer || 'A').trim().toUpperCase();
          const targetOpt = q.options.find(
            (o) => o.key.toUpperCase() === originalCorrectKey || o.isCorrect
          );

          // Shuffle the options
          const shuffledOpts = shuffleArray(q.options, rng);
          const newKeys = ['A', 'B', 'C', 'D'];

          q.options = shuffledOpts.map((opt, i) => {
            const isThisCorrect = targetOpt ? opt.text === targetOpt.text : i === 0;
            return {
              key: newKeys[i],
              text: opt.text,
              isCorrect: isThisCorrect,
            };
          });

          const newCorrect = q.options.find((o) => o.isCorrect);
          if (newCorrect) {
            q.correctAnswer = newCorrect.key;
          }
        }

        // 3. Shuffle True/False sub-items
        if (shuffleOrder && isTF && Array.isArray(q.options) && q.options.length === 4 && c > 0) {
          const shuffledOpts = shuffleArray(q.options, rng);
          const subKeys = ['a', 'b', 'c', 'd'];
          q.options = shuffledOpts.map((opt, i) => ({
            ...opt,
            key: subKeys[i],
            isCorrect: opt.isCorrect ?? false,
          }));
          q.correctAnswer = q.options.map((o) => `${o.key}: ${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
        }

        // 4. Permute numbers if requested
        if (shuffleValues && c > 0) {
          q.content = permuteNumericalValues(q.content, c);
        }

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

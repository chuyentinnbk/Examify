import { PrismaClient } from '@prisma/client';
import { normalizeSvgGeometry } from '../src/lib/exam-sections';

const prisma = new PrismaClient();

function processSvgInText(text: string | null | undefined): string | null | undefined {
  if (!text || typeof text !== 'string') return text;
  if (!text.includes('<svg')) return text;
  return normalizeSvgGeometry(text);
}

function processQuestion(q: any): boolean {
  let changed = false;

  if (q.content && q.content.includes('<svg')) {
    const next = processSvgInText(q.content);
    if (next !== q.content) {
      q.content = next;
      changed = true;
    }
  }

  if (q.explanation && q.explanation.includes('<svg')) {
    const next = processSvgInText(q.explanation);
    if (next !== q.explanation) {
      q.explanation = next;
      changed = true;
    }
  }

  if (Array.isArray(q.options)) {
    q.options = q.options.map((opt: any) => {
      if (typeof opt === 'string' && opt.includes('<svg')) {
        const next = processSvgInText(opt);
        if (next !== opt) changed = true;
        return next;
      }
      return opt;
    });
  }

  return changed;
}

async function main() {
  console.log('--- Starting SVG Geometry Database Migration ---');

  const exams = await prisma.exam.findMany({
    select: {
      id: true,
      title: true,
      structuredJson: true,
    },
  });

  const targetExams = exams.filter((e) => e.structuredJson && e.structuredJson.includes('<svg'));
  console.log(`Found ${targetExams.length} exams containing SVG geometry.`);

  for (const exam of targetExams) {
    if (!exam.structuredJson) continue;
    console.log(`\nProcessing Exam [${exam.id}]: "${exam.title}"`);
    try {
      const data = JSON.parse(exam.structuredJson);
      let totalUpdatedQuestions = 0;

      // 1. Process base questions
      if (Array.isArray(data.questions)) {
        data.questions.forEach((q: any, idx: number) => {
          if (processQuestion(q)) {
            totalUpdatedQuestions++;
          }
        });
      }

      // 2. Process variants
      if (Array.isArray(data.variants)) {
        data.variants.forEach((v: any, vIdx: number) => {
          if (Array.isArray(v.questions)) {
            v.questions.forEach((q: any) => {
              if (processQuestion(q)) {
                totalUpdatedQuestions++;
              }
            });
          }
        });
      }

      console.log(`  Updated ${totalUpdatedQuestions} question items in exam.`);

      // 3. Save back to database
      await prisma.exam.update({
        where: { id: exam.id },
        data: {
          structuredJson: JSON.stringify(data),
        },
      });

      console.log(`  ✓ Successfully migrated exam [${exam.id}].`);
    } catch (err) {
      console.error(`  ✗ Error migrating exam [${exam.id}]:`, err);
    }
  }

  console.log('\n--- Migration Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

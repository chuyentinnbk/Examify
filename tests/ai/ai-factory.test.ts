import { AIFactory } from '../../src/core/ai/ai-factory';
import { ExamPromptBuilder } from '../../src/core/ai/prompt-builder';
import { ExamType } from '@prisma/client';

function runAITests() {
  console.log('🧪 =========================================================');
  console.log('🧪 Starting Multi-AI Architecture & Prompt Builder Tests');
  console.log('🧪 =========================================================\n');

  // 1. Test AIFactory instantiation
  console.log('1. Testing AIFactory provider resolution...');
  const openaiProvider = AIFactory.getProvider('openai');
  const geminiProvider = AIFactory.getProvider('gemini');
  const selfHostedProvider = AIFactory.getProvider('self-hosted');

  if (openaiProvider.providerName !== 'openai') {
    throw new Error(`Expected openai, got ${openaiProvider.providerName}`);
  }
  console.log(`✅ Resolved OpenAI provider: ${openaiProvider.providerName} (${openaiProvider.modelName})`);

  if (geminiProvider.providerName !== 'gemini') {
    throw new Error(`Expected gemini, got ${geminiProvider.providerName}`);
  }
  console.log(`✅ Resolved Gemini provider: ${geminiProvider.providerName} (${geminiProvider.modelName})`);

  if (selfHostedProvider.providerName !== 'self-hosted') {
    throw new Error(`Expected self-hosted, got ${selfHostedProvider.providerName}`);
  }
  console.log(`✅ Resolved Self-Hosted provider: ${selfHostedProvider.providerName} (${selfHostedProvider.modelName})`);

  // 2. Test Prompt Builder Hierarchy assembly
  console.log('\n2. Testing ExamPromptBuilder with curriculum hierarchy and cognitive matrix...');
  const builtPrompt = ExamPromptBuilder.build({
    curriculum: {
      level: 'Upper Secondary',
      grade: 'Grade 10',
      subject: 'Mathematics',
      semester: 'Semester 1',
      topic: 'Quadratic Functions',
      lesson: 'Graphing Parabolas and Vertex Calculation',
    },
    examType: ExamType.MID_TERM,
    durationMinutes: 45,
    totalPoints: 10,
    totalQuestions: 20,
    cognitiveMatrix: {
      knowledge: 40,
      comprehension: 30,
      application: 20,
      highApplication: 10,
    },
    customPrompt: 'Include 2 questions on finding the symmetry axis of a parabola.',
    language: 'Vietnamese',
  });

  if (!builtPrompt.systemPrompt.includes('JSON')) {
    throw new Error('System prompt missing strict JSON enforcement');
  }
  if (!builtPrompt.userPrompt.includes('Upper Secondary') || !builtPrompt.userPrompt.includes('Quadratic Functions')) {
    throw new Error('User prompt missing curriculum hierarchy context');
  }
  if (!builtPrompt.userPrompt.includes('MID_TERM')) {
    throw new Error('User prompt missing ExamType specification');
  }
  if (!builtPrompt.userPrompt.includes('symmetry axis')) {
    throw new Error('User prompt missing safe sanitized teacher instruction');
  }

  console.log('✅ ExamPromptBuilder successfully generated system and user prompts with complete context.');
  console.log('\n---------------------------------------------------------');
  console.log('All AI Strategy & Prompt tests passed successfully.');
  console.log('---------------------------------------------------------\n');
}

runAITests();

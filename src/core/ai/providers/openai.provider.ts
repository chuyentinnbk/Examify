import OpenAI from 'openai';
import {
  ExamGenerationPayload,
  ExamGenerationResult,
  GeneratedExamData,
  IAIProvider,
  ProviderConfig,
} from '../types';
import { ExamPromptBuilder } from '../prompt-builder';
import { KeyPoolManager } from '../key-pool';

export class OpenAIProvider implements IAIProvider {
  public readonly providerName = 'openai';
  public modelName: string;
  private keyPool: KeyPoolManager;
  private fallbackModels: string[];
  private timeoutMs: number;

  constructor(config?: ProviderConfig) {
    const rawKeys = config?.apiKey || process.env.OPENAI_API_KEY || '';
    this.keyPool = new KeyPoolManager('OpenAI', rawKeys);

    // Support comma-separated models: "gpt-4o-mini, gpt-4o, gpt-3.5-turbo"
    const rawModels = (config?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini')
      .split(/[,;]+/)
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    this.modelName = rawModels[0] || 'gpt-4o-mini';
    this.fallbackModels = rawModels;
    this.timeoutMs = config?.timeoutMs || 90000;
  }

  public async validateConnection(): Promise<boolean> {
    const activeKey = this.keyPool.getNextKey();
    if (!activeKey) return false;

    try {
      const client = new OpenAI({ apiKey: activeKey, timeout: 5000 });
      const response = await client.models.list();
      return !!response.data;
    } catch {
      return false;
    }
  }

  public async generateExam(payload: ExamGenerationPayload): Promise<ExamGenerationResult> {
    const { systemPrompt, userPrompt } = ExamPromptBuilder.build(payload);
    const maxAttempts = Math.max(1, this.keyPool.totalKeys * this.fallbackModels.length);
    let lastError: string = 'No OpenAI API keys available';

    for (let attempt = 0; attempt < Math.min(maxAttempts, 5); attempt++) {
      const activeKey = this.keyPool.getNextKey();
      if (!activeKey) break;

      const currentModel = this.fallbackModels[attempt % this.fallbackModels.length] || this.modelName;

      try {
        if (process.env.DEBUG === 'true') {
          console.log(`[OpenAIProvider] Attempt ${attempt + 1}: Using model "${currentModel}" with key (...${activeKey.slice(-6)})`);
        }

        const client = new OpenAI({
          apiKey: activeKey,
          timeout: this.timeoutMs,
        });

        const completion = await client.chat.completions.create({
          model: currentModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });

        const rawContent = completion.choices[0]?.message?.content || '';
        const cleanJson = rawContent
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        const examData = JSON.parse(cleanJson) as GeneratedExamData;
        this.keyPool.markSuccess(activeKey);

        return {
          success: true,
          examData,
          rawResponse: rawContent,
          provider: this.providerName,
          model: currentModel,
          usage: {
            promptTokens: completion.usage?.prompt_tokens,
            completionTokens: completion.usage?.completion_tokens,
            totalTokens: completion.usage?.total_tokens,
          },
        };
      } catch (error: unknown) {
        const errMessage = error instanceof Error ? error.message : 'Unknown OpenAI generation error';
        lastError = errMessage;

        const isRateLimit =
          errMessage.includes('429') ||
          errMessage.toLowerCase().includes('quota') ||
          errMessage.toLowerCase().includes('rate limit');

        if (isRateLimit) {
          this.keyPool.markRateLimited(activeKey, 60);
        }

        if (process.env.DEBUG === 'true') {
          console.warn(`⚠️ [OpenAIProvider] Attempt ${attempt + 1} failed: ${errMessage}. Trying next key/model...`);
        }
      }
    }

    return {
      success: false,
      error: `OpenAI generation failed after multiple key/model retries: ${lastError}`,
      provider: this.providerName,
      model: this.modelName,
    };
  }
}

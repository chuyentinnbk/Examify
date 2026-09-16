import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ExamGenerationPayload,
  ExamGenerationResult,
  GeneratedExamData,
  IAIProvider,
  ProviderConfig,
} from '../types';
import { ExamPromptBuilder } from '../prompt-builder';
import { KeyPoolManager } from '../key-pool';

export class GeminiProvider implements IAIProvider {
  public readonly providerName = 'gemini';
  public modelName: string;
  private keyPool: KeyPoolManager;
  private fallbackModels: string[];

  constructor(config?: ProviderConfig) {
    const rawKeys = config?.apiKey || process.env.GEMINI_API_KEY || '';
    this.keyPool = new KeyPoolManager('Gemini', rawKeys);

    // Support comma-separated models list: "gemini-3.6-flash, gemini-3.7-flash, gemini-flash-latest"
    const rawModels = (config?.model || process.env.GEMINI_MODEL || 'gemini-3.6-flash')
      .split(/[,;]+/)
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    this.modelName = rawModels[0] || 'gemini-3.6-flash';
    this.fallbackModels = rawModels;
  }

  public async validateConnection(): Promise<boolean> {
    const activeKey = this.keyPool.getNextKey();
    if (!activeKey) return false;

    try {
      const genAI = new GoogleGenerativeAI(activeKey);
      const model = genAI.getGenerativeModel({ model: this.modelName });
      const test = await model.generateContent('ping');
      return !!test.response.text();
    } catch {
      return false;
    }
  }

  public async generateExam(payload: ExamGenerationPayload): Promise<ExamGenerationResult> {
    const { systemPrompt, userPrompt } = ExamPromptBuilder.build(payload);
    const maxAttempts = Math.max(1, this.keyPool.totalKeys * this.fallbackModels.length);
    let lastError: string = 'No Gemini API keys available';

    // Loop through keys and fallback models
    for (let attempt = 0; attempt < Math.min(maxAttempts, 5); attempt++) {
      const activeKey = this.keyPool.getNextKey();
      if (!activeKey) {
        break;
      }

      // Cycle through fallback models if needed
      const currentModel = this.fallbackModels[attempt % this.fallbackModels.length] || this.modelName;

      try {
        if (process.env.DEBUG === 'true') {
          console.log(`[GeminiProvider] Attempt ${attempt + 1}: Using model "${currentModel}" with key (...${activeKey.slice(-6)})`);
        }

        const genAI = new GoogleGenerativeAI(activeKey);
        const model = genAI.getGenerativeModel({
          model: currentModel,
          systemInstruction: systemPrompt,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        });

        const result = await model.generateContent(userPrompt);
        const rawResponse = result.response.text();

        // Clean response markdown fences if returned
        const cleanJson = rawResponse
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        const examData = JSON.parse(cleanJson) as GeneratedExamData;

        // Mark key as healthy
        this.keyPool.markSuccess(activeKey);

        return {
          success: true,
          examData,
          rawResponse,
          provider: this.providerName,
          model: currentModel,
          usage: {
            promptTokens: result.response.usageMetadata?.promptTokenCount,
            completionTokens: result.response.usageMetadata?.candidatesTokenCount,
            totalTokens: result.response.usageMetadata?.totalTokenCount,
          },
        };
      } catch (error: unknown) {
        const errMessage = error instanceof Error ? error.message : 'Unknown Gemini generation error';
        lastError = errMessage;

        // Check if error is rate limit (429, ResourceExhausted, QuotaExceeded)
        const isRateLimit =
          errMessage.includes('429') ||
          errMessage.toLowerCase().includes('quota') ||
          errMessage.toLowerCase().includes('resource_exhausted');

        if (isRateLimit) {
          this.keyPool.markRateLimited(activeKey, 60);
        }

        if (process.env.DEBUG === 'true') {
          console.warn(`⚠️ [GeminiProvider] Attempt ${attempt + 1} failed: ${errMessage}. Trying next key/model...`);
        }
      }
    }

    return {
      success: false,
      error: `Gemini generation failed after multiple key/model retries: ${lastError}`,
      provider: this.providerName,
      model: this.modelName,
    };
  }
}

import { ExamGenerationPayload, ExamGenerationResult, IAIProvider, ProviderConfig } from './types';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { SelfHostedProvider } from './providers/self-hosted.provider';

export type SupportedAIProvider = 'openai' | 'gemini' | 'claude' | 'self-hosted' | 'custom-mcp';

export class AIFactory {
  /**
   * Instantiates and returns the designated AI Provider.
   */
  public static getProvider(
    providerType?: SupportedAIProvider | string,
    config?: ProviderConfig
  ): IAIProvider {
    const activeProvider = (
      providerType ||
      process.env.DEFAULT_AI_PROVIDER ||
      'gemini'
    ).toLowerCase();

    switch (activeProvider) {
      case 'openai':
      case 'chatgpt':
        return new OpenAIProvider(config);

      case 'gemini':
      case 'google':
        return new GeminiProvider(config);

      case 'claude':
      case 'anthropic':
        return new ClaudeProvider(config);

      case 'self-hosted':
      case 'ollama':
      case 'vllm':
      case 'local':
      case 'custom-mcp':
      case 'mcp':
        return new SelfHostedProvider(config);

      default:
        return new GeminiProvider(config);
    }
  }

  /**
   * Resilient Generation: Executes AI Exam Generation with cross-provider auto-fallback.
   * e.g. Primary (Gemini) -> Secondary (OpenAI) -> Tertiary (Self-Hosted)
   */
  public static async generateWithFallback(
    payload: ExamGenerationPayload,
    preferredProvider?: string
  ): Promise<ExamGenerationResult> {
    const defaultProvider = process.env.DEFAULT_AI_PROVIDER || 'gemini';
    const primary = (preferredProvider || defaultProvider).toLowerCase();

    // Define provider hierarchy chain
    const providersToTry: string[] = [primary];

    if (!providersToTry.includes('gemini') && process.env.GEMINI_API_KEY) {
      providersToTry.push('gemini');
    }
    if (!providersToTry.includes('openai') && process.env.OPENAI_API_KEY) {
      providersToTry.push('openai');
    }
    if (!providersToTry.includes('self-hosted') && process.env.SELF_HOSTED_AI_BASE_URL) {
      providersToTry.push('self-hosted');
    }

    let lastResult: ExamGenerationResult | null = null;

    for (let i = 0; i < providersToTry.length; i++) {
      const pName = providersToTry[i];
      const provider = this.getProvider(pName);

      if (process.env.DEBUG === 'true') {
        console.log(`[AIFactory] Attempting generation with provider: ${pName}`);
      }

      const result = await provider.generateExam(payload);
      if (result.success) {
        return result;
      }

      lastResult = result;
      if (process.env.DEBUG === 'true') {
        console.warn(`⚠️ [AIFactory] Provider "${pName}" failed: ${result.error}. Trying next fallback provider...`);
      }
    }

    return (
      lastResult || {
        success: false,
        error: 'All configured AI providers failed to generate exam',
        provider: primary,
        model: 'unknown',
      }
    );
  }
}

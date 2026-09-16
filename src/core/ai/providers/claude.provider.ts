import {
  ExamGenerationPayload,
  ExamGenerationResult,
  GeneratedExamData,
  IAIProvider,
  ProviderConfig,
} from '../types';
import { ExamPromptBuilder } from '../prompt-builder';
import { KeyPoolManager } from '../key-pool';

export class ClaudeProvider implements IAIProvider {
  public readonly providerName = 'claude';
  public modelName: string;
  private keyPool: KeyPoolManager;
  private fallbackModels: string[];
  private timeoutMs: number;

  constructor(config?: ProviderConfig) {
    const rawKeys = config?.apiKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
    this.keyPool = new KeyPoolManager('Anthropic Claude', rawKeys);

    // Support comma-separated models: "claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022"
    const rawModels = (config?.model || process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022')
      .split(/[,;]+/)
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    this.modelName = rawModels[0] || 'claude-3-5-sonnet-20241022';
    this.fallbackModels = rawModels;
    this.timeoutMs = config?.timeoutMs || 90000;
  }

  public async validateConnection(): Promise<boolean> {
    const activeKey = this.keyPool.getNextKey();
    if (!activeKey) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': activeKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Ping' }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  public async generateExam(payload: ExamGenerationPayload): Promise<ExamGenerationResult> {
    const { systemPrompt, userPrompt } = ExamPromptBuilder.build(payload);
    const maxAttempts = Math.max(1, this.keyPool.totalKeys * this.fallbackModels.length);
    let lastError = 'No Anthropic Claude API keys available';

    for (let attempt = 0; attempt < Math.min(maxAttempts, 5); attempt++) {
      const activeKey = this.keyPool.getNextKey();
      if (!activeKey) break;

      const currentModel = this.fallbackModels[attempt % this.fallbackModels.length] || this.modelName;

      try {
        if (process.env.DEBUG === 'true') {
          console.log(`[ClaudeProvider] Attempt ${attempt + 1}: Using model "${currentModel}" with key (...${activeKey.slice(-6)})`);
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': activeKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: currentModel,
            max_tokens: 4096,
            system: `${systemPrompt}\n\nIMPORTANT: You must return ONLY raw valid JSON matching the requested schema. Do not enclose in markdown blocks.`,
            messages: [
              {
                role: 'user',
                content: userPrompt,
              },
            ],
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`HTTP ${response.status}: ${errBody}`);
        }

        const data = (await response.json()) as {
          content?: Array<{ type: string; text: string }>;
          usage?: { input_tokens: number; output_tokens: number };
        };

        const content = data.content?.[0]?.text || '';
        if (!content) {
          throw new Error('Claude returned an empty response body');
        }

        // Parse JSON response cleanly
        let cleanJson = content.trim();
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsedData = JSON.parse(cleanJson) as GeneratedExamData;

        this.keyPool.markSuccess(activeKey);
        return {
          success: true,
          examData: parsedData,
          rawResponse: content,
          provider: this.providerName,
          model: currentModel,
          usage: {
            promptTokens: data.usage?.input_tokens,
            completionTokens: data.usage?.output_tokens,
            totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
          },
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        this.keyPool.markRateLimited(activeKey, 60);
        if (process.env.DEBUG === 'true') {
          console.warn(`⚠️ [ClaudeProvider] Attempt ${attempt + 1} with model "${currentModel}" failed: ${lastError}`);
        }
      }
    }

    return {
      success: false,
      error: `Claude generation failed: ${lastError}`,
      provider: this.providerName,
      model: this.modelName,
    };
  }
}

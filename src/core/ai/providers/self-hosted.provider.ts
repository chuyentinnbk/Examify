import OpenAI from 'openai';
import {
  ExamGenerationPayload,
  ExamGenerationResult,
  GeneratedExamData,
  IAIProvider,
  ProviderConfig,
} from '../types';
import { ExamPromptBuilder } from '../prompt-builder';

export class SelfHostedProvider implements IAIProvider {
  public readonly providerName = 'self-hosted';
  public readonly modelName: string;
  private client: OpenAI;

  constructor(config?: ProviderConfig) {
    this.modelName =
      config?.model ||
      process.env.SELF_HOSTED_AI_MODEL ||
      'llama3:8b';

    const baseURL =
      config?.baseURL ||
      process.env.SELF_HOSTED_AI_BASE_URL ||
      'http://localhost:11434/v1';

    const apiKey =
      config?.apiKey ||
      process.env.SELF_HOSTED_AI_API_KEY ||
      'not-needed';

    this.client = new OpenAI({
      baseURL,
      apiKey,
      timeout: config?.timeoutMs || 120000,
    });
  }

  public async validateConnection(): Promise<boolean> {
    try {
      const response = await this.client.models.list();
      return !!response.data;
    } catch {
      return false;
    }
  }

  public async generateExam(payload: ExamGenerationPayload): Promise<ExamGenerationResult> {
    const { systemPrompt, userPrompt } = ExamPromptBuilder.build(payload);

    try {
      const completion = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const rawContent = completion.choices[0]?.message?.content || '';

      // Clean response in case markdown formatting wrapper was returned
      const cleanJson = rawContent
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const examData = JSON.parse(cleanJson) as GeneratedExamData;

      return {
        success: true,
        examData,
        rawResponse: rawContent,
        provider: this.providerName,
        model: this.modelName,
        usage: {
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          totalTokens: completion.usage?.total_tokens,
        },
      };
    } catch (error: unknown) {
      const errMessage =
        error instanceof Error ? error.message : 'Unknown SelfHosted AI generation error';
      return {
        success: false,
        error: errMessage,
        provider: this.providerName,
        model: this.modelName,
      };
    }
  }
}

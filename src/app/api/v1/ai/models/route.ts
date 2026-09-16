import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface ModelInfo {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'claude' | 'self-hosted';
  description?: string;
  isDefault?: boolean;
}

/**
 * Fetch models from Google Gemini API
 * Endpoint: https://generativelanguage.googleapis.com/v1beta/models?key=API_KEY
 */
async function fetchGeminiModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const key = apiKey.split(/[,;]+/)[0]?.trim();
    if (!key) return [];

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      return [
        { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Khuyên dùng)', provider: 'gemini', isDefault: true },
        { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', provider: 'gemini' },
        { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', provider: 'gemini' },
      ];
    }

    const data = await res.json();
    const models = (data.models || [])
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => {
        const cleanId = m.name.replace(/^models\//, '');
        return {
          id: cleanId,
          name: m.displayName || cleanId,
          provider: 'gemini' as const,
          description: m.description || '',
          isDefault: cleanId === 'gemini-3.6-flash' || cleanId === 'gemini-3.7-flash',
        };
      });

    return models.length > 0 ? models : [
      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', provider: 'gemini', isDefault: true },
      { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', provider: 'gemini' },
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', provider: 'gemini' },
    ];
  } catch {
    return [
      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', provider: 'gemini', isDefault: true },
      { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', provider: 'gemini' },
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', provider: 'gemini' },
    ];
  }
}

/**
 * Fetch models from OpenAI / ChatGPT API
 * Endpoint: https://api.openai.com/v1/models
 */
async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const key = apiKey.split(/[,;]+/)[0]?.trim();
    if (!key) return [];

    const res = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Nhanh & Tối ưu)', provider: 'openai', isDefault: true },
        { id: 'gpt-4o', name: 'GPT-4o (Đa phương thức)', provider: 'openai' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
      ];
    }

    const data = await res.json();
    const allowedPrefixes = ['gpt-4', 'gpt-3.5', 'o1', 'o3'];
    const models = (data.data || [])
      .filter((m: any) => allowedPrefixes.some((p) => m.id.startsWith(p)))
      .sort((a: any, b: any) => b.created - a.created)
      .map((m: any) => ({
        id: m.id,
        name: m.id,
        provider: 'openai' as const,
        description: `Owner: ${m.owned_by}`,
        isDefault: m.id === 'gpt-4o-mini',
      }));

    return models.length > 0 ? models : [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', isDefault: true },
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
    ];
  } catch {
    return [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', isDefault: true },
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
    ];
  }
}

/**
 * Fetch models from Anthropic / Claude API
 * Endpoint: https://api.anthropic.com/v1/models
 */
async function fetchClaudeModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const key = apiKey.split(/[,;]+/)[0]?.trim();
    if (!key) return [];

    const res = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Mới nhất)', provider: 'claude', isDefault: true },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Tốc độ cao)', provider: 'claude' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'claude' },
      ];
    }

    const data = await res.json();
    const models = (data.data || []).map((m: any) => ({
      id: m.id,
      name: m.display_name || m.id,
      provider: 'claude' as const,
      description: m.created_at ? `Released: ${m.created_at}` : '',
      isDefault: m.id.includes('sonnet'),
    }));

    return models.length > 0 ? models : [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'claude', isDefault: true },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'claude' },
    ];
  } catch {
    return [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'claude', isDefault: true },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'claude' },
    ];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider')?.toLowerCase();
  const customKey = searchParams.get('apiKey');

  const geminiKey = customKey || process.env.GEMINI_API_KEY || '';
  const openaiKey = customKey || process.env.OPENAI_API_KEY || '';
  const claudeKey = customKey || process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '';

  try {
    if (provider === 'gemini') {
      const models = await fetchGeminiModels(geminiKey);
      return apiSuccess({ provider: 'gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', models });
    }

    if (provider === 'openai' || provider === 'chatgpt') {
      const models = await fetchOpenAIModels(openaiKey);
      return apiSuccess({ provider: 'openai', endpoint: 'https://api.openai.com/v1/models', models });
    }

    if (provider === 'claude' || provider === 'anthropic') {
      const models = await fetchClaudeModels(claudeKey);
      return apiSuccess({ provider: 'claude', endpoint: 'https://api.anthropic.com/v1/models', models });
    }

    // Return all providers
    const [geminiModels, openaiModels, claudeModels] = await Promise.all([
      fetchGeminiModels(geminiKey),
      fetchOpenAIModels(openaiKey),
      fetchClaudeModels(claudeKey),
    ]);

    return apiSuccess({
      endpoints: {
        gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
        chatgpt: 'https://api.openai.com/v1/models',
        claude: 'https://api.anthropic.com/v1/models',
      },
      models: {
        gemini: geminiModels,
        openai: openaiModels,
        claude: claudeModels,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error fetching models';
    return apiError(msg, 500);
  }
}

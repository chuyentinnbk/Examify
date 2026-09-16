import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { apiError, apiSuccess } from '@/lib/utils';
import { AuditLogger } from '@/core/logger/audit-logger';

export const dynamic = 'force-dynamic';

function isPlaceholderKey(key: string | undefined | null): boolean {
  if (!key) return true;
  const trimmed = key.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.includes('your-openai-api-key') || trimmed.includes('sk-proj-your-openai')) return true;
  if (trimmed.includes('your-gemini-api-key') || trimmed.includes('your-claude-api-key')) return true;
  return false;
}

function parseKeysList(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\n]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && !isPlaceholderKey(k));
}

function maskApiKey(key: string | undefined | null): string {
  if (!key || isPlaceholderKey(key)) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '****';
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function updateEnvFile(updates: Record<string, string>) {
  const envPath = path.join(process.cwd(), '.env');
  let currentContent = '';
  if (fs.existsSync(envPath)) {
    currentContent = fs.readFileSync(envPath, 'utf8');
  }

  const lines = currentContent.split('\n');
  const updatedKeys = new Set<string>();

  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) return line;

    const key = line.substring(0, eqIndex).trim();
    if (key in updates) {
      updatedKeys.add(key);
      const val = updates[key];
      return `${key}="${val}"`;
    }
    return line;
  });

  // Append any keys that didn't exist
  Object.keys(updates).forEach((k) => {
    if (!updatedKeys.has(k)) {
      newLines.push(`${k}="${updates[k]}"`);
    }
  });

  fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');

  // Also update process.env in memory immediately
  Object.entries(updates).forEach(([k, v]) => {
    process.env[k] = v;
  });
}

/**
 * GET /api/v1/ai/settings
 * Returns current AI configuration & token status for all providers.
 */
export async function GET() {
  try {
    const geminiRaw = process.env.GEMINI_API_KEY || '';
    const openaiRaw = process.env.OPENAI_API_KEY || '';
    const claudeRaw = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '';
    const selfHostedUrl = process.env.SELF_HOSTED_AI_BASE_URL || '';
    const selfHostedKey = process.env.SELF_HOSTED_AI_API_KEY || '';
    const defaultProvider = process.env.DEFAULT_AI_PROVIDER || 'gemini';

    const geminiKeys = parseKeysList(geminiRaw);
    const openaiKeys = parseKeysList(openaiRaw);
    const claudeKeys = parseKeysList(claudeRaw);

    const providers = {
      gemini: {
        id: 'gemini',
        name: 'Google Gemini',
        hasKey: geminiKeys.length > 0,
        maskedKey: geminiKeys[0] ? maskApiKey(geminiKeys[0]) : '',
        maskedKeys: geminiKeys.map(maskApiKey),
        rawKeyCount: geminiKeys.length,
        currentModel: (process.env.GEMINI_MODEL || 'gemini-3.6-flash').split(',')[0].trim(),
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      },
      openai: {
        id: 'openai',
        name: 'ChatGPT (OpenAI)',
        hasKey: openaiKeys.length > 0,
        maskedKey: openaiKeys[0] ? maskApiKey(openaiKeys[0]) : '',
        maskedKeys: openaiKeys.map(maskApiKey),
        rawKeyCount: openaiKeys.length,
        currentModel: (process.env.OPENAI_MODEL || 'gpt-4o-mini').split(',')[0].trim(),
        endpoint: 'https://api.openai.com/v1/models',
      },
      claude: {
        id: 'claude',
        name: 'Anthropic Claude',
        hasKey: claudeKeys.length > 0,
        maskedKey: claudeKeys[0] ? maskApiKey(claudeKeys[0]) : '',
        maskedKeys: claudeKeys.map(maskApiKey),
        rawKeyCount: claudeKeys.length,
        currentModel: (process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022').split(',')[0].trim(),
        endpoint: 'https://api.anthropic.com/v1/models',
      },
      'self-hosted': {
        id: 'self-hosted',
        name: 'Local AI (Ollama / vLLM)',
        hasKey: Boolean(selfHostedUrl && selfHostedUrl.trim().length > 0),
        baseUrl: selfHostedUrl || 'http://localhost:11434/v1',
        maskedKey: maskApiKey(selfHostedKey) || 'ollama',
        maskedKeys: [maskApiKey(selfHostedKey) || 'ollama'],
        rawKeyCount: selfHostedUrl ? 1 : 0,
        currentModel: process.env.SELF_HOSTED_AI_MODEL || 'llama3:8b',
        endpoint: selfHostedUrl || 'http://localhost:11434/v1',
      },
      'custom-mcp': {
        id: 'custom-mcp',
        name: 'Custom MCP Server',
        hasKey: Boolean(selfHostedUrl && selfHostedUrl.trim().length > 0),
        baseUrl: selfHostedUrl || 'http://localhost:11434/v1',
        maskedKey: maskApiKey(selfHostedKey) || 'mcp',
        maskedKeys: [maskApiKey(selfHostedKey) || 'mcp'],
        rawKeyCount: selfHostedUrl ? 1 : 0,
        currentModel: process.env.SELF_HOSTED_AI_MODEL || 'llama3:8b',
        endpoint: selfHostedUrl || 'http://localhost:11434/v1',
      },
    };

    return apiSuccess({
      defaultProvider,
      dailyTokenLimit: parseInt(process.env.DAILY_TOKEN_LIMIT || '250000', 10),
      maxPerRequest: parseInt(process.env.MAX_PER_REQUEST || '8000', 10),
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.2'),
      providers,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching AI settings';
    return apiError(msg, 500);
  }
}

/**
 * POST /api/v1/ai/settings
 * Updates AI configuration & provider keys in .env & in-memory.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      defaultProvider,
      geminiApiKey,
      geminiApiKeys,
      geminiModel,
      openaiApiKey,
      openaiApiKeys,
      openaiModel,
      claudeApiKey,
      claudeApiKeys,
      claudeModel,
      selfHostedBaseUrl,
      selfHostedApiKey,
      selfHostedModel,
      dailyTokenLimit,
      maxPerRequest,
      temperature,
    } = body;

    const updates: Record<string, string> = {};

    if (defaultProvider) updates['DEFAULT_AI_PROVIDER'] = defaultProvider;

    // Helper to normalize array or string of keys
    const normalizeKeys = (keysInput: any, singleInput: any): string | null => {
      if (Array.isArray(keysInput)) {
        const clean = keysInput.map((k) => String(k).trim()).filter((k) => k.length > 0 && !isPlaceholderKey(k));
        return clean.join(', ');
      }
      if (typeof singleInput === 'string') {
        const clean = singleInput
          .split(/[,;\n]+/)
          .map((k) => k.trim())
          .filter((k) => k.length > 0 && !isPlaceholderKey(k));
        return clean.join(', ');
      }
      return null;
    };

    const gKeys = normalizeKeys(geminiApiKeys, geminiApiKey);
    if (gKeys !== null) updates['GEMINI_API_KEY'] = gKeys;
    if (geminiModel) updates['GEMINI_MODEL'] = geminiModel;

    const oKeys = normalizeKeys(openaiApiKeys, openaiApiKey);
    if (oKeys !== null) updates['OPENAI_API_KEY'] = oKeys;
    if (openaiModel) updates['OPENAI_MODEL'] = openaiModel;

    const cKeys = normalizeKeys(claudeApiKeys, claudeApiKey);
    if (cKeys !== null) {
      updates['CLAUDE_API_KEY'] = cKeys;
      updates['ANTHROPIC_API_KEY'] = cKeys;
    }
    if (claudeModel) {
      updates['CLAUDE_MODEL'] = claudeModel;
      updates['ANTHROPIC_MODEL'] = claudeModel;
    }

    if (selfHostedBaseUrl !== undefined) updates['SELF_HOSTED_AI_BASE_URL'] = selfHostedBaseUrl.trim();
    if (selfHostedApiKey !== undefined) updates['SELF_HOSTED_AI_API_KEY'] = selfHostedApiKey.trim();
    if (selfHostedModel) updates['SELF_HOSTED_AI_MODEL'] = selfHostedModel;

    if (dailyTokenLimit !== undefined) updates['DAILY_TOKEN_LIMIT'] = String(dailyTokenLimit);
    if (maxPerRequest !== undefined) updates['MAX_PER_REQUEST'] = String(maxPerRequest);
    if (temperature !== undefined) updates['AI_TEMPERATURE'] = String(temperature);

    updateEnvFile(updates);

    AuditLogger.log({
      action: 'UPDATE_AI_CONFIG',
      entity: 'AI_PROVIDERS_SETTINGS',
      details: {
        updatedFields: Object.keys(updates),
        defaultProvider: updates['DEFAULT_AI_PROVIDER'] || process.env.DEFAULT_AI_PROVIDER,
      },
    });

    return apiSuccess(
      { updated: Object.keys(updates) },
      'Cấu hình Multi-API Keys và AI Provider đã được cập nhật thành công!'
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update AI settings';
    return apiError(msg, 500);
  }
}

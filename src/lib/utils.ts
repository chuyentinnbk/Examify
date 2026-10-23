import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string | Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export function apiSuccess<T>(
  data: T,
  message?: string,
  meta?: Record<string, unknown>,
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      ...(message ? { message } : {}),
      data,
      ...(meta ? { meta } : {}),
    },
    { status }
  );
}

export function apiError(
  error: string | Record<string, unknown>,
  status = 400,
  message?: string
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      success: false,
      ...(message ? { message } : {}),
      error,
    },
    { status }
  );
}

export function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
}

/**
 * Robustly parses JSON from LLM/AI output:
 * 1. Strips markdown fences if present (```json ... ```)
 * 2. Attempts direct JSON.parse
 * 3. Extracts outermost {...} or [...] matching brackets regardless of preamble/postscript text
 * 4. Cleans trailing commas if necessary
 */
export function parseAiJson<T = any>(rawText: string): T {
  if (!rawText || !rawText.trim()) {
    throw new Error('AI output is empty');
  }

  let clean = rawText.trim();

  // 1. Try extracting content inside markdown fence
  const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as T;
    } catch {
      clean = fenceMatch[1].trim();
    }
  }

  // 2. Direct parse attempt
  try {
    return JSON.parse(clean) as T;
  } catch {
    // 3. Bracket extraction: find outer {...} or [...]
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    const firstBracket = clean.indexOf('[');
    const lastBracket = clean.lastIndexOf(']');

    const hasBraces = firstBrace >= 0 && lastBrace > firstBrace;
    const hasBrackets = firstBracket >= 0 && lastBracket > firstBracket;

    let candidate = '';
    if (hasBraces && (!hasBrackets || firstBrace < firstBracket)) {
      candidate = clean.substring(firstBrace, lastBrace + 1);
    } else if (hasBrackets) {
      candidate = clean.substring(firstBracket, lastBracket + 1);
    } else if (hasBraces) {
      candidate = clean.substring(firstBrace, lastBrace + 1);
    }

    if (candidate) {
      try {
        return JSON.parse(candidate) as T;
      } catch {
        // Strip trailing commas before closing braces/brackets: [1, 2,] -> [1, 2]
        const withoutTrailingCommas = candidate.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(withoutTrailingCommas) as T;
      }
    }

    throw new Error('Không thể tìm thấy cấu trúc JSON hợp lệ trong phản hồi của AI');
  }
}


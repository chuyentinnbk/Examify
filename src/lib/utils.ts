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

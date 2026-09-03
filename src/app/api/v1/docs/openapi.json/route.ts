import { NextResponse } from 'next/server';
import { openApiSpec } from '@/core/docs/openapi-spec';

export async function GET() {
  return NextResponse.json(openApiSpec, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

import { NextResponse } from 'next/server';
import YAML from 'yaml';
import { openApiSpec } from '@/core/docs/openapi-spec';

export async function GET() {
  const yamlString = YAML.stringify(openApiSpec);
  return new NextResponse(yamlString, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-yaml; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

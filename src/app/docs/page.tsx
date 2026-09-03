import React from 'react';
import type { Metadata } from 'next';
import ScalarView from './scalar-view';
import { openApiSpec } from '@/core/docs/openapi-spec';

export const metadata: Metadata = {
  title: 'Examify - API Reference & Playground',
  description:
    'Modern interactive Scalar API documentation and testing playground for the Examify AI Exam Generation Platform.',
};

export default function DocsPage() {
  return (
    <main style={{ minHeight: '100vh', width: '100%', background: '#0b0f19' }}>
      <ScalarView spec={openApiSpec as unknown as Record<string, unknown>} />
    </main>
  );
}

'use client';

import React from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

interface ScalarViewProps {
  spec: Record<string, unknown>;
}

export default function ScalarView({ spec }: ScalarViewProps) {
  return (
    <div className="scalar-container" style={{ width: '100%', minHeight: '100vh', background: '#0b0f19' }}>
      <ApiReferenceReact
        configuration={{
          spec: {
            content: spec,
          },
          theme: 'kepler',
          darkMode: true,
          layout: 'modern',
          showSidebar: true,
          searchHotKey: 'k',
          hideModels: false,
          hideDownloadButton: false,
          metaData: {
            title: 'Examify Backend API Reference',
          },
          authentication: {
            preferredSecurityScheme: 'BearerAuth',
          },
        }}
      />
    </div>
  );
}

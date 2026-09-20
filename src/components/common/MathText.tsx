'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

interface MathTextProps {
  content: string;
  className?: string;
  inline?: boolean;
}

/**
 * Safely removes explicit option prefixes like "A. ", "B. ", "(A) "
 * without stripping numbers or mathematical variables (e.g. "15", "D = R")
 */
export function cleanOptionText(text: string): string {
  if (!text) return '';
  return text.replace(/^(\(?[A-D]\)[\.\:\-\s]+|[A-D][\.\:\)]\s+)/i, '').trim() || text;
}

/**
 * MathText renders mixed text with LaTeX math notation ($...$ inline or $$...$$ block) using KaTeX.
 */
export default function MathText({ content, className = '', inline = false }: MathTextProps) {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // Regex to find $$...$$ or $...$
    // $$...$$ for display math, $...$ for inline math
    const mathRegex = /(\$\$[\s\S]*?\$\$|\$(?:\\.|[^\$\\])+\$)/g;

    const parts = content.split(mathRegex);

    return parts
      .map((part) => {
        if (!part) return '';

        // Block Math: $$...$$
        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          const rawFormula = part.slice(2, -2).trim();
          try {
            return katex.renderToString(rawFormula, {
              displayMode: true,
              throwOnError: false,
              output: 'htmlAndMathml',
            });
          } catch {
            return `<span class="katex-error">${part}</span>`;
          }
        }

        // Inline Math: $...$
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const rawFormula = part.slice(1, -1).trim();
          try {
            return katex.renderToString(rawFormula, {
              displayMode: false,
              throwOnError: false,
              output: 'htmlAndMathml',
            });
          } catch {
            return `<span class="katex-error">${part}</span>`;
          }
        }

        // Plain text: escape HTML and replace newlines with <br /> if not inline
        const escaped = part
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        return inline ? escaped : escaped.replace(/\n/g, '<br />');
      })
      .join('');
  }, [content, inline]);

  if (inline) {
    return (
      <span
        className={`math-rendered-inline ${className}`}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    );
  }

  return (
    <div
      className={`math-rendered-block ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}

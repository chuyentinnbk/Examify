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
 * Intelligently reformats squished single-line code (especially Python)
 * into clean, indented multi-line code with proper line breaks.
 */
function beautifyCode(rawCode: string, lang: string): string {
  let code = rawCode.trim();
  if (!code) return '';

  // If code already contains newlines, preserve them
  if (code.includes('\n')) {
    return code.replace(/\r\n/g, '\n');
  }

  const isPython = !lang || lang.toLowerCase().includes('py');

  if (isPython) {
    // Split semicolons if present
    code = code.replace(/;\s*/g, '\n');

    // Break before control flow statements
    code = code.replace(/\s+(elif\b|else\s*:|finally\s*:|except\b)/g, '\n$1');
    code = code.replace(/([0-9a-zA-Z_"'\]\)])\s+(if\b|for\b|while\b|def\b|class\b|return\b)/g, '$1\n$2');
    // Break assignments like "a = 7 b = 12" -> "a = 7\nb = 12"
    code = code.replace(/([0-9a-zA-Z_"'\]\)])\s+([a-zA-Z_]\w*\s*=[^=])/g, '$1\n$2');
    // Break after colons if followed immediately by statement on same line
    code = code.replace(/:\s*(?!\n)([a-zA-Z_])/g, ':\n$1');

    const lines = code.split('\n');
    let indent = 0;
    const formatted = lines.map((line) => {
      const s = line.trim();
      if (!s) return '';
      if (/^(elif\b|else:|except\b|finally:)/.test(s)) {
        const cur = '    '.repeat(Math.max(0, indent - 1)) + s;
        if (s.endsWith(':')) indent = Math.max(1, indent);
        return cur;
      }
      const cur = '    '.repeat(indent) + s;
      if (s.endsWith(':')) indent++;
      return cur;
    });

    return formatted.join('\n');
  }

  return code;
}

/**
 * Escapes HTML characters safely.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * MathText renders mixed text with:
 * 1. Markdown code blocks (```python ... ```) rendered as syntax-highlighted IDE boxes
 * 2. Inline code (`...`)
 * 3. LaTeX math notation ($...$ inline or $$...$$ block) using KaTeX
 * 4. Regular line breaks and text
 */
export default function MathText({ content, className = '', inline = false }: MathTextProps) {
  // If content contains code blocks (```) or SVG diagrams, force block rendering
  const hasBlock = content?.includes('```') || /<svg\b/i.test(content || '');
  const isActuallyInline = inline && !hasBlock;

  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // Step 0: Extract and tokenise Vector SVG diagrams (<svg ...>...</svg>)
    const svgBlocks: string[] = [];
    const svgRegex = /<svg\b[^>]*>[\s\S]*?<\/svg>/gi;
    let preprocessed = content.replace(svgRegex, (match) => {
      const token = `__SVG_BLOCK_${svgBlocks.length}__`;
      svgBlocks.push(match);
      return token;
    });

    // Step 1: Extract and tokenise code blocks ```lang\ncode```
    const codeBlocks: { lang: string; code: string }[] = [];
    const codeBlockRegex = /```(?:([a-zA-Z0-9_+\-]*)\s*\n?)?([\s\S]*?)```/g;

    preprocessed = preprocessed.replace(codeBlockRegex, (_, langMatch, codeMatch) => {
      const lang = (langMatch || 'python').trim();
      const rawCode = (codeMatch || '').trim();
      const formattedCode = beautifyCode(rawCode, lang);
      const token = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push({ lang: lang || 'python', code: formattedCode });
      return token;
    });

    // Step 2: Extract LaTeX math: $$...$$ or $...$
    const mathRegex = /(\$\$[\s\S]*?\$\$|\$(?:\\.|[^\$\\])+\$)/g;
    const parts = preprocessed.split(mathRegex);

    let html = parts
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
            return `<span class="katex-error">${escapeHtml(part)}</span>`;
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
            return `<span class="katex-error">${escapeHtml(part)}</span>`;
          }
        }

        // Plain text: escape HTML
        let text = escapeHtml(part);

        // Inline code: `...`
        text = text.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 font-mono text-xs border border-slate-200/80 dark:border-slate-700/80">$1</code>');

        // Newlines to <br /> if not inline
        return isActuallyInline ? text : text.replace(/\n/g, '<br />');
      })
      .join('');

    // Step 3: Replace code block tokens with 2-column line numbered IDE cards
    codeBlocks.forEach((cb, idx) => {
      const token = `__CODE_BLOCK_${idx}__`;
      const displayLang = cb.lang.toUpperCase() || 'CODE';
      const lines = cb.code.split('\n');

      const lineNumbersHtml = lines
        .map((_, i) => `<div class="leading-relaxed select-none">${i + 1}</div>`)
        .join('');

      const codeLinesHtml = lines
        .map((line) => `<div class="leading-relaxed whitespace-pre">${escapeHtml(line) || '&nbsp;'}</div>`)
        .join('');

      const codeBoxHtml = `
<div class="my-2 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-900 shadow-sm print:bg-white print:border-black print:border print:rounded-none print:shadow-none print:my-1.5 text-left not-italic">
  <div class="flex items-center justify-between px-3 py-1 bg-slate-800/90 border-b border-slate-700/60 text-[10px] font-mono text-slate-300 print:hidden select-none">
    <div class="flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full bg-rose-500/80 inline-block"></span>
      <span class="w-2 h-2 rounded-full bg-amber-500/80 inline-block"></span>
      <span class="w-2 h-2 rounded-full bg-emerald-500/80 inline-block"></span>
      <span class="ml-1.5 font-bold uppercase tracking-wider text-slate-200 font-sans">${displayLang}</span>
    </div>
    <span class="text-[10px] text-slate-400 font-sans">chương trình</span>
  </div>
  <div class="flex p-2.5 print:p-2 text-xs font-mono bg-transparent overflow-x-auto">
    <div class="pr-2.5 mr-2.5 border-r border-slate-700/80 print:border-r print:border-black text-right text-slate-500 print:text-black font-semibold select-none min-w-[24px]">
      ${lineNumbersHtml}
    </div>
    <div class="flex-1 text-emerald-300 dark:text-emerald-400 print:text-black select-text font-normal">
      ${codeLinesHtml}
    </div>
  </div>
</div>
`.trim();

      html = html.replace(token, codeBoxHtml);
    });

    // Step 4: Replace SVG tokens with responsive & print-friendly geometry diagrams
    svgBlocks.forEach((rawSvg, idx) => {
      const token = `__SVG_BLOCK_${idx}__`;
      let cleanSvg = rawSvg;
      if (!cleanSvg.includes('class=')) {
        cleanSvg = cleanSvg.replace('<svg', '<svg class="exam-geo-svg w-auto max-h-56 mx-auto object-contain print:max-h-48"');
      }
      const svgBoxHtml = `
<div class="my-2.5 flex justify-center items-center overflow-x-auto print:my-1.5 bg-slate-50/50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 print:bg-white print:border-none print:p-0">
  ${cleanSvg}
</div>
`.trim();

      html = html.replace(token, svgBoxHtml);
    });

    return html;
  }, [content, isActuallyInline]);

  if (isActuallyInline) {
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

import React from 'react';

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', padding: '3rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.85rem', borderRadius: '9999px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', marginBottom: '1.25rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#93c5fd' }}>Architecture Ready & Active</span>
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '1rem' }}>
          Examify <span className="glow-gradient">Full-Stack AI Exam Engine</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', maxWidth: '700px', margin: '0 auto' }}>
          Next.js App Router skeleton architecture with MariaDB Prisma ORM, Redis sliding window security, anti-prompt injection defense, and multi-AI strategy adapters.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {/* Module 1 */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🛡️</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Self-Hosted Security</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1rem' }}>
            Zero Cloudflare dependencies. Redis sliding window log rate limiting, GeoIP country resolution, and strict session invalidation.
          </p>
          <div style={{ fontSize: '0.8rem', color: '#60a5fa', fontFamily: 'monospace' }}>
            src/middleware.ts &bull; src/core/security/
          </div>
        </div>

        {/* Module 2 */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🧠</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Anti-Prompt Injection</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1rem' }}>
            Multi-layer defense against jailbreaks (DAN, Persona switching), delimiter hijacking (<code style={{ color: '#ec4899' }}>&lt;system&gt;, [INST]</code>), and homoglyph evasion.
          </p>
          <div style={{ fontSize: '0.8rem', color: '#a78bfa', fontFamily: 'monospace' }}>
            src/core/security/prompt-guard.ts
          </div>
        </div>

        {/* Module 3 */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚡</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Multi-AI Provider Strategy</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1rem' }}>
            Pluggable <code style={{ color: '#34d399' }}>IAIProvider</code> architecture supporting OpenAI GPT-4o, Google Gemini, and Self-Hosted LLMs (vLLM/Ollama).
          </p>
          <div style={{ fontSize: '0.8rem', color: '#34d399', fontFamily: 'monospace' }}>
            src/core/ai/ (OpenAI, Gemini, SelfHosted)
          </div>
        </div>

        {/* Module 4 */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Curriculum Hierarchy Matrix</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1rem' }}>
            6-level taxonomy (Levels &rarr; Grades &rarr; Subjects &rarr; Semesters &rarr; Topics &rarr; Lessons) paired with 4 exam types and cognitive distribution matrices.
          </p>
          <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontFamily: 'monospace' }}>
            prisma/schema.prisma &bull; src/core/ai/prompt-builder.ts
          </div>
        </div>

        {/* Module 5 */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💾</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dual-Channel Storage & Audit</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1rem' }}>
            Atomic exam JSON artifact writes to <code style={{ color: '#93c5fd' }}>/storage/exams/</code> and dual-written audit logs (MariaDB + Winston daily rotating files).
          </p>
          <div style={{ fontSize: '0.8rem', color: '#93c5fd', fontFamily: 'monospace' }}>
            src/core/storage/ &bull; src/core/logger/
          </div>
        </div>

        {/* Module 6 */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✉️</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Async BullMQ Mail Engine</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1rem' }}>
            Redis-backed message queue for background transactional emails with concurrency handling, exponential backoff retries, and SMTP transporter.
          </p>
          <div style={{ fontSize: '0.8rem', color: '#f43f5e', fontFamily: 'monospace' }}>
            src/core/mail/ (Queue & Worker)
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Quick Actions & Verification</h3>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/docs" className="btn-primary">
            📖 Explore Scalar API Docs (/docs)
          </a>
          <a
            href="/setup"
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'rgba(255, 255, 255, 0.05)',
              fontWeight: 600,
              fontSize: '0.95rem',
            }}
          >
            Launch Setup Wizard (/setup)
          </a>
          <a
            href="/api/v1/setup"
            target="_blank"
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'rgba(255, 255, 255, 0.05)',
              fontWeight: 600,
              fontSize: '0.95rem',
            }}
          >
            Check Setup API Status
          </a>
        </div>
      </div>
    </main>
  );
}

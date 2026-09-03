import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Examify - Control Dashboard',
  description: 'Manage AI exam generations, curriculum taxonomy, security audit logs, and API integrations.',
};

export default function DashboardPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', padding: '2.5rem 1.5rem', color: '#f8fafc' }}>
      <div style={{ maxWidth: '1250px', margin: '0 auto' }}>
        {/* Navigation & Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '2.5rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                System Online
              </span>
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#ffffff' }}>
              Examify <span className="glow-gradient">Control Dashboard</span>
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              Central command for pedagogical curriculum, AI generation jobs, and security governance.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a
              href="/docs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1.1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#60a5fa',
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                textDecoration: 'none',
              }}
            >
              📖 Interactive Docs
            </a>
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.6rem 1.1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#cbd5e1',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textDecoration: 'none',
              }}
            >
              System Home
            </a>
          </div>
        </header>

        {/* Quick Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              AI Engine Provider
            </span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>
              Gemini 1.5 Flash
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>OpenAI & vLLM/Ollama Ready</span>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              Curriculum Taxonomy
            </span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.25rem' }}>
              3 Levels Active
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Primary, Lower Sec, Upper Sec</span>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              Rate Limiting Policy
            </span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
              120 req / min
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Sliding Window Security</span>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              PromptGuard Defense
            </span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ec4899', marginTop: '0.25rem' }}>
              100% Active
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Zero-Day Jailbreak Filter</span>
          </div>
        </div>

        {/* Feature Action Cards */}
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1rem', color: '#ffffff' }}>
          Core Subsystems & Developer Workspaces
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {/* Card 1 */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📖</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
              Interactive API Reference (Scalar)
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              Test real API endpoints, inspect request parameters, verify JWT Bearer tokens, and explore OpenAPI 3.0.3 schema specifications.
            </p>
            <a href="/docs" className="btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem' }}>
              Open Scalar Docs &rarr;
            </a>
          </div>

          {/* Card 2 */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🤖</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
              AI Exam Generation Pipeline
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              Trigger automated test authoring based on curriculum hierarchy (Levels &rarr; Grades &rarr; Subjects &rarr; Semesters &rarr; Topics &rarr; Lessons).
            </p>
            <a
              href="/docs#/Exams/post_exams"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#34d399',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                textDecoration: 'none',
              }}
            >
              Test Exam Generator &rarr;
            </a>
          </div>

          {/* Card 3 */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🛡️</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
              Audit Logs & Security Stream
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              Review dual-written audit logs stored in MariaDB and rotating files in <code>/storage/logs/</code> with GeoIP resolution and client IPs.
            </p>
            <a
              href="/docs#/Audit%20Logs/get_logs_activity"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#f43f5e',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                textDecoration: 'none',
              }}
            >
              View Audit Endpoints &rarr;
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
          Examify Platform &bull; Production Skeleton Initialized &bull; App Router &bull; MariaDB &bull; Redis
        </footer>
      </div>
    </div>
  );
}

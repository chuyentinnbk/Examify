'use client';

import React, { useState, useEffect } from 'react';

export default function SetupPage() {
  const [formData, setFormData] = useState({
    institutionName: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkSetupState() {
      try {
        const res = await fetch('/api/v1/setup');
        const json = await res.json();
        if (json.data?.isInitialized) {
          setIsLocked(true);
        }
      } catch (err) {
        console.error('Failed to check setup status:', err);
      } finally {
        setCheckingStatus(false);
      }
    }
    checkSetupState();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters with uppercase and number');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionName: formData.institutionName,
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Setup failed');
      }

      setSuccess(true);
      if (data.data?.token) {
        // Store in cookie / local storage
        document.cookie = `examify_token=${data.data.token}; path=/; max-age=604800; SameSite=Lax`;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error during setup';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Checking system state...</p>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>System Already Initialized</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            The primary administrator account has already been provisioned and the setup endpoint is permanently locked.
          </p>
          <a href="/login" className="btn-primary" style={{ width: '100%' }}>
            Proceed to Login
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Initialization Complete</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Administrator account created, default curriculum hierarchy seeded, and system lock activated.
          </p>
          <a href="/" className="btn-primary" style={{ width: '100%' }}>
            Enter Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-blue)', fontWeight: 700 }}>
            Initial Deployment
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', marginBottom: '0.5rem' }}>
            Examify <span className="glow-gradient">Master Setup</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Provision the root <strong style={{ color: '#fff' }}>ADMIN</strong> account. This endpoint will be permanently locked after creation.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              color: '#fca5a5',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
              Institution / School Name
            </label>
            <input
              type="text"
              name="institutionName"
              required
              placeholder="e.g. National High School for the Gifted"
              value={formData.institutionName}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
              Admin Full Name
            </label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="e.g. Dr. Jane Doe"
              value={formData.fullName}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
              Master Admin Email
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="admin@examify.local"
              value={formData.email}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
              Master Password
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="Minimum 8 characters (1 uppercase, 1 digit)"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>
              Confirm Master Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              placeholder="Re-enter master password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.875rem' }}
          >
            {loading ? 'Initializing System Master...' : 'Initialize & Lock Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}

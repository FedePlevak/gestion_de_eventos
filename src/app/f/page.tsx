'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Header } from '@/components/Header';

export default function FamilyAccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState('');
  const processingRef = useRef(false);

  const processSecret = async (secret: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Limpiar el fragmento de la URL de inmediato para proteger el secreto
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      const res = await fetch('/api/family/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secret.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No pudimos validar tu enlace de acceso.');
      }

      // Redirigir al panel del evento familiar
      router.push(`/e/${data.eventId}`);
    } catch (err: any) {
      setError(
        err.message ||
          'No pudimos abrir el evento con este enlace. Si el comité te envió uno nuevo, por favor usá el más reciente.'
      );
      setLoading(false);
      processingRef.current = false;
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let secretToProcess: string | null = null;

    // 1. Intentar desde el hash de la URL (#secret=XYZ o #XYZ)
    const hash = window.location.hash.substring(1);
    if (hash) {
      if (hash.includes('secret=')) {
        const params = new URLSearchParams(hash);
        secretToProcess = params.get('secret');
      } else {
        secretToProcess = hash;
      }
    }

    // 2. Fallback de compatibilidad desde query string (?secret=XYZ)
    if (!secretToProcess) {
      const queryParams = new URLSearchParams(window.location.search);
      secretToProcess = queryParams.get('secret');
    }

    if (secretToProcess) {
      processSecret(secretToProcess);
    }
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSecret.trim() || loading) return;

    let clean = manualSecret.trim();
    if (clean.includes('secret=')) {
      clean = clean.split('secret=')[1].split('&')[0];
    } else if (clean.includes('#')) {
      clean = clean.split('#')[1];
    }

    processSecret(clean);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main className="app-container" style={{ paddingTop: 'var(--spacing-6)', paddingBottom: 'var(--spacing-8)' }}>
        <Card
          title={loading ? 'Abriendo tu espacio familiar' : 'Ingreso de familias'}
          subtitle={
            loading
              ? 'Estamos preparando las consultas y la información de tu evento'
              : 'Verificá tu enlace de participación'
          }
        >
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--spacing-8) 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--spacing-3)',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid var(--color-border)',
                  borderTopColor: 'var(--color-primary)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <p
                style={{
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  fontSize: 'var(--font-size-base)',
                  margin: 0,
                }}
              >
                Estamos abriendo el espacio de tu familia…
              </p>
              <p style={{ color: 'var(--color-text-subtle)', fontSize: 'var(--font-size-xs)', margin: 0 }}>
                Esto toma solo unos instantes.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              {error && (
                <div
                  role="alert"
                  style={{
                    backgroundColor: 'var(--color-danger-bg)',
                    border: '1px solid var(--color-danger-border)',
                    color: 'var(--color-danger-text)',
                    padding: 'var(--spacing-3)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-sm)',
                    lineHeight: 'var(--line-height-normal)',
                  }}
                >
                  {error}
                </div>
              )}

              <p style={{ color: 'var(--color-text-main)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                El acceso normal se realiza al presionar directamente el enlace privado compartido por el comité.
              </p>

              <div
                style={{
                  backgroundColor: 'var(--color-surface-subtle)',
                  border: '1px solid var(--color-border)',
                  padding: 'var(--spacing-3)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-subtle)',
                  lineHeight: 'var(--line-height-normal)',
                }}
              >
                Si no pudiste abrir el enlace desde tu aplicación de mensajería, podés pegarlo a continuación para ingresar:
              </div>

              <form
                onSubmit={handleManualSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}
              >
                <Input
                  label="Enlace que recibiste"
                  value={manualSecret}
                  onChange={(e) => setManualSecret(e.target.value)}
                  placeholder="Pegá acá el enlace privado o código"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />

                <Button type="submit" isLoading={loading} fullWidth variant="primary">
                  Abrir evento
                </Button>
              </form>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--spacing-2)' }}>
                <Link
                  href="/"
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-subtle)',
                    textDecoration: 'underline',
                  }}
                >
                  ← Volver a la página principal
                </Link>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

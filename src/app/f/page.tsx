'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Header } from '@/components/Header';

export default function FamilyAccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState('');

  const processSecret = async (secret: string) => {
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
        throw new Error(data.error || 'El enlace no pudo ser validado.');
      }

      // Redirigir al panel del evento familiar
      router.push(`/e/${data.eventId}`);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al ingresar.');
      setLoading(false);
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

    // 2. Intentar desde parámetros de consulta (?secret=XYZ)
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
    if (!manualSecret.trim()) return;

    let clean = manualSecret.trim();
    // Si pegaron una URL completa, extraer el secreto
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
      <main className="app-container">
        <Card title="Ingreso Familiar" subtitle="Verificación de enlace seguro">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-8) 0' }}>
              <p style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 'var(--font-size-lg)' }}>
                Validando tu acceso...
              </p>
              <p style={{ color: 'var(--color-text-subtle)', marginTop: 'var(--spacing-2)' }}>
                Un momento por favor, estamos preparando la información de tu familia.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              {error && (
                <div
                  style={{
                    backgroundColor: 'var(--color-danger-bg)',
                    border: '1px solid var(--color-danger-border)',
                    color: 'var(--color-danger-text)',
                    padding: 'var(--spacing-3)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              <p style={{ color: 'var(--color-text-muted)' }}>
                Si el enlace no se abrió automáticamente, podés pegar acá el código que te envió el comité organizador:
              </p>

              <form
                onSubmit={handleManualSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}
              >
                <Input
                  label="Código o enlace recibido"
                  value={manualSecret}
                  onChange={(e) => setManualSecret(e.target.value)}
                  placeholder="Pegá tu código o enlace aquí"
                  required
                />
                <Button type="submit" isLoading={loading} fullWidth>
                  Ingresar al evento
                </Button>
              </form>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

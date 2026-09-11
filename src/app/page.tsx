import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main className="app-container">
        <section style={{ textAlign: 'center', padding: 'var(--spacing-6) 0' }}>
          <h2
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 800,
              color: 'var(--color-primary)',
              lineHeight: 'var(--line-height-tight)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            Plataforma de Eventos
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-base)' }}>
            Consultas, información y cobros organizados de forma transparente.
          </p>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <Card
            title="¿Sos parte de una familia?"
            subtitle="Accedé de forma directa y privada"
          >
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-4)' }}>
              Cada familia cuenta con un enlace personal único enviado por el comité organizador por WhatsApp o correo. No necesitás usuario ni contraseña.
            </p>
            <div
              style={{
                backgroundColor: 'var(--color-surface-subtle)',
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-subtle)',
              }}
            >
              💡 Buscá en tus mensajes el enlace que te compartió el comité e ingresá directamente desde allí.
            </div>
          </Card>

          <Card
            title="¿Sos organizador?"
            subtitle="Administrá eventos, participantes y etapas"
          >
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-4)' }}>
              Los organizadores se identifican con su correo electrónico autorizado para coordinar eventos.
            </p>
            <Link
              href="/admin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'var(--touch-target-min)',
                padding: '0.75rem 1.25rem',
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                width: '100%',
              }}
            >
              Ingresar como Organizador
            </Link>
          </Card>
        </div>
      </main>
    </div>
  );
}

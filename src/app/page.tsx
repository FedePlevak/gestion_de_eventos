import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main className="app-container" style={{ paddingTop: 'var(--spacing-6)', paddingBottom: 'var(--spacing-8)' }}>
        <section style={{ textAlign: 'center', marginBottom: 'var(--spacing-4)' }}>
          <h2
            style={{
              fontFamily: 'var(--font-editorial)',
              fontSize: 'clamp(2rem, 5vw, 2.75rem)',
              fontWeight: 400,
              color: 'var(--color-primary)',
              lineHeight: 'var(--line-height-tight)',
              margin: '0 0 var(--spacing-2) 0',
            }}
          >
            Organizá el encuentro con las cosas claras
          </h2>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 'var(--font-size-base)',
              lineHeight: 'var(--line-height-relaxed)',
              margin: 0,
            }}
          >
            Consultas, avisos y seguimiento de pagos para eventos de familias.
          </p>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {/* Tarjeta para Familias */}
          <Card
            title="¿Participás como familia?"
            subtitle="Acceso privado sin usuario ni contraseña"
          >
            <p style={{ color: 'var(--color-text-main)', fontSize: 'var(--font-size-sm)', margin: '0 0 var(--spacing-3) 0' }}>
              Abrí el enlace privado que te compartió el comité por WhatsApp o correo electrónico. No necesitás registrarte ni crear una cuenta.
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
                marginBottom: 'var(--spacing-3)',
              }}
            >
              Buscá en los mensajes de tu grupo o conversación el enlace del evento e ingresá directamente desde allí.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Link
                href="/f"
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  padding: '0.25rem 0',
                }}
              >
                Ya tengo mi enlace y no pude abrirlo →
              </Link>
            </div>
          </Card>

          {/* Tarjeta para Organización */}
          <Card
            title="¿Sos parte de la organización?"
            subtitle="Espacio de coordinación para integrantes del comité"
          >
            <p style={{ color: 'var(--color-text-main)', fontSize: 'var(--font-size-sm)', margin: '0 0 var(--spacing-4) 0' }}>
              Los integrantes del comité pueden gestionar consultas, revisar familias convocadas y verificar aportes.
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
                color: 'var(--color-primary-text)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: 'var(--font-size-base)',
                width: '100%',
                boxShadow: 'var(--shadow-sm)',
                boxSizing: 'border-box',
                textAlign: 'center',
              }}
            >
              Ingresar como organizador
            </Link>
          </Card>
        </div>
      </main>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Header } from '@/components/Header';
import { Badge } from '@/components/Badge';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [isLogged, setIsLogged] = useState(false);
  const [organizerEmail, setOrganizerEmail] = useState('');

  // En desarrollo/demostración local, permitimos seleccionar un organizador de prueba
  const handleDevLogin = (selectedEmail: string) => {
    if (typeof document !== 'undefined') {
      document.cookie = `dev_organizer_email=${selectedEmail}; path=/; max-age=86400`;
    }
    setOrganizerEmail(selectedEmail);
    setIsLogged(true);
  };

  const handleLogout = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'dev_organizer_email=; path=/; max-age=0';
    }
    setOrganizerEmail('');
    setIsLogged(false);
  };

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)dev_organizer_email=([^;]*)/);
      if (match && match[1]) {
        setOrganizerEmail(decodeURIComponent(match[1]));
        setIsLogged(true);
      }
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header isOrganizer userBadge={isLogged ? organizerEmail : undefined} />
      <main className="app-container">
        {!isLogged ? (
          <Card
            title="Ingreso de Organizadores"
            subtitle="Acceso para comités y administradores de eventos"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email) handleDevLogin(email);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}
            >
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="tu-correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" fullWidth>
                Ingresar con mi correo
              </Button>
            </form>

            <div
              style={{
                marginTop: 'var(--spacing-4)',
                paddingTop: 'var(--spacing-4)',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', marginBottom: 'var(--spacing-2)' }}>
                Acceso rápido con cuentas de prueba (Semilla local):
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                <Button
                  variant="secondary"
                  onClick={() => handleDevLogin('organizador1@colegio.edu.uy')}
                >
                  organizador1@colegio.edu.uy (Ambos eventos)
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleDevLogin('organizador2@colegio.edu.uy')}
                >
                  organizador2@colegio.edu.uy (Solo Fiesta Fin de Año)
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-primary)' }}>
                  Mis Eventos
                </h2>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                  Eventos donde tenés membresía activa como organizador
                </p>
              </div>
              <Button variant="outline" onClick={handleLogout} style={{ minHeight: '36px', padding: '0.4rem 0.8rem' }}>
                Salir
              </Button>
            </div>

            <Card
              title="Fiesta de Fin de Año 2026"
              subtitle="Colegio San Martín · 80 Familias"
              action={<Badge variant="success">Activo</Badge>}
            >
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-3)' }}>
                Gestión de consultas sobre menú, confirmación de asistencia y cobro de aporte por familia.
              </p>
              <Link
                href="/admin/events/fiesta-egresados-2026"
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
                Administrar Evento
              </Link>
            </Card>

            {organizerEmail === 'organizador1@colegio.edu.uy' && (
              <Card
                title="Asamblea Anual de Padres 2026"
                subtitle="Colegio San Martín · 45 Familias"
                action={<Badge variant="info">Preparación</Badge>}
              >
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-3)' }}>
                  Votación de autoridades de comisión y prioridades del próximo ciclo lectivo.
                </p>
                <Link
                  href="/admin/events/asamblea-anual-2026"
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
                  Administrar Evento
                </Link>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

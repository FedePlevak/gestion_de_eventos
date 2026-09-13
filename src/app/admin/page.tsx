'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Header } from '@/components/Header';
import { Badge } from '@/components/Badge';

interface EventSummary {
  id: string;
  name: string;
  description: string;
  eventDate?: string | null;
  status: string;
  participantCount: number;
  stageCount: number;
  createdAt: string;
}

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: string;
  canCreateEvents: boolean;
}

export default function AdminDashboardPage() {
  const [isLogged, setIsLogged] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Formulario de login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Eventos
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Modal / Formulario de creación de evento
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [enablePayment, setEnablePayment] = useState(false);
  const [expectedAmount, setExpectedAmount] = useState('');
  const [currency, setCurrency] = useState('UYU');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Verificar sesión existente al cargar
  const checkSession = async () => {
    setLoadingUser(true);
    try {
      const res = await fetch('/api/admin/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.organizer) {
          setIsLogged(true);
          setCurrentUser(data.organizer);
          fetchEvents();
          return;
        }
      }
    } catch (err) {
      console.error('Error al verificar sesión:', err);
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/admin/events');
      if (res.ok) {
        const data = await res.json();
        if (data.events) {
          setEvents(data.events);
        }
      }
    } catch (err) {
      console.error('Error al obtener eventos:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciales no válidas.');
      }

      setIsLogged(true);
      setCurrentUser(data.user);
      setPassword('');
      fetchEvents();
    } catch (err: any) {
      setLoginError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
    setIsLogged(false);
    setCurrentUser(null);
    setEvents([]);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    setCreateLoading(true);
    setCreateError(null);

    try {
      const payload: any = {
        name: newEventName.trim(),
        description: newEventDesc.trim() || undefined,
        eventDate: newEventDate ? new Date(newEventDate).toISOString() : undefined,
        paymentConfig: {
          enabled: enablePayment,
          expectedAmountMinor:
            enablePayment && expectedAmount ? Math.round(Number(expectedAmount) * 100) : 0,
          currency,
        },
      };

      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear el evento.');

      setShowCreateModal(false);
      setNewEventName('');
      setNewEventDesc('');
      setNewEventDate('');
      setEnablePayment(false);
      setExpectedAmount('');
      fetchEvents();
    } catch (err: any) {
      setCreateError(err.message || 'Error al guardar el nuevo evento.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        isOrganizer
        userBadge={isLogged && currentUser ? `${currentUser.name || currentUser.email}` : undefined}
      />

      <main className={isLogged ? 'app-container-admin' : 'app-container'} style={{ paddingTop: 'var(--spacing-6)', paddingBottom: 'var(--spacing-8)' }}>
        {loadingUser ? (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--color-text-subtle)' }}>
            Comprobando sesión de organizador…
          </div>
        ) : !isLogged ? (
          /* Formulario de Login */
          <div style={{ maxWidth: '440px', margin: '0 auto', width: '100%' }}>
            <Card
              title="Ingresá a Rondia"
              subtitle="Acceso para integrantes del comité"
            >
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                {loginError && (
                  <div
                    role="alert"
                    style={{
                      padding: 'var(--spacing-3)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-danger-bg)',
                      border: '1px solid var(--color-danger-border)',
                      color: 'var(--color-danger-text)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 600,
                    }}
                  >
                    {loginError}
                  </div>
                )}

                <Input
                  label="Correo electrónico"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />

                <Input
                  label="Contraseña"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="primary"
                  isLoading={loginLoading}
                  style={{ marginTop: 'var(--spacing-2)' }}
                >
                  Ingresar al panel
                </Button>
              </form>
            </Card>
          </div>
        ) : (
          /* Panel de Organizador */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            {/* Encabezado con bienvenida y botón para nuevo evento */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 'var(--spacing-3)',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    margin: 0,
                    lineHeight: 'var(--line-height-tight)',
                  }}
                >
                  Tus eventos
                </h2>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', margin: 'var(--spacing-1) 0 0 0' }}>
                  Sesión iniciada como <strong>{currentUser?.email}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  + Crear nuevo evento
                </Button>

                <Button
                  variant="outline"
                  onClick={handleLogout}
                >
                  Cerrar sesión
                </Button>
              </div>
            </div>

            {/* Modal / Formulario para crear nuevo evento */}
            {showCreateModal && (
              <Card
                title="Crear nuevo evento"
                subtitle="Completá los datos básicos de la convocatoria"
                action={
                  <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                    Cancelar
                  </Button>
                }
              >
                <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                  {createError && (
                    <div
                      role="alert"
                      style={{
                        padding: 'var(--spacing-3)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-danger-bg)',
                        border: '1px solid var(--color-danger-border)',
                        color: 'var(--color-danger-text)',
                        fontSize: 'var(--font-size-sm)',
                      }}
                    >
                      {createError}
                    </div>
                  )}

                  <Input
                    label="Nombre del evento"
                    placeholder="Ej: Fiesta de Fin de Año 2026"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    required
                  />

                  <Input
                    label="Descripción breve (opcional)"
                    placeholder="Ej: Celebración de egresados de 6to de Primaria"
                    value={newEventDesc}
                    onChange={(e) => setNewEventDesc(e.target.value)}
                  />

                  <Input
                    label="Fecha estimada del evento (opcional)"
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                  />

                  <div
                    style={{
                      marginTop: 'var(--spacing-2)',
                      padding: 'var(--spacing-3)',
                      backgroundColor: 'var(--color-surface-subtle)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--spacing-2)',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enablePayment}
                        onChange={(e) => setEnablePayment(e.target.checked)}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}>
                        Habilitar aporte económico o cuota por familia
                      </span>
                    </label>

                    {enablePayment && (
                      <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap', marginTop: 'var(--spacing-1)' }}>
                        <div style={{ flex: 1, minWidth: '180px' }}>
                          <Input
                            label="Importe esperado por familia"
                            type="number"
                            placeholder="Ej: 3000"
                            value={expectedAmount}
                            onChange={(e) => setExpectedAmount(e.target.value)}
                            helperText="Ingresá el monto en números sin puntos"
                            required={enablePayment}
                          />
                        </div>
                        <div style={{ width: '130px' }}>
                          <label
                            style={{
                              display: 'block',
                              fontSize: 'var(--font-size-sm)',
                              fontWeight: 600,
                              color: 'var(--color-text-main)',
                              marginBottom: 'var(--spacing-1)',
                            }}
                          >
                            Moneda
                          </label>
                          <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            style={{
                              width: '100%',
                              minHeight: 'var(--touch-target-min)',
                              padding: '0.75rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--color-control-border)',
                              fontSize: 'var(--font-size-base)',
                              backgroundColor: 'var(--color-surface)',
                              color: 'var(--color-text-main)',
                            }}
                          >
                            <option value="UYU">UYU ($)</option>
                            <option value="USD">USD (US$)</option>
                            <option value="ARS">ARS ($)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-3)' }}>
                    <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" variant="primary" isLoading={createLoading}>
                      Crear evento
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Listado de Eventos */}
            {loadingEvents ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-6)', color: 'var(--color-text-subtle)' }}>
                Cargando tus eventos…
              </div>
            ) : events.length === 0 ? (
              <Card
                title="Todavía no tenés eventos asignados"
                subtitle="Creá tu primer evento para comenzar a convocar familias y crear consultas"
              >
                <div style={{ textAlign: 'center', padding: 'var(--spacing-4) 0' }}>
                  <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-sm)' }}>
                    Al crear un evento podrás convocar familias, configurar consultas con votación y realizar el seguimiento de aportes.
                  </p>
                  <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                    + Crear mi primer evento
                  </Button>
                </div>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                {events.map((evt) => (
                  <Card
                    key={evt.id}
                    title={evt.name}
                    subtitle={
                      evt.eventDate
                        ? `Fecha: ${new Date(evt.eventDate).toLocaleDateString('es-UY', { dateStyle: 'long' })}`
                        : 'Sin fecha fijada'
                    }
                    action={
                      evt.status === 'active' ? (
                        <Badge variant="success">Activo</Badge>
                      ) : (
                        <Badge variant="neutral">{evt.status}</Badge>
                      )
                    }
                  >
                    {evt.description && (
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: '0 0 var(--spacing-3) 0' }}>
                        {evt.description}
                      </p>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        gap: 'var(--spacing-4)',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-subtle)',
                        marginBottom: 'var(--spacing-3)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>
                        <strong>{evt.participantCount}</strong> familias convocadas
                      </span>
                      <span>
                        <strong>{evt.stageCount}</strong> consultas del evento
                      </span>
                    </div>

                    <Link
                      href={`/admin/events/${evt.id}`}
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
                        textAlign: 'center',
                        boxSizing: 'border-box',
                      }}
                    >
                      Administrar evento →
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

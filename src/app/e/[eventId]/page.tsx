import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { validateFamilySession } from '@/modules/access/family-service';
import { getAdminDb } from '@/server/firebase-admin';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { FamilySupportSection } from './FamilySupportSection';
import { EventModel } from '@/modules/events/types';

interface PageProps {
  params: {
    eventId: string;
  };
}

export default async function FamilyEventDashboardPage({ params }: PageProps) {
  const cookieStore = cookies();
  const rawSessionId = cookieStore.get('family_session')?.value;

  let sessionContext;
  try {
    sessionContext = await validateFamilySession(rawSessionId, params.eventId);
  } catch (error) {
    // Si la sesión no es válida para este evento, redirigir a la página de canje
    redirect('/f');
  }

  const db = getAdminDb();
  const eventDoc = await db
    .collection('workspaces')
    .doc(sessionContext.workspaceId)
    .collection('events')
    .doc(params.eventId)
    .get();

  if (!eventDoc.exists) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: 'var(--spacing-10) 0' }}>
        <h2>Evento no encontrado</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>El evento solicitado no existe o fue archivado.</p>
      </div>
    );
  }

  const event = eventDoc.data() as EventModel;

  // Cargar etapas visibles con estado de respuesta para esta familia
  const { getEventStagesForFamily } = await import('@/modules/stages/service');
  const stages = await getEventStagesForFamily(sessionContext);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        eventName={event.name}
        userBadge={`Familia ${sessionContext.familyName}`}
        isOrganizer={false}
      />

      <main className="app-container">
        {/* Tarjeta de bienvenida y verificación de identidad */}
        <section
          style={{
            backgroundColor: 'var(--color-primary-light)',
            padding: 'var(--spacing-4)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-1)',
          }}
        >
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-primary)' }}>
            ACCESO CONFIRMADO
          </span>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-primary)' }}>
            Hola, Familia {sessionContext.familyName}
          </h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)' }}>
            Bienvenida al espacio de coordinación para <strong>{event.name}</strong>. Aquí podés responder las consultas y coordinar el evento.
          </p>
        </section>

        {/* Sección de Etapas y Consultas */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text-main)' }}>
              Etapas y Consultas
            </h3>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
              {stages.length} disponible{stages.length === 1 ? '' : 's'}
            </span>
          </div>

          {stages.length === 0 ? (
            <Card>
              <div style={{ textAlign: 'center', padding: 'var(--spacing-4) 0', color: 'var(--color-text-muted)' }}>
                <p style={{ fontWeight: 600 }}>No hay consultas abiertas en este momento.</p>
                <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-1)' }}>
                  El comité te avisará cuando haya una nueva etapa para participar.
                </p>
              </div>
            </Card>
          ) : (
            stages.map((stage) => {
              let badgeElement = <Badge variant="warning">Pendiente</Badge>;
              if (stage.hasResponded) {
                badgeElement = <Badge variant="success">Respondida</Badge>;
              } else if (stage.hasRead) {
                badgeElement = <Badge variant="success">Lectura confirmada</Badge>;
              } else if (stage.isClosed) {
                badgeElement = <Badge variant="neutral">Cerrada</Badge>;
              }

              return (
                <Link
                  key={stage.id}
                  href={`/e/${params.eventId}/stages/${stage.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <Card
                    title={stage.title}
                    subtitle={stage.description}
                    action={badgeElement}
                  >
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 'var(--spacing-2) 0' }}>
                      {stage.content || 'Tocá para ver las opciones y responder.'}
                    </p>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 600,
                        color: 'var(--color-primary)',
                      }}
                    >
                      Ver consulta y responder →
                    </span>
                  </Card>
                </Link>
              );
            })
          )}
        </section>

        {/* Sección de Pago si está habilitada */}
        {event.paymentConfig?.enabled && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text-main)' }}>
              Cuota o Aporte del Evento
            </h3>
            <Link
              href={`/e/${params.eventId}/payment`}
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              <Card
                title="Aporte por Familia"
                subtitle={`Importe fijado: $${(event.paymentConfig.expectedAmountMinor / 100).toLocaleString('es-UY')} ${event.paymentConfig.currency}`}
                action={<Badge variant="info">Ver Estado</Badge>}
              >
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-3)' }}>
                  Podés consultar las instrucciones bancarias, informar tu transferencia y adjuntar el comprobante para revisión del comité.
                </p>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                  }}
                >
                  Informar aporte o ver comprobante →
                </span>
              </Card>
            </Link>
          </section>
        )}

        {/* Mesa de ayuda y consultas directas al comité (Reglas S01, S02) */}
        <FamilySupportSection eventId={params.eventId} />
      </main>
    </div>
  );
}

import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { validateFamilySession } from '@/modules/access/family-service';
import { getStageForFamily } from '@/modules/stages/service';
import { getAdminDb } from '@/server/firebase-admin';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { StageCountdown } from '@/components/StageCountdown';
import { StageClientInteraction } from './StageClientInteraction';
import { StagePublishedResults } from './StagePublishedResults';
import { getPublishedResultsForFamily } from '@/modules/results/service';
import { EventModel } from '@/modules/events/types';

interface PageProps {
  params: {
    eventId: string;
    stageId: string;
  };
}

export default async function FamilyStageDetailPage({ params }: PageProps) {
  const cookieStore = cookies();
  const rawSessionId = cookieStore.get('family_session')?.value;

  let sessionContext;
  try {
    sessionContext = await validateFamilySession(rawSessionId, params.eventId);
  } catch (error) {
    redirect('/f');
  }

  // Cargar datos del evento
  const db = getAdminDb();
  const eventDoc = await db
    .collection('workspaces')
    .doc(sessionContext.workspaceId)
    .collection('events')
    .doc(params.eventId)
    .get();

  if (!eventDoc.exists) {
    redirect('/f');
  }

  const event = eventDoc.data() as EventModel;

  // Cargar detalle de la etapa y respuestas de la familia
  let stageData;
  try {
    stageData = await getStageForFamily(sessionContext, params.stageId);
  } catch (err: any) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header eventName={event.name} userBadge={`Familia ${sessionContext.familyName}`} isOrganizer={false} />
        <main className="app-container" style={{ textAlign: 'center', padding: 'var(--spacing-8) 0' }}>
          <Card title="Consulta no disponible">
            <p style={{ color: 'var(--color-danger-text)', marginBottom: 'var(--spacing-4)' }}>
              {err.userMessage || 'Esta consulta no está disponible en este momento.'}
            </p>
            <Link
              href={`/e/${params.eventId}`}
              style={{
                display: 'inline-block',
                color: 'var(--color-primary)',
                fontWeight: 600,
              }}
            >
              ← Volver al evento
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  const { stage, existingResponse, readConfirmation, isClosed } = stageData;

  // Cargar resultados publicados si existen (Reglas R04, R05, R06, R07)
  const publishedResults = await getPublishedResultsForFamily(sessionContext, params.stageId);

  // Formato amigable de fecha de vencimiento
  let deadlineText: string | null = null;
  if (stage.deadlineAt) {
    const d = new Date(stage.deadlineAt);
    deadlineText = d.toLocaleString('es-UY', {
      timeZone: stage.timezone || 'America/Montevideo',
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        eventName={event.name}
        userBadge={`Familia ${sessionContext.familyName}`}
        isOrganizer={false}
      />

      <main className="app-container">
        {/* Navegación de regreso */}
        <div style={{ marginBottom: 'var(--spacing-2)' }}>
          <Link
            href={`/e/${params.eventId}`}
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-primary)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            ← Volver a consultas del evento
          </Link>
        </div>

        {/* Encabezado de la consulta */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap', alignItems: 'center' }}>
            {isClosed ? (
              <Badge variant="neutral">Consulta Cerrada</Badge>
            ) : (
              <Badge variant="success">Consulta Abierta</Badge>
            )}
            {deadlineText && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                {isClosed ? `Venció: ${deadlineText}` : `Cierra: ${deadlineText}`}
              </span>
            )}
          </div>

          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-primary)' }}>
            {stage.title}
          </h2>

          {stage.description && (
            <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-muted)' }}>
              {stage.description}
            </p>
          )}
        </section>

        {/* Cuenta regresiva en vivo first-mobile */}
        {stage.deadlineAt && (
          <div style={{ marginTop: 'var(--spacing-3)', marginBottom: 'var(--spacing-2)' }}>
            <StageCountdown
              deadlineAt={stage.deadlineAt}
              isClosed={isClosed}
              variant="detail"
              timezone={stage.timezone}
            />
          </div>
        )}

        {/* Aclaraciones del comité organizador si existen (Regla E14) */}
        {stage.clarifications && stage.clarifications.length > 0 && (
          <div
            style={{
              backgroundColor: 'var(--color-warning-bg)',
              border: '1px solid var(--color-warning-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-2)',
            }}
          >
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-warning-text)' }}>
              📌 ACLARACIÓN DEL COMITÉ:
            </span>
            {stage.clarifications.map((c) => (
              <p key={c.id} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-warning-text)' }}>
                {c.content}
              </p>
            ))}
          </div>
        )}

        {/* Contenido interactivo */}
        <StageClientInteraction
          eventId={params.eventId}
          stage={stage}
          existingResponse={existingResponse}
          readConfirmation={readConfirmation}
          isClosed={isClosed}
        />

        {/* Resultados publicados por el comité (Reglas R04, R05, R06, R07) */}
        {publishedResults && (
          <div style={{ marginTop: 'var(--spacing-4)' }}>
            <StagePublishedResults results={publishedResults} />
          </div>
        )}
      </main>
    </div>
  );
}

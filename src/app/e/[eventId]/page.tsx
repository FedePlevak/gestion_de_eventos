import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { validateFamilySession } from '@/modules/access/family-service';
import { getAdminDb } from '@/server/firebase-admin';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { StageCountdown } from '@/components/StageCountdown';
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
        <h2>Evento no disponible</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>El evento solicitado no existe o fue archivado.</p>
      </div>
    );
  }

  const event = eventDoc.data() as EventModel;

  // Cargar etapas visibles con estado de respuesta para esta familia
  const { getEventStagesForFamily } = await import('@/modules/stages/service');
  const stages = await getEventStagesForFamily(sessionContext);

  // Cargar estado de la cuota / aporte para esta familia
  const { getFamilyPaymentStatus } = await import('@/modules/payments/service');
  const paymentData = await getFamilyPaymentStatus(sessionContext);

  const rawFamilyName = sessionContext.familyName || 'Invitada';
  const familyDisplayName = rawFamilyName.toLowerCase().startsWith('familia')
    ? rawFamilyName
    : `Familia ${rawFamilyName}`;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        eventName={event.name}
        userBadge={familyDisplayName}
        isOrganizer={false}
      />

      <main className="app-container" style={{ paddingTop: 'var(--spacing-4)', paddingBottom: 'var(--spacing-8)' }}>
        {/* Tarjeta de bienvenida y verificación de identidad */}
        <section
          style={{
            backgroundColor: 'var(--color-surface)',
            padding: 'var(--spacing-4)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-1)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 700,
              color: 'var(--color-primary)',
              letterSpacing: '0.03em',
            }}
          >
            Acceso confirmado
          </span>
          <h2
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 700,
              color: 'var(--color-primary)',
              margin: 0,
              lineHeight: 'var(--line-height-tight)',
            }}
          >
            Hola, {familyDisplayName}
          </h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
            Este es el espacio de tu familia para <strong>{event.name}</strong>. Podés responder las consultas y seguir el estado de tu aporte.
          </p>
        </section>

        {/* Sección de Consultas y Resumen */}
        {(() => {
          const hasPaymentStage = Boolean(paymentData?.enabled);
          const paymentStatus = paymentData?.payment?.status || 'pending';
          const isPaymentPending = hasPaymentStage && paymentStatus === 'pending';
          const isPaymentReported = hasPaymentStage && paymentStatus === 'reported';
          const isPaymentRevision = hasPaymentStage && paymentStatus === 'requires_revision';
          const isPaymentVerified = hasPaymentStage && paymentStatus === 'verified';

          const surveyPendingCount = stages.filter((s) => !s.hasResponded && !s.hasRead && !s.isClosed).length;
          const totalFamilyPendingActions = surveyPendingCount + (isPaymentPending || isPaymentRevision ? 1 : 0);

          return (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>
                  Consultas e información del evento
                </h3>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                  {stages.length + (hasPaymentStage ? 1 : 0)} sección/secciones
                </span>
              </div>

              {/* Banner de estado de avance familiar */}
              <div
                style={{
                  backgroundColor: totalFamilyPendingActions > 0
                    ? 'var(--color-warning-bg)'
                    : isPaymentReported
                    ? 'var(--color-info-bg)'
                    : 'var(--color-success-bg)',
                  border: `1px solid ${
                    totalFamilyPendingActions > 0
                      ? 'var(--color-warning-border)'
                      : isPaymentReported
                      ? 'var(--color-info-border)'
                      : 'var(--color-success-border)'
                  }`,
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--spacing-3) var(--spacing-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-1)',
                }}
              >
                <strong
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: totalFamilyPendingActions > 0
                      ? 'var(--color-warning-text)'
                      : isPaymentReported
                      ? 'var(--color-info-text)'
                      : 'var(--color-success-text)',
                  }}
                >
                  {totalFamilyPendingActions > 0
                    ? `Tenés ${totalFamilyPendingActions} acción/acciones pendientes de responder o informar.`
                    : isPaymentReported
                    ? 'No tenés respuestas pendientes. Tu pago sigue esperando verificación del comité.'
                    : 'Completaste todas tus respuestas y tu aporte está verificado.'}
                </strong>
                <p
                  style={{
                    margin: 0,
                    fontSize: 'var(--font-size-xs)',
                    color: totalFamilyPendingActions > 0
                      ? 'var(--color-warning-text)'
                      : isPaymentReported
                      ? 'var(--color-info-text)'
                      : 'var(--color-success-text)',
                  }}
                >
                  {totalFamilyPendingActions > 0
                    ? 'Revisá las tarjetas marcadas como pendientes abajo para completar tu participación.'
                    : isPaymentReported
                    ? 'El comité cotejará tu transferencia con la cuenta bancaria para confirmar la recepción.'
                    : 'Podés consultar tus respuestas guardadas en cualquier momento.'}
                </p>
              </div>

              {stages.length === 0 && !hasPaymentStage ? (
                <Card>
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-4) 0', color: 'var(--color-text-muted)' }}>
                    <p style={{ fontWeight: 600, margin: 0 }}>Todavía no hay información o consultas disponibles.</p>
                    <p style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--spacing-1)', color: 'var(--color-text-subtle)' }}>
                      El comité te avisará cuando haya novedades.
                    </p>
                  </div>
                </Card>
              ) : (
                <>
                  {/* Consultas y etapas del evento */}
                  {stages.map((stage) => {
                    const isPending = !stage.hasResponded && !stage.hasRead && !stage.isClosed;

                    let badgeElement = (
                      <Badge variant="warning">
                        {stage.type === 'info' ? 'Pendiente de leer' : 'Pendiente de respuesta'}
                      </Badge>
                    );

                    if (stage.hasResponded) {
                      badgeElement = <Badge variant="success">Respuesta guardada</Badge>;
                    } else if (stage.hasRead) {
                      badgeElement = <Badge variant="success">Lectura confirmada</Badge>;
                    } else if (stage.isClosed) {
                      badgeElement = <Badge variant="neutral">Consulta cerrada</Badge>;
                    }

                    return (
                      <Link
                        key={stage.id}
                        href={`/e/${params.eventId}/stages/${stage.id}`}
                        style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                      >
                        <Card
                          title={stage.title}
                          subtitle={
                            stage.deadlineAt ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '2px' }}>
                                <span>Plazo: {new Date(stage.deadlineAt).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })} h</span>
                                <StageCountdown deadlineAt={stage.deadlineAt} isClosed={stage.isClosed} variant="compact" />
                              </div>
                            ) : undefined
                          }
                          action={badgeElement}
                        >
                          {stage.description && (
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 'var(--spacing-1) 0' }}>
                              {stage.description}
                            </p>
                          )}

                          <div style={{ marginTop: 'var(--spacing-2)' }}>
                            {isPending ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  fontSize: 'var(--font-size-sm)',
                                  fontWeight: 600,
                                  color: 'var(--color-primary)',
                                }}
                              >
                                {stage.type === 'info' ? 'Leer información →' : 'Responder consulta →'}
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-block',
                                  fontSize: 'var(--font-size-xs)',
                                  fontWeight: 600,
                                  color: 'var(--color-text-subtle)',
                                }}
                              >
                                Ver detalle de mi respuesta →
                              </span>
                            )}
                          </div>
                        </Card>
                      </Link>
                    );
                  })}

                  {/* Cuota / Aporte Financiero */}
                  {hasPaymentStage && (
                    <Link
                      href={`/e/${params.eventId}/payment`}
                      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                    >
                      <Card
                        title="Aporte económico para el evento"
                        subtitle={
                          paymentData.expectedAmountMinor > 0
                            ? `Importe fijado: ${(paymentData.currency || 'UYU')} ${(paymentData.expectedAmountMinor / 100).toLocaleString('es-UY')}`
                            : 'Monto a coordinar'
                        }
                        action={
                          isPaymentVerified ? (
                            <Badge variant="success">Pago recibido</Badge>
                          ) : isPaymentReported ? (
                            <Badge variant="info">Pago informado · Pendiente de verificación</Badge>
                          ) : isPaymentRevision ? (
                            <Badge variant="warning">Hay un dato para revisar</Badge>
                          ) : (
                            <Badge variant="warning">Pendiente de informar</Badge>
                          )
                        }
                      >
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 'var(--spacing-1) 0' }}>
                          {isPaymentVerified
                            ? 'El comité verificó la recepción de tu transferencia bancaria. ¡Muchas gracias!'
                            : isPaymentReported
                            ? 'Enviaste tu informe de pago. El comité lo verificará contra la cuenta bancaria.'
                            : isPaymentRevision
                            ? 'El comité solicitó revisar el comprobante o el importe informado.'
                            : 'Podés consultar las instrucciones bancarias, realizar la transferencia y adjuntar tu comprobante.'}
                        </p>

                        <div style={{ marginTop: 'var(--spacing-2)' }}>
                          {isPaymentPending || isPaymentRevision ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 600,
                                color: 'var(--color-primary)',
                              }}
                            >
                              Informar aporte o ver datos bancarios →
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 600,
                                color: 'var(--color-text-subtle)',
                              }}
                            >
                              Ver detalle del informe →
                            </span>
                          )}
                        </div>
                      </Card>
                    </Link>
                  )}
                </>
              )}
            </section>
          );
        })()}

        {/* Mesa de ayuda y consultas directas al comité (Reglas S01, S02) */}
        <FamilySupportSection eventId={params.eventId} />
      </main>
    </div>
  );
}

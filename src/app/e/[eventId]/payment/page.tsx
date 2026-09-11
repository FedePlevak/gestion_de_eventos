import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { validateFamilySession } from '@/modules/access/family-service';
import { getFamilyPaymentStatus } from '@/modules/payments/service';
import { getAdminDb } from '@/server/firebase-admin';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { PaymentClientForm } from './PaymentClientForm';
import { EventModel } from '@/modules/events/types';

interface PageProps {
  params: {
    eventId: string;
  };
}

export default async function FamilyPaymentPage({ params }: PageProps) {
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
    redirect('/f');
  }

  const event = eventDoc.data() as EventModel;
  const paymentData = await getFamilyPaymentStatus(sessionContext);

  if (!paymentData.enabled) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header eventName={event.name} userBadge={`Familia ${sessionContext.familyName}`} isOrganizer={false} />
        <main className="app-container" style={{ textAlign: 'center', padding: 'var(--spacing-8) 0' }}>
          <Card title="Aporte no habilitado">
            <p style={{ color: 'var(--color-text-muted)' }}>Este evento no tiene configurada una etapa de cobro.</p>
            <Link href={`/e/${params.eventId}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              ← Volver al evento
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  const { currency, expectedAmountMinor, bankInstructions, payment } = paymentData;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        eventName={event.name}
        userBadge={`Familia ${sessionContext.familyName}`}
        isOrganizer={false}
      />

      <main className="app-container">
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
            ← Volver al evento
          </Link>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
            <Badge variant="info">Aporte Único por Familia</Badge>
          </div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-primary)' }}>
            Cuota o Aporte de la Fiesta
          </h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            Importe fijado: <strong>${(expectedAmountMinor / 100).toLocaleString('es-UY')} {currency}</strong>
          </p>
        </section>

        {/* Instrucciones Bancarias */}
        {bankInstructions && (
          <Card title="Datos para la Transferencia Bancaria">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-2)',
                fontSize: 'var(--font-size-sm)',
                lineHeight: 'var(--line-height-normal)',
              }}
            >
              <p><strong>Banco:</strong> {bankInstructions.bankName}</p>
              <p><strong>Titular de la cuenta:</strong> {bankInstructions.accountHolder}</p>
              <p><strong>Número de Cuenta:</strong> {bankInstructions.accountNumber}</p>
              {bankInstructions.alias && <p><strong>Alias / CBU:</strong> {bankInstructions.alias}</p>}
              {bankInstructions.additionalNotes && (
                <p style={{ color: 'var(--color-text-subtle)', marginTop: 'var(--spacing-1)' }}>
                  💡 {bankInstructions.additionalNotes}
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Formulario e informe de pago interactivo */}
        <PaymentClientForm
          eventId={params.eventId}
          initialPayment={payment}
          expectedAmountMinor={expectedAmountMinor}
          currency={currency}
        />
      </main>
    </div>
  );
}

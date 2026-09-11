'use client';

import React, { useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { buildWhatsAppMessage } from '@/modules/communication/formatter';
import { WhatsAppTemplateType } from '@/modules/communication/types';

interface ParticipantItem {
  id: string;
  familyId: string;
  familyName: string;
  contactPhone?: string;
  contactEmail?: string;
  secret?: string;
}

interface Props {
  eventName: string;
  participants: ParticipantItem[];
}

export const WhatsAppAdminSection: React.FC<Props> = ({ eventName, participants }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateType>('INVITATION');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId(null), 2500);
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>Asistente de Mensajes para WhatsApp</h3>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
            Textos personalizados listos para copiar o abrir en WhatsApp con el enlace de cada familia.
          </p>
        </div>
      </div>

      {/* Aviso de seguridad y regla S03 */}
      <div
        style={{
          backgroundColor: 'var(--color-surface-subtle)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-3)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-subtle)',
          lineHeight: 'var(--line-height-normal)',
        }}
      >
        💡 <strong>Control manual del comité:</strong> Esta herramienta prepara los textos para que los envíes directamente desde tu aplicación de WhatsApp. No realiza envíos automáticos ni altera el estado de las familias al preparar o copiar mensajes.
      </div>

      {/* Selector de plantilla */}
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', overflowX: 'auto', paddingBottom: 'var(--spacing-1)' }}>
        <Button
          variant={selectedTemplate === 'INVITATION' ? 'primary' : 'secondary'}
          onClick={() => setSelectedTemplate('INVITATION')}
          style={{ minHeight: '34px', padding: '0.3rem 0.7rem', fontSize: 'var(--font-size-xs)' }}
        >
          Invitación y Acceso
        </Button>
        <Button
          variant={selectedTemplate === 'STAGE_REMINDER' ? 'primary' : 'secondary'}
          onClick={() => setSelectedTemplate('STAGE_REMINDER')}
          style={{ minHeight: '34px', padding: '0.3rem 0.7rem', fontSize: 'var(--font-size-xs)' }}
        >
          Recordatorio de Menú
        </Button>
        <Button
          variant={selectedTemplate === 'PAYMENT_REMINDER' ? 'primary' : 'secondary'}
          onClick={() => setSelectedTemplate('PAYMENT_REMINDER')}
          style={{ minHeight: '34px', padding: '0.3rem 0.7rem', fontSize: 'var(--font-size-xs)' }}
        >
          Recordatorio de Cuota ($3.000)
        </Button>
      </div>

      {/* Lista de familias con mensajes preparados */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {participants.map((p) => {
            const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
            const accessUrl = p.secret ? `${appUrl}/f#secret=${p.secret}` : `${appUrl}/f`;
            const msg = buildWhatsAppMessage(selectedTemplate, {
              recipientName: p.familyName,
              recipientPhone: p.contactPhone,
              eventName,
              accessUrl,
              stageTitle: 'Elección del Plato Principal',
              deadlineText: '20 de Septiembre 23:59',
              amountText: '$ 3.000 UYU',
            });

            const isCopied = copiedId === p.id;
            const isLinkCopied = copiedLinkId === p.id;

            return (
              <div
                key={p.id}
                style={{
                  paddingBottom: 'var(--spacing-3)',
                  borderBottom: '1px solid var(--color-surface-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>Familia {p.familyName}</span>
                    {p.contactPhone && (
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', marginLeft: 'var(--spacing-2)' }}>
                        📱 {p.contactPhone}
                      </span>
                    )}
                  </div>
                  <Badge variant="neutral">{msg.title}</Badge>
                </div>

                {/* Previsualización del texto */}
                <div
                  style={{
                    backgroundColor: 'var(--color-surface-subtle)',
                    padding: 'var(--spacing-3)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-main)',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                  }}
                >
                  {msg.text}
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-2)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Button
                    variant="outline"
                    onClick={() => handleCopyLink(accessUrl, p.id)}
                    style={{ minHeight: '30px', padding: '0.2rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
                  >
                    {isLinkCopied ? '✓ ¡Enlace copiado!' : '🔗 Copiar solo link'}
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => handleCopy(msg.text, p.id)}
                    style={{ minHeight: '30px', padding: '0.2rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
                  >
                    {isCopied ? '✓ ¡Texto copiado!' : '📋 Copiar texto'}
                  </Button>

                  <a
                    href={msg.waLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.2rem 0.6rem',
                      backgroundColor: '#25D366',
                      color: '#ffffff',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    💬 Abrir en WhatsApp ↗
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
};

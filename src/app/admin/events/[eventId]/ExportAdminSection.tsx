'use client';

import React from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

interface Props {
  eventId: string;
}

export const ExportAdminSection: React.FC<Props> = ({ eventId }) => {
  const handleDownload = (type: 'responses' | 'payments') => {
    window.open(`/api/admin/events/${encodeURIComponent(eventId)}/export?type=${type}`, '_blank');
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
      <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-primary)' }}>
        Exportación de datos y cierre del evento
      </h3>
      <Card
        title="Descarga de planillas para el comité"
        subtitle="Archivos CSV estructurados con codificación UTF-8 para apertura directa en Microsoft Excel o Google Sheets."
      >
        <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            onClick={() => handleDownload('responses')}
            style={{ minHeight: 'var(--touch-target-min)', padding: '0.4rem 0.9rem' }}
          >
            Descargar CSV de respuestas
          </Button>

          <Button
            variant="outline"
            onClick={() => handleDownload('payments')}
            style={{ minHeight: 'var(--touch-target-min)', padding: '0.4rem 0.9rem' }}
          >
            Descargar CSV de pagos
          </Button>
        </div>
      </Card>
    </section>
  );
};

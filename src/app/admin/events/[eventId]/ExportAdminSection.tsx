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
      <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
        Exportación de Datos y Cierre del Evento
      </h3>
      <Card
        title="Descarga de Planillas para el Comité"
        subtitle="Archivos CSV estructurados con codificación UTF-8 para apertura directa en Microsoft Excel o Google Sheets."
      >
        <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            onClick={() => handleDownload('responses')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-1)' }}
          >
            📊 Descargar CSV de Respuestas
          </Button>

          <Button
            variant="outline"
            onClick={() => handleDownload('payments')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-1)' }}
          >
            💰 Descargar CSV de Conciliación de Pagos
          </Button>
        </div>
      </Card>
    </section>
  );
};

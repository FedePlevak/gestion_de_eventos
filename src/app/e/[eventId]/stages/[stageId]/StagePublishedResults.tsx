import React from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { StageAggregatedResults } from '@/modules/results/types';

interface Props {
  results: StageAggregatedResults;
}

export const StagePublishedResults: React.FC<Props> = ({ results }) => {
  const publishedDate = new Date(results.publishedAt).toLocaleDateString('es-UY', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card
      title="Resultados Publicados por el Comité"
      subtitle={`Actualizado el ${publishedDate}`}
      action={
        <Badge variant={results.isProvisional ? 'warning' : 'success'}>
          {results.isProvisional ? 'Resultados Provisorios' : 'Resultados Definitivos'}
        </Badge>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        {/* Métricas globales con denominadores reales (Regla R04) */}
        <div
          style={{
            backgroundColor: 'var(--color-surface-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--spacing-2)',
          }}
        >
          <div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
              Participación de las familias convocadas
            </span>
            <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-primary)' }}>
              {results.respondedFamiliesCount} de {results.totalEligibleFamilies} familias respondieron
            </p>
          </div>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-success)' }}>
            {results.responseRatePercentage}% de participación
          </span>
        </div>

        {/* Nota o mensaje aclaratorio del comité si existe */}
        {results.note && (
          <div
            style={{
              backgroundColor: 'var(--color-primary-light)',
              borderLeft: '4px solid var(--color-primary)',
              padding: 'var(--spacing-3)',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-primary)',
            }}
          >
            <strong>Mensaje del Comité:</strong> {results.note}
          </div>
        )}

        {/* Distribución de opciones agregadas */}
        {results.breakdown && results.breakdown.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-main)' }}>
              Distribución de Respuestas:
            </h4>
            {results.breakdown.map((item) => (
              <div
                key={item.optionId}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                  <span style={{ fontWeight: 600 }}>{item.label}</span>
                  <span style={{ color: 'var(--color-text-subtle)' }}>
                    <strong>{item.count}</strong> {item.count === 1 ? 'voto' : 'votos'} ({item.percentage}%)
                  </span>
                </div>
                {/* Barra de progreso porcentual */}
                <div
                  style={{
                    width: '100%',
                    height: '10px',
                    backgroundColor: 'var(--color-border)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${item.percentage}%`,
                      height: '100%',
                      backgroundColor: 'var(--color-primary)',
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.4s ease-in-out',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { StageModel, StageResponse, ReadConfirmation } from '@/modules/stages/types';

interface Props {
  eventId: string;
  stage: StageModel;
  existingResponse: StageResponse | null;
  readConfirmation: ReadConfirmation | null;
  isClosed: boolean;
}

export const StageClientInteraction: React.FC<Props> = ({
  eventId,
  stage,
  existingResponse: initialResponse,
  readConfirmation: initialRead,
  isClosed,
}) => {
  const [response, setResponse] = useState<StageResponse | null>(initialResponse);
  const [read, setRead] = useState<ReadConfirmation | null>(initialRead);

  // Form state
  const [selectedChoice, setSelectedChoice] = useState<string>(
    initialResponse?.answers?.choice || ''
  );
  const [selectedChoices, setSelectedChoices] = useState<string[]>(
    initialResponse?.answers?.choices || []
  );
  const [openText, setOpenText] = useState<string>(
    initialResponse?.answers?.text || ''
  );
  const [quantity, setQuantity] = useState<number>(
    initialResponse?.answers?.quantity ?? 0
  );

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Confirmar lectura informativa
  const handleConfirmRead = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/stages/${stage.id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo confirmar la lectura.');
      }

      setRead(data.confirmation);
      setSuccessMessage('¡Lectura confirmada! Gracias por informarte.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al confirmar lectura.');
    } finally {
      setLoading(false);
    }
  };

  // Enviar respuesta
  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    let answers: Record<string, any> = {};

    switch (stage.type) {
      case 'single_choice':
        if (!selectedChoice) {
          setErrorMessage('Por favor seleccioná una opción.');
          setLoading(false);
          return;
        }
        answers = { choice: selectedChoice };
        break;

      case 'multiple_choice':
        if (selectedChoices.length === 0) {
          setErrorMessage('Por favor seleccioná al menos una opción.');
          setLoading(false);
          return;
        }
        answers = { choices: selectedChoices };
        break;

      case 'yes_no':
        if (!selectedChoice) {
          setErrorMessage('Por favor indicá Sí o No.');
          setLoading(false);
          return;
        }
        answers = { choice: selectedChoice };
        break;

      case 'open_text':
        if (!openText.trim()) {
          setErrorMessage('Por favor ingresá tu respuesta.');
          setLoading(false);
          return;
        }
        answers = { text: openText.trim() };
        break;

      case 'integer_quantity':
        answers = { quantity: Number(quantity) };
        break;

      default:
        break;
    }

    try {
      const res = await fetch(`/api/stages/${stage.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          answers,
          expectedVersion: response?.version,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar la respuesta.');
      }

      setResponse(data.response);
      setSuccessMessage(
        response
          ? 'Tu respuesta fue actualizada con éxito.'
          : '¡Respuesta guardada con éxito!'
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al enviar la respuesta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      {/* Mensajes de éxito o error */}
      {successMessage && (
        <div
          style={{
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            color: 'var(--color-success-text)',
            padding: 'var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--spacing-3)',
          }}
        >
          ✓ {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger-text)',
            padding: 'var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--spacing-3)',
          }}
        >
          ⚠️ {errorMessage}
        </div>
      )}

      {/* ESTADO 1: Etapa Informativa con Confirmación de Lectura */}
      {stage.type === 'info' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {stage.content && (
            <div
              style={{
                fontSize: 'var(--font-size-base)',
                lineHeight: 'var(--line-height-normal)',
                color: 'var(--color-text-main)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {stage.content}
            </div>
          )}

          {read ? (
            <div
              style={{
                backgroundColor: 'var(--color-surface-subtle)',
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
              }}
            >
              <Badge variant="success">Lectura confirmada</Badge>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                {new Date(read.confirmedAt).toLocaleDateString('es-UY', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ) : isClosed ? (
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-subtle)' }}>
              Esta etapa informativa está cerrada.
            </p>
          ) : (
            <Button onClick={handleConfirmRead} isLoading={loading} fullWidth>
              Confirmar que leí esta información
            </Button>
          )}
        </div>
      )}

      {/* ESTADO 2: Consulta con Respuestas (Opciones / Selección / Texto) */}
      {stage.type !== 'info' && (
        <form onSubmit={handleSubmitResponse} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {/* Opción única (ej. Menú) */}
          {stage.type === 'single_choice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)' }}>
                Elegí una opción:
              </p>
              {(stage.options || []).map((opt) => {
                const isSelected = selectedChoice === opt.id;
                return (
                  <label
                    key={opt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--spacing-3)',
                      padding: 'var(--spacing-3)',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${
                        isSelected ? 'var(--color-primary)' : 'var(--color-border)'
                      }`,
                      backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      cursor: isClosed ? 'not-allowed' : 'pointer',
                      opacity: isClosed && !isSelected ? 0.5 : 1,
                    }}
                  >
                    <input
                      type="radio"
                      name="stage_option"
                      value={opt.id}
                      checked={isSelected}
                      disabled={isClosed}
                      onChange={() => setSelectedChoice(opt.id)}
                      style={{
                        marginTop: '0.2rem',
                        width: '18px',
                        height: '18px',
                        accentColor: 'var(--color-primary)',
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: isSelected ? 700 : 500, color: 'var(--color-text-main)' }}>
                        {opt.label}
                      </span>
                      {opt.description && (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                          {opt.description}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {/* Opción múltiple */}
          {stage.type === 'multiple_choice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)' }}>
                Podés seleccionar varias opciones:
              </p>
              {(stage.options || []).map((opt) => {
                const isChecked = selectedChoices.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-3)',
                      padding: 'var(--spacing-3)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isChecked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      backgroundColor: isChecked ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      cursor: isClosed ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      value={opt.id}
                      checked={isChecked}
                      disabled={isClosed}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedChoices([...selectedChoices, opt.id]);
                        } else {
                          setSelectedChoices(selectedChoices.filter((c) => c !== opt.id));
                        }
                      }}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          )}

          {/* Sí / No */}
          {stage.type === 'yes_no' && (
            <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
              <Button
                type="button"
                variant={selectedChoice === 'yes' ? 'primary' : 'secondary'}
                onClick={() => !isClosed && setSelectedChoice('yes')}
                disabled={isClosed}
                style={{ flex: 1 }}
              >
                Sí
              </Button>
              <Button
                type="button"
                variant={selectedChoice === 'no' ? 'primary' : 'secondary'}
                onClick={() => !isClosed && setSelectedChoice('no')}
                disabled={isClosed}
                style={{ flex: 1 }}
              >
                No
              </Button>
            </div>
          )}

          {/* Texto libre */}
          {stage.type === 'open_text' && (
            <textarea
              value={openText}
              disabled={isClosed}
              onChange={(e) => setOpenText(e.target.value)}
              placeholder="Escribí tu respuesta acá..."
              rows={4}
              style={{
                width: '100%',
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontFamily: 'inherit',
                fontSize: 'var(--font-size-base)',
              }}
            />
          )}

          {/* Cantidad entera */}
          {stage.type === 'integer_quantity' && (
            <input
              type="number"
              min={0}
              step={1}
              value={quantity}
              disabled={isClosed}
              onChange={(e) => setQuantity(Number(e.target.value))}
              style={{
                width: '100%',
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-base)',
              }}
            />
          )}

          {/* Estado de respuesta existente */}
          {response && (
            <div
              style={{
                backgroundColor: 'var(--color-surface-subtle)',
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Respuesta guardada (versión {response.version})</span>
              <span>
                {new Date(response.updatedAt).toLocaleTimeString('es-UY', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}

          {/* Botón de envío si la consulta sigue abierta */}
          {!isClosed ? (
            <Button type="submit" isLoading={loading} fullWidth>
              {response ? 'Modificar mi respuesta' : 'Enviar respuesta'}
            </Button>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--spacing-2)',
                backgroundColor: 'var(--color-surface-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-subtle)',
              }}
            >
              🔒 Esta consulta está cerrada y no admite nuevos cambios.
            </div>
          )}
        </form>
      )}
    </Card>
  );
};

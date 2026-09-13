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

  // Estados de los campos
  const [selectedChoice, setSelectedChoice] = useState<string>(
    initialResponse?.answers?.choice || ''
  );
  const [selectedChoices, setSelectedChoices] = useState<string[]>(
    initialResponse?.answers?.choices || []
  );
  const [openText, setOpenText] = useState<string>(
    initialResponse?.answers?.text || ''
  );
  const [quantity, setQuantity] = useState<number | ''>(
    initialResponse?.answers?.quantity !== undefined ? initialResponse.answers.quantity : ''
  );

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictVersion, setConflictVersion] = useState<number | null>(null);

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
      setSuccessMessage('Lectura confirmada. Gracias por informarte.');
    } catch (err: any) {
      setErrorMessage(err.message || 'No pudimos confirmar la lectura. Por favor intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Enviar o actualizar respuesta
  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isClosed) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setConflictVersion(null);

    let answers: Record<string, any> = {};

    switch (stage.type) {
      case 'single_choice':
        if (!selectedChoice) {
          setErrorMessage('Por favor seleccioná una opción antes de guardar.');
          setLoading(false);
          return;
        }
        answers = { choice: selectedChoice };
        break;

      case 'multiple_choice':
        if (selectedChoices.length === 0) {
          setErrorMessage('Por favor seleccioná al menos una opción antes de guardar.');
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
          setErrorMessage('Por favor ingresá tu respuesta antes de guardar.');
          setLoading(false);
          return;
        }
        answers = { text: openText.trim() };
        break;

      case 'integer_quantity':
        if (quantity === '' || isNaN(Number(quantity))) {
          setErrorMessage('Por favor indicá una cantidad válida.');
          setLoading(false);
          return;
        }
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
        // Conflicto de versión
        if (res.status === 409) {
          setConflictVersion(data.currentVersion || 2);
          throw new Error(
            'Otra persona de tu familia guardó cambios recientemente. Podés recargar para ver la versión guardada.'
          );
        }
        throw new Error(data.error || 'No pudimos guardar la respuesta.');
      }

      setResponse(data.response);
      setSuccessMessage('Respuesta guardada con éxito.');
    } catch (err: any) {
      setErrorMessage(
        err.message || 'No pudimos guardar. Lo que escribiste sigue acá; intentá de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      {/* Mensajes de éxito o error */}
      {successMessage && (
        <div
          role="status"
          style={{
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            color: 'var(--color-success-text)',
            padding: 'var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            lineHeight: 'var(--line-height-normal)',
            marginBottom: 'var(--spacing-3)',
          }}
        >
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger-text)',
            padding: 'var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            lineHeight: 'var(--line-height-normal)',
            marginBottom: 'var(--spacing-3)',
          }}
        >
          {errorMessage}
          {conflictVersion && (
            <div style={{ marginTop: 'var(--spacing-2)' }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Cargar versión más reciente
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ESTADO 1: Etapa Informativa con Confirmación de Lectura */}
      {stage.type === 'info' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {stage.content && (
            <div
              style={{
                fontSize: 'var(--font-size-base)',
                lineHeight: 'var(--line-height-relaxed)',
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
                border: '1px solid var(--color-border)',
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
                flexWrap: 'wrap',
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
                })}{' '}
                h
              </span>
            </div>
          ) : isClosed ? (
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-subtle)', margin: 0 }}>
              Esta etapa informativa está cerrada.
            </p>
          ) : (
            <Button
              onClick={handleConfirmRead}
              isLoading={loading}
              fullWidth
              variant="primary"
            >
              {loading ? 'Guardando confirmación…' : 'Confirmar que leí'}
            </Button>
          )}
        </div>
      )}

      {/* ESTADO 2: Consulta con Respuestas (Opciones / Selección / Texto) */}
      {stage.type !== 'info' && (
        <form onSubmit={handleSubmitResponse} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {/* Opción única (radio buttons grandes) */}
          {stage.type === 'single_choice' && (
            <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <legend style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)', marginBottom: 'var(--spacing-1)' }}>
                Elegí una opción:
              </legend>
              {(stage.options || []).map((opt) => {
                const isSelected = selectedChoice === opt.id;
                return (
                  <label
                    key={opt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: 'var(--touch-target-min)',
                      gap: 'var(--spacing-3)',
                      padding: '0.75rem var(--spacing-3)',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${
                        isSelected ? 'var(--color-primary)' : 'var(--color-control-border)'
                      }`,
                      backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      cursor: isClosed ? 'not-allowed' : 'pointer',
                      opacity: isClosed && !isSelected ? 0.6 : 1,
                      boxSizing: 'border-box',
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
                        width: '20px',
                        height: '20px',
                        accentColor: 'var(--color-primary)',
                        cursor: isClosed ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontWeight: isSelected ? 700 : 500, color: 'var(--color-text-main)', fontSize: 'var(--font-size-base)' }}>
                        {opt.label}
                      </span>
                      {opt.description && (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
                          {opt.description}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </fieldset>
          )}

          {/* Opción múltiple (checkboxes grandes) */}
          {stage.type === 'multiple_choice' && (
            <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <legend style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)', marginBottom: 'var(--spacing-1)' }}>
                Podés seleccionar una o más opciones:
              </legend>
              {(stage.options || []).map((opt) => {
                const isChecked = selectedChoices.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: 'var(--touch-target-min)',
                      gap: 'var(--spacing-3)',
                      padding: '0.75rem var(--spacing-3)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isChecked ? 'var(--color-primary)' : 'var(--color-control-border)'}`,
                      backgroundColor: isChecked ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      cursor: isClosed ? 'not-allowed' : 'pointer',
                      boxSizing: 'border-box',
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
                      style={{
                        width: '20px',
                        height: '20px',
                        accentColor: 'var(--color-primary)',
                        cursor: isClosed ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-main)' }}>{opt.label}</span>
                  </label>
                );
              })}
            </fieldset>
          )}

          {/* Sí / No */}
          {stage.type === 'yes_no' && (
            <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <legend style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)', marginBottom: 'var(--spacing-1)' }}>
                Seleccioná tu respuesta:
              </legend>
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
            </fieldset>
          )}

          {/* Texto libre */}
          {stage.type === 'open_text' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
              <label
                htmlFor="stage-open-text"
                style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}
              >
                Tu respuesta:
              </label>
              <textarea
                id="stage-open-text"
                value={openText}
                disabled={isClosed}
                onChange={(e) => setOpenText(e.target.value)}
                placeholder="Escribí tu respuesta acá…"
                rows={4}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-control-border)',
                  fontFamily: 'inherit',
                  fontSize: 'var(--font-size-base)',
                  lineHeight: 'var(--line-height-normal)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-main)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Cantidad entera */}
          {stage.type === 'integer_quantity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
              <label
                htmlFor="stage-quantity"
                style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}
              >
                Cantidad:
              </label>
              <input
                id="stage-quantity"
                type="number"
                min={0}
                step={1}
                value={quantity}
                disabled={isClosed}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuantity(val === '' ? '' : Math.max(0, parseInt(val, 10)));
                }}
                placeholder="0"
                style={{
                  width: '100%',
                  minHeight: 'var(--touch-target-min)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-control-border)',
                  fontSize: 'var(--font-size-base)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-main)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Estado de respuesta existente */}
          {response && (
            <div
              style={{
                backgroundColor: 'var(--color-surface-subtle)',
                border: '1px solid var(--color-border)',
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 'var(--spacing-1)',
              }}
            >
              <span>Respuesta guardada</span>
              <span>
                Última actualización:{' '}
                {new Date(response.updatedAt).toLocaleTimeString('es-UY', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                h
              </span>
            </div>
          )}

          {/* Botón de envío si la consulta sigue abierta */}
          {!isClosed ? (
            <Button type="submit" isLoading={loading} fullWidth variant="primary">
              {loading
                ? 'Guardando respuesta…'
                : response
                ? 'Modificar respuesta'
                : 'Guardar respuesta'}
            </Button>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--spacing-3)',
                backgroundColor: 'var(--color-surface-subtle)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-subtle)',
              }}
            >
              Esta consulta está cerrada y no admite nuevas modificaciones.
            </div>
          )}
        </form>
      )}
    </Card>
  );
};

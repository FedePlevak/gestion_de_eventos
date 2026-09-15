'use client';

import React, { useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { StageModel, StageResponse, ReadConfirmation, StageQuestion } from '@/modules/stages/types';

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

  // Estados para etapas compuestas (multifacéticas con múltiples preguntas)
  const isComposite = Boolean(stage.questions && stage.questions.length > 0);
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, any>>(
    initialResponse?.answers || {}
  );

  // Estados legacy para etapas clásicas de un solo campo
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

  // Evaluación en vivo de visibilidad condicional para una pregunta
  const isQuestionVisible = (q: StageQuestion, answers: Record<string, any>): boolean => {
    if (!q.condition) return true;
    const parentVal = answers[q.condition.dependsOnQuestionId];
    if (q.condition.operator === 'equals') {
      return parentVal === q.condition.value;
    }
    if (q.condition.operator === 'not_equals') {
      return parentVal !== q.condition.value;
    }
    return true;
  };

  // Actualizador para respuestas dinámicas
  const handleDynamicAnswerChange = (questionId: string, value: any) => {
    setDynamicAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

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

    if (isComposite && stage.questions) {
      // Validar preguntas obligatorias visibles
      for (const q of stage.questions) {
        if (q.type === 'info') continue;
        if (!isQuestionVisible(q, dynamicAnswers)) continue;

        const val = dynamicAnswers[q.id];
        if (q.required) {
          if (val === undefined || val === null || val === '') {
            setErrorMessage(`Por favor completá "${q.title}" antes de guardar.`);
            setLoading(false);
            return;
          }
          if (q.type === 'multiple_choice' && (!Array.isArray(val) || val.length === 0)) {
            setErrorMessage(`Debés seleccionar al menos una opción en "${q.title}".`);
            setLoading(false);
            return;
          }
        }
      }

      // Filtrar respuestas de preguntas que quedaron ocultas por su condición
      const cleanedAnswers: Record<string, any> = {};
      for (const q of stage.questions) {
        if (q.type === 'info') continue;
        if (isQuestionVisible(q, dynamicAnswers)) {
          if (dynamicAnswers[q.id] !== undefined) {
            cleanedAnswers[q.id] = dynamicAnswers[q.id];
          }
        }
      }
      answers = cleanedAnswers;
    } else {
      // Validación legacy para etapas de tipo simple
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
        err.message || 'No pudimos guardar. Lo que completaste sigue acá; intentá de nuevo.'
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
            fontWeight: 600,
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
            fontWeight: 600,
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

      {/* RENDERIZADO 1: Etapas Compuestas Multifacéticas */}
      {isComposite && stage.questions && (
        <form onSubmit={handleSubmitResponse} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
          {stage.questions.map((q, idx) => {
            const isVisible = isQuestionVisible(q, dynamicAnswers);
            if (!isVisible) return null;

            const val = dynamicAnswers[q.id];

            // 1. Bloque puramente informativo dentro de la etapa
            if (q.type === 'info') {
              return (
                <div
                  key={q.id}
                  style={{
                    backgroundColor: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-1)',
                  }}
                >
                  <strong style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary)' }}>
                    ℹ️ {q.title}
                  </strong>
                  {q.description && (
                    <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--line-height-relaxed)', whiteSpace: 'pre-wrap' }}>
                      {q.description}
                    </p>
                  )}
                </div>
              );
            }

            return (
              <div
                key={q.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-2)',
                  paddingBottom: idx < (stage.questions?.length ?? 0) - 1 ? 'var(--spacing-4)' : '0',
                  borderBottom: idx < (stage.questions?.length ?? 0) - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                {/* Título de la pregunta y aclaración */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 700,
                      fontSize: 'var(--font-size-base)',
                      color: 'var(--color-text-main)',
                      lineHeight: 'var(--line-height-tight)',
                    }}
                  >
                    {q.title}
                    {q.required && (
                      <span style={{ color: 'var(--color-danger-text)', marginLeft: '4px' }}>*</span>
                    )}
                  </label>
                  {q.description && (
                    <p style={{ margin: 'var(--spacing-1) 0 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                      {q.description}
                    </p>
                  )}
                </div>

                {/* Control por tipo de pregunta */}

                {/* A. Sí / No */}
                {q.type === 'yes_no' && (
                  <div style={{ display: 'flex', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-1)' }}>
                    <Button
                      type="button"
                      variant={val === 'yes' ? 'primary' : 'outline'}
                      onClick={() => !isClosed && handleDynamicAnswerChange(q.id, 'yes')}
                      disabled={isClosed}
                      style={{
                        flex: 1,
                        minHeight: 'var(--touch-target-min)',
                        fontWeight: val === 'yes' ? 700 : 500,
                      }}
                    >
                      {val === 'yes' ? '✓ Sí' : 'Sí'}
                    </Button>
                    <Button
                      type="button"
                      variant={val === 'no' ? 'primary' : 'outline'}
                      onClick={() => !isClosed && handleDynamicAnswerChange(q.id, 'no')}
                      disabled={isClosed}
                      style={{
                        flex: 1,
                        minHeight: 'var(--touch-target-min)',
                        fontWeight: val === 'no' ? 700 : 500,
                      }}
                    >
                      {val === 'no' ? '✓ No' : 'No'}
                    </Button>
                  </div>
                )}

                {/* B. Cantidad Numérica Entera (con botones táctiles + y -) */}
                {q.type === 'integer_quantity' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-1)' }}>
                    <button
                      type="button"
                      disabled={isClosed || (val !== undefined && Number(val) <= (q.minQuantity ?? 0))}
                      onClick={() => {
                        const current = Number(val || 0);
                        const next = Math.max(q.minQuantity ?? 0, current - 1);
                        handleDynamicAnswerChange(q.id, next);
                      }}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-control-border)',
                        backgroundColor: 'var(--color-surface)',
                        fontSize: 'var(--font-size-xl)',
                        fontWeight: 700,
                        cursor: isClosed ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-primary)',
                      }}
                      aria-label={`Disminuir ${q.title}`}
                    >
                      −
                    </button>

                    <input
                      type="number"
                      min={q.minQuantity ?? 0}
                      max={q.maxQuantity}
                      value={val !== undefined ? val : ''}
                      disabled={isClosed}
                      placeholder={q.placeholder || '0'}
                      onChange={(e) => {
                        const raw = e.target.value;
                        handleDynamicAnswerChange(q.id, raw === '' ? '' : Math.max(0, parseInt(raw, 10) || 0));
                      }}
                      style={{
                        width: '90px',
                        height: '44px',
                        textAlign: 'center',
                        fontSize: 'var(--font-size-lg)',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-control-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-main)',
                      }}
                    />

                    <button
                      type="button"
                      disabled={isClosed || (q.maxQuantity !== undefined && Number(val || 0) >= q.maxQuantity)}
                      onClick={() => {
                        const current = Number(val || 0);
                        const next = current + 1;
                        if (q.maxQuantity !== undefined && next > q.maxQuantity) return;
                        handleDynamicAnswerChange(q.id, next);
                      }}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-control-border)',
                        backgroundColor: 'var(--color-surface)',
                        fontSize: 'var(--font-size-xl)',
                        fontWeight: 700,
                        cursor: isClosed ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-primary)',
                      }}
                      aria-label={`Aumentar ${q.title}`}
                    >
                      +
                    </button>
                  </div>
                )}

                {/* C. Opción Única (Selección exclusiva) */}
                {q.type === 'single_choice' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-1)' }}>
                    {(q.options || []).map((opt) => {
                      const isSelected = val === opt.id;
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
                            name={`q_${q.id}`}
                            value={opt.id}
                            checked={isSelected}
                            disabled={isClosed}
                            onChange={() => handleDynamicAnswerChange(q.id, opt.id)}
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
                  </div>
                )}

                {/* D. Opción Múltiple (Casillas verificables) */}
                {q.type === 'multiple_choice' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-1)' }}>
                    {(q.options || []).map((opt) => {
                      const selectedList: string[] = Array.isArray(val) ? val : [];
                      const isChecked = selectedList.includes(opt.id);
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
                                handleDynamicAnswerChange(q.id, [...selectedList, opt.id]);
                              } else {
                                handleDynamicAnswerChange(q.id, selectedList.filter((c) => c !== opt.id));
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
                  </div>
                )}

                {/* E. Texto Libre */}
                {q.type === 'open_text' && (
                  <div style={{ marginTop: 'var(--spacing-1)' }}>
                    <textarea
                      value={val || ''}
                      disabled={isClosed}
                      onChange={(e) => handleDynamicAnswerChange(q.id, e.target.value)}
                      placeholder={q.placeholder || 'Escribí tu respuesta o aclaración acá…'}
                      rows={3}
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
              </div>
            );
          })}

          {/* Botón para enviar todas las respuestas de la etapa */}
          <div style={{ marginTop: 'var(--spacing-2)' }}>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={loading}
              disabled={isClosed}
              style={{ minHeight: '48px', fontSize: 'var(--font-size-base)', fontWeight: 700 }}
            >
              {isClosed ? 'Consulta cerrada' : response ? 'Actualizar mi respuesta' : 'Guardar respuesta'}
            </Button>
          </div>
        </form>
      )}

      {/* RENDERIZADO 2: Etapas Informativas Clásicas con Confirmación de Lectura */}
      {!isComposite && stage.type === 'info' && (
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

      {/* RENDERIZADO 3: Etapas Clásicas Simples (Votación individual) */}
      {!isComposite && stage.type !== 'info' && (
        <form onSubmit={handleSubmitResponse} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {/* Opción única */}
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

          {/* Opción múltiple */}
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
                  variant={selectedChoice === 'yes' ? 'primary' : 'outline'}
                  onClick={() => !isClosed && setSelectedChoice('yes')}
                  disabled={isClosed}
                  style={{ flex: 1, minHeight: 'var(--touch-target-min)' }}
                >
                  {selectedChoice === 'yes' ? '✓ Sí' : 'Sí'}
                </Button>
                <Button
                  type="button"
                  variant={selectedChoice === 'no' ? 'primary' : 'outline'}
                  onClick={() => !isClosed && setSelectedChoice('no')}
                  disabled={isClosed}
                  style={{ flex: 1, minHeight: 'var(--touch-target-min)' }}
                >
                  {selectedChoice === 'no' ? '✓ No' : 'No'}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <label
                htmlFor="stage-quantity"
                style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}
              >
                Indicá la cantidad:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                <button
                  type="button"
                  disabled={isClosed || quantity === '' || Number(quantity) <= 0}
                  onClick={() => setQuantity((prev) => Math.max(0, (Number(prev) || 0) - 1))}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-control-border)',
                    backgroundColor: 'var(--color-surface)',
                    fontSize: 'var(--font-size-xl)',
                    fontWeight: 700,
                    cursor: isClosed ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)',
                  }}
                  aria-label="Disminuir cantidad"
                >
                  −
                </button>

                <input
                  id="stage-quantity"
                  type="number"
                  min="0"
                  value={quantity}
                  disabled={isClosed}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setQuantity(raw === '' ? '' : Math.max(0, parseInt(raw, 10) || 0));
                  }}
                  placeholder="0"
                  style={{
                    width: '100px',
                    height: '44px',
                    textAlign: 'center',
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-control-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-main)',
                  }}
                />

                <button
                  type="button"
                  disabled={isClosed}
                  onClick={() => setQuantity((prev) => (Number(prev) || 0) + 1)}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-control-border)',
                    backgroundColor: 'var(--color-surface)',
                    fontSize: 'var(--font-size-xl)',
                    fontWeight: 700,
                    cursor: isClosed ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)',
                  }}
                  aria-label="Aumentar cantidad"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Botón de Enviar */}
          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={loading}
            disabled={isClosed}
            style={{ marginTop: 'var(--spacing-2)', minHeight: '48px', fontSize: 'var(--font-size-base)', fontWeight: 700 }}
          >
            {isClosed ? 'Consulta cerrada' : response ? 'Actualizar mi respuesta' : 'Guardar respuesta'}
          </Button>
        </form>
      )}

      {/* Historial de revisiones previas */}
      {response && response.version > 1 && (
        <div style={{ marginTop: 'var(--spacing-3)', paddingTop: 'var(--spacing-3)', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
            ℹ️ Guardaste la versión #{response.version} el{' '}
            {new Date(response.updatedAt).toLocaleDateString('es-UY', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            h. Podés volver a modificar tu respuesta mientras la consulta permanezca abierta.
          </span>
        </div>
      )}
    </Card>
  );
};

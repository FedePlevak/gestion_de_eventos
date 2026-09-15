'use client';

import React from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { StageQuestion, StageQuestionType } from '@/modules/stages/types';

interface Props {
  questions: StageQuestion[];
  onChange: (questions: StageQuestion[]) => void;
  isLocked?: boolean;
}

export function getTitlePlaceholder(type: StageQuestionType): string {
  switch (type) {
    case 'yes_no':
      return 'Ej: ¿Confirmás tu asistencia al evento?';
    case 'integer_quantity':
      return 'Ej: ¿Cuántos adultos asistirán? (o niños, acompañantes)';
    case 'single_choice':
      return 'Ej: ¿Qué opción de menú o turno preferís?';
    case 'multiple_choice':
      return 'Ej: ¿En qué actividades de la kermesse te gustaría participar?';
    case 'open_text':
      return 'Ej: Restricciones alimentarias, alergias o sugerencias';
    case 'info':
      return 'Ej: Horario de llegada, mapa de acceso y recomendaciones';
    default:
      return 'Ej: Escribí el título o consigna de la pregunta acá';
  }
}

export function getDescriptionPlaceholder(type: StageQuestionType): string {
  switch (type) {
    case 'yes_no':
      return 'Ej: Responder antes del viernes para confirmar cupo (opcional)';
    case 'integer_quantity':
      return 'Ej: Contar solo integrantes de la familia conviviente (opcional)';
    case 'single_choice':
      return 'Ej: Elegí una única alternativa (opcional)';
    case 'multiple_choice':
      return 'Ej: Podés marcar más de una alternativa (opcional)';
    case 'open_text':
      return 'Ej: Dejanos cualquier comentario relevante para la organización (opcional)';
    case 'info':
      return 'Ej: Rogamos llegar 15 minutos antes para acreditación (opcional)';
    default:
      return 'Ej: Texto explicativo o aclaración (opcional)';
  }
}

export function getOptionPlaceholder(type: StageQuestionType, optIdx: number): string {
  if (type === 'single_choice') {
    if (optIdx === 0) return 'Ej: Menú Tradicional';
    if (optIdx === 1) return 'Ej: Menú Vegetariano / Celíaco';
    return `Ej: Opción ${optIdx + 1}`;
  }
  if (type === 'multiple_choice') {
    if (optIdx === 0) return 'Ej: Decoración del salón';
    if (optIdx === 1) return 'Ej: Puesto de buffet y bebidas';
    if (optIdx === 2) return 'Ej: Juegos y kermesse';
    return `Ej: Alternativa ${optIdx + 1}`;
  }
  return `Ej: Opción ${optIdx + 1}`;
}

export function getTypeLabel(type: StageQuestionType): string {
  switch (type) {
    case 'yes_no':
      return 'Sí / No';
    case 'integer_quantity':
      return 'Cantidad numérica';
    case 'single_choice':
      return 'Opción única';
    case 'multiple_choice':
      return 'Opción múltiple';
    case 'open_text':
      return 'Texto libre';
    case 'info':
      return 'Informativo';
    default:
      return type;
  }
}

export function isQuestionComplete(q: StageQuestion): boolean {
  if (!q.title.trim()) return false;
  if (q.type === 'single_choice' || q.type === 'multiple_choice') {
    if (!q.options || q.options.length < 2) return false;
    if (q.options.some((opt) => !opt.label.trim())) return false;
  }
  return true;
}

export function getDefaultNewQuestion(type: StageQuestionType): StageQuestion {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  switch (type) {
    case 'yes_no':
      return {
        id,
        title: '',
        type: 'yes_no',
        required: true,
      };
    case 'integer_quantity':
      return {
        id,
        title: '',
        description: '',
        type: 'integer_quantity',
        required: true,
        minQuantity: 0,
        placeholder: '0',
      };
    case 'single_choice':
      return {
        id,
        title: '',
        type: 'single_choice',
        required: true,
        options: [
          { id: `opt_${Date.now()}_1`, label: '' },
          { id: `opt_${Date.now()}_2`, label: '' },
        ],
      };
    case 'multiple_choice':
      return {
        id,
        title: '',
        description: '',
        type: 'multiple_choice',
        required: false,
        options: [
          { id: `opt_${Date.now()}_1`, label: '' },
          { id: `opt_${Date.now()}_2`, label: '' },
        ],
      };
    case 'open_text':
      return {
        id,
        title: '',
        description: '',
        type: 'open_text',
        required: false,
        placeholder: 'Escribí tus aclaraciones acá…',
      };
    case 'info':
      return {
        id,
        title: '',
        description: '',
        type: 'info',
        required: false,
      };
    default:
      return {
        id,
        title: '',
        type: 'open_text',
        required: false,
      };
  }
}

export const StageQuestionBuilder: React.FC<Props> = ({
  questions,
  onChange,
  isLocked = false,
}) => {
  const handleAddQuestion = (type: StageQuestionType) => {
    if (isLocked) return;
    const newQ = getDefaultNewQuestion(type);
    onChange([...questions, newQ]);
  };

  const handleUpdateQuestion = (index: number, updates: Partial<StageQuestion>) => {
    const next = [...questions];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const handleRemoveQuestion = (index: number) => {
    if (isLocked) return;
    if (questions.length <= 1) {
      alert('La consulta debe contener al menos un campo o pregunta.');
      return;
    }
    const removedId = questions[index].id;
    // Quitar la pregunta y limpiar cualquier condición que apuntara a ella
    const next = questions
      .filter((_, i) => i !== index)
      .map((q) => {
        if (q.condition?.dependsOnQuestionId === removedId) {
          const { condition, ...rest } = q;
          return rest;
        }
        return q;
      });
    onChange(next);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (isLocked) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const next = [...questions];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    onChange(next);
  };

  // Manejo de opciones para single_choice y multiple_choice
  const handleAddOption = (qIndex: number) => {
    if (isLocked) return;
    const q = questions[qIndex];
    const currentOptions = q.options || [];
    const newOpt = {
      id: `opt_${Date.now()}_${currentOptions.length + 1}`,
      label: '',
    };
    handleUpdateQuestion(qIndex, { options: [...currentOptions, newOpt] });
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, label: string) => {
    const q = questions[qIndex];
    const nextOptions = [...(q.options || [])];
    nextOptions[optIndex] = { ...nextOptions[optIndex], label };
    handleUpdateQuestion(qIndex, { options: nextOptions });
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    if (isLocked) return;
    const q = questions[qIndex];
    const currentOptions = q.options || [];
    if (currentOptions.length <= 2) {
      alert('Se requieren al menos 2 opciones.');
      return;
    }
    handleUpdateQuestion(qIndex, {
      options: currentOptions.filter((_, i) => i !== optIndex),
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-primary)' }}>
          Preguntas y campos de la etapa ({questions.length})
        </span>

        {isLocked && (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning-text)', fontWeight: 600 }}>
            🔒 Preguntas bloqueadas por respuestas recibidas
          </span>
        )}
      </div>

      {/* Lista de preguntas / bloques */}
      {questions.map((q, qIndex) => {
        // Preguntas anteriores que pueden usarse como condición
        const previousQuestions = questions.slice(0, qIndex).filter((prev) => prev.type !== 'info');
        const complete = isQuestionComplete(q);

        return (
          <div
            key={q.id}
            style={{
              padding: 'var(--spacing-3)',
              backgroundColor: !complete ? 'rgba(255, 242, 217, 0.25)' : 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: !complete
                ? '1.5px dashed var(--color-warning-border, #D0AA63)'
                : '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-3)',
              boxShadow: 'var(--shadow-xs)',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {/* Encabezado del bloque */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)' }}>
                  #{qIndex + 1}
                </span>
                <Badge variant={q.type === 'yes_no' ? 'info' : q.type === 'integer_quantity' ? 'warning' : 'neutral'}>
                  {getTypeLabel(q.type)}
                </Badge>

                {!complete ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-warning-text, #795014)',
                      backgroundColor: 'var(--color-warning-bg, #FFF2D9)',
                      border: '1px solid var(--color-warning-border, #D0AA63)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ Sin completar
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-success-text, #24543A)',
                      backgroundColor: 'var(--color-success-bg, #EAF4EC)',
                      border: '1px solid var(--color-success-border, #9EBFA7)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 600,
                    }}
                  >
                    ✓ Listo
                  </span>
                )}
              </div>

              {!isLocked && (
                <div style={{ display: 'flex', gap: 'var(--spacing-1)', alignItems: 'center' }}>
                  <button
                    type="button"
                    disabled={qIndex === 0}
                    onClick={() => handleMoveQuestion(qIndex, 'up')}
                    title="Subir orden"
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: 'var(--font-size-xs)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      cursor: qIndex === 0 ? 'not-allowed' : 'pointer',
                      opacity: qIndex === 0 ? 0.4 : 1,
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={qIndex === questions.length - 1}
                    onClick={() => handleMoveQuestion(qIndex, 'down')}
                    title="Bajar orden"
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: 'var(--font-size-xs)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      cursor: qIndex === questions.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: qIndex === questions.length - 1 ? 0.4 : 1,
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIndex)}
                    title="Eliminar campo"
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: 'var(--font-size-xs)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-danger-border)',
                      color: 'var(--color-danger-text)',
                      backgroundColor: 'var(--color-danger-bg)',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Título o consigna */}
            <Input
              label="Título o pregunta"
              value={q.title}
              onChange={(e) => handleUpdateQuestion(qIndex, { title: e.target.value })}
              placeholder={getTitlePlaceholder(q.type)}
              helperText={
                !q.title.trim()
                  ? '⚠️ Escribí la pregunta acá (el texto en gris es solo un ejemplo)'
                  : undefined
              }
              style={{
                border: !q.title.trim() ? '1.5px dashed var(--color-warning-border, #D0AA63)' : undefined,
              }}
              required
            />

            {/* Aclaración o texto de ayuda */}
            <Input
              label="Aclaración o texto de ayuda (opcional)"
              value={q.description || ''}
              onChange={(e) => handleUpdateQuestion(qIndex, { description: e.target.value })}
              placeholder={getDescriptionPlaceholder(q.type)}
            />

            {/* Controles específicos del tipo */}
            {q.type !== 'info' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: isLocked ? 'not-allowed' : 'pointer' }}>
                <input
                  type="checkbox"
                  checked={q.required}
                  disabled={isLocked}
                  onChange={(e) => handleUpdateQuestion(qIndex, { required: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                />
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-main)' }}>
                  Campo obligatorio para la familia
                </span>
              </label>
            )}

            {/* Opciones para single_choice y multiple_choice */}
            {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-2)',
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  backgroundColor: 'var(--color-surface-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700 }}>
                    Opciones disponibles:
                  </span>
                  {(!q.options || q.options.some((o) => !o.label.trim())) && (
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning-text)', fontWeight: 600 }}>
                      ⚠️ Opciones pendientes de completar
                    </span>
                  )}
                </div>
                {(q.options || []).map((opt, optIdx) => (
                  <div key={opt.id} style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
                    <Input
                      label=""
                      value={opt.label}
                      disabled={isLocked}
                      onChange={(e) => handleUpdateOption(qIndex, optIdx, e.target.value)}
                      placeholder={getOptionPlaceholder(q.type, optIdx)}
                      helperText={!opt.label.trim() ? '⚠️ Escribí la opción (el texto en gris es un ejemplo)' : undefined}
                      style={{
                        border: !opt.label.trim() ? '1.5px dashed var(--color-warning-border, #D0AA63)' : undefined,
                      }}
                    />
                    {!isLocked && (q.options?.length ?? 0) > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(qIndex, optIdx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-danger-text)',
                          cursor: 'pointer',
                          padding: '0.4rem',
                          fontSize: 'var(--font-size-sm)',
                        }}
                        title="Quitar opción"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {!isLocked && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 'var(--spacing-1)' }}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleAddOption(qIndex)}
                      style={{ fontSize: 'var(--font-size-xs)', minHeight: '30px', padding: '0.2rem 0.6rem' }}
                    >
                      + Agregar otra opción
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* LÓGICA CONDICIONAL: Mostrar solo si depende de una pregunta previa */}
            {previousQuestions.length > 0 && (
              <div
                style={{
                  marginTop: 'var(--spacing-1)',
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  backgroundColor: q.condition ? 'var(--color-surface-subtle)' : 'transparent',
                  border: q.condition ? '1px dashed var(--color-primary)' : '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-2)',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: isLocked ? 'not-allowed' : 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(q.condition)}
                    disabled={isLocked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const defaultParent = previousQuestions[0];
                        const defaultVal = defaultParent.type === 'yes_no' ? 'yes' : defaultParent.options?.[0]?.id || '';
                        handleUpdateQuestion(qIndex, {
                          condition: {
                            dependsOnQuestionId: defaultParent.id,
                            operator: 'equals',
                            value: defaultVal,
                          },
                        });
                      } else {
                        const { condition, ...rest } = q;
                        handleUpdateQuestion(qIndex, rest);
                      }
                    }}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                  />
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-primary)' }}>
                    {q.condition ? 'Lógica condicional activa' : 'Condicionar visibilidad (mostrar solo según respuesta previa)'}
                  </span>
                </label>

                {q.condition && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-1)' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                        Mostrar este campo solo si:
                      </span>

                      {/* Selector de pregunta padre */}
                      <select
                        value={q.condition.dependsOnQuestionId}
                        disabled={isLocked}
                        onChange={(e) => {
                          const newParentId = e.target.value;
                          const foundParent = previousQuestions.find((p) => p.id === newParentId);
                          const defaultVal = foundParent?.type === 'yes_no' ? 'yes' : foundParent?.options?.[0]?.id || '';
                          handleUpdateQuestion(qIndex, {
                            condition: {
                              ...q.condition!,
                              dependsOnQuestionId: newParentId,
                              value: defaultVal,
                            },
                          });
                        }}
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          padding: '0.35rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-surface)',
                          maxWidth: '220px',
                        }}
                      >
                        {previousQuestions.map((prev, pIdx) => (
                          <option key={prev.id} value={prev.id}>
                            #{pIdx + 1}: {prev.title.slice(0, 30)}…
                          </option>
                        ))}
                      </select>

                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                        es igual a:
                      </span>

                      {/* Selector de valor según tipo del padre */}
                      {(() => {
                        const parentQ = previousQuestions.find((p) => p.id === q.condition?.dependsOnQuestionId);
                        if (parentQ?.type === 'yes_no') {
                          return (
                            <select
                              value={q.condition.value}
                              disabled={isLocked}
                              onChange={(e) => {
                                handleUpdateQuestion(qIndex, {
                                  condition: {
                                    ...q.condition!,
                                    value: e.target.value,
                                  },
                                });
                              }}
                              style={{
                                fontSize: 'var(--font-size-xs)',
                                padding: '0.35rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-surface)',
                              }}
                            >
                              <option value="yes">Sí</option>
                              <option value="no">No</option>
                            </select>
                          );
                        } else if (parentQ?.options && parentQ.options.length > 0) {
                          return (
                            <select
                              value={q.condition.value}
                              disabled={isLocked}
                              onChange={(e) => {
                                handleUpdateQuestion(qIndex, {
                                  condition: {
                                    ...q.condition!,
                                    value: e.target.value,
                                  },
                                });
                              }}
                              style={{
                                fontSize: 'var(--font-size-xs)',
                                padding: '0.35rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-surface)',
                              }}
                            >
                              {parentQ.options.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          );
                        } else {
                          return (
                            <input
                              type="text"
                              value={q.condition.value}
                              disabled={isLocked}
                              onChange={(e) => {
                                handleUpdateQuestion(qIndex, {
                                  condition: {
                                    ...q.condition!,
                                    value: e.target.value,
                                  },
                                });
                              }}
                              placeholder="Valor esperado"
                              style={{
                                fontSize: 'var(--font-size-xs)',
                                padding: '0.35rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-surface)',
                                width: '100px',
                              }}
                            />
                          );
                        }
                      })()}
                    </div>

                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                      💡 La familia verá este campo únicamente si responde este valor en la pregunta anterior.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Botones para agregar nuevos tipos de preguntas */}
      {!isLocked && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-2)',
            padding: 'var(--spacing-3)',
            backgroundColor: 'var(--color-surface-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-subtle)' }}>
            + AGREGAR OTRO CAMPO O PREGUNTA A ESTA ETAPA:
          </span>

          <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddQuestion('yes_no')}
              style={{ fontSize: 'var(--font-size-xs)', minHeight: '34px' }}
            >
              + Sí / No
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddQuestion('integer_quantity')}
              style={{ fontSize: 'var(--font-size-xs)', minHeight: '34px' }}
            >
              + Cantidad (Adultos / Niños)
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddQuestion('single_choice')}
              style={{ fontSize: 'var(--font-size-xs)', minHeight: '34px' }}
            >
              + Opción única
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddQuestion('multiple_choice')}
              style={{ fontSize: 'var(--font-size-xs)', minHeight: '34px' }}
            >
              + Opción múltiple
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddQuestion('open_text')}
              style={{ fontSize: 'var(--font-size-xs)', minHeight: '34px' }}
            >
              + Texto libre / Sugerencias
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddQuestion('info')}
              style={{ fontSize: 'var(--font-size-xs)', minHeight: '34px' }}
            >
              + Bloque informativo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

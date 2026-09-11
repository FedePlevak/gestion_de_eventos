'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

interface StageSummary {
  id: string;
  title: string;
  type: string;
  status: 'open' | 'closed' | 'draft' | 'canceled';
  deadlineAt?: string;
  responseCount: number;
  readCount: number;
  isSemanticallyLocked: boolean;
  clarifications?: { id: string; content: string; createdAt: string }[];
}

interface Props {
  eventId: string;
  initialStages: StageSummary[];
}

export const StageAdminControls: React.FC<Props> = ({ eventId, initialStages }) => {
  const [stages, setStages] = useState<StageSummary[]>(initialStages);
  const [activeActionStageId, setActiveActionStageId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'close' | 'reopen' | 'clarify' | 'publish' | 'unpublish' | null>(null);
  const [reasonOrContent, setReasonOrContent] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Estados para creación de nueva etapa
  const [isCreating, setIsCreating] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createType, setCreateType] = useState<string>('single_choice');
  const [createDescription, setCreateDescription] = useState('');
  const [createDeadline, setCreateDeadline] = useState('');
  const [createOptions, setCreateOptions] = useState<string[]>(['Opción A', 'Opción B']);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Sincronizar etapas reales si existen en base de datos
  useEffect(() => {
    const fetchStages = async () => {
      try {
        const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/stages`, {
          headers: {
            'x-dev-organizer-email': 'organizador1@colegio.edu.uy',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.stages && data.stages.length > 0) {
            setStages(
              data.stages.map((s: any) => ({
                id: s.id,
                title: s.title,
                type: s.type,
                status: s.status,
                deadlineAt: s.deadlineAt,
                responseCount: s.responseCount || 0,
                readCount: s.readCount || 0,
                isSemanticallyLocked: s.isSemanticallyLocked || false,
                clarifications: s.clarifications || [],
              }))
            );
          }
        }
      } catch (err) {
        // En caso de fallo de red en dev, conserva initialStages
      }
    };
    fetchStages();
  }, [eventId]);

  const handleAddOption = () => {
    setCreateOptions((prev) => [...prev, `Opción ${String.fromCharCode(65 + prev.length)}`]);
  };

  const handleOptionChange = (index: number, value: string) => {
    setCreateOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleRemoveOption = (index: number) => {
    if (createOptions.length <= 2) {
      alert('Se requieren al menos 2 opciones.');
      return;
    }
    setCreateOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createTitle.trim()) {
      setCreateError('El título de la consulta es obligatorio.');
      return;
    }

    let formattedOptions: { id: string; label: string }[] | undefined = undefined;
    if (createType === 'single_choice' || createType === 'multiple_choice') {
      const validOptions = createOptions.map((o) => o.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        setCreateError('Debés ingresar al menos 2 opciones de respuesta válidas.');
        return;
      }
      formattedOptions = validOptions.map((label, idx) => ({
        id: `opt_${Date.now()}_${idx + 1}`,
        label,
      }));
    }

    setCreateLoading(true);

    try {
      const payload: any = {
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
        type: createType,
        visibility: 'visible',
        order: stages.length + 1,
      };

      if (createDeadline) {
        payload.deadlineAt = new Date(createDeadline).toISOString();
      }

      if (formattedOptions) {
        payload.options = formattedOptions;
      }

      const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/stages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-organizer-email': 'organizador1@colegio.edu.uy',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la etapa.');
      }

      const newStageSummary: StageSummary = {
        id: data.stage.id,
        title: data.stage.title,
        type: data.stage.type,
        status: data.stage.status,
        deadlineAt: data.stage.deadlineAt,
        responseCount: 0,
        readCount: 0,
        isSemanticallyLocked: false,
        clarifications: [],
      };

      setStages((prev) => [...prev, newStageSummary]);
      setFeedback(`✓ ¡Consulta "${data.stage.title}" creada y publicada exitosamente!`);
      setIsCreating(false);

      // Resetear campos
      setCreateTitle('');
      setCreateDescription('');
      setCreateType('single_choice');
      setCreateDeadline('');
      setCreateOptions(['Opción A', 'Opción B']);
    } catch (err: any) {
      setCreateError(err.message || 'Error al crear la etapa.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleExecuteAction = async (stageId: string) => {
    if (!actionType) return;
    setLoading(true);
    setFeedback(null);

    try {
      if (actionType === 'publish' || actionType === 'unpublish') {
        const payload: any = actionType === 'unpublish' ? { action: 'unpublish' } : { note: reasonOrContent.trim() };
        const res = await fetch(`/api/admin/events/${eventId}/stages/${stageId}/publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dev-organizer-email': 'organizador1@colegio.edu.uy',
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al actualizar publicación');
        setFeedback(actionType === 'publish' ? '✓ Resultados publicados exitosamente para las familias.' : '✓ Publicación de resultados retirada.');
        setActiveActionStageId(null);
        setActionType(null);
        setReasonOrContent('');
        setLoading(false);
        return;
      }

      const payload: any = { action: actionType };
      if (actionType === 'close') {
        payload.reason = reasonOrContent.trim() || 'Cierre manual por el comité';
      } else if (actionType === 'reopen') {
        if (!reasonOrContent.trim()) {
          alert('El motivo de reapertura es obligatorio.');
          setLoading(false);
          return;
        }
        payload.reason = reasonOrContent.trim();
        payload.newDeadlineAt = newDeadline ? new Date(newDeadline).toISOString() : null;
      } else if (actionType === 'clarify') {
        if (!reasonOrContent.trim()) {
          alert('El texto de la aclaración es obligatorio.');
          setLoading(false);
          return;
        }
        payload.content = reasonOrContent.trim();
      }

      const res = await fetch(`/api/admin/events/${eventId}/stages/${stageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-organizer-email': 'organizador1@colegio.edu.uy',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al ejecutar acción');
      }

      setFeedback('✓ Acción aplicada con éxito.');
      setStages((prev) =>
        prev.map((s) => {
          if (s.id !== stageId) return s;
          if (actionType === 'close') return { ...s, status: 'closed' };
          if (actionType === 'reopen') return { ...s, status: 'open', deadlineAt: payload.newDeadlineAt };
          if (actionType === 'clarify') {
            return {
              ...s,
              clarifications: [
                ...(s.clarifications || []),
                { id: `clar_${Date.now()}`, content: reasonOrContent, createdAt: new Date().toISOString() },
              ],
            };
          }
          return s;
        })
      );

      setActiveActionStageId(null);
      setActionType(null);
      setReasonOrContent('');
      setNewDeadline('');
    } catch (err: any) {
      alert(err.message || 'Ocurrió un error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
      {/* Barra superior con botón de Crear Nueva Etapa */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-subtle)' }}>
          {stages.length} consulta{stages.length === 1 ? '' : 's'} configurada{stages.length === 1 ? '' : 's'}
        </span>

        {!isCreating && (
          <Button
            variant="primary"
            onClick={() => setIsCreating(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-1)' }}
          >
            + Nueva Etapa / Consulta
          </Button>
        )}
      </div>

      {feedback && (
        <div
          style={{
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            color: 'var(--color-success-text)',
            padding: 'var(--spacing-2) var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
          }}
        >
          {feedback}
        </div>
      )}

      {/* Formulario para Crear Nueva Etapa */}
      {isCreating && (
        <Card
          title="Crear Nueva Consulta o Etapa"
          subtitle="Configurá las preguntas para que las familias participen desde su celular."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreating(false);
                setCreateError(null);
              }}
              style={{ fontSize: 'var(--font-size-xs)', padding: '0.2rem 0.6rem' }}
            >
              Cerrar
            </Button>
          }
        >
          <form onSubmit={handleCreateStage} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            {createError && (
              <div
                style={{
                  backgroundColor: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger-border)',
                  color: 'var(--color-danger-text)',
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-xs)',
                }}
              >
                ⚠ {createError}
              </div>
            )}

            <Input
              label="Título de la consulta"
              placeholder="Ej: Elección del Plato Principal, Confirmación de Asistencia, Talle de Remera"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              required
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                Tipo de consulta
              </label>
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: 'var(--font-size-sm)',
                  backgroundColor: 'var(--color-surface)',
                }}
              >
                <option value="single_choice">Votación de Opción Única (1 sola opción)</option>
                <option value="multiple_choice">Selección Múltiple (1 o más opciones)</option>
                <option value="yes_no">Consulta Sí o No</option>
                <option value="open_text">Texto libre / Comentarios o Sugerencias</option>
                <option value="integer_quantity">Cantidad Numérica (ej. cantidad de entradas)</option>
                <option value="info">Aviso Informativo (con confirmación de lectura)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                Instrucciones o descripción para las familias
              </label>
              <textarea
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Explicá a las familias qué deben elegir o considerar..."
                rows={3}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Opciones de respuesta para single_choice y multiple_choice */}
            {(createType === 'single_choice' || createType === 'multiple_choice') && (
              <div
                style={{
                  backgroundColor: 'var(--color-surface-subtle)',
                  padding: 'var(--spacing-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>
                    Opciones de votación:
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddOption}
                    style={{ fontSize: 'var(--font-size-xs)', padding: '0.2rem 0.5rem' }}
                  >
                    + Agregar opción
                  </Button>
                </div>

                {createOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
                    <Input
                      label=""
                      placeholder={`Opción ${idx + 1}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      required
                    />
                    {createOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleRemoveOption(idx)}
                        style={{ fontSize: 'var(--font-size-xs)', padding: '0.4rem 0.6rem', alignSelf: 'flex-end', marginBottom: '4px' }}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Input
              label="Fecha y hora de cierre (opcional)"
              type="datetime-local"
              value={createDeadline}
              onChange={(e) => setCreateDeadline(e.target.value)}
            />
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', marginTop: '-0.5rem' }}>
              💡 Si no fijás fecha, la consulta quedará abierta hasta que el comité decida cerrarla manualmente.
            </span>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsCreating(false);
                  setCreateError(null);
                }}
                disabled={createLoading}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                variant="primary"
                isLoading={createLoading}
              >
                Crear y Publicar Etapa
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de etapas existentes */}
      {stages.map((stage) => {
        const isEditingThis = activeActionStageId === stage.id;

        return (
          <Card
            key={stage.id}
            title={stage.title}
            subtitle={
              stage.deadlineAt
                ? `Cierre: ${new Date(stage.deadlineAt).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })}`
                : 'Sin fecha límite configurada (cierre manual)'
            }
            action={
              <Badge variant={stage.status === 'open' ? 'success' : 'neutral'}>
                {stage.status === 'open' ? 'Abierta' : 'Cerrada'}
              </Badge>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <div style={{ display: 'flex', gap: 'var(--spacing-3)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', flexWrap: 'wrap' }}>
                <span>Tipo: <strong>{stage.type}</strong></span>
                <span>Respuestas: <strong>{stage.responseCount}</strong></span>
                {stage.type === 'info' && <span>Lecturas: <strong>{stage.readCount}</strong></span>}
                {stage.isSemanticallyLocked && <span>🔒 Preguntas protegidas</span>}
              </div>

              {stage.clarifications && stage.clarifications.length > 0 && (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning-text)' }}>
                  📌 {stage.clarifications.length} aclaración{stage.clarifications.length > 1 ? 'es' : ''} añadida{stage.clarifications.length > 1 ? 's' : ''}
                </div>
              )}

              {/* Botones de acción administrativa */}
              <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap', marginTop: 'var(--spacing-2)' }}>
                {stage.status === 'open' ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveActionStageId(stage.id);
                      setActionType('close');
                    }}
                    style={{ minHeight: '32px', padding: '0.25rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
                  >
                    Cerrar etapa
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveActionStageId(stage.id);
                      setActionType('reopen');
                    }}
                    style={{ minHeight: '32px', padding: '0.25rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
                  >
                    Reabrir consulta
                  </Button>
                )}

                <Button
                  variant="secondary"
                  onClick={() => {
                    setActiveActionStageId(stage.id);
                    setActionType('clarify');
                  }}
                  style={{ minHeight: '32px', padding: '0.25rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
                >
                  + Agregar aclaración
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveActionStageId(stage.id);
                    setActionType('publish');
                  }}
                  style={{ minHeight: '32px', padding: '0.25rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
                >
                  📢 Publicar resultados
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setActiveActionStageId(stage.id);
                    setActionType('unpublish');
                  }}
                  style={{ minHeight: '32px', padding: '0.25rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
                >
                  Ocultar publicación
                </Button>
              </div>

              {/* Formulario de acción desplegado */}
              {isEditingThis && actionType && (
                <div
                  style={{
                    marginTop: 'var(--spacing-3)',
                    padding: 'var(--spacing-3)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-2)',
                  }}
                >
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700 }}>
                    {actionType === 'close' && 'Confirmar cierre manual de la consulta:'}
                    {actionType === 'reopen' && 'Reapertura de consulta (requiere motivo):'}
                    {actionType === 'clarify' && 'Nueva aclaración visible para las familias:'}
                    {actionType === 'publish' && 'Publicar resultados consolidados a las familias:'}
                    {actionType === 'unpublish' && '¿Retirar la publicación de resultados para las familias?'}
                  </span>

                  {actionType === 'unpublish' ? (
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                      Los resultados dejarán de ser visibles para las familias inmediatamente.
                    </p>
                  ) : actionType === 'publish' ? (
                    <Input
                      label="Mensaje o conclusión del comité (opcional)"
                      value={reasonOrContent}
                      onChange={(e) => setReasonOrContent(e.target.value)}
                      placeholder="Ej: Agradecemos la masiva participación. La opción ganadora es el menú tradicional."
                    />
                  ) : (
                    <Input
                      label={actionType === 'clarify' ? 'Texto de la aclaración' : 'Motivo'}
                      value={reasonOrContent}
                      onChange={(e) => setReasonOrContent(e.target.value)}
                      placeholder={
                        actionType === 'reopen'
                          ? 'Ej: Se otorga prórroga de 48 hs para familias rezagadas'
                          : 'Ingresá el detalle...'
                      }
                      required
                    />
                  )}

                  {actionType === 'reopen' && (
                    <Input
                      label="Nuevo vencimiento (opcional)"
                      type="datetime-local"
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                    />
                  )}

                  <div style={{ display: 'flex', gap: 'var(--spacing-2)', justifyContent: 'flex-end', marginTop: 'var(--spacing-1)' }}>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setActiveActionStageId(null);
                        setActionType(null);
                      }}
                      style={{ minHeight: '32px', padding: '0.3rem 0.7rem', fontSize: 'var(--font-size-xs)' }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      isLoading={loading}
                      onClick={() => handleExecuteAction(stage.id)}
                      style={{ minHeight: '32px', padding: '0.3rem 0.7rem', fontSize: 'var(--font-size-xs)' }}
                    >
                      Confirmar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

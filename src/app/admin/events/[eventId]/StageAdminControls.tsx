'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { StageCountdown } from '@/components/StageCountdown';

export interface StageSummary {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string; // 'draft' | 'open' | 'closed'
  visibility?: string; // 'visible' | 'hidden'
  order?: number;
  deadlineAt?: string;
  responseCount: number;
  readCount: number;
  isSemanticallyLocked: boolean;
  options?: Array<{ id: string; label: string; description?: string }>;
  clarifications?: { id: string; content: string; createdAt: string }[];
}

interface Props {
  eventId: string;
  initialStages: StageSummary[];
}

export const StageAdminControls: React.FC<Props> = ({ eventId, initialStages }) => {
  const [stages, setStages] = useState<StageSummary[]>(
    [...initialStages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  );
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
  const [createPublishImmediately, setCreatePublishImmediately] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Estados para edición de etapa existente
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Estados para panel visual de avance y resultados en vivo
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [stageOverviewData, setStageOverviewData] = useState<Record<string, any>>({});
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Record<string, 'breakdown' | 'responses' | 'pending'>>({});

  const loadStageOverview = async (stageId: string, force = false) => {
    if (!force && stageOverviewData[stageId]) return;
    setOverviewLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/stages/${encodeURIComponent(stageId)}`);
      if (res.ok) {
        const data = await res.json();
        setStageOverviewData((prev) => ({ ...prev, [stageId]: data }));
      }
    } catch (err) {
      console.error('Error al cargar panel de avance:', err);
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleToggleOverview = (stageId: string) => {
    if (expandedStageId === stageId) {
      setExpandedStageId(null);
    } else {
      setExpandedStageId(stageId);
      loadStageOverview(stageId);
    }
  };

  // Sincronizar etapas en vivo
  const refreshStages = async () => {
    try {
      const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/stages`);
      if (res.ok) {
        const data = await res.json();
        if (data.stages) {
          const sorted = (data.stages as StageSummary[]).sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          );
          setStages(sorted);
        }
      }
    } catch (err) {
      console.error('Error al refrescar etapas:', err);
    }
  };

  useEffect(() => {
    refreshStages();
  }, [eventId]);

  // Manejo de opciones en creación
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

  // Guardar nueva etapa
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
        visibility: createPublishImmediately ? 'visible' : 'hidden',
        status: 'open',
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la etapa.');
      }

      setFeedback(
        createPublishImmediately
          ? `✓ Consulta "${data.stage.title}" creada y publicada exitosamente para las familias.`
          : `✓ Consulta "${data.stage.title}" creada en Borrador (Oculta). Podés editarla o activarla cuando desees.`
      );
      setIsCreating(false);

      // Resetear campos
      setCreateTitle('');
      setCreateDescription('');
      setCreateType('single_choice');
      setCreateDeadline('');
      setCreateOptions(['Opción A', 'Opción B']);
      setCreatePublishImmediately(false);

      await refreshStages();
    } catch (err: any) {
      setCreateError(err.message || 'Error al crear la etapa.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Abrir edición de etapa
  const startEditing = (stage: StageSummary) => {
    setEditingStageId(stage.id);
    setEditTitle(stage.title);
    setEditDescription(stage.description || '');

    // Formatear correctamente la fecha local para el input datetime-local (YYYY-MM-DDTHH:mm)
    let localIso = '';
    if (stage.deadlineAt) {
      const d = new Date(stage.deadlineAt);
      if (!isNaN(d.getTime())) {
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localTime = new Date(d.getTime() - tzOffset);
        localIso = localTime.toISOString().slice(0, 16);
      }
    }
    setEditDeadline(localIso);
    setEditOptions(stage.options ? stage.options.map((o) => o.label) : ['Opción A', 'Opción B']);
    setEditError(null);
    setActiveActionStageId(null);
  };

  const handleEditAddOption = () => {
    setEditOptions((prev) => [...prev, `Opción ${String.fromCharCode(65 + prev.length)}`]);
  };

  const handleEditOptionChange = (idx: number, val: string) => {
    setEditOptions((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleEditRemoveOption = (idx: number) => {
    if (editOptions.length <= 2) {
      alert('Se requieren al menos 2 opciones.');
      return;
    }
    setEditOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Guardar edición
  const handleSaveEdit = async (stageId: string) => {
    if (!editTitle.trim()) {
      setEditError('El título no puede estar vacío.');
      return;
    }

    const currentStage = stages.find((s) => s.id === stageId);
    if (!currentStage) return;

    setEditLoading(true);
    setEditError(null);

    try {
      let deadlineIso: string | null = null;
      if (editDeadline && editDeadline.trim()) {
        const d = new Date(editDeadline.trim());
        if (isNaN(d.getTime())) {
          setEditError('La fecha y hora de vencimiento ingresada no es válida.');
          setEditLoading(false);
          return;
        }
        deadlineIso = d.toISOString();
      }

      const payload: any = {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        deadlineAt: deadlineIso,
      };

      // Solo enviar options si la etapa NO está bloqueada semánticamente Y las opciones cambiaron
      if (!currentStage.isSemanticallyLocked && (currentStage.type === 'single_choice' || currentStage.type === 'multiple_choice')) {
        const valid = editOptions.map((o) => o.trim()).filter(Boolean);
        if (valid.length < 2) {
          setEditError('Debés ingresar al menos 2 opciones.');
          setEditLoading(false);
          return;
        }

        const originalLabels = (currentStage.options || []).map((o) => o.label.trim());
        const hasOptionsChanged =
          valid.length !== originalLabels.length || valid.some((v, i) => v !== originalLabels[i]);

        if (hasOptionsChanged) {
          payload.options = valid.map((label, idx) => ({
            id: currentStage.options?.[idx]?.id || `opt_${Date.now()}_${idx + 1}`,
            label,
          }));
        }
      }

      const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/stages/${encodeURIComponent(stageId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar los cambios.');

      setFeedback('✓ Cambios guardados exitosamente.');
      setEditingStageId(null);
      await refreshStages();
    } catch (err: any) {
      setEditError(err.message || 'Error al actualizar la etapa.');
    } finally {
      setEditLoading(false);
    }
  };

  // Activar / Ocultar etapa (1 solo clic)
  const handleToggleVisibility = async (stageId: string, currentVisibility: string = 'hidden') => {
    setLoading(true);
    setFeedback(null);

    const willBeVisible = currentVisibility !== 'visible';
    const payload = {
      visibility: willBeVisible ? 'visible' : 'hidden',
      status: willBeVisible ? 'open' : undefined,
    };

    try {
      const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/stages/${encodeURIComponent(stageId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar visibilidad.');

      setFeedback(
        willBeVisible
          ? '✓ Consulta activada y visible para las familias convocadas.'
          : '✓ Consulta pausada y oculta para las familias.'
      );
      await refreshStages();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar visibilidad.');
    } finally {
      setLoading(false);
    }
  };

  // Reordenar etapas (Subir / Bajar)
  const handleMoveStage = async (stageId: string, direction: 'up' | 'down') => {
    const sorted = [...stages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const idx = sorted.findIndex((s) => s.id === stageId);
    if (idx === -1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const currentStage = sorted[idx];
    const targetStage = sorted[targetIdx];

    const currentOrder = currentStage.order ?? idx + 1;
    const targetOrder = targetStage.order ?? targetIdx + 1;

    setLoading(true);
    try {
      // Actualizar ambas etapas
      await Promise.all([
        fetch(`/api/admin/events/${encodeURIComponent(eventId)}/stages/${encodeURIComponent(currentStage.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: targetOrder }),
        }),
        fetch(`/api/admin/events/${encodeURIComponent(eventId)}/stages/${encodeURIComponent(targetStage.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: currentOrder }),
        }),
      ]);

      setFeedback('✓ Orden de consultas actualizado.');
      await refreshStages();
    } catch (err) {
      console.error('Error al mover etapa:', err);
    } finally {
      setLoading(false);
    }
  };

  // Acciones administrativas de cierre / reapertura / aclaración / publicación de resultados
  const handleExecuteAction = async (stageId: string) => {
    if (!actionType) return;
    setLoading(true);
    setFeedback(null);

    try {
      if (actionType === 'publish' || actionType === 'unpublish') {
        const payload: any = actionType === 'unpublish' ? { action: 'unpublish' } : { note: reasonOrContent.trim() };
        const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/stages/${encodeURIComponent(stageId)}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al actualizar publicación');
        setFeedback(actionType === 'publish' ? '✓ Resultados publicados para las familias.' : '✓ Publicación de resultados retirada.');
        setActiveActionStageId(null);
        setActionType(null);
        setReasonOrContent('');
        await refreshStages();
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
        if (newDeadline) payload.newDeadlineAt = new Date(newDeadline).toISOString();
      } else if (actionType === 'clarify') {
        if (!reasonOrContent.trim() || reasonOrContent.trim().length < 3) {
          alert('El texto de la aclaración debe tener al menos 3 caracteres.');
          setLoading(false);
          return;
        }
        payload.content = reasonOrContent.trim();
      }

      const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/stages/${encodeURIComponent(stageId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al ejecutar la acción');

      setFeedback('✓ Acción registrada exitosamente.');
      setActiveActionStageId(null);
      setActionType(null);
      setReasonOrContent('');
      setNewDeadline('');
      await refreshStages();
    } catch (err: any) {
      alert(err.message || 'Error al procesar la acción.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
      {/* Botón principal para abrir formulario de creación */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <Button
          variant="primary"
          onClick={() => {
            setIsCreating(!isCreating);
            setEditingStageId(null);
          }}
          style={{ minHeight: '38px', fontSize: 'var(--font-size-sm)' }}
        >
          {isCreating ? '✕ Cancelar Nueva Etapa' : '+ Nueva Etapa / Consulta'}
        </Button>
      </div>

      {feedback && (
        <div
          style={{
            padding: 'var(--spacing-3)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-success-surface, #e8f5e9)',
            color: 'var(--color-success-text, #2e7d32)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
          }}
        >
          {feedback}
        </div>
      )}

      {/* Formulario de creación de nueva etapa */}
      {isCreating && (
        <Card
          title="Crear Nueva Etapa de Consulta o Información"
          subtitle="Configurá la pregunta y opciones. Se guardará por defecto en borrador para que puedas revisarla antes de activarla."
        >
          <form onSubmit={handleCreateStage} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            {createError && (
              <div
                style={{
                  padding: 'var(--spacing-3)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-error-surface, #ffebee)',
                  color: 'var(--color-error-text, #c62828)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                }}
              >
                {createError}
              </div>
            )}

            <Input
              label="Título o pregunta principal de la etapa"
              placeholder="Ej: Necesitamos confirmar una fecha para el evento"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              required
            />

            <Input
              label="Descripción o contexto adicional (opcional)"
              placeholder="Ej: Indiquen las fechas en las que su familia tiene disponibilidad"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
            />

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, marginBottom: 'var(--spacing-1)' }}>
                Tipo de consulta
              </label>
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: 'var(--font-size-sm)',
                  backgroundColor: 'var(--color-surface)',
                }}
              >
                <option value="single_choice">Opción única (Votar una sola alternativa)</option>
                <option value="multiple_choice">Opción múltiple (Permitir varias opciones)</option>
                <option value="yes_no">Sí / No</option>
                <option value="integer_quantity">Cantidad numérica (Ej: cuántas personas asisten)</option>
                <option value="open_text">Texto libre / Sugerencias</option>
                <option value="info">Solo Informativa (Lectura con confirmación)</option>
              </select>
            </div>

            {(createType === 'single_choice' || createType === 'multiple_choice') && (
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
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700 }}>
                  Opciones de respuesta disponibles:
                </span>
                {createOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
                    <Input
                      label=""
                      placeholder={`Opción ${idx + 1}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                    />
                    {createOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-error-text, #c62828)',
                          cursor: 'pointer',
                          padding: '0.4rem',
                          fontSize: 'var(--font-size-sm)',
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 'var(--spacing-1)' }}>
                  <Button type="button" variant="outline" onClick={handleAddOption} style={{ fontSize: 'var(--font-size-xs)', minHeight: '30px' }}>
                    + Agregar otra opción
                  </Button>
                </div>
              </div>
            )}

            <Input
              label="Fecha y hora de cierre automático (opcional)"
              type="datetime-local"
              value={createDeadline}
              onChange={(e) => setCreateDeadline(e.target.value)}
            />

            {/* Checkbox para activar inmediatamente o dejar en borrador */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer', marginTop: 'var(--spacing-1)' }}>
              <input
                type="checkbox"
                checked={createPublishImmediately}
                onChange={(e) => setCreatePublishImmediately(e.target.checked)}
              />
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                Hacer visible y abierta para las familias inmediatamente
              </span>
            </label>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
              {createPublishImmediately
                ? '⚠️ Las familias podrán verla y votar en cuanto la guardes.'
                : '🔒 Se guardará como borrador oculto. Podrás revisarla, editarla y activarla con un clic.'}
            </span>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>

              <Button type="submit" variant="primary" isLoading={createLoading}>
                {createPublishImmediately ? 'Guardar y Publicar Etapa' : 'Guardar Etapa en Borrador'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de etapas existentes ordenadas */}
      {stages.map((stage, index) => {
        const isEditingThisAction = activeActionStageId === stage.id;
        const isEditingForm = editingStageId === stage.id;
        const isVisible = stage.visibility === 'visible';
        const isOpen = stage.status === 'open';

        return (
          <Card
            key={stage.id}
            title={stage.title}
            subtitle={
              stage.deadlineAt ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '2px' }}>
                  <span>📅 Cierre: {new Date(stage.deadlineAt).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <StageCountdown deadlineAt={stage.deadlineAt} isClosed={stage.status === 'closed'} variant="compact" />
                </div>
              ) : (
                'Sin fecha límite fija (cierre manual)'
              )
            }
            action={
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                {!isVisible ? (
                  <>
                    <Badge variant="neutral">Borrador · Oculta</Badge>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning-text)', fontWeight: 600 }}>
                      Solo organizadores
                    </span>
                  </>
                ) : isOpen ? (
                  <>
                    <Badge variant="success">Publicada y activa</Badge>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success-text)', fontWeight: 600 }}>
                      Visible para familias
                    </span>
                  </>
                ) : (
                  <>
                    <Badge variant="neutral">Cerrada</Badge>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontWeight: 600 }}>
                      Consulta finalizada
                    </span>
                  </>
                )}
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              {stage.description && (
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: '0.2rem 0' }}>
                  {stage.description}
                </p>
              )}

              <div style={{ display: 'flex', gap: 'var(--spacing-3)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', flexWrap: 'wrap' }}>
                <span>Tipo: <strong>{stage.type}</strong></span>
                <span>Respuestas: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{stage.responseCount}</strong></span>
                {stage.type === 'info' && <span>Lecturas: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{stage.readCount}</strong></span>}
                {stage.isSemanticallyLocked && (
                  <span style={{ color: 'var(--color-warning-text)', fontWeight: 600 }}>
                    Preguntas protegidas (ya tiene votos)
                  </span>
                )}
              </div>

              {stage.clarifications && stage.clarifications.length > 0 && (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning-text)' }}>
                  {stage.clarifications.length} aclaración{stage.clarifications.length > 1 ? 'es' : ''} añadida{stage.clarifications.length > 1 ? 's' : ''}
                </div>
              )}

              {/* Botones de acción administrativa */}
              <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap', marginTop: 'var(--spacing-2)' }}>
                {/* 1. Botón de Ver Avance en Vivo */}
                <Button
                  variant={expandedStageId === stage.id ? 'secondary' : 'primary'}
                  onClick={() => handleToggleOverview(stage.id)}
                  style={{
                    minHeight: 'var(--touch-target-min)',
                    padding: '0.35rem 0.75rem',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 700,
                  }}
                >
                  {expandedStageId === stage.id ? 'Ocultar avance' : 'Ver avance'}
                </Button>

                {/* 2. Activar / Desactivar Etapa para Familias */}
                {!isVisible ? (
                  <Button
                    variant="primary"
                    onClick={() => handleToggleVisibility(stage.id, 'hidden')}
                    disabled={loading}
                    style={{
                      minHeight: 'var(--touch-target-min)',
                      padding: '0.35rem 0.75rem',
                      fontSize: 'var(--font-size-xs)',
                    }}
                  >
                    Activar para familias
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => handleToggleVisibility(stage.id, 'visible')}
                    disabled={loading}
                    style={{
                      minHeight: 'var(--touch-target-min)',
                      padding: '0.35rem 0.75rem',
                      fontSize: 'var(--font-size-xs)',
                    }}
                  >
                    Ocultar a familias
                  </Button>
                )}

                {/* 3. Botón de Editar */}
                <Button
                  variant="outline"
                  onClick={() => (isEditingForm ? setEditingStageId(null) : startEditing(stage))}
                  style={{
                    minHeight: 'var(--touch-target-min)',
                    padding: '0.35rem 0.75rem',
                    fontSize: 'var(--font-size-xs)',
                  }}
                >
                  {isEditingForm ? 'Cancelar edición' : 'Editar consulta'}
                </Button>

                {/* 4. Subir / Bajar Orden */}
                <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                  <Button
                    variant="outline"
                    onClick={() => handleMoveStage(stage.id, 'up')}
                    disabled={index === 0 || loading}
                    style={{
                      minHeight: 'var(--touch-target-min)',
                      minWidth: '40px',
                      padding: '0.35rem 0.5rem',
                      fontSize: 'var(--font-size-sm)',
                    }}
                    title="Subir orden"
                    aria-label="Subir orden"
                  >
                    ↑
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleMoveStage(stage.id, 'down')}
                    disabled={index === stages.length - 1 || loading}
                    style={{
                      minHeight: 'var(--touch-target-min)',
                      minWidth: '40px',
                      padding: '0.35rem 0.5rem',
                      fontSize: 'var(--font-size-sm)',
                    }}
                    title="Bajar orden"
                    aria-label="Bajar orden"
                  >
                    ↓
                  </Button>
                </div>

                {/* 5. Cerrar / Reabrir */}
                {isOpen ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveActionStageId(stage.id);
                      setActionType('close');
                      setEditingStageId(null);
                    }}
                    style={{
                      minHeight: 'var(--touch-target-min)',
                      padding: '0.35rem 0.75rem',
                      fontSize: 'var(--font-size-xs)',
                    }}
                  >
                    Cerrar consulta
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveActionStageId(stage.id);
                      setActionType('reopen');
                      setEditingStageId(null);
                    }}
                    style={{
                      minHeight: 'var(--touch-target-min)',
                      padding: '0.35rem 0.75rem',
                      fontSize: 'var(--font-size-xs)',
                    }}
                  >
                    Reabrir consulta
                  </Button>
                )}

                {/* 6. Aclaración */}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setActiveActionStageId(stage.id);
                    setActionType('clarify');
                    setEditingStageId(null);
                  }}
                  style={{
                    minHeight: 'var(--touch-target-min)',
                    padding: '0.35rem 0.75rem',
                    fontSize: 'var(--font-size-xs)',
                  }}
                >
                  Agregar aclaración
                </Button>

                {/* 7. Publicar / Ocultar Resultados Consolidados */}
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveActionStageId(stage.id);
                    setActionType('publish');
                    setEditingStageId(null);
                  }}
                  style={{
                    minHeight: 'var(--touch-target-min)',
                    padding: '0.35rem 0.75rem',
                    fontSize: 'var(--font-size-xs)',
                  }}
                >
                  Publicar resultados
                </Button>
              </div>

              {/* Formulario de EDICIÓN de etapa */}
              {isEditingForm && (
                <div
                  style={{
                    marginTop: 'var(--spacing-3)',
                    padding: 'var(--spacing-4)',
                    backgroundColor: 'var(--color-surface)',
                    border: '2px solid var(--color-primary)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-3)',
                  }}
                >
                  <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' }}>
                    ✏️ Editando: {stage.title}
                  </strong>

                  {editError && (
                    <div
                      style={{
                        padding: 'var(--spacing-2) var(--spacing-3)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-error-surface, #ffebee)',
                        color: 'var(--color-error-text, #c62828)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 600,
                      }}
                    >
                      {editError}
                    </div>
                  )}

                  <Input
                    label="Título de la consulta"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />

                  <Input
                    label="Descripción o contexto"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />

                  <Input
                    label="Fecha y hora de cierre (dejar vacío para cierre manual)"
                    type="datetime-local"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                  />

                  {/* Opciones de respuesta si corresponde */}
                  {(stage.type === 'single_choice' || stage.type === 'multiple_choice') && (
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
                      <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700 }}>
                        Opciones de respuesta:
                      </span>

                      {stage.isSemanticallyLocked ? (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning-text)', fontWeight: 600 }}>
                          🔒 Ya se registraron votos de familias en esta consulta. Por seguridad de los resultados, las opciones no se pueden modificar.
                        </div>
                      ) : (
                        <>
                          {editOptions.map((opt, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
                              <Input
                                label=""
                                placeholder={`Opción ${idx + 1}`}
                                value={opt}
                                onChange={(e) => handleEditOptionChange(idx, e.target.value)}
                              />
                              {editOptions.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleEditRemoveOption(idx)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-error-text, #c62828)',
                                    cursor: 'pointer',
                                    padding: '0.4rem',
                                    fontSize: 'var(--font-size-sm)',
                                  }}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}

                          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleEditAddOption}
                              style={{ fontSize: 'var(--font-size-xs)', minHeight: '30px' }}
                            >
                              + Agregar opción
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
                    <Button type="button" variant="outline" onClick={() => setEditingStageId(null)}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => handleSaveEdit(stage.id)}
                      isLoading={editLoading}
                    >
                      Guardar Cambios
                    </Button>
                  </div>
                </div>
              )}

              {/* Panel Visual de Avance y Votación en Vivo */}
              {expandedStageId === stage.id && (
                <div
                  style={{
                    marginTop: 'var(--spacing-3)',
                    padding: 'var(--spacing-4)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-3)',
                  }}
                >
                  {overviewLoading && !stageOverviewData[stage.id] ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-subtle)', padding: 'var(--spacing-3)', fontSize: 'var(--font-size-sm)' }}>
                      ⏳ Cargando datos en vivo de participación y votación...
                    </div>
                  ) : stageOverviewData[stage.id] ? (
                    (() => {
                      const overview = stageOverviewData[stage.id];
                      const currentTab = activeTab[stage.id] || 'breakdown';

                      return (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
                            <div>
                              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                                Participación General
                              </span>
                              <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, color: 'var(--color-primary)', margin: '0.1rem 0' }}>
                                {overview.totalResponded} de {overview.totalEligible} familias respondieron ({overview.responseRatePercentage}%)
                              </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                              <Badge variant={overview.isPublished ? 'success' : 'neutral'}>
                                {overview.isPublished ? '📢 Resultados visibles para familias' : '🔒 Resultados privados (solo comité)'}
                              </Badge>
                              <Button
                                variant="outline"
                                onClick={() => loadStageOverview(stage.id, true)}
                                disabled={overviewLoading}
                                style={{ fontSize: 'var(--font-size-xs)', padding: '0.2rem 0.6rem', minHeight: '28px' }}
                              >
                                🔄 Actualizar
                              </Button>
                            </div>
                          </div>

                          <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--color-border)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${overview.responseRatePercentage}%`,
                                height: '100%',
                                backgroundColor: 'var(--color-primary)',
                                transition: 'width 0.4s ease',
                              }}
                            />
                          </div>

                          {/* Selector de pestañas */}
                          <div style={{ display: 'flex', gap: 'var(--spacing-2)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-2)', marginTop: 'var(--spacing-1)', flexWrap: 'wrap' }}>
                            <Button
                              variant={currentTab === 'breakdown' ? 'primary' : 'outline'}
                              onClick={() => setActiveTab((prev) => ({ ...prev, [stage.id]: 'breakdown' }))}
                              style={{ fontSize: 'var(--font-size-xs)', padding: '0.25rem 0.6rem', minHeight: '30px' }}
                            >
                              📊 Conteo de Opciones
                            </Button>
                            <Button
                              variant={currentTab === 'responses' ? 'primary' : 'outline'}
                              onClick={() => setActiveTab((prev) => ({ ...prev, [stage.id]: 'responses' }))}
                              style={{ fontSize: 'var(--font-size-xs)', padding: '0.25rem 0.6rem', minHeight: '30px' }}
                            >
                              👥 Familias que votaron ({overview.familyResponsesList?.length || 0})
                            </Button>
                            <Button
                              variant={currentTab === 'pending' ? 'primary' : 'outline'}
                              onClick={() => setActiveTab((prev) => ({ ...prev, [stage.id]: 'pending' }))}
                              style={{ fontSize: 'var(--font-size-xs)', padding: '0.25rem 0.6rem', minHeight: '30px' }}
                            >
                              ⏳ Familias pendientes ({overview.pendingFamilies?.length || 0})
                            </Button>
                          </div>

                          {/* Pestaña 1: Conteo de opciones */}
                          {currentTab === 'breakdown' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                              {overview.totalResponded === 0 ? (
                                <div style={{ padding: 'var(--spacing-3)', textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: 'var(--font-size-sm)' }}>
                                  Aún no se han recibido votos para esta consulta.
                                </div>
                              ) : (
                                overview.breakdown?.map((item: any) => (
                                  <div
                                    key={item.optionId}
                                    style={{
                                      backgroundColor: 'var(--color-surface)',
                                      padding: 'var(--spacing-3)',
                                      borderRadius: 'var(--radius-md)',
                                      border: '1px solid var(--color-border)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 'var(--spacing-2)',
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{item.label}</span>
                                      <span style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' }}>
                                        {item.count} voto{item.count === 1 ? '' : 's'} ({item.percentage}%)
                                      </span>
                                    </div>

                                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-border)', borderRadius: '999px', overflow: 'hidden' }}>
                                      <div
                                        style={{
                                          width: `${item.percentage}%`,
                                          height: '100%',
                                          backgroundColor: item.count > 0 ? 'var(--color-primary)' : 'transparent',
                                          transition: 'width 0.4s ease',
                                        }}
                                      />
                                    </div>

                                    {item.familyNames && item.familyNames.length > 0 && (
                                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>Votaron:</span>
                                        {item.familyNames.map((fn: string, i: number) => (
                                          <span
                                            key={i}
                                            style={{
                                              fontSize: 'var(--font-size-xs)',
                                              backgroundColor: 'var(--color-surface-subtle)',
                                              border: '1px solid var(--color-border)',
                                              borderRadius: 'var(--radius-sm)',
                                              padding: '0.1rem 0.4rem',
                                            }}
                                          >
                                            Familia {fn}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {/* Pestaña 2: Respuestas detalladas */}
                          {currentTab === 'responses' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                              {overview.familyResponsesList?.length === 0 ? (
                                <div style={{ padding: 'var(--spacing-3)', textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: 'var(--font-size-sm)' }}>
                                  Ninguna familia ha respondido todavía.
                                </div>
                              ) : (
                                overview.familyResponsesList?.map((resp: any) => (
                                  <div
                                    key={resp.participantId}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: 'var(--spacing-2) var(--spacing-3)',
                                      backgroundColor: 'var(--color-surface)',
                                      border: '1px solid var(--color-border)',
                                      borderRadius: 'var(--radius-md)',
                                      flexWrap: 'wrap',
                                      gap: 'var(--spacing-2)',
                                    }}
                                  >
                                    <div>
                                      <strong style={{ fontSize: 'var(--font-size-sm)' }}>Familia {resp.familyName}</strong>
                                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', display: 'block' }}>
                                        {new Date(resp.submittedAt).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })} · Versión {resp.version}
                                      </span>
                                    </div>
                                    <Badge variant="info">{resp.answersText}</Badge>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {/* Pestaña 3: Familias pendientes */}
                          {currentTab === 'pending' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                              {overview.pendingFamilies?.length === 0 ? (
                                <div style={{ padding: 'var(--spacing-3)', textAlign: 'center', color: 'var(--color-success-text)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                  🎉 ¡Todas las familias convocadas han respondido esta consulta!
                                </div>
                              ) : (
                                overview.pendingFamilies?.map((fam: any) => (
                                  <div
                                    key={fam.id}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: 'var(--spacing-2) var(--spacing-3)',
                                      backgroundColor: 'var(--color-surface)',
                                      border: '1px solid var(--color-border)',
                                      borderRadius: 'var(--radius-md)',
                                      flexWrap: 'wrap',
                                      gap: 'var(--spacing-2)',
                                    }}
                                  >
                                    <div>
                                      <strong style={{ fontSize: 'var(--font-size-sm)' }}>Familia {fam.familyName}</strong>
                                      {fam.contactPhone && (
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', display: 'block' }}>
                                          📱 {fam.contactPhone}
                                        </span>
                                      )}
                                    </div>
                                    <Badge variant="neutral">Pendiente</Badge>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()
                  ) : null}
                </div>
              )}

              {/* Formulario desplegable para acciones específicas (cerrar, reabrir, aclarar, publicar) */}
              {isEditingThisAction && actionType && (
                <div
                  style={{
                    marginTop: 'var(--spacing-3)',
                    padding: 'var(--spacing-3)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-2)',
                  }}
                >
                  <strong style={{ fontSize: 'var(--font-size-xs)' }}>
                    {actionType === 'close' && 'Cierre manual de la consulta'}
                    {actionType === 'reopen' && 'Reapertura de la consulta'}
                    {actionType === 'clarify' && 'Agregar aclaración oficial'}
                    {actionType === 'publish' && 'Publicar resultados consolidados para las familias'}
                    {actionType === 'unpublish' && 'Ocultar publicación de resultados'}
                  </strong>

                  {actionType === 'close' && (
                    <Input
                      label="Motivo del cierre (opcional)"
                      placeholder="Ej: Plazo cumplido o decisión adoptada"
                      value={reasonOrContent}
                      onChange={(e) => setReasonOrContent(e.target.value)}
                    />
                  )}

                  {actionType === 'reopen' && (
                    <>
                      <Input
                        label="Motivo de reapertura (obligatorio)"
                        placeholder="Ej: Corrección de opciones o extensión del plazo"
                        value={reasonOrContent}
                        onChange={(e) => setReasonOrContent(e.target.value)}
                        required
                      />
                      <Input
                        label="Nueva fecha límite (opcional)"
                        type="datetime-local"
                        value={newDeadline}
                        onChange={(e) => setNewDeadline(e.target.value)}
                      />
                    </>
                  )}

                  {actionType === 'clarify' && (
                    <Input
                      label="Texto de la aclaración"
                      placeholder="Ej: Aclaramos que la opción A incluye postre"
                      value={reasonOrContent}
                      onChange={(e) => setReasonOrContent(e.target.value)}
                      required
                    />
                  )}

                  {actionType === 'publish' && (
                    <Input
                      label="Mensaje o nota para las familias (opcional)"
                      placeholder="Ej: Compartimos los resultados finales de la votación"
                      value={reasonOrContent}
                      onChange={(e) => setReasonOrContent(e.target.value)}
                    />
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)' }}>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setActiveActionStageId(null);
                        setActionType(null);
                        setReasonOrContent('');
                        setNewDeadline('');
                      }}
                      style={{ minHeight: '32px', fontSize: 'var(--font-size-xs)' }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => handleExecuteAction(stage.id)}
                      isLoading={loading}
                      style={{ minHeight: '32px', fontSize: 'var(--font-size-xs)' }}
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

      {/* Indicador de etapa de cuota / aporte */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--spacing-2)',
          padding: 'var(--spacing-3) var(--spacing-4)',
          backgroundColor: 'var(--color-surface)',
          border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-md)',
          marginTop: 'var(--spacing-2)',
        }}
      >
        <div>
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
            💳 Etapa de Cuota o Aporte Económico
          </span>
          <p style={{ margin: '2px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Podés publicar u ocultar el aporte financiero a las familias y ajustar el monto cuando lo entiendas pertinente.
          </p>
        </div>

        <a
          href="#seccion-pagos"
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 700,
            color: 'var(--color-primary)',
            textDecoration: 'none',
            padding: '0.35rem 0.75rem',
            backgroundColor: 'var(--color-primary-light, rgba(59, 130, 246, 0.1))',
            borderRadius: 'var(--radius-md)',
          }}
        >
          Gestionar Etapa de Cuota ↓
        </a>
      </div>
    </div>
  );
};

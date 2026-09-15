'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { buildWhatsAppMessage } from '@/modules/communication/formatter';
import { WhatsAppTemplateType } from '@/modules/communication/types';

export interface ParticipantItem {
  id: string;
  familyId: string;
  familyName: string;
  contactPhone?: string;
  contactEmail?: string;
  classCode?: string;
  customFields?: Record<string, string>;
  secret?: string;
}

interface Props {
  eventName: string;
  eventId?: string;
  participants: ParticipantItem[];
  onParticipantDeleted?: (participantId: string) => void;
  onParticipantUpdated?: (participant: ParticipantItem) => void;
}

export const WhatsAppAdminSection: React.FC<Props> = ({
  eventName,
  eventId,
  participants,
  onParticipantDeleted,
  onParticipantUpdated,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateType>('INVITATION');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Estados para regeneración de enlace
  const [regeneratingFamily, setRegeneratingFamily] = useState<ParticipantItem | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenFeedback, setRegenFeedback] = useState<string | null>(null);

  // Estados para eliminación de familia
  const [deletingFamily, setDeletingFamily] = useState<ParticipantItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Obtener lista única de clases si existen
  const classCodes = useMemo(() => {
    return Array.from(
      new Set(participants.map((p) => p.classCode).filter(Boolean))
    ) as string[];
  }, [participants]);

  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      // 1. Filtro por clase/grado
      if (selectedClassFilter !== 'ALL' && p.classCode !== selectedClassFilter) {
        return false;
      }

      // 2. Filtro por texto de búsqueda
      if (searchQuery.trim()) {
        const query = normalizeText(searchQuery);
        const nameMatch = normalizeText(p.familyName).includes(query);
        const phoneMatch = p.contactPhone ? normalizeText(p.contactPhone).includes(query) : false;
        const emailMatch = p.contactEmail ? normalizeText(p.contactEmail).includes(query) : false;
        const classMatch = p.classCode ? normalizeText(p.classCode).includes(query) : false;

        const customMatch = p.customFields
          ? Object.values(p.customFields).some((v) => normalizeText(String(v)).includes(query))
          : false;

        return nameMatch || phoneMatch || emailMatch || classMatch || customMatch;
      }

      return true;
    });
  }, [participants, selectedClassFilter, searchQuery]);

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

  const handleConfirmRegenerateLink = async () => {
    if (!regeneratingFamily || !eventId) return;
    setRegenLoading(true);
    try {
      const res = await fetch(
        `/api/admin/events/${encodeURIComponent(eventId)}/participants/${encodeURIComponent(regeneratingFamily.id)}/regenerate-link`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Regeneración solicitada desde panel de familias' }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al regenerar el enlace.');

      const updated: ParticipantItem = {
        ...regeneratingFamily,
        secret: data.rawSecret,
      };

      if (onParticipantUpdated) {
        onParticipantUpdated(updated);
      }

      setRegenFeedback(`✓ Nuevo enlace generado con éxito para ${regeneratingFamily.familyName}. El enlace anterior fue revocado.`);
      setTimeout(() => setRegenFeedback(null), 5000);
      setRegeneratingFamily(null);
    } catch (err: any) {
      alert(err.message || 'Error al regenerar el enlace.');
    } finally {
      setRegenLoading(false);
    }
  };

  const handleConfirmDeleteFamily = async () => {
    if (!deletingFamily || !eventId) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(
        `/api/admin/events/${encodeURIComponent(eventId)}/participants/${encodeURIComponent(deletingFamily.id)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar la familia.');

      if (onParticipantDeleted) {
        onParticipantDeleted(deletingFamily.id);
      }

      setDeleteFeedback(`✓ Familia "${deletingFamily.familyName}" eliminada correctamente del evento.`);
      setTimeout(() => setDeleteFeedback(null), 5000);
      setDeletingFamily(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Error al eliminar la familia.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-primary)' }}>
            Asistente de mensajes para WhatsApp
          </h3>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', margin: 'var(--spacing-1) 0 0 0' }}>
            Textos personalizados listos para copiar o abrir en WhatsApp con el enlace personal de cada familia.
          </p>
        </div>
      </div>

      {/* Alertas de feedback */}
      {regenFeedback && (
        <div
          role="status"
          style={{
            padding: 'var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            color: 'var(--color-success-text)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
          }}
        >
          {regenFeedback}
        </div>
      )}

      {deleteFeedback && (
        <div
          role="status"
          style={{
            padding: 'var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            color: 'var(--color-success-text)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
          }}
        >
          {deleteFeedback}
        </div>
      )}

      {/* Aviso de control manual */}
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
        <strong>Control manual del comité:</strong> Esta herramienta prepara los textos para que los envíes directamente desde tu aplicación de WhatsApp. No realiza envíos automáticos ni altera el estado de las familias al preparar o copiar mensajes.
      </div>

      {/* Selector de plantilla estilo Segmented Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
        <div
          style={{
            display: 'inline-flex',
            gap: 'var(--spacing-1)',
            padding: '4px',
            backgroundColor: 'var(--color-surface-subtle)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            alignSelf: 'flex-start',
            maxWidth: '100%',
          }}
        >
          {[
            { key: 'INVITATION' as const, label: 'Invitación y enlace personal' },
            { key: 'STAGE_REMINDER' as const, label: 'Consulta abierta' },
            { key: 'PAYMENT_REMINDER' as const, label: 'Aporte o cuota' },
          ].map((tpl) => {
            const isSelected = selectedTemplate === tpl.key;
            return (
              <button
                key={tpl.key}
                type="button"
                onClick={() => setSelectedTemplate(tpl.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                  backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                  color: isSelected ? '#ffffff' : 'var(--color-text-main)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 2px 6px rgba(23, 63, 53, 0.2)' : 'none',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {tpl.label}
              </button>
            );
          })}
        </div>

        {/* Buscador de familias / alumnos y filtro de clase */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-3)',
            backgroundColor: 'var(--color-surface)',
            padding: 'var(--spacing-4)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Campo de búsqueda interactivo */}
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-subtle)',
                  fontSize: '14px',
                  pointerEvents: 'none',
                }}
              >
                🔍
              </span>
              <input
                type="text"
                placeholder="Buscar por nombre de alumno, familia, teléfono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 32px 8px 36px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-main)',
                  fontSize: 'var(--font-size-sm)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-subtle)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '2px 4px',
                  }}
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-subtle)',
                whiteSpace: 'nowrap',
                fontWeight: 600,
              }}
            >
              {filteredParticipants.length} de {participants.length}
            </span>
          </div>

          {/* Filtro por Clase / Grado con diseño pill contrastante */}
          {classCodes.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
                flexWrap: 'wrap',
                paddingTop: 'var(--spacing-2)',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-primary)' }}>
                🏫 Clase:
              </span>
              <button
                type="button"
                onClick={() => setSelectedClassFilter('ALL')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: selectedClassFilter === 'ALL' ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                  backgroundColor: selectedClassFilter === 'ALL' ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: selectedClassFilter === 'ALL' ? '#ffffff' : 'var(--color-text-main)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: selectedClassFilter === 'ALL' ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: selectedClassFilter === 'ALL' ? '0 2px 6px rgba(23, 63, 53, 0.25)' : 'none',
                  transition: 'all var(--transition-fast)',
                }}
              >
                Todas ({participants.length})
              </button>
              {classCodes.map((code) => {
                const count = participants.filter((p) => p.classCode === code).length;
                const isSelected = selectedClassFilter === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedClassFilter(code)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-full)',
                      border: isSelected ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                      backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: isSelected ? '#ffffff' : 'var(--color-text-main)',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 2px 6px rgba(23, 63, 53, 0.25)' : 'none',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    Clase {code} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lista de familias con mensajes preparados */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {filteredParticipants.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--spacing-5)',
                color: 'var(--color-text-subtle)',
                fontSize: 'var(--font-size-sm)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
              }}
            >
              <span>🔎 No se encontraron familias que coincidan con "<strong>{searchQuery}</strong>"</span>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedClassFilter('ALL');
                }}
                style={{ fontSize: 'var(--font-size-xs)', minHeight: '36px' }}
              >
                Restablecer filtros y búsqueda
              </Button>
            </div>
          )}

          {filteredParticipants.map((p) => {
            const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
            const accessUrl = p.secret ? `${appUrl}/f#secret=${p.secret}` : `${appUrl}/f`;
            const msg = buildWhatsAppMessage(selectedTemplate, {
              recipientName: p.familyName,
              recipientPhone: p.contactPhone,
              eventName,
              accessUrl,
              stageTitle: 'Consulta abierta',
              deadlineText: 'Fecha límite indicada',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--color-text-main)' }}>
                      {p.familyName}
                    </span>
                    {p.classCode && (
                      <span
                        style={{
                          backgroundColor: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontWeight: 700,
                          fontSize: '11px',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        Clase {p.classCode}
                      </span>
                    )}
                    {p.contactPhone && (
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
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
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    fontFamily: 'monospace',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {msg.text}
                </div>

                {/* Acciones de la familia: gestión del enlace a la izquierda, compartir a la derecha */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-2)',
                    marginTop: 'var(--spacing-1)',
                  }}
                >
                  {/* Controles de gestión administrativa */}
                  <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
                    <Button
                      variant="outline"
                      onClick={() => setRegeneratingFamily(p)}
                      style={{
                        minHeight: 'var(--touch-target-min)',
                        padding: '0.35rem 0.65rem',
                        fontSize: 'var(--font-size-xs)',
                      }}
                      title="Genera un enlace nuevo revocando el anterior"
                    >
                      🔄 Nuevo enlace
                    </Button>

                    <Button
                      variant="danger"
                      onClick={() => {
                        setDeletingFamily(p);
                        setDeleteError(null);
                      }}
                      style={{
                        minHeight: 'var(--touch-target-min)',
                        padding: '0.35rem 0.65rem',
                        fontSize: 'var(--font-size-xs)',
                      }}
                      title="Eliminar familia del evento"
                    >
                      🗑️ Eliminar
                    </Button>
                  </div>

                  {/* Controles de WhatsApp y copia */}
                  <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
                    <Button
                      variant="outline"
                      onClick={() => handleCopyLink(accessUrl, p.id)}
                      style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
                    >
                      {isLinkCopied ? '✓ Enlace copiado' : 'Copiar solo enlace'}
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => handleCopy(msg.text, p.id)}
                      style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
                    >
                      {isCopied ? '✓ Texto copiado' : 'Copiar texto'}
                    </Button>

                    <a
                      href={msg.waLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 'var(--touch-target-min)',
                        padding: '0.35rem 0.85rem',
                        backgroundColor: '#25D366',
                        color: '#ffffff',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Abrir en WhatsApp ↗
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Modal de confirmación para regenerar enlace personal */}
      {regeneratingFamily && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'var(--spacing-4)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '460px',
              width: '100%',
              padding: 'var(--spacing-5)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-3)',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-primary)' }}>
              ¿Regenerar enlace personal?
            </h3>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)' }}>
              Vas a generar un enlace nuevo para <strong>{regeneratingFamily.familyName}</strong>.
            </p>
            <div
              style={{
                padding: 'var(--spacing-3)',
                backgroundColor: 'var(--color-warning-bg)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-warning-text)',
                fontWeight: 600,
                lineHeight: 'var(--line-height-normal)',
              }}
            >
              🔒 <strong>Seguridad:</strong> El enlace anterior dejará de funcionar de inmediato. Si la familia tenía una sesión abierta con el enlace viejo, se solicitará que use el nuevo.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
              <Button
                variant="secondary"
                onClick={() => setRegeneratingFamily(null)}
                disabled={regenLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmRegenerateLink}
                isLoading={regenLoading}
              >
                Sí, generar nuevo enlace
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar familia */}
      {deletingFamily && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'var(--spacing-4)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '460px',
              width: '100%',
              padding: 'var(--spacing-5)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-3)',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-danger-text)' }}>
              ¿Eliminar familia invitada?
            </h3>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)' }}>
              ¿Estás seguro de que querés eliminar a <strong>"{deletingFamily.familyName}"</strong>?
            </p>

            <div
              style={{
                padding: 'var(--spacing-3)',
                backgroundColor: 'var(--color-danger-bg)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-danger-text)',
                lineHeight: 'var(--line-height-normal)',
              }}
            >
              Esta acción revocará su enlace de acceso de inmediato y la removerá de las listas y planillas del evento. Usalo si la cargaste por duplicado o con datos incorrectos.
            </div>

            {deleteError && (
              <div
                role="alert"
                style={{
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger-text)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setDeletingFamily(null);
                  setDeleteError(null);
                }}
                disabled={deleteLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDeleteFamily}
                isLoading={deleteLoading}
              >
                Sí, eliminar familia
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

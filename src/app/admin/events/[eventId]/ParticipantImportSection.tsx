'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';

interface ParticipantImportSectionProps {
  eventId: string;
  onImportComplete?: () => void;
}

interface ParsedFamily {
  familyName: string;
  contactPhone?: string;
  contactEmail?: string;
}

export function ParticipantImportSection({ eventId, onImportComplete }: ParticipantImportSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  
  // Estado para subida de archivo
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedList, setParsedList] = useState<ParsedFamily[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para alta manual individual
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  const normalizeHeader = (header: string): string => {
    return header
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    setIsProcessingFile(true);
    setFeedback(null);
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        throw new Error('El archivo parece estar vacío.');
      }

      // Detectar nombres de columnas
      const sampleRow = rawRows[0];
      const keys = Object.keys(sampleRow);

      let familyKey = keys.find((k) => {
        const norm = normalizeHeader(k);
        return norm.includes('familia') || norm.includes('alumno') || norm.includes('nombre') || norm.includes('estudiante');
      });

      let phoneKey = keys.find((k) => {
        const norm = normalizeHeader(k);
        return norm.includes('telefono') || norm.includes('celular') || norm.includes('whatsapp') || norm.includes('contacto') || norm.includes('movil');
      });

      let emailKey = keys.find((k) => {
        const norm = normalizeHeader(k);
        return norm.includes('email') || norm.includes('correo') || norm.includes('mail');
      });

      // Si no detecta automáticamente por nombre, usar la primera columna como nombre
      if (!familyKey && keys.length > 0) {
        familyKey = keys[0];
      }

      const families: ParsedFamily[] = [];

      for (const row of rawRows) {
        const nameVal = familyKey ? String(row[familyKey]).trim() : '';
        if (!nameVal) continue;

        const phoneVal = phoneKey ? String(row[phoneKey]).trim() : '';
        const emailVal = emailKey ? String(row[emailKey]).trim() : '';

        families.push({
          familyName: nameVal,
          contactPhone: phoneVal || undefined,
          contactEmail: emailVal || undefined,
        });
      }

      if (families.length === 0) {
        throw new Error('No se encontraron registros válidos de familias en el archivo.');
      }

      setParsedList(families);
      setFeedback({
        type: 'success',
        message: `✓ Se detectaron ${families.length} familias en "${file.name}". Revisá la vista previa y confirmá la importación.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al procesar el archivo Excel o CSV.',
      });
      setParsedList([]);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleConfirmImport = async () => {
    if (parsedList.length === 0) return;
    setImportLoading(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/participants/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: parsedList }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al importar las familias.');

      setFeedback({
        type: 'success',
        message: `🎉 ¡Éxito! Se importaron ${data.count} familias y se generaron sus enlaces únicos. Ya podés convocarlas y enviarles recordatorios por WhatsApp.`,
      });

      setParsedList([]);
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'No se pudieron guardar las familias.',
      });
    } finally {
      setImportLoading(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    setImportLoading(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/participants/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: [
            {
              familyName: manualName.trim(),
              contactPhone: manualPhone.trim() || undefined,
              contactEmail: manualEmail.trim() || undefined,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al agregar la familia.');

      setFeedback({
        type: 'success',
        message: `✓ Familia "${manualName.trim()}" agregada con éxito y enlace generado.`,
      });

      setManualName('');
      setManualPhone('');
      setManualEmail('');
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al agregar la familia.',
      });
    } finally {
      setImportLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { 'Familia / Alumno': 'García Morales', 'Teléfono / WhatsApp': '099123456', 'Correo Electrónico': 'garcia@ejemplo.com' },
      { 'Familia / Alumno': 'Rodríguez Silva', 'Teléfono / WhatsApp': '098654321', 'Correo Electrónico': 'rodriguez@ejemplo.com' },
      { 'Familia / Alumno': 'Pérez Bianchi', 'Teléfono / WhatsApp': '091223344', 'Correo Electrónico': '' },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participantes');
    XLSX.writeFile(wb, 'plantilla_familias_evento.xlsx');
  };

  return (
    <Card
      title="Convocatoria de Familias y Participantes"
      subtitle="Subí tu planilla Excel (.xlsx, .xls) o CSV con el listado de familias para generar automáticamente sus accesos únicos"
      action={
        <Button
          variant={isExpanded ? 'secondary' : 'primary'}
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ minHeight: '36px', fontSize: 'var(--font-size-xs)' }}
        >
          {isExpanded ? 'Ocultar panel' : '+ Convocar / Importar Familias'}
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-subtle)' }}>
          Cada familia importada recibe un identificador y enlace privado para participar y votar en cada etapa sin necesidad de recordar contraseñas.
        </p>

        {isExpanded && (
          <div
            style={{
              padding: 'var(--spacing-4)',
              backgroundColor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-3)',
            }}
          >
            {/* Pestañas de modo: Archivo vs Manual */}
            <div style={{ display: 'flex', gap: 'var(--spacing-2)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-2)' }}>
              <Button
                variant={activeTab === 'upload' ? 'primary' : 'outline'}
                onClick={() => setActiveTab('upload')}
                style={{ fontSize: 'var(--font-size-xs)', minHeight: '32px' }}
              >
                📁 Subir Archivo Excel o CSV
              </Button>
              <Button
                variant={activeTab === 'manual' ? 'primary' : 'outline'}
                onClick={() => setActiveTab('manual')}
                style={{ fontSize: 'var(--font-size-xs)', minHeight: '32px' }}
              >
                ✍️ Alta Manual Individual
              </Button>
            </div>

            {/* Mensajes de feedback */}
            {feedback && (
              <div
                style={{
                  padding: 'var(--spacing-3)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: feedback.type === 'success' ? 'var(--color-success-surface, #e8f5e9)' : 'var(--color-error-surface, #ffebee)',
                  color: feedback.type === 'success' ? 'var(--color-success-text, #2e7d32)' : 'var(--color-error-text, #c62828)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                }}
              >
                {feedback.message}
              </div>
            )}

            {activeTab === 'upload' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                {/* Zona de arrastrar y soltar / botón de archivo */}
                <div
                  style={{
                    border: '2px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-5)',
                    textAlign: 'center',
                    backgroundColor: 'var(--color-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    cursor: 'pointer',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={{ fontSize: '2rem' }}>📊</div>
                  <strong style={{ fontSize: 'var(--font-size-sm)' }}>
                    {fileName ? fileName : 'Arrastrá o seleccioná tu archivo Excel (.xlsx, .xls) o CSV'}
                  </strong>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                    Detecta automáticamente columnas con nombres como "Familia", "Alumno", "Teléfono" y "Email"
                  </span>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    disabled={isProcessingFile}
                    style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)' }}
                  >
                    {isProcessingFile ? 'Leyendo archivo...' : 'Seleccionar archivo desde mi equipo'}
                  </Button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      fontSize: 'var(--font-size-xs)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontWeight: 600,
                    }}
                  >
                    📥 Descargar plantilla Excel de ejemplo
                  </button>
                </div>

                {/* Vista previa de familias detectadas */}
                {parsedList.length > 0 && (
                  <div
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--spacing-3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--spacing-2)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 'var(--font-size-sm)' }}>
                        Vista previa ({parsedList.length} familias a importar)
                      </strong>
                      <Badge variant="info">Listo para guardar</Badge>
                    </div>

                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                      <table style={{ width: '100%', fontSize: 'var(--font-size-xs)', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--color-surface-subtle)', borderBottom: '1px solid var(--color-border)' }}>
                            <th style={{ padding: '0.4rem 0.6rem' }}>#</th>
                            <th style={{ padding: '0.4rem 0.6rem' }}>Familia / Alumno</th>
                            <th style={{ padding: '0.4rem 0.6rem' }}>Teléfono</th>
                            <th style={{ padding: '0.4rem 0.6rem' }}>Correo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedList.slice(0, 15).map((fam, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '0.35rem 0.6rem', color: 'var(--color-text-subtle)' }}>{idx + 1}</td>
                              <td style={{ padding: '0.35rem 0.6rem', fontWeight: 600 }}>{fam.familyName}</td>
                              <td style={{ padding: '0.35rem 0.6rem' }}>{fam.contactPhone || '—'}</td>
                              <td style={{ padding: '0.35rem 0.6rem' }}>{fam.contactEmail || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {parsedList.length > 15 && (
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                        ... y {parsedList.length - 15} familias más.
                      </span>
                    )}

                    <Button
                      variant="primary"
                      onClick={handleConfirmImport}
                      isLoading={importLoading}
                      style={{ marginTop: 'var(--spacing-2)' }}
                    >
                      Confirmar e importar {parsedList.length} familias
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'manual' && (
              <form onSubmit={handleManualAdd} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                <Input
                  label="Nombre de la familia o alumno"
                  placeholder="Ej: Familia Rodríguez Silva"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  required
                />
                <Input
                  label="Teléfono / Celular (opcional para recordatorios WhatsApp)"
                  placeholder="Ej: 099123456"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                />
                <Input
                  label="Correo electrónico (opcional)"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                />
                <Button type="submit" variant="primary" isLoading={importLoading}>
                  Guardar y generar enlace único
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

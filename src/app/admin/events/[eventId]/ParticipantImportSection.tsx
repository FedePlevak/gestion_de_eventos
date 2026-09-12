'use client';

import React, { useState, useRef, useMemo } from 'react';
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
  
  // Estado para archivo y mapeo flexible
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  
  // Columnas asignadas por el usuario
  const [selectedNameCol, setSelectedNameCol] = useState<string>('');
  const [selectedSurnameCol, setSelectedSurnameCol] = useState<string>('');
  const [selectedPhoneCol, setSelectedPhoneCol] = useState<string>('');
  const [selectedEmailCol, setSelectedEmailCol] = useState<string>('');

  // Personalización del nombre
  const [prefixOption, setPrefixOption] = useState<'none' | 'familia' | 'custom'>('none');
  const [customPrefix, setCustomPrefix] = useState<string>('');
  const [nameOrder, setNameOrder] = useState<'name_surname' | 'surname_name' | 'name_only' | 'surname_only'>('name_surname');

  // Control de vista previa y proceso
  const [showRawPreview, setShowRawPreview] = useState(false);
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
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rows.length === 0) {
        throw new Error('El archivo parece estar vacío o no contiene filas con datos.');
      }

      // Extraer todas las columnas encontradas
      const colSet = new Set<string>();
      rows.forEach((r) => {
        Object.keys(r).forEach((k) => {
          if (k && !k.startsWith('__EMPTY')) {
            colSet.add(k);
          }
        });
      });
      const cols = Array.from(colSet);

      if (cols.length === 0) {
        throw new Error('No se detectaron encabezados ni columnas legibles en el archivo.');
      }

      setRawRows(rows);
      setAvailableColumns(cols);

      // Auto-detección inteligente de columnas sugeridas
      const normCols = cols.map((c) => ({ original: c, norm: normalizeHeader(c) }));

      const foundName = normCols.find((c) =>
        c.norm.includes('nombre') ||
        c.norm.includes('alumno') ||
        c.norm.includes('familia') ||
        c.norm.includes('estudiante') ||
        c.norm.includes('participante') ||
        c.norm.includes('hijo') ||
        c.norm.includes('hija')
      );
      setSelectedNameCol(foundName ? foundName.original : cols[0]);

      const foundSurname = normCols.find(
        (c) => c.norm.includes('apellido') && c.original !== (foundName ? foundName.original : '')
      );
      setSelectedSurnameCol(foundSurname ? foundSurname.original : '');

      const foundPhone = normCols.find(
        (c) =>
          c.norm.includes('telefono') ||
          c.norm.includes('celular') ||
          c.norm.includes('whatsapp') ||
          c.norm.includes('movil') ||
          c.norm.includes('tel') ||
          c.norm.includes('contacto')
      );
      setSelectedPhoneCol(foundPhone ? foundPhone.original : '');

      const foundEmail = normCols.find(
        (c) => c.norm.includes('email') || c.norm.includes('correo') || c.norm.includes('mail')
      );
      setSelectedEmailCol(foundEmail ? foundEmail.original : '');

      setFeedback({
        type: 'success',
        message: `✓ Se cargó "${file.name}" con ${rows.length} filas y ${cols.length} columnas detectadas. Podés ajustar las columnas abajo para personalizar los datos.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al procesar el archivo Excel o CSV.',
      });
      setRawRows([]);
      setAvailableColumns([]);
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Recalcular lista parseada en tiempo real según el mapeo y personalización
  const parsedList = useMemo<ParsedFamily[]>(() => {
    if (!selectedNameCol || rawRows.length === 0) return [];

    const result: ParsedFamily[] = [];

    for (const row of rawRows) {
      const rawName = String(row[selectedNameCol] || '').trim();
      const rawSurname = selectedSurnameCol ? String(row[selectedSurnameCol] || '').trim() : '';

      if (!rawName && !rawSurname) continue;

      let combinedName = '';
      if (selectedSurnameCol && rawSurname) {
        if (nameOrder === 'name_surname') {
          combinedName = rawName ? `${rawName} ${rawSurname}` : rawSurname;
        } else if (nameOrder === 'surname_name') {
          combinedName = rawName ? `${rawSurname}, ${rawName}` : rawSurname;
        } else if (nameOrder === 'surname_only') {
          combinedName = rawSurname;
        } else {
          combinedName = rawName || rawSurname;
        }
      } else {
        combinedName = rawName;
      }

      // Aplicar personalización de prefijo
      let finalName = combinedName;
      if (prefixOption === 'familia') {
        if (!finalName.toLowerCase().startsWith('familia')) {
          finalName = `Familia ${finalName}`;
        }
      } else if (prefixOption === 'custom' && customPrefix.trim()) {
        finalName = `${customPrefix.trim()} ${finalName}`;
      }

      const phoneVal = selectedPhoneCol ? String(row[selectedPhoneCol] || '').trim() : '';
      const emailVal = selectedEmailCol ? String(row[selectedEmailCol] || '').trim() : '';

      result.push({
        familyName: finalName,
        contactPhone: phoneVal || undefined,
        contactEmail: emailVal || undefined,
      });
    }

    return result;
  }, [
    rawRows,
    selectedNameCol,
    selectedSurnameCol,
    selectedPhoneCol,
    selectedEmailCol,
    prefixOption,
    customPrefix,
    nameOrder,
  ]);

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

      setRawRows([]);
      setAvailableColumns([]);
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
      { 'Nombre': 'Benicio', 'Apellido': 'García', 'Teléfono / WhatsApp': '099123456', 'Correo Electrónico': 'garcia@ejemplo.com' },
      { 'Nombre': 'Franco Vincenzo', 'Apellido': 'Rodríguez', 'Teléfono / WhatsApp': '098654321', 'Correo Electrónico': 'rodriguez@ejemplo.com' },
      { 'Nombre': 'Manuel', 'Apellido': 'Pérez', 'Teléfono / WhatsApp': '091223344', 'Correo Electrónico': '' },
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
                {/* Zona de carga de archivo */}
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
                    {fileName ? fileName : 'Arrastrá o seleccioná tu archivo Excel (.xlsx, .xls) o CSV (.csv)'}
                  </strong>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                    Detecta automáticamente todas las columnas y filas de tu archivo para que elijas qué datos usar.
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

                {/* Panel de Configuración y Mapeo Flexible de Columnas */}
                {availableColumns.length > 0 && (
                  <div
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--spacing-4)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--spacing-3)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
                      <div>
                        <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' }}>
                          ⚙️ Detección y Personalización de Columnas
                        </strong>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                          Se detectaron <strong>{rawRows.length} filas</strong> y <strong>{availableColumns.length} columnas</strong> en tu archivo. Elegí qué columna corresponde a cada dato:
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowRawPreview(!showRawPreview)}
                        style={{
                          background: 'none',
                          border: '1px solid var(--color-border)',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--font-size-xs)',
                          cursor: 'pointer',
                          color: 'var(--color-text-subtle)',
                        }}
                      >
                        {showRawPreview ? 'Ocultar datos originales' : '🔍 Ver columnas originales del archivo'}
                      </button>
                    </div>

                    {/* Visualización de datos originales si se expande */}
                    {showRawPreview && (
                      <div
                        style={{
                          backgroundColor: 'var(--color-surface-subtle)',
                          padding: 'var(--spacing-3)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--font-size-xs)',
                          overflowX: 'auto',
                        }}
                      >
                        <strong style={{ display: 'block', marginBottom: '4px' }}>Columnas detectadas:</strong>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          {availableColumns.map((col, idx) => (
                            <span
                              key={idx}
                              style={{
                                backgroundColor: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontWeight: 600,
                              }}
                            >
                              {col}
                            </span>
                          ))}
                        </div>
                        <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                {availableColumns.map((col, i) => (
                                  <th key={i} style={{ padding: '2px 6px', textAlign: 'left' }}>{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rawRows.slice(0, 3).map((r, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                  {availableColumns.map((col, j) => (
                                    <td key={j} style={{ padding: '2px 6px' }}>{String(r[col] || '—')}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Grilla de selectores de mapeo */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 'var(--spacing-3)',
                        backgroundColor: 'var(--color-surface-subtle)',
                        padding: 'var(--spacing-3)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {/* 1. Columna de Nombre / Alumno */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-main)' }}>
                          👤 Columna de Nombre / Alumno:
                        </label>
                        <select
                          value={selectedNameCol}
                          onChange={(e) => setSelectedNameCol(e.target.value)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            fontSize: 'var(--font-size-xs)',
                            backgroundColor: 'var(--color-surface)',
                            fontWeight: 600,
                          }}
                        >
                          {availableColumns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Columna de Apellido (opcional) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-main)' }}>
                          🏷️ Columna de Apellido (opcional):
                        </label>
                        <select
                          value={selectedSurnameCol}
                          onChange={(e) => setSelectedSurnameCol(e.target.value)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            fontSize: 'var(--font-size-xs)',
                            backgroundColor: 'var(--color-surface)',
                          }}
                        >
                          <option value="">-- Ninguna (ya incluido o sin apellido) --</option>
                          {availableColumns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 3. Columna de Teléfono / Celular */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-main)' }}>
                          📱 Columna de Teléfono / WhatsApp:
                        </label>
                        <select
                          value={selectedPhoneCol}
                          onChange={(e) => setSelectedPhoneCol(e.target.value)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            fontSize: 'var(--font-size-xs)',
                            backgroundColor: 'var(--color-surface)',
                          }}
                        >
                          <option value="">-- Ninguna (sin teléfono) --</option>
                          {availableColumns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 4. Columna de Email */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-main)' }}>
                          ✉️ Columna de Correo Electrónico:
                        </label>
                        <select
                          value={selectedEmailCol}
                          onChange={(e) => setSelectedEmailCol(e.target.value)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            fontSize: 'var(--font-size-xs)',
                            backgroundColor: 'var(--color-surface)',
                          }}
                        >
                          <option value="">-- Ninguna (sin correo) --</option>
                          {availableColumns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Opciones de personalización del nombre */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 'var(--spacing-3)',
                        paddingTop: 'var(--spacing-2)',
                        borderTop: '1px dashed var(--color-border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Prefijo para el nombre:</span>
                        <select
                          value={prefixOption}
                          onChange={(e: any) => setPrefixOption(e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            fontSize: 'var(--font-size-xs)',
                            backgroundColor: 'var(--color-surface)',
                          }}
                        >
                          <option value="none">Tal cual en el archivo (sin prefijo)</option>
                          <option value="familia">Agregar "Familia " (ej: Familia Benicio)</option>
                          <option value="custom">Personalizado...</option>
                        </select>
                      </div>

                      {prefixOption === 'custom' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="text"
                            placeholder="Ej: Fam. / Alumno: "
                            value={customPrefix}
                            onChange={(e) => setCustomPrefix(e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--color-border)',
                              fontSize: 'var(--font-size-xs)',
                              width: '130px',
                            }}
                          />
                        </div>
                      )}

                      {selectedSurnameCol && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Combinación:</span>
                          <select
                            value={nameOrder}
                            onChange={(e: any) => setNameOrder(e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--color-border)',
                              fontSize: 'var(--font-size-xs)',
                              backgroundColor: 'var(--color-surface)',
                            }}
                          >
                            <option value="name_surname">Nombre Apellido (ej: Benicio Morales)</option>
                            <option value="surname_name">Apellido, Nombre (ej: Morales, Benicio)</option>
                            <option value="name_only">Solo Nombre</option>
                            <option value="surname_only">Solo Apellido</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Vista previa en tiempo real de familias detectadas con el mapeo aplicado */}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
                      <div>
                        <strong style={{ fontSize: 'var(--font-size-sm)' }}>
                          Vista previa ({parsedList.length} familias a importar)
                        </strong>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>
                          Verificá que los nombres, teléfonos y correos coincidan con lo que querés guardar.
                        </div>
                      </div>
                      <Badge variant="info">Listo para guardar</Badge>
                    </div>

                    <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                      <table style={{ width: '100%', fontSize: 'var(--font-size-xs)', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--color-surface-subtle)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0 }}>
                            <th style={{ padding: '0.4rem 0.6rem' }}>#</th>
                            <th style={{ padding: '0.4rem 0.6rem' }}>Nombre / Familia a Guardar</th>
                            <th style={{ padding: '0.4rem 0.6rem' }}>Teléfono / Celular</th>
                            <th style={{ padding: '0.4rem 0.6rem' }}>Correo Electrónico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedList.slice(0, 20).map((fam, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '0.35rem 0.6rem', color: 'var(--color-text-subtle)' }}>{idx + 1}</td>
                              <td style={{ padding: '0.35rem 0.6rem', fontWeight: 600 }}>{fam.familyName}</td>
                              <td style={{ padding: '0.35rem 0.6rem', color: fam.contactPhone ? 'inherit' : 'var(--color-text-subtle)' }}>
                                {fam.contactPhone || '—'}
                              </td>
                              <td style={{ padding: '0.35rem 0.6rem', color: fam.contactEmail ? 'inherit' : 'var(--color-text-subtle)' }}>
                                {fam.contactEmail || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {parsedList.length > 20 && (
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                        ... y {parsedList.length - 20} familias más.
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

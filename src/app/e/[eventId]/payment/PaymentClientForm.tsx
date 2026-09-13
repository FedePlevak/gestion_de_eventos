'use client';

import React, { useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { PaymentReport } from '@/modules/payments/types';

interface Props {
  eventId: string;
  initialPayment: PaymentReport;
  expectedAmountMinor: number;
  currency: string;
}

export const PaymentClientForm: React.FC<Props> = ({
  eventId,
  initialPayment,
  expectedAmountMinor,
  currency,
}) => {
  const [payment, setPayment] = useState<PaymentReport>(initialPayment);
  const [declaredAmount, setDeclaredAmount] = useState<string>(
    initialPayment.declaredAmountMinor
      ? String(initialPayment.declaredAmountMinor / 100)
      : String(expectedAmountMinor / 100)
  );
  const [transferDate, setTransferDate] = useState<string>(
    initialPayment.transferDate || new Date().toISOString().split('T')[0]
  );
  const [reference, setReference] = useState<string>(initialPayment.reference || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isVerified = payment.status === 'verified';
  const requiresRevision = payment.status === 'requires_revision';
  const isReported = payment.status === 'reported';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 3_000_000) {
        setErrorMessage('El archivo seleccionado supera los 3 MB permitidos. Por favor seleccioná un archivo más liviano.');
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      setErrorMessage(null);
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const amountMinor = Math.round(parseFloat(declaredAmount) * 100);
    if (isNaN(amountMinor) || amountMinor <= 0) {
      setErrorMessage('Ingresá un importe válido.');
      setLoading(false);
      return;
    }

    if (!transferDate) {
      setErrorMessage('Indicá la fecha en que realizaste la transferencia.');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('eventId', eventId);
      formData.append('declaredAmountMinor', String(amountMinor));
      formData.append('transferDate', transferDate);
      formData.append('reference', reference.trim());
      if (payment.version) {
        formData.append('expectedVersion', String(payment.version));
      }
      if (selectedFile) {
        formData.append('receipt', selectedFile);
      }

      const res = await fetch('/api/payments/report', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al informar el pago.');
      }

      setPayment(data.payment);
      setSelectedFile(null);
      setSuccessMessage('¡Informe de pago enviado con éxito! El comité revisará la acreditación.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al enviar el informe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="Informe de pago"
      subtitle="Completá los datos luego de realizar la transferencia bancaria"
      action={
        isVerified ? (
          <Badge variant="success">Pago recibido</Badge>
        ) : isReported ? (
          <Badge variant="info">Pago informado · Pendiente de verificación</Badge>
        ) : requiresRevision ? (
          <Badge variant="danger">Hay un dato para revisar</Badge>
        ) : (
          <Badge variant="warning">Pendiente de informar</Badge>
        )
      }
    >
      {/* Mensajes de retroalimentación */}
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
            marginBottom: 'var(--spacing-3)',
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Alerta de corrección solicitada por el comité */}
      {requiresRevision && payment.revisionReason && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            padding: 'var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--spacing-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-1)',
          }}
        >
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-danger-text)' }}>
            El comité solicitó revisar este pago:
          </span>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-danger-text)' }}>
            {payment.revisionReason}
          </p>
        </div>
      )}

      {/* Pago Verificado */}
      {isVerified ? (
        <div
          style={{
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            padding: 'var(--spacing-4)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-2)',
          }}
        >
          <p style={{ fontWeight: 700, color: 'var(--color-success-text)', fontSize: 'var(--font-size-lg)' }}>
            Pago recibido
          </p>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-success-text)' }}>
            El comité confirmó la acreditación de <strong style={{ fontVariantNumeric: 'tabular-nums' }}>${(payment.verifiedAmountMinor! / 100).toLocaleString('es-UY')} {payment.currency}</strong> para tu familia.
          </p>
          {payment.verifiedAt && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontVariantNumeric: 'tabular-nums' }}>
              Verificado el {new Date(payment.verifiedAt).toLocaleDateString('es-UY')}
            </span>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          <Input
            label={`Importe transferido (${currency})`}
            type="number"
            step="1"
            min="1"
            value={declaredAmount}
            onChange={(e) => setDeclaredAmount(e.target.value)}
            required
            helperText={`Importe sugerido para este evento: $${(expectedAmountMinor / 100).toLocaleString('es-UY')}`}
          />

          <Input
            label="Fecha de la transferencia"
            type="date"
            value={transferDate}
            onChange={(e) => setTransferDate(e.target.value)}
            required
          />

          <Input
            label="Referencia o número de comprobante (opcional)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Ej: Transf. BROU 984729"
          />

          {/* Adjuntar comprobante */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
              Comprobante bancario (opcional, máx. 3 MB)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              style={{
                fontSize: 'var(--font-size-sm)',
                padding: 'var(--spacing-2)',
                border: '1px solid var(--color-control-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface)',
              }}
            />
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
              Formatos admitidos: imágenes (JPEG, PNG, WebP) o documentos PDF hasta 3 MB.
            </span>
          </div>

          {/* Comprobante previamente adjunto */}
          {payment.attachment && (
            <div
              style={{
                backgroundColor: 'var(--color-surface-subtle)',
                padding: 'var(--spacing-2) var(--spacing-3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 'var(--font-size-xs)',
              }}
            >
              <span>Comprobante actual: <strong>{payment.attachment.fileName}</strong></span>
              <a
                href={`/api/payments/receipts/${payment.attachment.id}?eventId=${eventId}&participantId=${payment.participantId}&path=${encodeURIComponent(payment.attachment.storagePath)}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--color-primary)', fontWeight: 600 }}
              >
                Ver adjunto ↗
              </a>
            </div>
          )}

          <Button type="submit" isLoading={loading} fullWidth>
            {isReported || requiresRevision ? 'Actualizar informe de pago' : 'Informar transferencia bancaria'}
          </Button>
        </form>
      )}
    </Card>
  );
};

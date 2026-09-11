import { NextRequest, NextResponse } from 'next/server';
import { validateFamilySession } from '@/modules/access/family-service';
import { submitFamilyPaymentReport } from '@/modules/payments/service';
import { validateAndUploadReceipt } from '@/modules/payments/storage-service';
import { AppError, UnauthorizedError, ValidationError } from '@/server/errors';
import { AttachmentMetadata } from '@/modules/payments/types';

export async function POST(request: NextRequest) {
  try {
    const rawSessionId = request.cookies.get('family_session')?.value;
    if (!rawSessionId) {
      throw new UnauthorizedError('Sesión familiar requerida.');
    }

    const formData = await request.formData();
    const eventId = formData.get('eventId') as string;
    const declaredAmountStr = formData.get('declaredAmountMinor') as string;
    const transferDate = formData.get('transferDate') as string;
    const reference = (formData.get('reference') as string) || '';
    const expectedVersionStr = formData.get('expectedVersion') as string | null;
    const file = formData.get('receipt') as File | null;

    if (!eventId) {
      throw new ValidationError('El identificador del evento es obligatorio.');
    }

    const declaredAmountMinor = parseInt(declaredAmountStr, 10);
    if (isNaN(declaredAmountMinor) || declaredAmountMinor <= 0) {
      throw new ValidationError('El importe transferido debe ser un número mayor a cero.');
    }

    const session = await validateFamilySession(rawSessionId, eventId);

    let attachment: AttachmentMetadata | undefined;
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      attachment = await validateAndUploadReceipt(
        session,
        buffer,
        file.name,
        file.type
      );
    }

    const expectedVersion = expectedVersionStr ? parseInt(expectedVersionStr, 10) : undefined;

    const payment = await submitFamilyPaymentReport(
      session,
      {
        declaredAmountMinor,
        transferDate,
        reference,
        attachment,
      },
      expectedVersion
    );

    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error('Error al procesar informe de pago:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado al procesar el pago.' },
      { status: 500 }
    );
  }
}

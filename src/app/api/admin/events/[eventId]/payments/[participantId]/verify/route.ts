import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerContextFromRequest } from '@/modules/access/organizer-service';
import {
  verifyPaymentAdmin,
  requestPaymentRevisionAdmin,
  reverseVerificationAdmin,
} from '@/modules/payments/service';
import { AppError } from '@/server/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string; participantId: string } }
) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    const body = await request.json();
    const { action, verifiedAmountMinor, receptionDate, reason } = body;

    let result;
    switch (action) {
      case 'verify':
        result = await verifyPaymentAdmin(
          organizer,
          params.eventId,
          params.participantId,
          { verifiedAmountMinor, receptionDate }
        );
        break;

      case 'request_revision':
        result = await requestPaymentRevisionAdmin(
          organizer,
          params.eventId,
          params.participantId,
          reason
        );
        break;

      case 'reverse':
        result = await reverseVerificationAdmin(
          organizer,
          params.eventId,
          params.participantId,
          reason
        );
        break;

      default:
        return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, payment: result });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error en verificación administrativa de pago:', error);
    return NextResponse.json({ error: 'Error al procesar la acción.' }, { status: 500 });
  }
}

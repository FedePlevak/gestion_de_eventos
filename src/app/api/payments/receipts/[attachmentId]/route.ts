import { NextRequest, NextResponse } from 'next/server';
import { validateFamilySession } from '@/modules/access/family-service';
import { getOrganizerContextFromRequest } from '@/modules/access/organizer-service';
import { getReceiptFile } from '@/modules/payments/storage-service';
import { AppError, UnauthorizedError, ValidationError } from '@/server/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: { attachmentId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const participantId = searchParams.get('participantId');
    const storagePath = searchParams.get('path');

    if (!eventId || !participantId || !storagePath) {
      throw new ValidationError('Parámetros insuficientes para acceder al comprobante.');
    }

    // Identificar si la solicitud proviene de una familia o de un organizador
    const familyCookie = request.cookies.get('family_session')?.value;
    let userContext: any;

    if (familyCookie) {
      const familySession = await validateFamilySession(familyCookie, eventId);
      userContext = { type: 'family', session: familySession };
    } else {
      const organizerContext = await getOrganizerContextFromRequest(request);
      userContext = { type: 'organizer', session: organizerContext };
    }

    const { buffer, contentType, fileName } = await getReceiptFile(
      userContext,
      eventId,
      participantId,
      storagePath
    );

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error al descargar comprobante:', error);
    return NextResponse.json({ error: 'No se pudo descargar el comprobante.' }, { status: 500 });
  }
}

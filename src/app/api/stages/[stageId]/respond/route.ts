import { NextRequest, NextResponse } from 'next/server';
import { validateFamilySession } from '@/modules/access/family-service';
import { submitStageResponse } from '@/modules/stages/service';
import { AppError, UnauthorizedError, ValidationError } from '@/server/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: { stageId: string } }
) {
  try {
    const rawSessionId = request.cookies.get('family_session')?.value;
    if (!rawSessionId) {
      throw new UnauthorizedError('Sesión requerida.');
    }

    const body = await request.json();
    const { eventId, answers, expectedVersion } = body;

    if (!eventId || typeof eventId !== 'string') {
      throw new ValidationError('El identificador del evento es obligatorio.');
    }

    // Validar sesión familiar asegurando aislamiento de evento (Regla A03)
    const session = await validateFamilySession(rawSessionId, eventId);

    // Enviar respuesta con validación de vencimiento y concurrencia
    const response = await submitStageResponse(session, params.stageId, answers, expectedVersion);

    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error('Error al enviar respuesta de etapa:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado al guardar la respuesta. Intentá nuevamente.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { validateFamilySession } from '@/modules/access/family-service';
import { confirmStageRead } from '@/modules/stages/service';
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
    const { eventId } = body;

    if (!eventId || typeof eventId !== 'string') {
      throw new ValidationError('El identificador del evento es obligatorio.');
    }

    const session = await validateFamilySession(rawSessionId, eventId);
    const confirmation = await confirmStageRead(session, params.stageId);

    return NextResponse.json({
      success: true,
      confirmation,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error('Error al confirmar lectura de etapa:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado al confirmar la lectura.' },
      { status: 500 }
    );
  }
}

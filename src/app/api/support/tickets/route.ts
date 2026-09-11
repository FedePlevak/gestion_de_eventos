import { NextRequest, NextResponse } from 'next/server';
import { validateFamilySession } from '@/modules/access/family-service';
import { createSupportTicket, getFamilySupportTickets } from '@/modules/support/service';
import { AppError, UnauthorizedError, ValidationError } from '@/server/errors';

export async function GET(request: NextRequest) {
  try {
    const rawSessionId = request.cookies.get('family_session')?.value;
    const eventId = request.nextUrl.searchParams.get('eventId');

    if (!rawSessionId || !eventId) {
      throw new UnauthorizedError('Sesión o evento requeridos.');
    }

    const session = await validateFamilySession(rawSessionId, eventId);
    const tickets = await getFamilySupportTickets(session);

    return NextResponse.json({ success: true, tickets });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error al obtener tickets familiares:', error);
    return NextResponse.json({ error: 'Error al cargar las consultas.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawSessionId = request.cookies.get('family_session')?.value;
    const body = await request.json();
    const { eventId, subject, description } = body;

    if (!rawSessionId || !eventId) {
      throw new UnauthorizedError('Sesión o evento requeridos.');
    }

    const session = await validateFamilySession(rawSessionId, eventId);
    const ticket = await createSupportTicket(session, { subject, description });

    return NextResponse.json({ success: true, ticket });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error al crear ticket de soporte:', error);
    return NextResponse.json({ error: 'Error al enviar la consulta.' }, { status: 500 });
  }
}

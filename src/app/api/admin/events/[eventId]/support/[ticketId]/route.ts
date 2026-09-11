import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerContextFromRequest } from '@/modules/access/organizer-service';
import { updateSupportTicketAdmin } from '@/modules/support/service';
import { AppError } from '@/server/errors';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string; ticketId: string } }
) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    const body = await request.json();

    const updated = await updateSupportTicketAdmin(
      organizer,
      params.eventId,
      params.ticketId,
      body
    );

    return NextResponse.json({ success: true, ticket: updated });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error al actualizar ticket de soporte:', error);
    return NextResponse.json({ error: 'Error al actualizar la consulta.' }, { status: 500 });
  }
}

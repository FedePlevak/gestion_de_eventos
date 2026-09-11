import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerContextFromRequest } from '@/modules/access/organizer-service';
import { exportEventResponsesCsv, exportEventPaymentsCsv } from '@/modules/export/service';
import { AppError } from '@/server/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    const type = request.nextUrl.searchParams.get('type');

    let csvContent = '';
    let fileName = '';

    if (type === 'payments') {
      csvContent = await exportEventPaymentsCsv(organizer, params.eventId);
      fileName = `pagos_${params.eventId}_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      csvContent = await exportEventResponsesCsv(organizer, params.eventId);
      fileName = `respuestas_${params.eventId}_${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Prefijo BOM UTF-8 (\uFEFF) para compatibilidad con Excel en Windows y español
    const bomCsv = '\uFEFF' + csvContent;

    return new Response(bomCsv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error al exportar CSV:', error);
    return NextResponse.json({ error: 'Error al exportar los datos.' }, { status: 500 });
  }
}

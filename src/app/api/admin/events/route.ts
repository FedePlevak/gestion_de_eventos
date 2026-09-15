import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerContextFromRequest } from '@/modules/access/organizer-service';
import { getAdminDb } from '@/server/firebase-admin';
import { AppError, ValidationError } from '@/server/errors';
import { recordAuditEvent } from '@/modules/audit/service';

export async function GET(request: NextRequest) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    const db = getAdminDb();
    const workspaceId = organizer.workspaceId || 'principal';

    const eventsRef = db.collection('workspaces').doc(workspaceId).collection('events');
    const eventsSnap = await eventsRef.where('status', '==', 'active').get();

    const accessibleEvents: any[] = [];

    for (const doc of eventsSnap.docs) {
      const eventData = doc.data();
      const eventId = doc.id;

      // Verificar si el organizador tiene acceso a este evento
      const orgRef = eventsRef.doc(eventId).collection('organizers').doc(organizer.organizerId);
      const orgSnap = await orgRef.get();

      let hasAccess = orgSnap.exists && orgSnap.data()?.status === 'active';

      if (!hasAccess && organizer.email) {
        const orgByEmailSnap = await eventsRef
          .doc(eventId)
          .collection('organizers')
          .where('email', '==', organizer.email.toLowerCase())
          .where('status', '==', 'active')
          .get();
        hasAccess = !orgByEmailSnap.empty;
      }

      // Si es organizador del evento (o si el usuario es admin global del espacio)
      if (hasAccess) {
        // Contar participantes y etapas
        const partsCountSnap = await eventsRef.doc(eventId).collection('participants').where('status', '==', 'active').count().get();
        const stagesCountSnap = await eventsRef.doc(eventId).collection('stages').count().get();

        accessibleEvents.push({
          id: eventId,
          name: eventData.name,
          description: eventData.description || '',
          eventDate: eventData.eventDate || null,
          status: eventData.status,
          participantCount: partsCountSnap.data().count,
          stageCount: stagesCountSnap.data().count,
          createdAt: eventData.createdAt,
        });
      }
    }

    return NextResponse.json({
      success: true,
      events: accessibleEvents,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.userMessage }, { status: error.statusCode });
    }
    console.error('Error al listar eventos:', error);
    return NextResponse.json({ error: 'Error al obtener los eventos.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    const body = await request.json();

    const { name, description, eventDate, paymentConfig } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new ValidationError('El nombre del evento es obligatorio (mínimo 2 caracteres).');
    }

    const db = getAdminDb();
    const workspaceId = organizer.workspaceId || 'principal';
    const eventsRef = db.collection('workspaces').doc(workspaceId).collection('events');
    const newEventDoc = eventsRef.doc();
    const now = new Date().toISOString();

    let parsedEventDate: string | null = null;
    if (eventDate && typeof eventDate === 'string' && eventDate.trim()) {
      const parsed = new Date(eventDate.trim());
      if (!isNaN(parsed.getTime())) {
        parsedEventDate = parsed.toISOString();
      }
    }

    const eventData = {
      id: newEventDoc.id,
      workspaceId,
      name: name.trim(),
      description: description?.trim() || '',
      timezone: 'America/Montevideo',
      eventDate: parsedEventDate,
      status: 'active',
      isArchived: false,
      paymentConfig: {
        enabled: Boolean(paymentConfig?.enabled),
        expectedAmountMinor: paymentConfig?.expectedAmountMinor ? Math.round(Number(paymentConfig.expectedAmountMinor)) : 0,
        currency: paymentConfig?.currency || 'UYU',
        bankInstructions: paymentConfig?.bankInstructions || null,
      },
      createdAt: now,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.set(newEventDoc, eventData);

    // Asignar al creador como primer organizador activo del evento
    const organizerDocRef = newEventDoc.collection('organizers').doc(organizer.organizerId);
    batch.set(organizerDocRef, {
      id: organizer.organizerId,
      workspaceId,
      eventId: newEventDoc.id,
      email: organizer.email.toLowerCase(),
      name: organizer.name,
      status: 'active',
      invitedAt: now,
      joinedAt: now,
    });

    await batch.commit();

    await recordAuditEvent({
      workspaceId,
      eventId: newEventDoc.id,
      actor: { type: 'organizer', id: organizer.organizerId },
      action: 'CREATE_EVENT',
      targetType: 'event',
      targetId: newEventDoc.id,
      details: { name: eventData.name },
    });

    return NextResponse.json({
      success: true,
      event: eventData,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.userMessage }, { status: error.statusCode });
    }
    console.error('Error al crear evento:', error);
    return NextResponse.json({ error: error.message || 'Error al crear el evento.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import {
  getOrganizerContextFromRequest,
  validateOrganizerEventAccess,
  revokeOrganizerAccess,
} from '@/modules/access/organizer-service';
import { getAdminDb, getAdminAuth } from '@/server/firebase-admin';
import { AppError, ValidationError, NotFoundError } from '@/server/errors';
import { recordAuditEvent } from '@/modules/audit/service';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    const workspaceId = organizer.workspaceId || 'principal';
    await validateOrganizerEventAccess(organizer, params.eventId, workspaceId);

    const db = getAdminDb();
    const organizersSnap = await db
      .collection('workspaces')
      .doc(workspaceId)
      .collection('events')
      .doc(params.eventId)
      .collection('organizers')
      .get();

    const organizers = organizersSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({
      success: true,
      organizers,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.userMessage }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Error al obtener organizadores.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const actor = await getOrganizerContextFromRequest(request);
    const workspaceId = actor.workspaceId || 'principal';
    await validateOrganizerEventAccess(actor, params.eventId, workspaceId);

    const body = await request.json();
    const { email, name, tempPassword } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new ValidationError('Debés proporcionar un correo electrónico válido.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = getAdminDb();
    const auth = getAdminAuth();
    const now = new Date().toISOString();

    const eventRef = db
      .collection('workspaces')
      .doc(workspaceId)
      .collection('events')
      .doc(params.eventId);

    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) {
      throw new NotFoundError('El evento no existe.');
    }

    // Buscar si el usuario ya existe en Firebase Auth
    let userUid: string;
    let userName = name?.trim() || cleanEmail.split('@')[0];

    try {
      const existingUser = await auth.getUserByEmail(cleanEmail);
      userUid = existingUser.uid;
      if (existingUser.displayName) userName = existingUser.displayName;
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        // Crear usuario en Firebase Auth
        const passwordToUse = tempPassword && tempPassword.length >= 6 ? tempPassword : 'temporal' + Math.floor(1000 + Math.random() * 9000);
        const newUser = await auth.createUser({
          email: cleanEmail,
          password: passwordToUse,
          displayName: userName,
          emailVerified: true,
        });
        userUid = newUser.uid;

        // Custom claims
        await auth.setCustomUserClaims(userUid, {
          role: 'organizer',
          workspaceId,
          canCreateEvents: true,
        });
      } else {
        throw err;
      }
    }

    // Registrar o actualizar en directorio global de organizadores
    await db.collection('organizer_directory').doc(cleanEmail).set({
      uid: userUid,
      email: cleanEmail,
      name: userName,
      workspaceId,
      canCreateEvents: true,
      updatedAt: now,
    }, { merge: true });

    // Agregar al evento como organizador activo
    const organizerRef = eventRef.collection('organizers').doc(userUid);
    await organizerRef.set({
      id: userUid,
      workspaceId,
      eventId: params.eventId,
      email: cleanEmail,
      name: userName,
      status: 'active',
      invitedBy: actor.organizerId,
      joinedAt: now,
    });

    await recordAuditEvent({
      workspaceId,
      eventId: params.eventId,
      actor: { type: 'organizer', id: actor.organizerId },
      action: 'ADD_ORGANIZER',
      targetType: 'organizer',
      targetId: userUid,
      details: { email: cleanEmail, name: userName },
    });

    return NextResponse.json({
      success: true,
      organizer: {
        id: userUid,
        email: cleanEmail,
        name: userName,
        status: 'active',
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.userMessage }, { status: error.statusCode });
    }
    console.error('Error al agregar organizador:', error);
    return NextResponse.json({ error: error.message || 'Error al agregar organizador.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const actor = await getOrganizerContextFromRequest(request);
    const workspaceId = actor.workspaceId || 'principal';
    await validateOrganizerEventAccess(actor, params.eventId, workspaceId);

    const { searchParams } = new URL(request.url);
    const targetOrganizerId = searchParams.get('organizerId');
    const reason = searchParams.get('reason') || 'Baja administrativa de organizador';

    if (!targetOrganizerId) {
      throw new ValidationError('El identificador del organizador a revocar es obligatorio.');
    }

    await revokeOrganizerAccess({
      workspaceId,
      eventId: params.eventId,
      targetOrganizerId,
      actorOrganizerId: actor.organizerId,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: 'Acceso de organizador revocado.',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.userMessage }, { status: error.statusCode });
    }
    console.error('Error al revocar organizador:', error);
    return NextResponse.json({ error: error.message || 'Error al revocar organizador.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerContextFromRequest } from '@/modules/access/organizer-service';
import { getAdminDb } from '@/server/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const context = await getOrganizerContextFromRequest(request);
    const db = getAdminDb();

    const directorySnap = await db
      .collection('organizer_directory')
      .doc(context.email.toLowerCase())
      .get();

    let canCreateEvents = true;
    let role = 'admin';

    if (directorySnap.exists) {
      const d = directorySnap.data();
      canCreateEvents = d?.canCreateEvents ?? true;
      role = d?.role || 'admin';
    }

    return NextResponse.json({
      authenticated: true,
      organizer: {
        id: context.organizerId,
        email: context.email,
        name: context.name,
        workspaceId: context.workspaceId,
        role,
        canCreateEvents,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { authenticated: false, error: error.message || 'No autenticado' },
      { status: 401 }
    );
  }
}

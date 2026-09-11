import { NextRequest, NextResponse } from 'next/server';
import { redeemFamilySecret } from '@/modules/access/family-service';
import { AppError } from '@/server/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret } = body;

    if (!secret || typeof secret !== 'string') {
      return NextResponse.json(
        { error: 'Secreto no proporcionado o inválido.' },
        { status: 400 }
      );
    }

    const { sessionId, context } = await redeemFamilySecret(secret);

    const response = NextResponse.json({
      success: true,
      eventId: context.eventId,
      participantId: context.participantId,
      familyName: context.familyName,
    });

    // Fijar cookie de sesión familiar segura
    response.cookies.set({
      name: 'family_session',
      value: sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 días
    });

    return response;
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error('Error al canjear enlace familiar:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al procesar el enlace. Por favor reintentá.' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Sesión cerrada.' });

  // Limpiar cookies de organizador
  response.cookies.set('organizer_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set('organizer_email', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set('dev_organizer_email', '', {
    path: '/',
    maxAge: 0,
  });

  return response;
}

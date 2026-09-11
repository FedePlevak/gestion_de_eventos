import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { getAdminDb } from '../src/server/firebase-admin';
import { generateRawSecret, hashFamilySecret } from '../src/modules/access/token';

async function runSeed() {
  console.log('Iniciando carga de datos ficticios (Incremento 0)...');
  const db = getAdminDb();

  // 1. Espacio 1: Colegio San Martín
  const ws1Ref = db.collection('workspaces').doc('colegio-san-martin');
  await ws1Ref.set({
    id: 'colegio-san-martin',
    name: 'Colegio San Martín',
    createdAt: new Date().toISOString(),
  });

  // 2. Espacio 2: Comisión Vecinal Barrio Verde (Espacio separado)
  const ws2Ref = db.collection('workspaces').doc('colectivo-vecinal');
  await ws2Ref.set({
    id: 'colectivo-vecinal',
    name: 'Comisión Vecinal Barrio Verde',
    createdAt: new Date().toISOString(),
  });

  // 3. Grupo 1 en Espacio 1: Generación 2026 (6to Primaria)
  const group1Ref = ws1Ref.collection('groups').doc('grupo-egresados-2026');
  await group1Ref.set({
    id: 'grupo-egresados-2026',
    workspaceId: 'colegio-san-martin',
    name: 'Generación 2026 - 6to Primaria',
    description: 'Nómina de alumnos y familias egresadas del ciclo primario',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Crear 10 familias representativas para la prueba inicial (ampliable a 80)
  const sampleFamilies = [
    { id: 'fam_01', name: 'Álvarez Pérez', email: 'familia.alvarez@ejemplo.com', phone: '099111222' },
    { id: 'fam_02', name: 'Bianchi Gómez', email: 'familia.bianchi@ejemplo.com', phone: '099222333' },
    { id: 'fam_03', name: 'Cardozo Silva', email: 'familia.cardozo@ejemplo.com', phone: '099333444' },
    { id: 'fam_04', name: 'Díaz Morales', email: 'familia.diaz@ejemplo.com', phone: '099444555' },
    { id: 'fam_05', name: 'Espósito Ferreira', email: 'familia.esposito@ejemplo.com', phone: '099555666' },
    { id: 'fam_06', name: 'Fernández Cabrera', email: 'familia.fernandez@ejemplo.com', phone: '099666777' },
    { id: 'fam_07', name: 'García Méndez', email: 'familia.garcia@ejemplo.com', phone: '099777888' },
    { id: 'fam_08', name: 'Hernández Larrosa', email: 'familia.hernandez@ejemplo.com', phone: '099888999' },
    { id: 'fam_09', name: 'Iglesias Suárez', email: 'familia.iglesias@ejemplo.com', phone: '099123456' },
    { id: 'fam_10', name: 'Juárez Núñez', email: 'familia.juarez@ejemplo.com', phone: '099654321' },
  ];

  for (const fam of sampleFamilies) {
    await group1Ref.collection('members').doc(fam.id).set({
      id: fam.id,
      workspaceId: 'colegio-san-martin',
      groupId: 'grupo-egresados-2026',
      familyId: fam.id,
      familyName: fam.name,
      contactEmail: fam.email,
      contactPhone: fam.phone,
      createdAt: new Date().toISOString(),
    });
  }

  // 4. Evento 1 en Espacio 1: Fiesta de Fin de Año 2026
  const event1Ref = ws1Ref.collection('events').doc('fiesta-egresados-2026');
  await event1Ref.set({
    id: 'fiesta-egresados-2026',
    workspaceId: 'colegio-san-martin',
    name: 'Fiesta de Fin de Año 2026',
    description: 'Celebración y cena de egresados de 6to de Primaria',
    timezone: 'America/Montevideo',
    eventDate: '2026-12-10T20:00:00-03:00',
    status: 'active',
    isArchived: false,
    sourceGroupId: 'grupo-egresados-2026',
    paymentConfig: {
      enabled: true,
      expectedAmountMinor: 300000, // $3.000 UYU
      currency: 'UYU',
      bankInstructions: {
        bankName: 'Banco República (BROU)',
        accountHolder: 'Comité Fiesta 2026 - Ana Gómez',
        accountNumber: 'CA 00123456-00001',
        alias: 'FIESTA.EGRESADOS.2026',
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Organizadores del Evento 1
  await event1Ref.collection('organizers').doc('org_01').set({
    id: 'org_01',
    workspaceId: 'colegio-san-martin',
    eventId: 'fiesta-egresados-2026',
    email: 'organizador1@colegio.edu.uy',
    name: 'Laura Méndez',
    status: 'active',
    invitedAt: new Date().toISOString(),
    joinedAt: new Date().toISOString(),
  });

  await event1Ref.collection('organizers').doc('org_02').set({
    id: 'org_02',
    workspaceId: 'colegio-san-martin',
    eventId: 'fiesta-egresados-2026',
    email: 'organizador2@colegio.edu.uy',
    name: 'Martín Cabrera',
    status: 'active',
    invitedAt: new Date().toISOString(),
    joinedAt: new Date().toISOString(),
  });

  // 5. Evento 2 en Espacio 1: Asamblea Anual de Padres 2026
  const event2Ref = ws1Ref.collection('events').doc('asamblea-anual-2026');
  await event2Ref.set({
    id: 'asamblea-anual-2026',
    workspaceId: 'colegio-san-martin',
    name: 'Asamblea Anual de Padres 2026',
    description: 'Votación de prioridades y autoridades del comité escolar',
    timezone: 'America/Montevideo',
    status: 'active',
    isArchived: false,
    paymentConfig: { enabled: false, expectedAmountMinor: 0, currency: 'UYU' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Solo organizador1 tiene acceso a la Asamblea (organizador2 NO tiene membresía aquí)
  await event2Ref.collection('organizers').doc('org_01').set({
    id: 'org_01',
    workspaceId: 'colegio-san-martin',
    eventId: 'asamblea-anual-2026',
    email: 'organizador1@colegio.edu.uy',
    name: 'Laura Méndez',
    status: 'active',
    invitedAt: new Date().toISOString(),
    joinedAt: new Date().toISOString(),
  });

  // 6. Participantes de familias y generación de secretos
  console.log('\n--- ENLACES DE PRUEBA DE FAMILIAS ---');
  for (const fam of sampleFamilies) {
    const partRef = event1Ref.collection('participants').doc(`part_${fam.id}`);
    const rawSecret = generateRawSecret();
    const tokenHash = hashFamilySecret(rawSecret);

    await partRef.set({
      id: `part_${fam.id}`,
      workspaceId: 'colegio-san-martin',
      eventId: 'fiesta-egresados-2026',
      familyId: fam.id,
      familyName: fam.name,
      contactEmail: fam.email,
      contactPhone: fam.phone,
      status: 'active',
      accessVersion: 1,
      tokenHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.collection('access_tokens').doc(tokenHash).set({
      workspaceId: 'colegio-san-martin',
      eventId: 'fiesta-egresados-2026',
      participantId: `part_${fam.id}`,
      accessVersion: 1,
      createdAt: new Date().toISOString(),
    });

    if (fam.id === 'fam_01' || fam.id === 'fam_02') {
      console.log(`- Familia ${fam.name}: http://localhost:3000/f#secret=${rawSecret}`);
    }
  }

  // 7. Etapas de prueba en Evento 1
  const stage1Ref = event1Ref.collection('stages').doc('etapa_menu');
  await stage1Ref.set({
    id: 'etapa_menu',
    workspaceId: 'colegio-san-martin',
    eventId: 'fiesta-egresados-2026',
    title: 'Elección de Menú Principal',
    description: 'Por favor confirmen las preferencias gastronómicas de la familia para la cena.',
    type: 'single_choice',
    status: 'open',
    order: 1,
    options: [
      { id: 'opt_tradicional', label: 'Menú Tradicional (Carne y guarnición)' },
      { id: 'opt_vegetariano', label: 'Menú Vegetariano' },
      { id: 'opt_celiaco', label: 'Menú Apto Celíacos (Sin TACC)' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log('\n✅ Semilla completada con éxito.');
  console.log('- 2 Espacios creados (colegio-san-martin, colectivo-vecinal)');
  console.log('- 2 Eventos en colegio-san-martin (fiesta-egresados-2026, asamblea-anual-2026)');
  console.log('- Cuentas de organizador preparadas (organizador1 y organizador2)');
  console.log('- 10 familias participantes con enlaces de acceso listos');
}

runSeed().catch((err) => {
  console.error('Error al ejecutar seed:', err);
  process.exit(1);
});

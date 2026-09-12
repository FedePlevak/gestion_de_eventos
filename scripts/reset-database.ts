import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { getAdminDb, getAdminAuth } from '../src/server/firebase-admin';

async function resetDatabase() {
  console.log('--- INICIANDO PUESTA A CERO DE LA BASE DE DATOS ---');
  const db = getAdminDb();
  const auth = getAdminAuth();

  // 1. Purgar colecciones en Firestore
  console.log('1. Purgando colecciones existentes en Firestore...');
  const rootCollections = await db.listCollections();
  for (const col of rootCollections) {
    console.log(`   - Purgando colección raíz: ${col.id}`);
    const docs = await col.listDocuments();
    for (const doc of docs) {
      await db.recursiveDelete(doc);
    }
  }
  console.log('✓ Firestore completamente limpio.');

  // 2. Limpiar usuarios previos en Firebase Auth
  console.log('2. Verificando usuarios en Firebase Auth...');
  const existingUsers = await auth.listUsers();
  for (const user of existingUsers.users) {
    console.log(`   - Eliminando usuario existente: ${user.email} (${user.uid})`);
    await auth.deleteUser(user.uid);
  }
  console.log('✓ Usuarios previos eliminados.');

  // 3. Crear el Espacio de Trabajo Inicial
  console.log('3. Creando espacio de trabajo principal...');
  const workspaceId = 'principal';
  const workspaceRef = db.collection('workspaces').doc(workspaceId);
  const now = new Date().toISOString();
  await workspaceRef.set({
    id: workspaceId,
    name: 'Espacio Principal de Eventos',
    createdAt: now,
    updatedAt: now,
  });
  console.log('✓ Espacio "principal" inicializado.');

  // 4. Crear los dos usuarios administradores/organizadores
  console.log('4. Creando usuarios administradores...');
  const usersToCreate = [
    {
      email: 'fedeplevak@gmail.com',
      password: 'colibri1',
      displayName: 'Fede Plevak',
    },
    {
      email: 'lucybelrod061195@gmail.com',
      password: '123456',
      displayName: 'Lucybel Rod',
    },
  ];

  for (const u of usersToCreate) {
    const userRecord = await auth.createUser({
      email: u.email,
      password: u.password,
      displayName: u.displayName,
      emailVerified: true,
    });

    // Custom claims para autorización rápida en servidor
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      workspaceId,
      canCreateEvents: true,
    });

    // Perfil en Firestore
    await workspaceRef.collection('organizers').doc(userRecord.uid).set({
      id: userRecord.uid,
      workspaceId,
      email: u.email,
      name: u.displayName,
      role: 'admin',
      canCreateEvents: true,
      status: 'active',
      createdAt: now,
    });

    // Índice global de organizadores por email para invitaciones directas
    await db.collection('organizer_directory').doc(u.email.toLowerCase()).set({
      uid: userRecord.uid,
      email: u.email.toLowerCase(),
      name: u.displayName,
      role: 'admin',
      workspaceId,
      canCreateEvents: true,
      createdAt: now,
    });

    console.log(`✓ Creado usuario ${u.email} (UID: ${userRecord.uid}) con rol Administrador.`);
  }

  console.log('\n=============================================');
  console.log('¡BASE DE DATOS DEJADA A 0 Y LISTA PARA PRODUCCIÓN!');
  console.log('Usuarios configurados:');
  console.log(' - fedeplevak@gmail.com');
  console.log(' - lucybelrod061195@gmail.com');
  console.log('=============================================\n');
}

resetDatabase()
  .catch((err) => {
    console.error('Error al resetear la base de datos:', err);
    process.exit(1);
  })
  .then(() => process.exit(0));

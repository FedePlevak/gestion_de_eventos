import { z } from 'zod';

const envSchema = z.object({
  APP_URL: z.string().url().default('http://localhost:3000'),
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FAMILY_TOKEN_PEPPER: z.string().min(32, 'FAMILY_TOKEN_PEPPER debe tener al menos 32 caracteres'),
  
  FIREBASE_PROJECT_ID: z.string().min(1).default('gestion-eventos-dev'),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional().default('gestion-eventos-dev.appspot.com'),

  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional().default('AIzaSyDZnSikyO2dJKFfCJhGRpkEORPh9LIsAdQ'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional().default('gestion-eventos-9846f.firebaseapp.com'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional().default('gestion-eventos-9846f'),

  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  FIREBASE_STORAGE_EMULATOR_HOST: z.string().optional(),
}).refine(
  (data) => {
    // En producción no se admiten emuladores bajo ninguna circunstancia
    if (data.APP_ENV === 'production') {
      return !data.FIRESTORE_EMULATOR_HOST && !data.FIREBASE_AUTH_EMULATOR_HOST && !data.FIREBASE_STORAGE_EMULATOR_HOST;
    }
    return true;
  },
  {
    message: 'Seguridad: Los emuladores de Firebase están prohibidos en entorno de producción.',
  }
);

let cachedEnv: z.infer<typeof envSchema> | null = null;

export function getEnv(): z.infer<typeof envSchema> {
  if (!cachedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const issues = result.error.format();
      console.error('Error de validación en variables de entorno:', JSON.stringify(issues, null, 2));
      throw new Error('Configuración de entorno inválida. Revise las variables requeridas.');
    }
    cachedEnv = result.data;
  }
  return cachedEnv;
}

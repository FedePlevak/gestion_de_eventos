# Blueprint de Arquitectura: Plataforma Independiente para Eventos Escolares / Grupales

Este documento define la especificación técnica completa (**Qué**, **Cómo** y **Con qué**) para desarrollar una plataforma o aplicación web independiente para gestionar cualquier evento paralelo o futuro de un grupo de padres/familias (por ejemplo: *Campamento de fin de curso*, *Fiesta de egresados*, *Viaje de egresaditos*, *Jornada deportiva*), sin interferir ni comprometer el sistema en producción de "El último día de clase".

---

## 1. EL "QUÉ": Alcance Funcional y Conceptual

La plataforma es una **Single-Purpose Web App** (aplicación de propósito único) optimizada para la interacción móvil de familias y la administración de un comité organizador específico. Su objetivo es eliminar los chats caóticos de WhatsApp, las planillas de Excel desincronizadas y los reclamos de transferencias perdidas.

### 1.1. Experiencia de las Familias (Frontend Público)
* **Acceso de Cero Fricción (Passwordless):**
  * Acceso mediante un enlace individual único por participante enviado por WhatsApp (ejemplo: `https://evento.app/#k=TOKEN_256_BITS`).
  * Sin registro de usuario, sin contraseñas que recordar ni descarga de aplicaciones.
  * Canje automático de token por cookie de sesión segura (`HttpOnly`, `SameSite=Lax`, `Secure`).
* **Visualización de la Propuesta Oficial:**
  * Vista clara del evento: fecha, lugar, qué incluye la cuota/importe único, cronograma y condiciones.
  * Sin votaciones ni discusiones abiertas: comunica decisiones ya acordadas por el comité.
* **Personalización / Confirmación (según requerimiento del evento):**
  * Confirmación de asistencia (Sí / No / Con restricciones).
  * Campos dinámicos adaptados al evento puntual (ejemplos: talle de remera, menú vegetariano/celíaco, autorización médica, acompañantes).
* **Gestión y Reporte de Pagos:**
  * Datos bancarios oficiales (Banco, Titular, Cuenta, Alias / CVU / CBU) con botón de copia en 1 clic.
  * Formulario para reportar el pago: importe transferido, fecha, banco de origen, número de referencia/comprobante y carga opcional de captura.
  * Visualización transparente del estado del pago: `PENDIENTE`, `INFORMADO` (en espera de conciliación) o `VERIFICADO` (confirmado por el tesorero).
* **Canal de Soporte Directo:**
  * Botón directo de contacto por WhatsApp o correo con el organizador responsable del evento.

### 1.2. Panel de Administración (Comité Organizador)
* **Autenticación Exclusiva para Organizadores:**
  * Login mediante correo y contraseña administrado por Firebase Authentication (con lista blanca estricta de organizadores del evento).
* **Dashboard de Control y Métricas:**
  * Resumen global: Total presupuestado vs. Total recaudado (confirmado en banco) vs. Total informado.
  * Métricas de participación: % de confirmados, % de pendientes, % de ausencias.
* **Gestión de Participantes:**
  * Tabla con buscador y filtros por grupo/clase, estado de confirmación y estado de pago.
  * Generador y exportador de enlaces individuales (`#k=...`) para distribución personalizada por WhatsApp.
  * Capacidad de regenerar/revocar enlaces si un padre perdió o filtró su acceso.
* **Módulo de Conciliación de Pagos:**
  * Bandeja de pagos informados pendientes de revisión.
  * Acción de 1 clic para **Verificar** o **Rechazar con motivo** (ej: "Importe incompleto", "Comprobante no legible").
  * Distinción innegociable: *la familia nunca puede auto-verificar su pago*.
* **Registro de Auditoría (Audit Log):**
  * Historial inmutable de cada acción administrativa (quién verificó un pago, quién cambió un dato, fecha y hora exacta).

---

## 2. EL "CÓMO": Arquitectura, Seguridad y Flujos Técnicos

### 2.1. Arquitectura de Software
* **Monolito Modular con Next.js App Router:**
  * Frontend y Backend integrados en un único repositorio con TypeScript estricto.
  * Renderizado híbrido: React Server Components (RSC) para carga ultrarrápida y DTOs seguros, Client Components solo para interactividad necesaria (formularios, modales, copiado de datos).
  * **Route Handlers Server-Side:** Toda la lógica de negocio, validación de sesiones y llamadas a base de datos se ejecutan en el servidor. El navegador del cliente **jamás** se comunica de forma directa con la base de datos.
* **Seguridad de Base de Datos:**
  * Reglas de Firestore en modo "Cero Confianza" (`firestore.rules`):
    ```javascript
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          allow read, write: if false; // Denegación total a clientes directos
        }
      }
    }
    ```
  * Solo el backend a través del **Firebase Admin SDK** (con credenciales de cuenta de servicio en variables de entorno seguras) tiene permisos para leer y escribir.

### 2.2. Flujo Criptográfico del Enlace Familiar (Sin Contraseñas)
1. **Generación del Token:**
   * Al dar de alta los participantes, el sistema genera para cada uno un token aleatorio criptográficamente seguro de 256 bits (`crypto.randomBytes(32).toString('hex')`).
2. **Almacenamiento Seguro:**
   * El token original **nunca** se guarda en la base de datos.
   * Se calcula su hash usando HMAC-SHA-256 junto con una clave secreta del servidor (`FAMILY_TOKEN_PEPPER`):
     $$\text{tokenHash} = \text{HMAC-SHA-256}(\text{token}, \text{FAMILY\_TOKEN\_PEPPER})$$
   * En Firestore solo se almacena `tokenHash`.
3. **Distribución en Fragmento de URL (`#k=`):**
   * El enlace entregado al padre tiene la estructura: `https://evento.app/#k=TOKEN_EN_CLARO`.
   * Al estar después del hash (`#`), el token **nunca viaja en los encabezados HTTP**, no queda registrado en logs de servidores web, proxies ni registros de CDN de Netlify.
4. **Canje y Sesión:**
   * El cliente ejecuta un script ligero en el navegador que lee `window.location.hash`, envía el token mediante una solicitud `POST /api/family/session` y limpia inmediatamente la URL con `window.history.replaceState`.
   * El servidor valida el hash del token contra Firestore. Si es válido y coincide con la versión de acceso (`accessVersion`), emite una cookie HTTP firmada y encriptada (`HttpOnly`, `Secure`, `SameSite=Lax`).
   * Toda navegación posterior utiliza esta cookie, que solo da acceso a los datos de ese participante específico.
5. **Revocación y Rotación:**
   * Cada participante tiene un campo `accessVersion: number`.
   * Si un enlace es revocado o regenerado por el admin, se incrementa `accessVersion`, invalidando de inmediato cualquier sesión activa o enlace anterior.

### 2.3. Modelo de Datos Recomendado (Cloud Firestore)

```
event_config/{eventId}
  ├── title: string
  ├── description: string
  ├── dates: { eventAt, paymentDeadlineAt, confirmationDeadlineAt }
  ├── financial: { costPerParticipantMinor, currency, bankInfo }
  ├── stages: { isConfirmationOpen, isPaymentOpen, isClosed }
  └── customFieldsSchema: [] // Definición de campos adicionales (talles, menú, etc.)

participants/{participantId}
  ├── fullName: string
  ├── groupOrClass: string
  ├── contactPhone: string
  ├── tokenHash: string (HMAC-SHA-256)
  ├── accessVersion: number
  ├── status: "PENDIENTE" | "CONFIRMADO" | "RECHAZADO"
  ├── customData: { shirtSize?, dietaryRestriction?, notes? }
  └── paymentSummary: { status, totalInformedMinor, totalVerifiedMinor }

payments/{paymentId}
  ├── participantId: string
  ├── amountMinor: number (entero en unidad menor, ej. $1500 -> 150000)
  ├── status: "INFORMADO" | "VERIFICADO" | "RECHAZADO"
  ├── reference: string
  ├── receiptUrl: string | null
  ├── informedAt: Timestamp
  ├── verifiedAt: Timestamp | null
  ├── verifiedBy: string | null (admin email)
  └── rejectReason: string | null

audit_logs/{logId}
  ├── timestamp: Timestamp
  ├── actorId: string (email admin o "family")
  ├── action: string
  ├── targetId: string
  └── details: map
```

---

## 3. EL "CON QUÉ": Stack Tecnológico y Herramientas

### 3.1. Núcleo Tecnológico (Stack)
* **Lenguaje:** TypeScript 5+ con tipado estricto (`"strict": true`, `"noImplicitAny": true`).
* **Framework Web:** Next.js 14 o 15 (App Router).
* **Motor de Base de Datos:** Google Cloud Firestore (Modo Nativo).
* **Autenticación Admin:** Firebase Authentication (SDK cliente en `/admin/login`, Firebase Admin SDK para verificación de JWT de sesión en middleware y Route Handlers).
* **Validación de Datos en Fronteras:** **Zod** (utilizado obligatoriamente en formularios de entrada, parseo de parámetros, endpoints de API y variables de entorno).
* **Estilos y Diseño Visual:**
  * CSS Moderno (Vanilla CSS Modules o TailwindCSS).
  * Enfoque 100% Mobile-First (el 98% del tráfico de familias llega desde WhatsApp en teléfonos).
  * Cumplimiento de accesibilidad WCAG 2.2 AA (alto contraste, tamaños táctiles mínimos de 48px).

### 3.2. Infraestructura y Costos
* **Hosting y CDN:** Netlify o Vercel (Plan Gratuito / Hobby).
  * Soporte nativo para Serverless Functions y Edge Middleware.
* **Base de Datos y Auth:** Proyecto de Google Firebase independiente (Plan Gratuito *Spark*).
  * Incluye 50.000 lecturas y 20.000 escrituras diarias en Firestore, y 10.000 logins mensuales en Auth.
  * **Costo operativo real:** $0 USD/mes para eventos de escala escolar o comunitaria (hasta miles de participantes).

### 3.3. Herramientas de Desarrollo y Calidad
* **Testing Automatizado:**
  * **Vitest:** Pruebas unitarias de esquemas Zod, funciones criptográficas y lógica de negocio.
  * **Firebase Emulator Suite:** Emuladores locales de Firestore y Auth para desarrollar y probar sin conectarse a internet ni gastar cuota de la nube.
  * **Playwright:** Pruebas de extremo a extremo (E2E) simulando dispositivos móviles (iPhone / Android) para verificar los flujos críticos de la familia.

---

## 4. GUÍA PASO A PASO: Cómo Desplegar el Nuevo Evento en Menos de 1 Día

Gracias a que el proyecto `ultimo_dia_bambini` ya cuenta con toda la arquitectura resuelta y probada, el camino más eficiente para lanzar el nuevo evento es crear una **instancia independiente derivada**:

```mermaid
graph TD
    A["Repositorio Base: ultimo_dia_bambini"] -->|1. Duplicar código| B["Nuevo Directorio: evento_campamento"]
    B -->|2. Crear proyecto en Firebase| C["Nuevo Firebase Project (Aislamiento 100%)"]
    B -->|3. Adaptar Contratos & Zod| D["Ajustar modelos (fechas, talles, precios)"]
    B -->|4. Importar Lista de Chicos| E["Ejecutar script CSV del nuevo evento"]
    C & D & E -->|5. Deploy en Netlify| F["Nuevo Sitio Web Activo (ej: campamento-2026.netlify.app)"]
```

### Paso 1: Creación del Repositorio Limpio
1. Copiar la carpeta del proyecto a un nuevo directorio (ej: `d:\Proyectos\campamento_bambini`).
2. Reiniciar el historial Git para comenzar un repositorio fresco:
   ```powershell
   cd d:\Proyectos\campamento_bambini
   Remove-Item -Recurse -Force .git
   git init
   ```

### Paso 2: Creación del Proyecto en Firebase (Aislamiento Total)
1. Ir a [Firebase Console](https://console.firebase.google.com/) y crear un proyecto nuevo (ej: `campamento-bambini-2026`).
2. Habilitar **Cloud Firestore** en modo producción (con denegación total en reglas).
3. Habilitar **Authentication** con el proveedor *Email/Password*.
4. Dar de alta a los administradores u organizadores específicos de este nuevo evento.
5. Descargar la clave privada de la cuenta de servicio (`service-account.json`) y extraer las credenciales.

### Paso 3: Configuración de Variables de Entorno (`.env.local`)
Generar secretos totalmente nuevos y únicos para este evento:
```env
# Clave secreta para derivar hashes de tokens familiares (generar con openssl rand -hex 32)
FAMILY_TOKEN_PEPPER="secreto_criptografico_unico_para_este_evento_nuevo"

# Credenciales de Firebase Admin (del nuevo proyecto)
FIREBASE_PROJECT_ID="campamento-bambini-2026"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@campamento-bambini-2026.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Claves públicas para el panel de login de organizadores
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="campamento-bambini-2026.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="campamento-bambini-2026"

# Configuración del Sitio
NEXT_PUBLIC_APP_URL="https://campamento-2026.netlify.app"
```

### Paso 4: Ajuste de Campos Específicos del Evento
1. Modificar los esquemas Zod en `src/lib/schema/` según lo que requiera este evento:
   * Si no requiere talles de remera, se remueve o reemplaza por otro campo (ej. restricciones de menú o carpas).
   * Se actualiza el monto fijo del evento en centésimos y los datos bancarios.
2. Actualizar el contenido estático de la propuesta en la configuración de la campaña (descripción, cronograma, qué incluye).

### Paso 5: Carga de Participantes y Generación de Enlaces
1. Colocar la nómina de niños o participantes en `data/participants.csv`.
2. Ejecutar el script de seed para poblar Firestore y generar los enlaces:
   ```bash
   npm run seed:participants
   ```
3. El script emitirá el archivo `data/magic_links.csv` con los enlaces personalizados listos para que la comisión organizadora los distribuya por WhatsApp.

### Paso 6: Despliegue en Netlify
1. Conectar el nuevo repositorio en Netlify.
2. Cargar las variables de entorno en el panel de Netlify (*Site settings > Environment variables*).
3. Ejecutar el despliegue automático.

---

## 5. Resumen de Beneficios de este Enfoque

1. **Cero Riesgo Cruzado:** Un error o cambio en el nuevo evento no puede afectar bajo ninguna circunstancia a "El último día de clase".
2. **Independencia Organizativa:** Si la comisión organizadora del nuevo evento incluye a otras mamás o papás, ellos solo tienen acceso a su propio panel de administración y a sus cuentas bancarias, sin ver los datos del otro evento.
3. **Mantenimiento Simple:** Cada proyecto es autocontenido, liviano y puede archivarse o apagarse una vez transcurrido el evento sin dejar código huérfano.

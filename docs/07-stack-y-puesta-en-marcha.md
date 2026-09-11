# Stack elegido y puesta en marcha

Decisión del 7 de septiembre de 2026. El usuario autorizó concretar la propuesta técnica para comenzar el desarrollo y eligió expresamente Netlify para el despliegue. Este documento fija la elección; no afirma que los servicios estén contratados o la aplicación implementada.

## Tecnologías

| Componente | Elección |
|---|---|
| Lenguaje | TypeScript en modo estricto, tanto interfaz como servidor. |
| Aplicación | Next.js App Router con React, en un único repositorio. |
| Servidor | Route Handlers y servicios de dominio con runtime Node.js; Firebase Admin SDK solo en servidor. |
| Estilos | CSS Modules y variables CSS compartidas para colores, tipografía, espacios y controles. |
| Validación | Zod en datos de entrada, configuración y contratos. |
| Base de datos | Cloud Firestore, modo nativo, edición Standard. |
| Organizadores | Firebase Authentication con enlace de acceso por correo y cookies de sesión del Admin SDK. |
| Familias | Enlaces propios por familia/evento y sesiones opacas validadas por el servidor. No crear usuarios Firebase para familias. |
| Comprobantes | Cloud Storage for Firebase, bucket privado; proyecto en plan Blaze. |
| Alojamiento | Netlify para la plataforma de producción, con HTTPS y dominio propio cuando esté disponible. |
| Correo de acceso | Envío de enlaces mediante Firebase Authentication. No incorporar otro proveedor de correo en el MVP. |
| Pruebas | Vitest, Playwright y Firebase Emulator Suite para Auth, Firestore y Storage. |
| Dependencias | npm con package-lock.json versionado; instalación reproducible mediante npm ci. |

Usar versiones estables compatibles al inicializar, sin versiones canary ni copiar las versiones antiguas del blueprint. Registrar versiones exactas en package.json, lockfile y la versión de Node en configuración local y Netlify. Elegir una versión LTS de Node admitida simultáneamente por Next.js, Firebase Admin y Netlify.

## Por qué se elige

Es una solución adecuada para el alcance actual: formularios, etapas configurables, permisos por evento y conteos operativos. Un solo lenguaje y una aplicación con módulos evitan mantener dos proyectos de interfaz y servidor. Firebase concentra identidad, persistencia y archivos; Netlify aloja Next.js sin administrar un servidor propio.

Firestore permite transacciones para respuestas, auditoría y verificaciones. Las reglas de negocio siguen siendo responsabilidad de la aplicación. Los datos flexibles de las etapas se representan mediante esquemas versionados.

Esta elección no implica que Firestore sea superior para cualquier producto. Aceptamos consultas sin joins relacionales y necesidad de índices y agregaciones explícitas. Si en el futuro predominan contabilidad compleja o informes cruzados entre clientes, evaluar PostgreSQL con evidencia de esa necesidad. No introducir dos bases ahora ni prometer escala ilimitada.

## Organización inicial del código

```text
src/
  app/                  Rutas familiares, administrativas y API
  components/           Controles compartidos accesibles
  modules/
    access/             Identidades, sesiones y permisos
    groups/             Familias y grupos
    events/             Convocatorias y organizadores
    stages/             Editor, plazos, respuestas y cierres
    payments/           Informes, revisión y recepción
    support/            Consultas y seguimiento
    audit/              Registro de acciones
  server/               Firebase Admin, repositorios y configuración privada
  styles/               Variables y estilos base
tests/                  Integración y recorridos
scripts/                Datos ficticios y tareas operativas explícitas
```

Los componentes no realizan llamadas de Firestore o Storage desde el navegador. El SDK cliente de Firebase se limita al acceso de organizadores. El servidor controla los datos entregados a cada sesión. No usar exportación estática de Next.js: el producto necesita servidor.

### Next.js en Netlify

Usar la integración oficial de Netlify con su adaptador OpenNext. Soporta App Router, renderizado de servidor y Route Handlers. La autorización y Firebase Admin se ejecutan en funciones Node.js; no colocar el Admin SDK en Edge Middleware. [Next.js en Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

Al implementar, versionar netlify.toml con comando npm run build y directorio .next, dejando al adaptador generar las funciones. No usar output: export ni redirección global a index.html. Registrar la versión efectiva del adaptador en la evidencia de cada build; seguir la integración mantenida por Netlify en lugar del runtime legado.

Separar variables por contexto de producción y Deploy Preview. Autorizar en Firebase el dominio real del sitio y el dominio de pruebas elegido. Verificar en un deploy de prueba el canje de enlaces, las cookies, las cargas multipart y que ninguna página o descarga privada quede en caché compartida. Los comprobantes no deben pasar por el optimizador público de imágenes.

## Firestore y separación de datos

- Un proyecto Firebase por entorno, no por evento. Producción y pruebas remotas van en proyectos distintos; desarrollo usa emuladores.
- Estructura base: workspaces/{workspaceId}/groups, families y events; bajo cada evento, participants, organizers, stages, payments, support y audit. Respuestas e historiales se mantienen en documentos y subcolecciones, no en arrays ilimitados.
- Identidades globales de organizador guardan solo datos de cuenta. Pertenencias y permisos se validan dentro de cada ámbito.
- Identificadores deterministas para unicidad por familia/etapa y obligación de pago; creación o modificación mediante transacción.
- Reglas Firestore de denegación a clientes directos. El Admin SDK elude esas reglas: por ello, pruebas de autorización del servidor son obligatorias.
- Índices compuestos definidos en un archivo versionado, consultas paginadas y filtros diseñados antes de implementarlos.
- No cargar todos los eventos para filtrar permisos en el navegador. No mantener listeners en tiempo real para cada familia; actualizar al entrar, guardar o refrescar.
- Evitar un único contador global que todas las respuestas escriban. Derivar o mantener resúmenes por etapa/evento con operaciones consistentes.
- Cierres grandes se materializan por páginas con un identificador de ciclo y estado de finalización. Congelar escritura antes de materializar; no permitir reapertura hasta completar la copia. Nunca exigir que todo un evento quepa en una transacción o documento.

La documentación oficial describe reintentos de transacciones; las funciones transaccionales deben carecer de efectos externos como envío de correo. [Transacciones de Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions).

## Accesos concretos

### Organizador

Usar el flujo web oficial de enlace por correo. El enlace verifica la identidad; la membresía del evento sigue siendo obligatoria. Una identidad sin invitación o membresía no obtiene acceso por completar el login.

Tras el canje web, enviar ID token a un endpoint protegido contra CSRF, comprobar autenticación reciente y emitir cookie administrativa HttpOnly, Secure y SameSite. Verificar revocación e invitación/membresía en servidor. No confiar en el correo enviado por el cliente como prueba de identidad.

Los enlaces web de Firebase Authentication son el mecanismo seleccionado; no depender de Firebase Dynamic Links para una app móvil. Configurar dominios autorizados y permitir únicamente destinos de retorno propios. [Acceso por correo](https://firebase.google.com/docs/auth/web/email-link-auth), [cookies de sesión](https://firebase.google.com/docs/auth/admin/manage-cookies).

Los organizadores comparten invitaciones de incorporación de forma manual en el MVP. Firebase envía los correos de inicio de sesión cuando se solicitan; esto no introduce envíos automáticos de novedades del evento.

### Familia

Secreto de 32 bytes aleatorios en fragmento de enlace; HMAC-SHA-256 con secreto del servidor para el índice de canje. Al canjear, generar identificador de sesión aleatorio y almacenar solo su hash con participante, evento, accessVersion y expiración. Cookie familiar separada de la administrativa.

Consultar sesión y versión vigente en cada operación protegida. No guardar listas de permisos obsoletas dentro de una cookie que permita evadir revocación. Denegar cache compartida de páginas privadas y de la respuesta de canje. No implementar criptografía propia ni cookies que contengan los datos completos de la familia.

## Comprobantes: ruta y límites elegidos

Para el MVP, un archivo por versión del informe: JPEG, PNG, WebP o PDF de hasta **3.000.000 bytes**. No codificar en base64: enviar multipart. Validar el archivo real en servidor además de extensión y tamaño.

Carga y descarga pasan por endpoints de Next.js con autorización y Firebase Admin SDK. El bucket deniega acceso público y acceso directo por SDK cliente; no generar enlaces permanentes de descarga. Cada descarga nueva valida que la familia o el organizador sigan autorizados. Una copia ya descargada no se puede retirar del dispositivo.

Netlify documenta **6 MB** para peticiones/respuestas con buffer y un máximo efectivo aproximado de **4,5 MB para cargas binarias**, por la codificación interna. El límite de archivo de 3 MB deja margen; limitar también el cuerpo multipart total y comprobarlo en el adaptador desplegado. Las imágenes grandes se reducen en el dispositivo con vista previa; si no se pueden convertir o el PDF supera el límite, informar cómo elegir otro archivo sin perder el formulario. Probar cámara y formatos reales de iOS/Android. [Límites de Netlify Functions](https://docs.netlify.com/build/functions/configuration/).

Guardar primero un objeto provisional y validado, asociarlo al informe en una transacción y limpiar objetos no asociados mediante tarea idempotente. Firestore y Storage no forman una transacción conjunta. Una falla de carga nunca debe marcar el informe como enviado correctamente. Mantener versiones anteriores privadas.

Si luego se necesitan archivos mayores, diseñar carga directa temporal autorizada, cuarentena y finalización validada como un cambio explícito. No elevar el límite local ignorando el del alojamiento.

## Despliegue y costos

Netlify aloja la aplicación y sus funciones; Firebase aloja datos, identidad y archivos. Firebase Hosting no forma parte de esta configuración. Agrupar regiones de funciones, Firestore y Storage lo más cerca posible entre sí para reducir latencia; fijar las regiones concretas antes de crear producción, según disponibilidad del plan y necesidades de residencia de datos.

Costos verificados el 7 de septiembre de 2026:

- **Netlify: plan de la cuenta del usuario**, sujeto a sus condiciones y consumo. Las cuentas con precios por créditos incluyen planes Free, Personal y Pro; una cuenta anterior puede tener otras condiciones. No modificar ni contratar un plan automáticamente. Medir builds, peticiones, cómputo y tráfico para elegir capacidad antes del piloto. [Planes por créditos](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/), [precios de Netlify](https://www.netlify.com/pricing/).
- Los 5–10 organizadores son usuarios de nuestra aplicación; no requieren cuentas o asientos de desarrollo en Netlify. Antes de producción revisar disponibilidad al agotar créditos, recargas, cantidad de colaboradores técnicos y elementos de marca del plan. El proveedor está decidido; el plan de facturación se confirma con la cuenta real.
- **Firebase Blaze: facturación por uso**. Cloud Storage requiere este plan aunque existan franquicias sin cargo; no asumir que el piloto ni todos los servicios serán gratuitos. [Requisitos de Storage](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).

El costo total depende del plan de Netlify y del consumo de Netlify/Firebase, dominio e impuestos. Se elimina la referencia anterior a USD 20/mes de alojamiento, que correspondía al proveedor inicialmente propuesto. No prometer costo cero: medir lecturas, archivos, tráfico y correo durante la prueba técnica. Configurar alertas y límites disponibles; una alerta de presupuesto no equivale a un corte garantizado del gasto.

El desarrollo local puede comenzar con emuladores y datos ficticios sin contratar producción. La selección documentada no autoriza compras ni crea cuentas facturables por sí sola.

## Configuración operativa

Al inicializar, crear .env.example sin valores reales y validar variables con Zod:

- APP_URL y APP_ENV.
- FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY y FIREBASE_STORAGE_BUCKET, privadas en servidor. Usar almacén de secretos de Netlify; no guardar JSON de cuenta de servicio en el repositorio.
- NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN y NEXT_PUBLIC_FIREBASE_PROJECT_ID para Auth del navegador. Estos identificadores públicos no conceden permisos de datos.
- FAMILY_TOKEN_PEPPER, privado y distinto entre entornos. La sesión familiar opaca no requiere inventar una clave de cifrado adicional.
- FIRESTORE_EMULATOR_HOST, FIREBASE_AUTH_EMULATOR_HOST y configuración del emulador de Storage exclusivamente en desarrollo/pruebas. Bloquear arranque de producción si se detectan destinos de emulador.

Versionar configuración de emuladores, reglas, índices, scripts de verificación y lockfile. Las Deploy Previews de Netlify apuntan solo al entorno de pruebas y no reciben secretos o datos de producción.

## Secuencia de inicio

1. Inicializar Next.js, TypeScript estricto, CSS Modules y dependencias indicadas; fijar versiones.
2. Configurar emuladores, validación de entorno y semilla ficticia con dos espacios.
3. Implementar acceso y permisos antes de cargar datos reales.
4. Construir los incrementos del documento 05 y probar los escenarios del 06.
5. Preparar el sitio de Netlify y ejecutar una prueba técnica remota de correo, sesiones, caché privado y archivos dentro de límites, con entorno de pruebas autorizado.
6. Antes del piloto, configurar cuentas de facturación, dominio, regiones, respaldos, retención y datos reales. Habilitar despliegue e invitaciones de forma explícita.

Esta decisión permite comenzar el desarrollo. La primera integración debe comprobar que las versiones efectivamente instaladas funcionan juntas; la documentación consultada no sustituye esa prueba.

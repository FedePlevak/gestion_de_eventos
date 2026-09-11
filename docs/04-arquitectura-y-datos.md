# Arquitectura y datos

## Estado de la decisión técnica

La selección está cerrada para comenzar: TypeScript estricto, Next.js App Router con React, Cloud Firestore en modo nativo, Firebase Authentication por enlace de correo, Cloud Storage for Firebase privado y Netlify. Ver [stack y puesta en marcha](07-stack-y-puesta-en-marcha.md) para implementación, costos y fuentes oficiales verificadas el 7 de septiembre de 2026.

Se conserva la base tecnológica del blueprint y se concretan sus omisiones. Firebase usa Blaze para comprobantes; no se promete operación gratuita. Las versiones estables compatibles se fijan al inicializar y se registran en el proyecto. La autorización se ejecuta en los servicios del servidor, no depende exclusivamente del middleware.

## Estructura propuesta

Aplicación web con módulos de interfaz familiar y administrativa, servidor que concentra autorización y reglas de negocio, base de datos persistente y almacenamiento privado de comprobantes. Un monolito modular es suficiente para el MVP; evitar servicios separados sin necesidad demostrada.

Módulos: identidades y permisos, grupos, eventos y participantes, etapas y respuestas, resultados, cobros, soporte, auditoría y exportaciones.

Toda operación que lee o escribe datos protegidos pasa por autorización del servidor. No confiar en filtros del navegador, identificadores difíciles de adivinar ni controles deshabilitados como medidas de seguridad.

## Modelo conceptual

Los identificadores son opacos y estables. Las entidades de negocio llevan el identificador del espacio; las del evento también eventId. Las referencias se validan dentro de ese ámbito.

| Entidad | Datos y restricciones principales |
|---|---|
| Workspace | Nombre, estado, fechas. Límite entre clientes. |
| OrganizerAccount | Identidad del proveedor, correo verificado, nombre. Sin asociación automática a familia. |
| GroupAccess | Organizador, espacio y grupos que puede utilizar o gestionar. No concede acceso a todos los eventos. |
| EventOrganizer | Evento, organizador, estado, quién invitó y cuándo. Capacidades iguales para miembros activos. |
| OrganizerInvitation | Evento, correo, vencimiento y estado; secreto protegido y canje único. |
| Family | Identidad familiar dentro del espacio, nombre y contacto mínimo necesario. |
| Group / GroupMember | Lista reutilizable y membresías activas; sin respuestas ni pagos. |
| Event | Nombre, descripción, zona horaria, fecha opcional, estado, configuración de cobro y contacto. |
| EventParticipant | Evento, familia, datos de convocatoria, estado, alta/baja y motivo. Unicidad evento/familia. |
| FamilyAccess | Participación, hash del secreto, versión de acceso, revocación. No guardar el enlace en claro. |
| Stage | Evento, tipo, título, texto, esquema versionado, orden, estado, visibilidad, vencimiento y revisión para concurrencia. |
| StageQuestion | Identificador estable, tipo, obligatoriedad, opciones, condición simple y validaciones. Puede integrarse al esquema de Stage. |
| StageVisit | Familia/etapa, primera y última apertura. Separado de lectura confirmada. |
| ReadConfirmation | Familia/etapa, revisión del contenido y momento. |
| StageResponse | Familia/etapa, respuestas vigentes, revisión, primera y última presentación. Unicidad familia/etapa. |
| ResponseRevision | Copia de respuestas de cada modificación aceptada, actor familiar, fecha y versión. |
| StageClosure | Ciclo de cierre, motivo, fecha efectiva, participantes y respuestas del resultado final. |
| PublishedResult | Copia agregada, fecha, cierre/revisión de origen, condición provisoria o final y retirada opcional. |
| PaymentObligation | Evento/participante, importe esperado, moneda, inclusión/exclusión y motivo. Una por participante. |
| PaymentReport | Informe vigente y versiones, importe declarado, fecha de transferencia, referencia, estado y adjuntos. |
| PaymentReview | Acción administrativa, importe recibido, fecha declarada de recepción, actor, motivo y momento efectivo de registro. |
| Attachment | Referencia privada al objeto, tipo comprobado, tamaño, ámbito, autor y estado de validación. Sin URL pública permanente. |
| SupportRequest | Evento/familia, asunto, descripción, estado, responsable y resumen público de resolución. |
| SupportAction | Cambio de estado, nota interna o resumen público; actor y momento. |
| AuditEvent | Ámbito, actor, acción, objeto, fecha del servidor, cambio y correlación de operación. Solo agregado. |

Las listas grandes y los historiales deben paginarse. No guardar una lista de respuestas de crecimiento ilimitado dentro de un único registro del evento.

## Autenticación y sesiones

### Organizadores

- Acceso elegido: enlace de correo de Firebase Authentication. No implementar un sistema propio de códigos ni contraseñas. Canjear el ID token por cookie de sesión administrativa mediante Firebase Admin SDK y protección CSRF.
- Verificar correo e invitación antes de conceder pertenencia. Estar autenticado no implica tener acceso a un evento.
- Validar membresía activa en cada operación. Revocar membresía corta acceso aunque la sesión de identidad siga vigente.

### Familias

- Generar un secreto con aleatoriedad criptográfica suficiente; almacenar su hash o HMAC y una versión de acceso.
- Mecanismo elegido: secreto en fragmento de URL, canje por POST, limpieza de la URL y cookie de sesión segura. El fragmento evita que viaje como parte de la solicitud inicial, pero no protege frente a quien posea el enlace o scripts que lean la página.
- Sesión HttpOnly y Secure en producción, política SameSite apropiada y protección frente a solicitudes cruzadas en escrituras.
- Consultar vigencia de participación y versión de acceso en cada operación protegida. Evitar caches que demoren una revocación prometida como inmediata.
- El enlace original se entrega al generarlo. Si se requiere volver a obtenerlo y no está disponible, se regenera; un hash no permite exportarlo de nuevo. Advertir que la regeneración invalida el anterior.
- La exportación inicial de enlaces es un archivo sensible para entrega manual. No se sube al repositorio ni se expone como descarga pública; eliminar copias temporales según el procedimiento operativo.

Sesiones administrativas y familiares con nombres y ámbitos separados para coexistir en el mismo navegador sin mezclarse.

## Autorización por operación

Cada operación familiar comprueba sesión → participación → evento → disponibilidad de etapa → plazo → propiedad del recurso. La lectura de un comprobante requiere pertenencia a esa familia o ser organizador del evento.

Cada operación administrativa comprueba identidad → membresía activa → pertenencia del recurso al evento → transición permitida. Administración de grupos requiere permiso sobre el grupo, no solo autenticación.

Rechazar referencias cruzadas incluso si el usuario conoce identificadores válidos de otro espacio. Entregar únicamente los campos necesarios a cada interfaz.

## Consistencia y auditoría

- Usar reloj del servidor y marcas de tiempo persistentes. Guardar instantes en UTC y presentar con zona horaria del evento.
- Guardar importes en unidades menores enteras con moneda explícita; no usar coma flotante para cálculos financieros.
- Respuesta y revisión histórica se escriben en una transacción o mecanismo equivalente.
- Revisar versión de etapa, estado y plazo dentro de la misma operación que acepta la respuesta. Resolver carreras entre responder, cerrar y editar contenido.
- La primera respuesta debe bloquear cambios semánticos de manera atómica; comprobarlo solo en la interfaz no basta.
- Las verificaciones de pago y sus reversos son idempotentes. Una sola recepción vigente por obligación.
- Cambios administrativos y auditoría se confirman juntos. El actor proviene de la sesión, nunca de un campo enviado por el cliente.
- Copias finales de cierre deben representar las respuestas aceptadas antes del límite, aunque se materialicen después. La reapertura no comienza hasta preservar el cierre anterior.
- Generar exportaciones autorizadas; neutralizar texto que pueda ejecutarse como fórmula al abrir un archivo tabular.

## Archivos y privacidad

- Almacenamiento privado separado del contenido público. Descarga mediante autorización o URL temporal de duración limitada; documentar cualquier demora de revocación que introduzca una URL firmada.
- Validar tamaño, extensión y contenido real del archivo. No aceptar HTML ni SVG como comprobantes visualizables.
- Usar nombres internos aleatorios, evitar ejecución de contenido y descargar archivos no previsualizables con encabezados seguros.
- Aplicar límites de frecuencia a canjes, cargas y formularios. No cargar contenido de terceros en páginas que canjean secretos sin evaluar su acceso a esos datos.
- No incluir comprobantes, tokens, referencias bancarias completas o respuestas sensibles en logs de errores o herramientas de analítica.
- Pedir solo datos alimentarios necesarios para organizar; no introducir formularios médicos por herencia del blueprint.
- Separar notas internas y contenido familiar en el modelo y en las respuestas del servidor.

## Operación antes del piloto

- Entornos de desarrollo/pruebas y producción separados, con datos ficticios fuera de producción.
- Secretos fuera del repositorio, permisos de servicio mínimos y procedimiento de rotación.
- Copias de seguridad y prueba de restauración, incluyendo relación entre base de datos y comprobantes.
- Monitoreo de errores, correo fallido, capacidad y costos, sin datos sensibles innecesarios.
- Política documentada de conservación y eliminación. La auditoría de aplicación no equivale a almacenamiento imposible de alterar por un operador de infraestructura.
- Seguir el documento 07 y registrar las versiones realmente instaladas y los resultados de integración. Reconfirmar precios antes de contratar; las credenciales y el dominio son configuración operativa pendiente, no una elección de stack pendiente.

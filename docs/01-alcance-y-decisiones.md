# Alcance y decisiones del MVP

## Problema y resultado esperado

Los comités necesitan consultar a familias, comunicar avances y reunir respuestas sin reconstruir conversaciones de WhatsApp ni mantener conteos paralelos. La plataforma debe mostrar qué respondió cada familia, qué falta y cuáles son los resultados al cierre. También debe completar el circuito de pago informado y recepción verificada.

El piloto debe permitir gestionar una fiesta de fin de año para aproximadamente 80 familias con entre 5 y 10 organizadores. La estructura debe servir a futuros grupos y eventos sin duplicar una aplicación por evento.

## Decisiones confirmadas por el usuario

| Área | Decisión |
|---|---|
| Producto | Plataforma reutilizable para distintos grupos, eventos y organizadores. |
| Grupos | Se pueden crear y modificar; al crear un evento se usa uno existente, se toma como base o se crea uno nuevo. |
| Participantes | La convocatoria del evento se puede ajustar sin modificar el grupo original. |
| Familia | Una identidad compartida; una respuesta por familia y consulta; no se identifica al adulto. |
| Acceso familiar | Enlace privado único por familia y evento, sin registro ni contraseña. |
| Organizadores | Cuentas individuales; todos pueden gestionar el evento. No son participantes por tener ese rol. |
| Separación | Quien también participa debe entrar mediante el enlace de su familia. Sin cambio de rol a familia desde administración. |
| Etapas | Configurables, ordenables e independientes; varias pueden estar disponibles simultáneamente. |
| Visibilidad | Una etapa inactiva o no visible no es accesible a las familias. |
| Plazos | Vencimiento opcional con cuenta regresiva. Se puede responder y editar hasta el cierre; después solo consultar. |
| Participación | Información con confirmación de lectura, Sí/No con texto, opciones y otras preguntas necesarias para el evento. |
| Seguimiento | Diferenciar acceso al contenido, lectura confirmada y respuesta enviada, con fechas. |
| Resultados | Se publican cuando el comité decide. |
| Integridad | No cambiar preguntas u opciones ya contestadas; duplicar para una nueva consulta. No editar respuestas en nombre de familias. |
| Cambios de plazo | Permitir extensión, cierre anticipado y reapertura con registro y advertencias; conservar cierres anteriores. |
| Pago | Un importe por familia y un único pago por evento; sin cuotas ni pagos parciales. |
| Recepción | La familia informa y puede adjuntar comprobante; el comité verifica recepción o solicita revisión. |
| Trazabilidad | Acciones familiares con familia y momento; acciones administrativas con persona y momento. |
| Soporte | Registro inicial y gestión por estados del comité. La resolución puede continuar por otra vía. |
| WhatsApp | Mensajes preparados para copiar o abrir en WhatsApp. El usuario realiza el envío. |
| Experiencia | Mobile-first, intuitiva para familias y organizadores sin experiencia digital. |

## Alcance incluido

Decisión técnica incorporada el 7 de septiembre de 2026, por autorización del usuario para concretar la propuesta: TypeScript, Next.js con React, Cloud Firestore, Firebase Authentication mediante enlace de correo, Cloud Storage privado y despliegue en Netlify. Firebase utiliza Blaze para el almacenamiento. Ver [stack y puesta en marcha](07-stack-y-puesta-en-marcha.md). La elección no implica contratación ni despliegue ya realizados.

- Espacios separados para diferentes clientes o colectivos, con grupos y eventos propios.
- Administración de grupos y familias; alta individual y carga de una lista mediante archivo tabular con vista previa y validación.
- Creación de eventos desde un grupo y ajuste de participantes.
- Invitaciones a organizadores y acceso individual sin contraseña mediante correo verificado.
- Generación, entrega manual y reemplazo de enlaces familiares.
- Etapas de información, Sí/No, una opción, varias opciones, respuesta abierta, cantidades y pago.
- Preguntas complementarias y condición sencilla: mostrar un campo cuando una respuesta concreta lo requiere.
- Borradores, vista previa, publicación, orden, ocultación, cierre, reapertura, duplicación y anulación.
- Resúmenes de participación, resultados y filtros de pendientes.
- Registro de pago, comprobante privado, revisión y verificación.
- Bandeja de soporte con responsable, estados e historial.
- Plantillas de mensajes de WhatsApp y exportación de respuestas, participación y pagos.
- Archivo de eventos y registro de auditoría.

## Supuestos de implementación propuestos

Estos puntos concretan el MVP y pueden ajustarse al revisar el diseño. No fueron todos confirmados individualmente.

1. Un “espacio” es el límite de separación entre clientes. Su creación inicial y la invitación del primer organizador serán operadas por el responsable de la plataforma, sin portal comercial de alta automática.
2. Un grupo sirve como origen de la lista de participantes. Combinar varios grupos automáticamente queda fuera del MVP.
3. Un único importe en la moneda configurada por evento se aplica a todas las familias convocadas al cobro. Por defecto se incluyen todas las familias activas; el comité puede excluir una con motivo antes de cerrar la lista de cobro. No se infiere obligación de pago a partir de votos o cantidad de asistentes.
4. El comprobante es opcional, como indica el blueprint: la familia puede informar el pago sin adjunto. El comité verifica contra su cuenta. Para el MVP: un archivo JPEG, PNG, WebP o PDF por versión del informe, hasta 3 MB (3.000.000 bytes); las imágenes grandes se reducen en el dispositivo con vista previa antes de enviar. Ver documento 07.
5. Resultados familiares agregados y publicados como una copia fechada, no como un tablero que cambia sin aviso. No se publican textos libres, datos alimentarios ni información financiera individual.
6. La identidad familiar permanece en el espacio, pero cada evento tiene participación y acceso propios. El teléfono no es una identidad única fiable.
7. El soporte usa Nueva, En gestión y Resuelta. Las notas internas se separan del motivo o resumen visible para la familia.
8. Un evento tiene una zona horaria explícita, inicialmente America/Montevideo. El servidor define la hora efectiva de cierre.

## Fuera del MVP

- Procesamiento de dinero, conexión bancaria, conciliación automática, cuotas, pagos parciales, reintegros y contabilidad de gastos.
- Chat, foro, debates públicos y envío automático de WhatsApp.
- Sitio comercial, suscripciones, facturación del servicio y alta autónoma de colegios.
- Aplicaciones nativas, funcionamiento completo sin conexión y notificaciones push.
- Editor de formularios con reglas arbitrarias, automatizaciones entre etapas o decisiones automáticas por mayoría.
- Identificación de adultos familiares y suplantación de familias desde administración.
- Reutilización automática de respuestas, comprobantes o pagos entre eventos.

## Validaciones antes de usar datos reales

No impiden comenzar el desarrollo con datos ficticios.

- Nombre del piloto, fecha, zona horaria, nómina y organizadores iniciales.
- Importe, moneda, instrucciones bancarias y familias alcanzadas por el cobro.
- Dominio, cuentas de Firebase/Netlify, configuración del correo de Firebase Authentication, costos al contratar y responsable operativo. Los proveedores ya están elegidos en el documento 07.
- Plazo de conservación de datos y comprobantes, aviso de privacidad y procedimiento de atención de solicitudes de eliminación.
- Prueba de usabilidad con personas representativas del piloto y corrección de bloqueos encontrados.

## Qué significa MVP completado

Los recorridos familiares y administrativos funcionan de punta a punta, con persistencia real, acceso separado por evento, registro de acciones y pruebas de las reglas críticas. Los criterios de docs/06-aceptacion-y-pruebas.md deben pasar. Un prototipo visual o una demostración con almacenamiento simulado no completan el MVP.

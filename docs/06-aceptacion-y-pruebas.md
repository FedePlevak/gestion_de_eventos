# Criterios de aceptación y pruebas

## Accesos y separación

- A01: un enlace familiar válido abre únicamente la participación de esa familia en ese evento, sin formulario de registro.
- A02: un enlace revocado y sus sesiones anteriores dejan de funcionar; el nuevo conserva respuestas y pagos.
- A03: conocer la URL o identificador de otra familia, evento o comprobante no habilita su acceso.
- A04: una cuenta organizadora sin membresía no accede al evento. Retirar la membresía corta operaciones en sesiones abiertas.
- A05: un organizador no aparece como participante por tener cuenta y no puede actuar como familia desde administración.
- A06: dos espacios no comparten datos aunque existan nombres, correos o teléfonos coincidentes.
- A07: familia y organizador pueden usar el mismo navegador con sesiones separadas sin atribuciones incorrectas.

## Grupos y convocatoria

- G01: crear un evento desde un grupo carga las familias seleccionadas sin copiar respuestas o pagos de otros eventos.
- G02: agregar o quitar participantes del evento no modifica el grupo de origen.
- G03: modificar o archivar un grupo no altera eventos existentes.
- G04: una baja conserva historial y no cambia copias de resultados cerrados; los indicadores actuales identifican la baja.
- G05: una importación informa filas inválidas y posibles duplicados antes de confirmar. No envía invitaciones.
- G06: un organizador solo puede usar grupos autorizados y no puede dejar un evento sin ningún organizador activo.

## Etapas y respuestas

- E01: pueden coexistir varias etapas visibles y se conserva el orden del comité en móvil y escritorio.
- E02: una etapa oculta, borrador o anulada no entrega contenido ni permite respuestas por llamadas directas al servidor.
- E03: cada tipo admite sus respuestas válidas y rechaza datos inválidos en servidor, incluyendo campos condicionales y límites de selección.
- E04: una etapa informativa ofrece lectura explícita y no exige una respuesta inexistente.
- E05: antes del vencimiento, la familia modifica su respuesta y se conservan versión anterior y fecha.
- E06: en el instante del vencimiento o después, se rechaza la escritura aunque el formulario se haya abierto antes. Verificar también una solicitud que estaba en tránsito.
- E07: sin fecha, la etapa continúa abierta hasta cierre manual. La cerrada visible muestra la respuesta propia sin edición.
- E08: ocultar no pausa el vencimiento. Mostrar de nuevo una etapa vencida no la reabre.
- E09: desde la primera respuesta o lectura, se rechaza cambiar contenido semántico, incluso si otro organizador intenta hacerlo al mismo tiempo que llega esa primera respuesta.
- E10: duplicar crea borrador sin respuestas, lecturas, resultados ni pagos. No crea una segunda obligación financiera.
- E11: reapertura exige motivo, conserva cierre anterior y vuelve provisorios los resultados actuales.
- E12: una respuesta guardada en otro dispositivo genera conflicto visible; no se pierde silenciosamente.
- E13: si falla el guardado, se conservan los valores en pantalla y no se muestra confirmación falsa.
- E14: una aclaración posterior no reemplaza texto confirmado ni renueva automáticamente la lectura.

## Seguimiento y publicación

- R01: abrir el evento no marca todas las etapas vistas. Abrir una etapa no confirma lectura.
- R02: responder registra respuesta y momento sin fabricar confirmación explícita de lectura.
- R03: no responder no cuenta como No, cero ni abstención explícita.
- R04: conteos incluyen denominador; selección múltiple distingue familias de selecciones; cantidades suman unidades.
- R05: las familias no ven resultados antes de publicación; publicación muestra fecha y condición provisoria/final.
- R06: publicar no expone textos libres, datos alimentarios, estados de pago individuales ni notas internas.
- R07: reabrir no presenta una copia anterior como resultado final vigente. Ocultar una etapa oculta también sus resultados.

## Pagos

- P01: cada familia convocada tiene una obligación única, sin multiplicación por asistentes.
- P02: informar con o sin comprobante deja estado pendiente de verificación y registra fecha declarada y fecha de presentación por separado.
- P03: la familia no puede verificar su pago mediante interfaz ni solicitud directa.
- P04: diferencias de importe se señalan y no se computan como recepción completa automáticamente.
- P05: solicitud de revisión conserva motivo visible y versiones. Una corrección familiar solo se acepta con etapa abierta y pago no verificado.
- P06: verificar registra organizador, momento, importe y recepción; doble clic, reintento o dos revisores no duplican el monto.
- P07: corregir una verificación conserva motivo e historial y ajusta totales exactamente una vez.
- P08: el comité puede conciliar después del vencimiento familiar; un evento archivado requiere restauración para nuevas operaciones.
- P09: un comprobante solo es accesible a su familia y comité autorizado. Archivos inválidos o excesivos se rechazan sin perder los demás datos del formulario.
- P10: un registro administrativo de recepción no aparece como informe realizado por una familia.
- P11: no se cambia el importe esperado después del primer informe o recepción; cambios bancarios conservan información anterior y autor.

## Soporte, mensajes y auditoría

- S01: cada familia solo consulta sus tickets. El comité cambia estado, responsable y resolución con autor y fecha.
- S02: notas internas no llegan a respuestas del servidor destinadas a familias.
- S03: los mensajes se copian o abren en WhatsApp, pero no se marcan enviados ni leídos. Un mensaje grupal no contiene secretos familiares.
- S04: modificar, cerrar, reabrir, anular, verificar o revocar genera registro atribuible. Ningún endpoint ordinario permite editar o borrar auditoría.
- S05: archivar conserva lectura y exportación, bloquea nuevas acciones; restaurar no reabre etapas vencidas.

## Estrategia de pruebas

1. Unitarias para reglas de transición, validaciones, cálculos y límites temporales.
2. Integración con persistencia y almacenamiento de prueba para aislamiento, autorización, transacciones, auditoría e idempotencia.
3. Pruebas de recorridos en navegador móvil para acceso, respuesta, vencimiento, pago, soporte y creación de etapas.
4. Pruebas concurrentes para primera respuesta contra edición, respuesta contra cierre, dos dispositivos y dos verificadores.
5. Revisión manual con celulares reales, teclado y lector de pantalla en recorridos críticos; confirmar también carga desde cámara y comportamiento al volver de WhatsApp.

Usar datos ficticios, reloj controlado para límites y casos de zonas horarias. No conectar pruebas a cuentas bancarias ni enviar mensajes reales.

## Condiciones para habilitar el piloto

- Todos los escenarios críticos anteriores pasan; las excepciones deben documentarse y acordarse, nunca omitirse silenciosamente.
- No hay bloqueos en las tareas de usabilidad definidas en docs/03-experiencia-de-usuario.md.
- Recorridos principales funcionan a 360 px, con teclado y sin depender exclusivamente del color o arrastre.
- Se han validado almacenamiento privado, revocación, correo de acceso, respaldo y restauración.
- Datos del evento, nómina, cobro y comité fueron revisados antes de enviar enlaces.
- Retención y privacidad definidas; costos y límites de servicios verificados.
- No quedan mocks o datos simulados en recorridos que se presentan como funcionales.
- Existe procedimiento de atención de fallos y habilitación explícita para publicar y distribuir accesos.

## Registro de ejecución

| Escenario | Versión | Entorno | Fecha | Resultado | Evidencia |
|---|---|---|---|:---:|---|
| G05 | v0.1.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/access.test.ts` (detección de duplicados e inválidos) |
| A01, A02, A03 | v0.1.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/access.test.ts` (HMAC pepper, revocación y aislamiento de evento) |
| A04, G06 | v0.1.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/access.test.ts` (membresía de organizador y revocación) |
| E01 | v0.2.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/stages.test.ts` (coexistencia y ordenamiento de etapas) |
| E02 | v0.2.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/stages.test.ts` (bloqueo de etapas ocultas y borradores) |
| E03 | v0.2.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/stages.test.ts` (validación de tipos de respuesta y cantidades) |
| E04 | v0.2.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/stages.test.ts` (confirmación explícita de lectura) |
| E05 | v0.2.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/stages.test.ts` (versionado incremental e historial de respuestas) |
| E06 | v0.2.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/stages.test.ts` (rechazo en servidor por vencimiento) |
| E09 | v0.2.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/stages.test.ts` (bloqueo semántico de opciones tras primera respuesta) |
| E11 | v0.2.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/stages.test.ts` (reapertura con motivo obligatorio e historial) |
| E12 | v0.2.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/stages.test.ts` (conflicto de concurrencia entre dispositivos) |
| P02 | v0.3.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/payments.test.ts` (estado reported y fechas declarada y real separadas) |
| P03, P05 | v0.3.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/payments.test.ts` (corrección familiar y bloqueo tras verificación) |
| P06 | v0.3.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/payments.test.ts` (verificación administrativa idempotente) |
| P07 | v0.3.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/payments.test.ts` (reversión justificada y ajuste exacto de totales) |
| P09 | v0.3.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/payments.test.ts` (límite estricto de 3 MB y tipos MIME permitidos) |
| P10 | v0.3.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/payments.test.ts` (registro administrativo directo sin falsear acción familiar) |
| R04 | v0.4.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/communication.test.ts` (denominadores reales con familias convocadas) |
| R05 | v0.4.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/communication.test.ts` (publicación y despublicación explícita para familias) |
| R06 | v0.4.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/communication.test.ts` (privacidad y no exposición de textos libres ni datos individuales) |
| R07 | v0.4.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/communication.test.ts` (etapa oculta oculta automáticamente sus resultados) |
| S01 | v0.4.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/communication.test.ts` (aislamiento estricto de tickets de soporte por familia) |
| S02 | v0.4.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/communication.test.ts` (supresión absoluta de notas internas en vistas familiares) |
| S03 | v0.4.0 | Local / Vitest | 2026-09-08 | PASÓ | `tests/communication.test.ts` (plantillas y enlaces wa.me sin envíos automáticos ni efectos colaterales) |


# Acceso y experiencia familiar

Parte del [encargo](../10-implementacion-marca-mobile-first.md). Estados y textos en [04](04-estados-y-contenidos.md); comprobaciones en [06](06-aceptacion-y-evidencia.md).

## Reglas comunes

Nombre del evento y nombre de la familia reconocibles, sin duplicar «Familia» si el dato ya lo incluye. Una columna, lectura breve, siguiente acción concreta y confirmación persistente. Mostrar información del evento autorizado; nunca obtener identidad de un parámetro manipulable para presentarla como autenticada.

No añadir un selector de rol ni accesos administrativos dentro de la sesión familiar. Las cuentas organizadoras que también participan usan el enlace de su familia por separado. No usar enlaces privados como destino del logotipo, metadato, clave de analítica o contenido de capturas.

## Entrada pública · `src/app/page.tsx`

Orden: marca, explicación breve, ingreso de organizadores e instrucción para familias. Titular propuesto: «Organizá el encuentro con las cosas claras». Apoyo: «Consultas, avisos y seguimiento de pagos para eventos de familias».

Acción administrativa: «Ingresar como organizador», hacia `/admin`. Instrucción familiar: «Abrí el enlace privado que te compartió el comité. No necesitás crear una cuenta». Si se mantiene acceso a `/f`, rotularlo «Ya tengo mi enlace» como recuperación secundaria, no como inscripción pública.

No agregar precios, testimonios, métricas de demostración, buscador público de familias o alta comercial. En 360 px el propósito y los dos caminos deben entenderse sin una portada que ocupe varias pantallas.

## Canje del enlace · `src/app/f/page.tsx`

| Estado | Presentación |
|---|---|
| Canje en curso | Marca discreta y «Estamos abriendo el espacio de tu familia». Bloquear envíos duplicados. |
| Sin enlace | Explicar dónde encontrarlo. La recuperación manual existente puede quedar en «Tengo un enlace y no pude abrirlo». |
| Error de conexión | «No pudimos abrir el evento. Intentá de nuevo». Ofrecer reintento seguro sin mostrar el secreto. |
| Enlace reemplazado o inválido | Explicación y contacto con el comité; no culpar al usuario ni mostrar un error técnico. |
| Éxito | Redirigir al evento que devuelve el servidor, sin pantalla ficticia de bienvenida intermedia. |

Si se conserva el pegado manual: etiqueta «Enlace que recibiste», sin autocompletar ni corrector, sin guardarlo en almacenamiento persistente y sin imprimir su valor en errores. No exigir transcribir un código para el recorrido normal.

El código observado acepta también secretos en query string y varios formatos de fragmento. Es un hallazgo a revisar como función de acceso, no un ejemplo que deba propagarse. Mantener el contrato documentado de secreto en fragmento, canje en servidor y limpieza del navegador. No cambiar emisores y receptores por separado ni romper invitaciones sin analizar compatibilidad. No probar secretos o enlaces reales.

## Inicio del evento · `src/app/e/[eventId]/page.tsx`

Orden de contenido:

1. Cabecera con marca, evento y familia.
2. Fecha del encuentro y contexto breve, si existen datos.
3. Pendientes que requieren acción familiar, separados de verificaciones a cargo del comité.
4. Tarjetas de información y consultas visibles, en el orden definido por el comité.
5. Estado de pago cuando corresponde y acceso a ayuda.

Cada tarjeta contiene título, contexto, estado de esa familia, plazo cuando existe y una acción explícita. No mostrar etapas ocultas o borradores ni reservarles tarjetas vacías. Consultas cerradas visibles permanecen en lectura.

No confundir abrir, confirmar lectura y responder. Para información se espera confirmación de lectura; para una pregunta se espera respuesta. No usar indiscriminadamente `hasResponded || hasRead` para afirmar que todas las consultas están completadas.

El estado `reported` quita la necesidad de informar nuevamente, pero mantiene «Pendiente de verificación». Mensaje posible: «No tenés respuestas pendientes. Tu pago sigue esperando verificación». La barra de progreso no debe hacer creer que ese aporte fue recibido. Evitar porcentajes agregados si mezclan acciones familiares con trabajo pendiente del comité.

Si no hay etapas visibles: «Todavía no hay información o consultas disponibles. El comité te avisará cuando haya novedades». Evento archivado: información en lectura y explicación del estado. Sesión inválida: instrucciones de acceso sin datos del evento.

## Consulta · ruta `/e/[eventId]/stages/[stageId]`

Archivos: `page.tsx`, `StageClientInteraction.tsx`, `StagePublishedResults.tsx` dentro de `src/app/e/[eventId]/stages/[stageId]/`.

Orden: volver al evento, título, contenido, aclaraciones fechadas cuando existen, fecha de cierre, acción o formulario, confirmación propia y resultados publicados si están autorizados.

| Tipo existente | Contrato móvil |
|---|---|
| `info` | Lectura y botón «Confirmar que leí». La apertura por sí sola no confirma lectura. |
| `yes_no` | Radios o controles equivalentes grandes; «Sí» y «No» explícitos. Complemento solo cuando corresponde al esquema. |
| `single_choice` | Una lista vertical con radios y área completa de selección. |
| `multiple_choice` | Checkboxes, instrucción sobre máximo cuando exista y error que preserve selecciones. |
| `open_text` | Textarea con etiqueta, altura adaptable y conservación del texto ante fallo. |
| `integer_quantity` | Campo de cantidad con teclado apropiado; valor cero válido cuando las reglas lo permiten. Nunca convertir vacío en cero. |

Respetar el esquema real de preguntas; no diseñar lógica condicional que el servidor no soporte sin registrar esa brecha. La presentación no cambia la obligatoriedad ni las opciones.

Acción: «Guardar respuesta». Mientras espera: «Guardando respuesta…». Tras aceptación: «Respuesta guardada» y fecha real. Si sigue abierta, indicar hasta cuándo se puede editar. Sin plazo, no inventar fecha límite.

En conflicto entre dispositivos, mostrar que la familia guardó otra versión y ofrecer cargarla; no sobrescribir en silencio. Al vencer mientras se escribe, conservar lo escrito como referencia y aclarar que no fue enviado. Cerrar el formulario en la interfaz no reemplaza el rechazo del servidor.

Resultados: denominador, fecha de publicación y carácter provisorio/final. Selección múltiple distingue elecciones de familias; cantidades expresan unidades. Mantener visible si la consulta fue reabierta y la publicación pertenece a un cierre anterior. Ningún texto libre, dato alimentario o dato financiero individual debe aparecer por el rediseño.

## Pago · ruta `/e/[eventId]/payment`

Archivos: `src/app/e/[eventId]/payment/page.tsx` y `PaymentClientForm.tsx`.

Orden: volver al evento, estado vigente, importe con moneda, instrucciones bancarias, informe familiar y ayuda. Si no está habilitado, explicar la situación; no generar deuda ni formulario operativo por mostrar la tarjeta.

Datos bancarios con etiquetas y acciones de copia específicas. Confirmar qué campo se copió, sin copiar otros datos ni exponerlos fuera del evento. No usar «Pagar» para la acción de enviar un informe.

Campos: importe transferido, fecha de transferencia, referencia opcional y comprobante opcional. Mantener los límites documentados de un archivo JPEG, PNG, WebP o PDF de hasta 3.000.000 bytes. Ofrecer selección desde celular y cámara si el dispositivo lo permite, sin forzar cámara ni impedir elegir PDF. La capacidad de reducir imágenes se verifica; no anunciarla si no existe.

Antes de enviar, vista previa o nombre legible, tamaño y posibilidad de retirar el adjunto. Archivo rechazado o error de carga no borra el resto de los campos. El comprobante se consulta por el recorrido privado autorizado; no usar una URL pública ni optimización pública de imágenes.

Después de informar: «Pago informado. Pendiente de verificación». En revisión: motivo visible y corrección cuando la etapa permita editar. Verificado: «Pago recibido», importe y fecha de recepción si existe como dato; `verifiedAt` corresponde a la verificación, no debe inventar la fecha bancaria. Etapa cerrada: conservar lectura y ofrecer ayuda, sin excepciones silenciosas al plazo.

## Ayuda · `FamilySupportSection.tsx`

Ubicación existente: `src/app/e/[eventId]/FamilySupportSection.tsx`. Rótulo de navegación «Ayuda» o «Mis consultas al comité» para distinguir de las consultas del evento.

Lista propia con asunto, fecha, estado y resolución visible. Formulario breve con asunto y descripción. Mantener valores ante fallo. Aclarar que el comité puede continuar la gestión por otra vía; no diseñar un chat o prometer un tiempo de respuesta que no exista.

No presentar notas internas, consultas de otras familias ni lista pública de contactos. Evento archivado conserva consulta de registros y bloquea nuevas solicitudes conforme al servidor.

## Estados transversales

Para cada ruta: carga, vacío, acceso inválido, error recuperable, contenido largo y éxito. Para formularios: sin cambios, cambios sin guardar, guardando, error, conflicto y cierre. Mantener posición y foco razonables al volver a la lista. La desaparición de una tarjeta tras guardar nunca será la única confirmación.

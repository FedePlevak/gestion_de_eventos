# Aceptación de la implementación Rondia

Esta matriz complementa docs/06. No reemplaza sus criterios funcionales. Cada escenario usa datos ficticios y se registra con versión, entorno, fecha, resultado y evidencia reproducible.

## Condiciones generales

- Build y comprobación de tipos completan sin errores nuevos.
- Las pruebas existentes siguen pasando. Las correcciones funcionales agregan pruebas en la capa que realmente cambió.
- No hay secretos, tokens, credenciales ni datos reales en repositorio, HTML entregado al navegador, capturas, consola, fixtures o reportes.
- No se despliega ni se envían mensajes reales durante la validación.
- La identidad está aplicada a todas las superficies inventariadas, no solo a la portada.

## Matriz visual y responsive

| ID | Escenario | Aceptación |
|---|---|---|
| RV01 | 320 px | Entrada, acceso, evento familiar, consulta, pago y cada sección administrativa no tienen desborde horizontal del documento. |
| RV02 | 360 y 390 px | Todos los recorridos críticos completan con una mano, objetivos de al menos 48 × 48 px y sin gesto lateral obligatorio. |
| RV03 | 768 px | Formularios no se ensanchan por encima de 640 px; tarjetas aprovechan el espacio sin introducir otro recorrido. |
| RV04 | 1024 y 1440 px | Administración utiliza hasta 1120 px; listas y resúmenes ganan legibilidad sin cambiar el orden o significado. |
| RV05 | texto al 200 % | El contenido se reacomoda; botones, estados, diálogos y errores no se solapan o recortan. |
| RV06 | contenido largo | Evento, familia, consulta, correo, motivo, archivo y montos largos envuelven o se reorganizan sin perder acciones. |
| RV07 | teclado móvil | El teclado no deja inaccesible el campo activo o Guardar; cerrar un bloque no pierde texto sin advertencia. |
| RV08 | reducción de movimiento | Sin scroll suave forzado, movimiento continuo o transición necesaria para comprender un estado. |
| RV09 | orientación horizontal | Los recorridos siguen utilizables; no dependen de una altura de pantalla fija. |

Registrar capturas de referencia solo con datos ficticios en 360 y 1024 px. Las capturas verifican composición; no prueban permisos o guardado.

## Identidad y componentes

| ID | Escenario | Aceptación |
|---|---|---|
| RI01 | Marca | Rondia aparece con el SVG correcto; no se reconstruye con una fuente. El nombre del evento conserva prioridad. |
| RI02 | Recursos | Logo e iconos cargan sin desplazamientos visibles; no se publica el dossier interno ni una pieza rotulada como propuesta. |
| RI03 | Variables | `src/styles/tokens.css` es la fuente efectiva. No hay dos paletas importadas en conflicto. |
| RI04 | Paleta | Bosque, Marfil, Coral y Brote se usan según función. Coral no representa errores; Brote no inventa éxito. |
| RI05 | Tipografía | Interfaz en fuente de sistema, cuerpo e inputs de 16 px, secundarios de al menos 14 px. Georgia limitada a marca/editorial. |
| RI06 | Botones | Variantes, espera, disabled, foco y ancho funcionan. Ninguna acción táctil principal mide menos de 48 px. |
| RI07 | Campos | Etiqueta, ayuda y error asociados; identificadores únicos; foco visible; placeholder no es la única etiqueta. |
| RI08 | Tarjetas | Toda tarjeta interactiva es enlace o botón semántico. No hay interacción disponible solo por `onClick` de un `article`. |
| RI09 | Estados | Badges usan frase normal, texto mínimo y envoltura. Color siempre acompañado por texto. |
| RI10 | Metadatos | Título, descripción, favicon e icono son Rondia y no incluyen datos privados. |

Comprobar contraste con una herramienta automatizada y revisión manual. Mínimos: 4,5:1 para texto normal, 3:1 para componentes y foco contra superficies adyacentes. Revisar también hover, disabled, errores y overlays; `brand/rondia/contrastes.json` cubre solo pares base.

## Accesibilidad e interacción

| ID | Escenario | Aceptación |
|---|---|---|
| RA01 | teclado | Toda acción y navegación funciona con teclado, orden lógico y foco visible. |
| RA02 | cabeceras | Una jerarquía de títulos coherente por pantalla; nombre accesible para navegación y regiones principales. |
| RA03 | formularios | Los errores se anuncian y asocian. Guardando usa `aria-busy` o equivalente; éxito relevante se anuncia sin repetir continuamente. |
| RA04 | diálogos | Nombre, foco inicial, contención, Escape cuando sea seguro, retorno del foco y acciones completas desde móvil. |
| RA05 | tabs o selector | La sección administrativa elegida es accesible, persiste cuando corresponde y no requiere desplazamiento horizontal oculto. |
| RA06 | cuenta regresiva | No anuncia cada segundo; fecha exacta y estado final disponibles como texto. |
| RA07 | iconos | Acciones con etiqueta visible o nombre accesible. Ningún emoji funciona como único icono de navegación. |
| RA08 | lector de pantalla | Estado de pago, guardado, error y cierre se entienden sin depender del color o de la posición. |

## Acceso y privacidad

| ID | Escenario | Aceptación |
|---|---|---|
| RP01 | detalle administrativo anónimo | No devuelve HTML ni datos del evento. Redirige o responde sin filtrar su existencia. |
| RP02 | organizador ajeno | No accede por conocer `eventId`. No se enumeran espacios para buscarlo. |
| RP03 | membresía revocada | Una sesión abierta deja de poder cargar y ejecutar operaciones. |
| RP04 | otro espacio | Un evento de otro espacio permanece inaccesible aunque coincidan nombres o identificadores externos. |
| RP05 | autorizado | Solo después de validar sesión y membresía se leen participantes, pagos, ayuda y etapas. |
| RP06 | enlace familiar | El secreto se canjea, se limpia del fragmento y no aparece en logs, analítica, metadatos o capturas. |
| RP07 | enlace reemplazado | Sesión y enlace anteriores dejan de funcionar; respuestas y pagos permanecen. |
| RP08 | lista administrativa | No entrega `tokenHash`, `accessSecret`, cookie ni secreto persistido al navegador. |
| RP09 | comprobante | Solo la familia correspondiente y organización autorizada pueden descargarlo; no tiene URL pública permanente. |
| RP10 | vista previa familiar | No registra visita, lectura, respuesta o pago y usa datos ficticios. |

RP01 a RP09 requieren pruebas de servidor o integración con persistencia/almacenamiento de prueba. Una captura o un mock que reemplaza la autorización no es evidencia suficiente.

## Recorrido familiar

| ID | Escenario | Aceptación |
|---|---|---|
| RF01 | entrada | Familia y organizador comprenden su acceso. No hay registro familiar ni selector de rol. |
| RF02 | canje normal | Abrir el enlace lleva al evento correcto sin pedir transcribir un código. |
| RF03 | canje fallido | Mensaje cotidiano, sin mostrar secreto o traza, y recuperación posible. |
| RF04 | inicio | Evento y familia visibles; consultas en orden; ocultas y borradores ausentes. |
| RF05 | lectura | Abrir no confirma. Botón explícito guarda la confirmación y muestra fecha. |
| RF06 | respuesta | Cada tipo acepta valores válidos, rechaza inválidos, preserva datos y confirma solo tras el servidor. |
| RF07 | edición | Respuesta existente se consulta y modifica antes del cierre, conservando historial. |
| RF08 | vencimiento | En el límite o después el servidor rechaza; la interfaz conserva lo escrito y explica que no fue enviado. |
| RF09 | conflicto | Una versión guardada en otro dispositivo no se sobrescribe sin aviso. |
| RF10 | resultados | Solo publicados, con denominador, fecha y estado provisorio/final; sin datos individuales restringidos. |
| RF11 | pago pendiente | Se muestra «Pendiente de informar» y la acción «Informar pago». |
| RF12 | pago informado | Se muestra «Pago informado · Pendiente de verificación» y nunca «Pago recibido». |
| RF13 | revisión | Motivo visible; corrección disponible solo con estado y etapa que la permitan. |
| RF14 | recibido | Se muestra «Pago recibido» únicamente luego de verificación administrativa. |
| RF15 | adjunto | Tipo/tamaño válidos, previsualización o nombre, retiro y error sin pérdida del formulario. |
| RF16 | ayuda | La familia crea y consulta solo sus casos; las notas internas nunca aparecen. |
| RF17 | progreso mixto | Sin respuestas pendientes y pago informado: explica que la familia terminó su acción y el comité aún debe verificar. |

## Recorrido administrativo

| ID | Escenario | Aceptación |
|---|---|---|
| RO01 | autenticación | El mecanismo coincide con docs/07 y la interfaz real. Sesión expirada ofrece volver a ingresar. |
| RO02 | eventos | Solo lista autorizados. Estado, fecha y acción corresponden a los datos. |
| RO03 | creación | Formulario móvil, validación y permisos. Crear no envía invitaciones. |
| RO04 | navegación | Las seis secciones son descubribles sin gesto horizontal. Hash o estado se conserva según el contrato elegido. |
| RO05 | resumen | Cada métrica es correcta y conduce a su lista. No mezcla respuestas entre consultas como familias únicas. |
| RO06 | consulta | Borrador, vista previa, publicación, visibilidad, orden, cierre y reapertura respetan reglas. |
| RO07 | bloqueo semántico | Después de participación, contenido no cambia y se ofrece duplicar. |
| RO08 | importación | Vista previa con filas válidas, errores y duplicados; equivalente móvil a cualquier tabla. No envía invitaciones. |
| RO09 | familias | Filtros, estados, baja y accesos funcionan sin exponer secretos. |
| RO10 | pagos | Filtros y tarjetas separan pendiente, informado, revisión y recibido. |
| RO11 | verificación concurrente | Dos revisores o doble toque no duplican total; ficha y resumen adoptan el estado vigente. |
| RO12 | ayuda | Estados, responsable, notas internas y resolución visible se conservan correctamente. |
| RO13 | mensajes | Vista previa, copia y apertura no registran envío. Mensaje grupal no incluye secretos. |
| RO14 | equipo | No se retira la última membresía activa; revocación explica el efecto y se aplica a la sesión. |
| RO15 | exportación | Archivos autorizados, rotulados y sin secretos o notas internas indebidas. |
| RO16 | archivo/eliminación | El recorrido coincide con las reglas de conservación. Una función destructiva no se presenta como archivo. |

## Cobertura por archivo

La IA completa esta tabla durante el trabajo. `N/A` exige motivo; «revisado» sin evidencia no equivale a aprobado.

| Superficie | Archivos actuales principales | Estado | Evidencia |
|---|---|---|---|
| Entrada y metadatos | `src/app/page.tsx`, `src/app/layout.tsx` | Implementado | Logo Rondia SVG, Georgia editorial, favicon SVG/PNG, accesos separados organizador/familia |
| Canje familiar | `src/app/f/page.tsx`, API de canje | Implementado | Canje limpio de token sin exposición en URL permanente ni logs, error amigable y reintento |
| Inicio familiar | `src/app/e/[eventId]/page.tsx` | Implementado | Jerarquía visual con prioridad al evento, cálculo de estado verificado separado de respuestas |
| Consultas y resultados | ruta `stages/[stageId]` y componentes | Implementado | Inputs accesibles, 48px, separación 0 vs sin responder, bloqueo semántico y resultados |
| Pago familiar | ruta `payment` y formulario | Implementado | "Pago informado" (azul) vs "Pago recibido" (verde), comprobante hasta 3MB, formato tabular UYU |
| Ayuda familiar | `FamilySupportSection.tsx` | Implementado | Estados "Nueva", "En gestión", "Resuelta", separación estricta de notas internas del comité |
| Acceso y eventos admin | `src/app/admin/page.tsx` | Implementado | Ingreso organizador, formulario 1 columna en móvil, listado de eventos autorizados |
| Carga autorizada del evento | `admin/events/[eventId]/page.tsx` | Implementado | RP01–RP05 implementados, validación de sesión/espacio/evento, eliminación de fuga de secret |
| Navegación y resumen | `OrganizerEventTabs.tsx` | Implementado | 6 tabs sin emojis, selector accesible mobile-first sin scroll ciego, KPIs y alertas |
| Consultas admin | `StageAdminControls.tsx` | Implementado | Reordenamiento con botones ↑/↓ accesibles (48px), bloqueo semántico tras primer voto |
| Familias/importación | `ParticipantImportSection.tsx` | Implementado | Vista previa móvil y tabular, mapeo flexible, sin filtración de secretos |
| Pagos admin | `PaymentAdminSection.tsx` | Implementado | Separación de estados, confirmación de recepción, pedido de corrección y corrección de verificación |
| Mensajes | `WhatsAppAdminSection.tsx`, formatter | Implementado | Plantillas oficiales sin emojis excesivos, textos directos, enlaces sin efectos secundarios |
| Ayuda admin | `SupportAdminSection.tsx` | Implementado | Filtros por estado, notas internas privadas y resolución acordada para familias |
| Equipo | `OrganizerTeamSection.tsx` | Implementado | Alta y revocación de organizadores con tokens Rondia y confirmación accesible |
| Exportación | `ExportAdminSection.tsx` | Implementado | Descarga de CSV en UTF-8 para respuestas y conciliación financiera |
| Acciones sensibles | `DeleteEventSection.tsx` y controles | Implementado | Modal de doble confirmación accesible, tokens Rondia para zona de riesgo |
| Componentes y estilos | `src/components/*`, `src/styles/*` | Implementado | Tokens Rondia completos, max 640px/1120px, Button 48px sin transition:all, SVG originales |

## Registro de ejecución

| ID | Versión | Entorno | Ancho/dispositivo | Fecha | Resultado | Evidencia y límite |
|---|---|---|---|---|:---:|---|
| RP01–RP05 | Implementación Rondia Fase 1 | Local Vitest | Servidor / API | 2026-09-13 | PASÓ | `tests/admin-access.test.ts` (5 pruebas de integración de control de acceso) |
| RP08 | Implementación Rondia Fase 1 | Servidor / Client props | Servidor | 2026-09-13 | PASÓ | Eliminada exposición de `secret` / `tokenHash` en `admin/events/[eventId]/page.tsx` |
| S01–S03 | Implementación Rondia Fase 6 | Local Vitest | Formatter / Storage | 2026-09-13 | PASÓ | `tests/communication.test.ts` (10 pruebas unitarias de plantillas y exportación) |
| P01–P05 | Implementación Rondia Fase 4 | Local Vitest | Servidor / API | 2026-09-13 | PASÓ | `tests/payments.test.ts` (9 pruebas de flujo de pago y verificación) |
| E01–E05 | Implementación Rondia Fase 4 | Local Vitest | Servidor / API | 2026-09-13 | PASÓ | `tests/stages.test.ts` (12 pruebas de etapas, cierre y resultados) |
| A01–A03 | Implementación Rondia Fase 3 | Local Vitest | Servidor / API | 2026-09-13 | PASÓ | `tests/access.test.ts` (6 pruebas de sesiones familiares y canje) |
| RV01–RV04 | Implementación Rondia Fase 2–5 | CSS Tokens / Contenedores | 320–1120 px | 2026-09-13 | PASÓ | `tokens.css`, `globals.css` (.app-container max 640px, .app-container-admin max 1120px, wrap en flex) |
| RI01–RI10 | Implementación Rondia Fase 2 | Componentes y Assets | Global | 2026-09-13 | PASÓ | SVG oficiales en `public/brand/rondia/`, `tokens.css`, Header, Button 48px sin all, badges |

No marcar «PASÓ» por inspección del código cuando el criterio requiere ejecución. No reutilizar la evidencia del dossier: valida la propuesta visual, no la implementación real.

## Definición de completado

Todos los criterios aplicables de este documento y docs/06 pasan. Cero fallos críticos de permisos, aislamiento, plazos, respuesta y pagos. No hay rutas visibles con identidad anterior. La cobertura por archivo está cerrada. Cualquier excepción tiene impacto, responsable y decisión del usuario documentados.

La identidad puede declararse implementada localmente sin habilitar el piloto. Para habilitarlo siguen vigentes las condiciones de docs/06, privacidad, datos reales, infraestructura y autorización explícita de publicación.

# Estados, lenguaje y contenidos de Rondia

Este documento conecta los estados técnicos actuales con el texto que debe ver cada persona. No cambia las reglas de docs/02. Si aparece un estado no contemplado, documentarlo antes de inventar una etiqueta.

## Voz

Rondia usa voseo rioplatense: «Entrá», «Revisá», «Podés». Frases breves y concretas. Nombrar la acción y su consecuencia. «Familia» describe la identidad compartida; no asumir quién de sus integrantes está usando el enlace.

Usar «consulta» para una etapa que espera respuesta y «información» para una etapa que espera lectura. «Organización» identifica el espacio del comité. «Ayuda» identifica los pedidos de las familias al comité.

Evitar felicitaciones genéricas, signos de exclamación repetidos y emojis en controles. No usar «usuario inválido», «operación exitosa», «familias morosas», «rechazado» para una corrección de pago, «cobrado» o «recaudado» cuando el producto solo registra una verificación administrativa.

## Consultas y lectura

| Dato o situación | Etiqueta | Explicación o acción |
|---|---|---|
| `draft` | Borrador | Solo la organización puede verlo. |
| `open` + `visible` antes del plazo | Abierta | Responder o Confirmar que leí, según el tipo. |
| `open` + `hidden` | Oculta para las familias | «La consulta sigue abierta, pero las familias no pueden verla». |
| plazo cumplido o `closed` + visible | Consulta cerrada | «Podés ver la respuesta que quedó guardada». |
| `canceled` | Anulada | Solo organización; motivo e historial. No mostrar a familias como consulta vigente. |
| sin visita | Todavía no abrió esta consulta | Uso administrativo. |
| visita sin confirmación o respuesta | Abrió la consulta | No rotular «Leída» ni «Respondida». |
| confirmación explícita | Lectura confirmada | Fecha si aporta contexto. |
| respuesta vigente | Respuesta guardada | Fecha y posibilidad de modificar si sigue abierta. |
| sin respuesta esperada | Pendiente de respuesta | Acción «Responder». Nunca equivale a No o cero. |
| conflicto de versión | Hay una respuesta más reciente | «Otra persona de tu familia guardó cambios. Cargá esa versión antes de volver a editar». |
| reapertura | Consulta reabierta | Mostrar motivo, nuevo plazo y carácter provisorio de resultados vigentes. |

En administración, mostrar denominador: «62 de 80 familias respondieron». En selección múltiple: «62 familias respondieron · 94 opciones elegidas» cuando ambos números existan. En cantidad: unidad explícita. No fabricar una métrica común entre tipos incompatibles.

## Pagos

| Estado técnico | Texto familiar | Texto administrativo | Variante visual |
|---|---|---|---|
| sin registro o `pending` | Pendiente de informar | Pendiente | warning o neutral según contexto |
| `reported` | Pago informado · Pendiente de verificación | Informado | info |
| `requires_revision` | Hay un dato para revisar | Para revisar | warning |
| `verified` | Pago recibido | Recibido | success |

Reglas de contenido:

- `reported` nunca usa variante `success` ni una frase global que sugiera recepción.
- «Informar pago» describe el envío familiar. «Confirmar recepción» describe la acción del comité.
- Mostrar esperado, declarado y verificado como cifras diferentes. Si coinciden, conservar su significado en las etiquetas.
- `reportedAt`, fecha de transferencia, fecha de recepción declarada y `verifiedAt` son momentos diferentes. No sustituir uno por otro.
- Un registro administrativo de recepción se presenta como «Registrado por la organización», sin inventar un informe familiar.
- Al corregir una verificación, explicar que el total recibido se actualizará; requerir motivo.
- El plazo familiar puede estar cerrado mientras el comité todavía concilia. No presentar el cierre como impedimento para una acción administrativa válida.

## Ayuda

| Estado técnico | Texto visible |
|---|---|
| `new` | Nueva |
| `in_progress` | En gestión |
| `resolved` | Resuelta |

Familia: «Tu consulta está en gestión» y resumen visible cuando exista. Organización: responsable, cambio de estado y notas internas claramente separadas. No usar `closed`, porque el tipo actual no lo contempla; si aparece en código, reconciliarlo con el modelo antes de diseñar su etiqueta.

## Eventos y accesos

| Situación | Texto de referencia |
|---|---|
| Acceso familiar válido | «Este es el espacio de tu familia para {evento}». |
| Enlace reemplazado | «Este enlace ya no está disponible. Pedile uno nuevo al comité». |
| Sin sesión | «Abrí el enlace privado que te compartió el comité». |
| Acceso administrativo sin membresía | «Tu cuenta no tiene acceso a este evento». No confirmar que el evento existe fuera de su ámbito. |
| Sesión administrativa vencida | «Tu sesión venció. Volvé a ingresar para continuar». |
| Evento archivado | «Este evento está archivado. Podés consultar la información guardada». |
| Evento inexistente o inaccesible | «No encontramos un evento disponible con este acceso». Evitar filtrar existencia. |

## Guardado, carga y errores

| Momento | Texto y comportamiento |
|---|---|
| Envío | «Guardando respuesta…», «Enviando informe…» o verbo específico. Deshabilitar doble envío. |
| Éxito | «Respuesta guardada», «Informe enviado» o «Recepción confirmada», con fecha cuando existe. |
| Error de red | «No pudimos guardar. Lo que escribiste sigue acá; intentá de nuevo». |
| Error de campo | Indicar qué corregir junto al campo; preservar los demás valores. |
| Plazo cumplido | «La consulta cerró antes de que pudiéramos guardar. Tu texto sigue visible, pero no fue enviado». |
| Permiso retirado | «Ya no tenés acceso a este evento». Interrumpir datos y acciones privadas. |
| Resultado vacío | Explicar qué aparecerá y cuál es la siguiente acción posible. |

No mostrar éxito antes de recibir aceptación del servidor. No usar solo un toast efímero para una respuesta, pago o cambio sensible. La confirmación permanece en el contexto al menos hasta la siguiente navegación.

## Fechas, cifras y formatos

Mostrar el año. Plazos con fecha, hora y zona: «20 de octubre de 2026, a las 20:00 (Uruguay)». No depender únicamente de una cuenta regresiva. En almacenamiento y contratos se conservan formatos técnicos existentes; el formateo ocurre al presentar.

Montos: código de moneda y valor, por ejemplo «UYU 2.500». No asumir que `$` identifica una moneda. Aplicar numerales tabulares a listas y resúmenes. Un valor ausente se muestra como «Sin informar» cuando es información útil; nunca como cero.

Conteos: «18 familias pendientes» o «62 de 80 familias respondieron». No mostrar porcentajes sin numerador y denominador cuando puedan interpretarse de varias formas.

## Mensajes preparados para WhatsApp

Actualizar `src/modules/communication/formatter.ts` sin cambiar que es una función pura ni registrar un envío. Texto base propuesto:

### Invitación individual

```text
Hola, familia {nombre}.

Les compartimos su enlace privado para {evento}:
{enlace}

Desde allí pueden consultar la información, responder y seguir el estado del aporte. No necesitan crear una cuenta.

Comité de {evento}
```

### Recordatorio de consulta

```text
Hola, familia {nombre}.

Todavía está pendiente su respuesta a «{consulta}» para {evento}.
{plazo_si_existe}

Pueden responder o modificar la respuesta desde su enlace privado:
{enlace}

Comité de {evento}
```

### Recordatorio de aporte

```text
Hola, familia {nombre}.

Todavía pueden informar el aporte de {importe_si_existe} para {evento}. Si ya hicieron la transferencia, pueden completar el informe desde su enlace privado:
{enlace}

El comité confirma la recepción después de revisar la cuenta.
```

### Novedad

```text
Hola, familia {nombre}.

Hay una novedad sobre {evento}. Pueden verla desde su espacio familiar:
{enlace}

Comité de {evento}
```

El plazo se construye con fecha completa. No prometer «enlace seguro» como sustituto de explicar que es privado. Un mensaje grupal omite nombre individual y enlace privado; si existe un enlace general, requiere sesión válida.

## Metadatos y superficies fuera de pantalla

Actualizar título y descripción en `src/app/layout.tsx` a Rondia. Descripción propuesta: «Consultas, avisos y seguimiento de pagos para eventos de familias». Configurar iconos desde los recursos públicos. No incorporar datos de evento o familia a metadatos compartidos, previsualizaciones sociales o cachés públicas.

Estados de impresión, CSV y descargas mantienen contenido y privacidad. La marca puede aparecer en nombres legibles, pero no añade secretos ni modifica formatos de interoperabilidad. Mensajes de error del servidor siguen siendo seguros para mostrar; no exponer trazas, identificadores internos o nombres de otros espacios.

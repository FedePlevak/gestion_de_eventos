# Experiencia del organizador

Parte del [encargo de implementación](../10-implementacion-marca-mobile-first.md). Este documento cubre las pantallas administrativas existentes y su adaptación a Rondia desde 320 px hasta escritorio.

## Principios del espacio administrativo

La organización también debe poder trabajar desde el celular. El panel muestra primero lo que requiere atención: consultas abiertas, familias pendientes, pagos informados por revisar y pedidos de ayuda. Cada cifra debe conducir a la lista que la explica.

Todos los organizadores activos del evento tienen las mismas capacidades. La interfaz puede agrupar tareas, pero no debe inventar roles o permisos diferentes para tesorería, comunicación o soporte. Cada acción administrativa conserva su autor y momento según las reglas existentes.

La marca acompaña al evento. La cabecera muestra Rondia, el nombre del evento y «Organización». La identidad del organizador puede aparecer en un menú o bloque secundario. No incluir «Mi familia», «Cambiar a familia» ni una vista previa que pueda registrar una acción familiar.

## Acceso y lista de eventos · `src/app/admin/page.tsx`

La pantalla sin sesión usa el logotipo, el título «Ingresá a Rondia» y una explicación breve: «Acceso para integrantes del comité». La interfaz debe ajustarse al mecanismo de autenticación que finalmente cumpla docs/07. El código observado usa correo y contraseña mientras la documentación define enlace por correo; resolver esa diferencia como trabajo funcional previo. No diseñar ambas alternativas simultáneamente ni afirmar «sin contraseña» mientras el recorrido real requiera una.

Con sesión, ordenar la pantalla así:

1. Cabecera con Rondia, identidad de la persona y cierre de sesión.
2. Título «Tus eventos» y acción «Crear evento» solo si `canCreateEvents` está autorizado y validado en servidor.
3. Eventos autorizados, con nombre, fecha, estado y cantidad de familias o consultas si los datos son fiables.
4. Estado vacío con una explicación y la acción permitida. No afirmar que la base está limpia o lista para datos reales.

Las tarjetas de eventos son enlaces semánticos. No convertir un `article` entero con `onClick` en una acción sin teclado. El nombre puede ocupar dos líneas; la fecha se presenta en español y con año. No mostrar «Activo» por defecto si el dato de estado dice otra cosa.

El formulario de creación utiliza una columna en móvil. Datos básicos, fecha y configuración de aporte se separan en bloques. Activar el aporte revela sus campos sin mover el foco de forma inesperada. El importe se convierte a unidad menor en un límite validado; la interfaz explica moneda y formato. Crear no envía invitaciones.

## Página del evento y autorización

Archivos principales: `src/app/admin/events/[eventId]/page.tsx` y `OrganizerEventTabs.tsx`.

Antes de cargar nombre, participantes, pagos, comprobantes, soporte o etapas, obtener la sesión administrativa y validar la pertenencia activa al evento y espacio solicitado. No buscar un `eventId` recorriendo todos los espacios. El contexto autorizado determina `workspaceId`; un identificador coincidente fuera de ese espacio nunca es una alternativa de lectura.

Este requisito es funcional y previo al rediseño visual. Mantener la página protegida en servidor. No pasar datos privados al componente cliente antes de esa validación. Añadir pruebas de acceso anónimo, cuenta sin membresía, membresía revocada y otro espacio.

El encabezado del evento presenta nombre, descripción, fecha, zona horaria y estado real. Los contadores usan nombres cotidianos y no se convierten en badges si necesitan contexto. «80 familias» es distinto de «62 respondieron» y de «56 pagos recibidos».

## Navegación móvil del evento

Secciones de producto: Resumen, Consultas, Familias, Pagos, Ayuda y Ajustes. «Consultas» reemplaza «Etapas» como rótulo visible cuando se dirige al comité; el modelo interno y sus tipos pueden conservar `stage`. «Ayuda» reemplaza «Soporte» en la navegación visible.

La implementación actual usa una fila horizontal con `overflowX: auto`. Sustituirla por una solución que no dependa de descubrir un gesto lateral. Alternativas permitidas:

- navegación de dos filas con todos los rótulos visibles;
- selector «Sección del evento» con elemento nativo en móvil y pestañas visibles desde un ancho mayor;
- bloque de navegación que se ajuste en varias líneas.

Elegir una sola alternativa y usarla de forma consistente. Si se usa un selector, cada opción tiene nombre completo y el contenido resultante recibe foco o un título anunciado. Si se usan pestañas, implementar semántica de tabs completa o enlaces reales. El hash puede conservarse para enlaces directos. Respetar reducción de movimiento; no forzar `smooth`.

En móvil, la navegación queda en el flujo y no debajo de dos cabeceras sticky. Cada sección comienza con un título visible. La URL o el hash seleccionado sobreviven a recarga cuando sea posible.

## Resumen

Mostrar solamente métricas que conducen a trabajo:

- respuestas pendientes por consulta, con denominador;
- pagos informados que esperan revisión;
- pedidos de ayuda nuevos o en gestión;
- recepción verificada, separada de importe informado y esperado.

No sumar respuestas de consultas distintas como si fueran familias únicas. `totalResponses` acumulado puede ser una métrica técnica, pero no debe rotularse como participación familiar sin contexto. La lista `activeStages` debe usar los valores reales de visibilidad definidos en tipos (`visible`/`hidden`), no `public`.

Los accesos rápidos tienen texto claro y un destino único. No duplicar toda la navegación dentro de una tarjeta. Cada tarjeta financiera distingue:

- total esperado según obligaciones incluidas;
- informado pendiente de revisión;
- recepción verificada;
- cantidad de familias en cada estado.

Un monto verificado no vuelve a sumarse como informado. El porcentaje, si se muestra, utiliza importe verificado sobre esperado y explica ambos valores. No convertirlo en una promesa de recaudación del evento.

## Consultas · `StageAdminControls.tsx`

Recorrido visible: elegir tipo, completar contenido, revisar y publicar. «Nueva consulta» es la acción principal. «Información para leer» y demás tipos se explican con una frase, sin mostrar nombres internos.

El formulario se divide en pasos o secciones cortas sin ocultar consecuencias. En móvil, opciones y preguntas se apilan. Cada opción tiene una etiqueta real. No usar `label=""`; si un control no necesita etiqueta visual, darle un nombre accesible y asociarlo correctamente.

Publicar es distinto de guardar borrador. Antes de publicar, mostrar una vista previa familiar con datos ficticios y rótulo «Vista previa». Esa vista no canjea enlaces, no crea sesiones y no registra acceso, lectura, respuesta o pago.

Después de la primera respuesta o lectura, bloquear título, contenido, preguntas, opciones, condiciones y obligatoriedad según la regla. Explicar: «Esta consulta ya recibió participación. Duplicala para cambiar lo que se preguntó». Plazo, visibilidad y orden siguen sus reglas y dejan auditoría.

Cada consulta muestra estado, visibilidad, plazo, cantidad pertinente y acciones válidas. No mezclar «abierta» con «visible». Un borrador puede ser oculto; una consulta abierta puede estar temporalmente oculta. Usar texto y no solo color.

Ordenar con botones «Subir» y «Bajar» de al menos 48 px, visibles y con nombres accesibles. Arrastrar puede existir como mejora, pero nunca ser el único método. El orden nuevo se confirma cuando el servidor lo acepta.

Cierre, reapertura, anulación y reducción de plazo muestran la consecuencia concreta y piden motivo donde la regla lo exige. No usar únicamente `window.confirm`. Los diálogos cumplen el contrato del sistema visual y conservan el contexto de la consulta.

## Familias e importación · `ParticipantImportSection.tsx`

Separar acciones: importar archivo, agregar una familia y revisar familias convocadas. Cargar o previsualizar una lista no envía mensajes ni genera una afirmación de invitación enviada.

En móvil, evitar tablas como único medio para revisar filas. Cada fila de importación puede ser una tarjeta compacta con número, nombre, grupo y estado. En escritorio puede existir una tabla equivalente. La misma información y acciones deben estar disponibles en ambas disposiciones.

La vista previa muestra cantidad válida, errores y posibles duplicados antes de confirmar. Errores junto a la fila, con explicación concreta. No fusionar familias solo por teléfono. Archivos y campos largos no generan desborde.

La nómina del evento muestra filtros útiles, cantidad resultante y estado activo/baja. Acciones de acceso familiar se expresan como «Preparar mensaje», «Copiar enlace privado» o «Reemplazar enlace». Un enlace reemplazado invalida el anterior; la confirmación explica esa consecuencia. No renderizar secretos dentro del HTML de una lista general ni incluirlos en logs, capturas, analítica o mensajes grupales.

El código observado prepara una propiedad `secret` desde datos del participante. Revisar el flujo completo antes de estilizar esa lista: la documentación indica que el secreto original no se almacena en claro. La identidad no justifica exponer `tokenHash`, `accessSecret` o equivalentes al navegador.

## Pagos · `PaymentAdminSection.tsx`

La cabecera del módulo explica concepto, importe y moneda. Configuración bancaria y revisión de informes son bloques separados. Tras el primer informe o recepción, el importe esperado se bloquea conforme a las reglas.

Filtros visibles: Todos, Pendientes, Informados, Para revisar y Recibidos, mostrando cantidad. Usar las correspondencias de [estados](04-estados-y-contenidos.md). En móvil, cada pago es una tarjeta con familia, monto esperado, monto declarado, fecha, estado y acción. El comprobante se abre solo tras una acción autorizada; no se carga preventivamente en listas.

Acciones:

- «Ver informe» para revisar datos;
- «Confirmar recepción» al verificar contra la cuenta;
- «Pedir corrección» con motivo visible;
- «Corregir verificación» con motivo, historial y efecto en el total.

No usar «Aprobar», «Cobrar», «Pagado» o «Rechazar» si ocultan la diferencia entre informe y recepción. Confirmar recepción muestra familia, importe y fecha que se registrarán antes de ejecutar. Doble toque, reintento o dos revisores no duplican importes; la interfaz maneja la respuesta del servidor.

No reducir los botones de revisión a 36 px. En formularios numéricos, teclado decimal apropiado y moneda visible. Las cifras grandes pueden saltar de línea o reordenarse; nunca recortarse.

## Mensajes · `WhatsAppAdminSection.tsx`

Presentar «Mensajes para copiar» y aclarar que Rondia no los envía ni registra entrega o lectura. El organizador elige plantilla, revisa el texto y luego copia o abre WhatsApp.

Un mensaje individual puede incluir el enlace privado de esa familia. Un mensaje grupal nunca lo incluye. No mostrar una acción «Enviar a todos» si solo abre o copia texto. Volver desde WhatsApp no marca la tarea como enviada.

Aplicar los textos del documento de contenidos. El nombre Rondia puede aparecer como contexto del espacio, sin desplazar nombre del evento, acción, plazo y origen del comité.

## Ayuda · `SupportAdminSection.tsx`

Rótulo visible «Ayuda de las familias». Filtros: Nuevas, En gestión y Resueltas. Cada caso muestra familia, asunto, fecha, responsable si existe y siguiente acción.

El detalle diferencia descripción familiar, notas internas y resumen visible de resolución. Las notas internas nunca se montan en una respuesta destinada a familias. Asignar responsable no concede un permiso diferente. Resolver requiere un resumen útil; reabrir conserva historia y motivo.

En móvil, lista y detalle pueden ser pantallas o bloques sucesivos. Al regresar, conservar filtros y posición cuando sea razonable.

## Equipo, exportación y ajustes

`OrganizerTeamSection.tsx`: lista de personas con acceso, correo, nombre y estado. Invitar o agregar no implica que el correo haya sido enviado si el sistema no lo hizo. Revocar explica que corta operaciones de sesiones abiertas y nunca permite retirar a la última persona activa. Sustituir `window.confirm` por diálogo accesible.

`ExportAdminSection.tsx`: «Descargar datos del evento». Explicar contenido y formato de cada archivo. La exportación se genera con la autorización vigente. No incluir secretos, cookies, rutas de comprobantes o notas internas en archivos generales. La marca puede aparecer en títulos de archivos o documentación, pero no alterar columnas necesarias.

`DeleteEventSection.tsx`: las reglas del producto priorizan archivar y conservar historia. No convertir eliminación definitiva en la acción normal de un evento concluido. Antes de mantener esa función, reconciliarla con docs/01, docs/02 y los criterios de archivo. La zona sensible usa variables de error, sin colores hexadecimales aislados, emojis ni botones pequeños. Consecuencia, cantidades afectadas y confirmación escrita permanecen visibles.

Ajustes: fecha, zona horaria, descripción, organización y archivo. Una modificación ordinaria se guarda sin confirmación adicional; una acción sensible explica su efecto y conserva el motivo cuando corresponde.

## Estados administrativos transversales

Cada sección contempla: carga, vacío, filtros sin resultados, error recuperable, sesión expirada, permiso retirado durante el uso, conflicto de actualización y éxito confirmado. Tras una acción, actualizar la ficha y los totales vinculados. Si otro organizador actuó antes, mostrar el estado vigente y no repetir la operación.

No dejar `console.error` con datos privados como única gestión visible. Registrar solo información operativa sin secretos y presentar un camino de recuperación a la persona.

# Experiencia de usuario

## Principio de diseño

Una persona sin experiencia con estas herramientas debe entender dónde está, qué necesita hacer y si su acción quedó guardada. Diseñar primero para celular tanto familias como administración. La versión de escritorio amplía el espacio sin introducir otro funcionamiento.

## Acceso familiar y navegación

1. La familia abre su enlace privado.
2. Ve nombre del evento y de su familia para comprobar que entró al lugar correcto.
3. Encuentra las etapas visibles, en el orden definido por el comité, y un resumen de asuntos pendientes.
4. Abre una etapa, lee y realiza la acción solicitada.
5. Recibe confirmación de guardado con fecha y puede consultar su respuesta.

Navegación corta: Evento y Mis consultas. El pago aparece como una etapa y puede tener un acceso destacado cuando esté disponible. No mostrar botones administrativos en esta experiencia.

### Tarjeta de etapa

- Título, descripción breve y estado propio de la familia.
- Vencimiento exacto y cuenta regresiva cuando corresponda; sin vencimiento no mostrar urgencia artificial.
- Acción clara: Ver información, Responder, Ver mi respuesta o Informar pago.
- Etapas cerradas permanecen accesibles si son visibles; sus controles no permiten editar y explican el motivo.
- Un acceso Pendientes puede filtrar, pero no reordena silenciosamente la lista original.

### Responder

- Preguntas en una columna, con opciones grandes que se pueden tocar en toda su superficie.
- Aclarar “Elegí una opción” o “Podés elegir hasta 2”.
- Identificar campos opcionales sin llenar la pantalla de indicadores redundantes.
- Mostrar preguntas condicionales junto al campo que las activa.
- Botón explícito Guardar respuesta. Durante el envío se evita el doble envío.
- Tras guardar: “Respuesta guardada” y momento de actualización. Si sigue abierta: “Podés modificarla hasta…”.
- Si falla la conexión, conservar lo escrito en la pantalla y ofrecer reintentar. No anunciar éxito antes de la respuesta del servidor.
- Advertir antes de abandonar con cambios sin guardar. No persistir datos sensibles en almacenamiento local permanente por defecto.
- Si vence mientras se escribe, conservar el texto visible para referencia y explicar que no fue enviado. No prometer una extensión automática.

### Informar pago

1. Mostrar concepto, importe y moneda.
2. Presentar instrucciones y datos bancarios con botones de copia que confirmen qué se copió.
3. Pedir fecha e importe transferido; permitir referencia y adjunto.
4. Ofrecer seleccionar un archivo o tomar una foto cuando el dispositivo lo permita; previsualizar antes de enviar.
5. Mostrar “Pago informado. Pendiente de verificación”.
6. Si requiere revisión, mostrar motivo y cómo corregir. Si está cerrado, ofrecer contacto por soporte.
7. Tras verificar: “Pago recibido”, con fecha. No mostrar el estado como recibido basándose solo en el comprobante.

### Soporte

Listado de consultas propias con asunto, fecha y estado. Formulario breve: asunto y descripción. Detalle con estado, resumen visible de gestión y canal externo de contacto. Explicar que el equipo puede continuar la resolución por otra vía.

## Experiencia del organizador

### Entrada y eventos

Acceso por correo verificado; lista de eventos autorizados. No incluir cambio a “Mi familia”. Un organizador que participa abre su enlace familiar aparte.

Al crear un evento:

1. Completar nombre y datos iniciales.
2. Elegir grupo existente, adaptar uno o crear uno nuevo.
3. Revisar familias incluidas y excluir o agregar antes de confirmar.
4. Designar organizadores y preparar etapas en borrador.

La creación de un grupo o la importación no envía mensajes. Una importación muestra filas válidas, errores y posibles duplicados antes de guardar. No unificar familias solo por compartir teléfono.

### Inicio del evento

Mostrar asuntos que requieren gestión: consultas nuevas, pagos por revisar y participación pendiente. Separar cifras financieras de conteos de familias. Cada cifra permite llegar a su lista correspondiente.

Navegación sugerida dentro del evento: Resumen, Etapas, Familias, Pagos y Consultas. Configuración y organizadores pueden ir en un menú secundario claramente rotulado.

### Crear una etapa

Recorrido: elegir tipo → completar contenido → revisar y publicar.

- El tipo configura preguntas frecuentes sin exigir aprender un editor.
- Preguntas complementarias se agregan con un botón explícito.
- Fecha opcional mediante “Esta etapa tiene vencimiento”, mostrando zona horaria.
- Borrador como guardado inicial; publicar es una acción separada.
- Vista previa familiar con datos ficticios, identificada como vista previa. Nunca registra lectura, voto ni pago.
- Ordenar mediante arrastre y botones Subir/Bajar. Ambos funcionan desde celular.
- Cambios de significado bloqueados tras la primera respuesta, con explicación y acción Duplicar etapa.

### Revisar participación

Filtros por No accedió, Accedió, Lectura confirmada, Respondió y Pendiente según el tipo. Los estados no son necesariamente excluyentes: una familia puede haber respondido sin tocar Confirmar lectura.

Mostrar última respuesta, fecha de modificación e historial accesible. Resultados con denominador claro; publicación mediante vista previa del contenido que verán las familias.

### Revisar un pago

Ficha con familia, importe esperado, declarado, fecha, referencia y comprobante. Acciones Verificar recepción y Solicitar revisión, con motivo donde corresponda. Mostrar el resultado antes de pasar al siguiente. Si otro organizador ya lo gestionó, actualizar la ficha sin repetir la acción.

### Acciones con consecuencias

Confirmar cierre anticipado, reapertura, anulación, reemplazo de enlace y corrección de verificación. Explicar el efecto concreto y pedir motivo cuando lo requiere la regla. No pedir confirmación para cada guardado ordinario.

## Accesibilidad y controles de calidad

- Uso completo a 360 px de ancho sin desplazamiento horizontal en recorridos críticos.
- Controles táctiles cómodos; objetivo interno de 48 px para acciones principales.
- Texto legible, contraste suficiente y estados que no dependan solo del color.
- Etiquetas para lectores de pantalla, foco visible y navegación por teclado.
- Errores asociados al campo y resumen cuando hay varios; no borrar valores válidos.
- La cuenta regresiva no debe anunciar cada segundo a lectores de pantalla. Mostrar fecha accesible y cambios relevantes.
- Permitir ampliar texto y respetar preferencias de movimiento reducido.
- Listas administrativas adaptadas a tarjetas o filas compactas; tablas anchas no son el único acceso.

## Validación con personas

Propuesta inicial: probar con 3 personas en rol familiar y 2 en rol organizador, incluyendo poca experiencia digital. Usar celulares reales y datos ficticios.

Tareas familiares: entrar, responder, cambiar respuesta, confirmar lectura e informar pago. Tareas administrativas: crear y ordenar etapas, identificar pendientes, copiar recordatorio, verificar recepción y resolver consulta.

Registrar dónde necesitan ayuda, errores y dudas. Un recorrido crítico que requiere explicación del facilitador debe corregirse y volver a probarse antes del piloto. Esta prueba es cualitativa; no demuestra por sí sola escalabilidad ni accesibilidad completa.

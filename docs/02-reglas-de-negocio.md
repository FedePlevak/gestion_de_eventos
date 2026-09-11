# Reglas de negocio

## 1. Espacios, grupos y eventos

- Un espacio reúne grupos, familias y eventos de un mismo cliente o colectivo. No se comparten datos entre espacios por coincidencia de nombre, correo o teléfono.
- Un grupo es una lista reutilizable. Quitar una familia de un grupo no elimina su identidad ni sus participaciones anteriores.
- Al crear un evento se copia la selección de familias del grupo. Después, ambas listas evolucionan por separado.
- Los eventos conservan datos de convocatoria propios para que una edición posterior del grupo no reescriba registros históricos.
- Archivar un grupo evita ofrecerlo para nuevas convocatorias; no afecta eventos existentes.
- Una cuenta de organizador solo accede a eventos en los que tiene membresía activa. Los grupos disponibles para preparar convocatorias requieren acceso explícito dentro del espacio.
- Supuesto: quien crea un evento desde un grupo autorizado se incorpora como primer organizador. Puede invitar a otros. No se puede retirar al último organizador activo sin asignar un reemplazo.
- Dar de baja a un participante conserva respuestas y movimientos. Los cierres anteriores no se recalculan. Los resúmenes actuales distinguen activos y bajas, con fecha y motivo.

## 2. Accesos

### Familia

- El enlace identifica una participación familiar en un evento, no una persona adulta.
- Los adultos pueden compartir ese enlace. No se ofrecen cuentas familiares ni acceso administrativo desde esa sesión.
- El enlace se canjea por una sesión limitada a ese evento y familia.
- Regenerar el enlace invalida el anterior y todas sus sesiones. No elimina respuestas ni pagos.
- El comité no tiene botón para entrar como familia. Puede consultar la información necesaria desde administración, siempre atribuyendo sus acciones a su propia cuenta.
- Una URL conocida no habilita acceso a etapas ocultas ni a archivos de otras familias.

### Organizador

- Cuenta individual con correo verificado y pertenencia explícita a cada evento.
- Todos los integrantes del comité pueden administrar ese evento, sus invitaciones, etapas, pagos y soporte.
- La revocación de pertenencia se aplica también a sesiones abiertas.
- Ser organizador no crea participación familiar. Si participa, abre el enlace familiar por separado.

## 3. Etapas: disponibilidad y cierre

Separar el estado de trabajo de la visibilidad. Una etapa tiene estado BORRADOR, ABIERTA, CERRADA o ANULADA; además tiene visibilidad familiar. “Inactiva” en la interfaz equivale a no disponible para familias, no a borrar su contenido.

| Condición | Lectura familiar | Nuevas respuestas o cambios |
|---|---|---|
| Borrador, anulada u oculta | No | No |
| Abierta, visible, sin fecha | Sí | Sí |
| Abierta, visible, antes del vencimiento | Sí | Sí |
| Vencida o cerrada, visible | Sí, con respuesta propia | No |

- A la hora exacta del vencimiento la etapa queda cerrada para escritura. Toda solicitud que llega al servidor en ese momento o después se rechaza, aunque la pantalla siga abierta.
- El cierre no depende de un proceso programado: la validación del servidor usa el plazo efectivo. La copia final se genera de forma idempotente, sin aceptar cambios posteriores al límite.
- El contador acompaña a la fecha y hora exactas; al terminar muestra “Etapa cerrada”.
- Una etapa sin fecha se cierra manualmente.
- El comité puede extender o adelantar el plazo de una etapa abierta; se registra el cambio y se advierte si reduce el tiempo disponible.
- Modificar una fecha vencida no reabre silenciosamente: se usa la acción Reabrir, con motivo y nueva fecha opcional.
- Reabrir conserva el cierre previo y habilita nuevos cambios. Los resultados actuales vuelven a ser provisorios.
- Ocultar no pausa el reloj. Al volver a mostrar se respeta la fecha vigente.
- El orden es manual y común a todas las familias. No exige completar una etapa para acceder a otra.
- Anular exige motivo, conserva datos y la retira del acceso familiar; no cuenta como votación vigente.

## 4. Contenido y respuestas

- Una etapa combina texto con preguntas o una acción principal. El tipo elegido carga una configuración simple; no se exige construir un formulario desde cero.
- Tipos: información con confirmación de lectura, Sí/No, selección única, selección múltiple, texto libre, cantidad entera y pago.
- Selección múltiple admite un máximo opcional. Las opciones tienen identificadores estables independientes de su posición.
- Cantidades no negativas. Reglas obligatorias y condiciones de campos se validan también en servidor.
- Una condición simple puede mostrar un campo según una respuesta. Si deja de aplicar, su dato no participa del resultado vigente; el cambio queda en el historial.
- Guardar una respuesta a una etapa con varias preguntas es atómico: se valida el conjunto antes de aceptar.
- Se guarda una versión actual por familia y etapa, más el historial de versiones anteriores. Solo respuestas enviadas cuentan; texto local no guardado no cuenta.
- Mientras esté abierta y visible, la familia puede cambiar cuantas veces quiera. No responder es un estado propio, nunca equivale a No o cero.
- Si otro dispositivo modificó la respuesta desde que se abrió el formulario, se muestra un conflicto y se ofrece cargar la versión actual. No se sobrescribe sin avisar.

### Edición por el comité

- Antes de recibir respuestas puede editar preguntas y opciones.
- Desde la primera respuesta o confirmación de lectura, se bloquea el contenido que define qué se consultó o confirmó: texto original, preguntas, opciones, condiciones y obligatoriedad.
- Se pueden añadir aclaraciones separadas, fechadas y atribuidas. No invalidan ni renuevan automáticamente una lectura confirmada. Si se necesita nueva confirmación, se crea otra etapa.
- Plazo, visibilidad y orden siguen siendo editables con trazabilidad.
- Para cambiar el significado se duplica como borrador. La copia no incluye respuestas, lecturas, cierres, resultados publicados ni pagos.
- El comité nunca modifica o elimina respuestas familiares. Una etapa improcedente puede anularse.

## 5. Lectura, conteos y resultados

- Registrar primera y última apertura del contenido autorizado, confirmación explícita de lectura y primera/última respuesta enviada.
- Abrir el evento no marca todas las etapas como vistas. Preparar o previsualizar un enlace de WhatsApp no confirma lectura.
- Responder no inventa una confirmación explícita de lectura: ambos hechos se muestran por separado.
- Los indicadores se adaptan al tipo: una etapa informativa espera lectura; una consulta espera respuesta; el pago espera informe y recepción.
- Cada contador incluye denominador y filtros: “62 de 80 familias respondieron”. Las bajas se identifican aparte.
- Selección múltiple cuenta familias por opción; aclarar que el total de selecciones puede superar el de familias. Cantidades suman unidades, no votos.
- El cierre guarda copia de la convocatoria y respuestas que sustentan los resultados finales.
- Publicar resultados es explícito. Supuesto: se publica una copia agregada con fecha y etiqueta Provisorio o Final; el comité puede actualizarla o retirarla.
- Reabrir no borra lo publicado, pero exige mostrar “Resultado del cierre anterior; consulta reabierta”. Un nuevo cierre no publica automáticamente nuevos resultados.
- Ocultar la etapa oculta también sus resultados a las familias.
- Datos individuales, textos libres, soporte, alimentación y comprobantes no se publican como resultados agregados por defecto.

## 6. Cobro y verificación

- Un cobro por evento, un importe configurado y una obligación por familia incluida. No multiplicar el importe por asistentes.
- Como máximo una etapa de pago operativa por evento. Duplicar una etapa de pago no genera una segunda deuda.
- Estados familiares: PENDIENTE, INFORMADO, REQUIERE_REVISION, VERIFICADO. La interfaz usa palabras comunes.
- La familia informa importe y fecha de transferencia, referencia opcional y comprobante opcional. Registrar también cuándo se presentó el informe.
- Si el importe declarado difiere del esperado, permitir dejar constancia pero señalar la diferencia y derivar a revisión. No considerarlo pago completo ni implementar cuotas implícitas.
- El comité puede solicitar revisión con motivo visible. La familia puede corregir el informe mientras la etapa esté abierta; se conservan versiones y archivos anteriores.
- Si está cerrada y hace falta corregir, el comité debe reabrirla o gestionar la aclaración por soporte. No existe una excepción silenciosa al cierre.
- Un organizador puede verificar cuando confirma la recepción completa. Debe registrar importe recibido y fecha declarada de recepción, además de actor y momento de la verificación.
- Supuesto: puede registrar una recepción comprobada aunque la familia no haya informado; se identifica como registro administrativo, sin fabricar una acción familiar.
- Un pago verificado bloquea la edición familiar, aunque la etapa siga abierta.
- Corregir una verificación requiere motivo e historial. Para devolverlo a revisión se retira su importe del total verificado exactamente una vez.
- Verificación y resúmenes se actualizan de forma atómica. Reintentos o doble clic no duplican la recepción.
- Vencimiento familiar no impide que el comité concilie después. El archivo del evento sí deja todo en consulta hasta una reapertura administrativa registrada.
- Mostrar monto esperado, informado pendiente de revisión y verificado por separado. Un pago verificado no se suma además como pendiente informado.
- Cambios de importe se bloquean desde el primer informe o recepción. Las instrucciones bancarias pueden corregirse con motivo, aviso destacado y conservación de las instrucciones anteriores.

## 7. Soporte y WhatsApp

- La familia crea una consulta dentro del evento y solo ve las propias.
- El comité ve Nueva, En gestión y Resuelta; puede asignar responsable y conservar historial de cambios.
- Resolver incluye un resumen visible de lo acordado. Las notas internas no se envían al cliente.
- Soporte no es un chat. La familia puede crear otra consulta referida a una anterior; el comité puede reabrir con motivo.
- Mensajes de WhatsApp incluyen nombre del evento, acción requerida, plazo si existe y enlace adecuado.
- Un mensaje grupal no contiene enlaces privados de familias. Un enlace general al evento requiere sesión familiar válida; de lo contrario indica que se use el enlace personal.
- Copiar o abrir WhatsApp no registra envío, entrega ni lectura. No se hacen envíos automáticos.

## 8. Archivo y conservación

- Archivar el evento lo deja en consulta para participantes y organizadores; bloquea respuestas, nuevos informes y nuevas consultas. El comité dispone de exportación.
- Restaurarlo requiere motivo. Las fechas vencidas siguen vencidas; restaurar no reabre etapas automáticamente.
- La auditoría es de solo agregado desde la aplicación y no tiene acciones de edición o borrado en la interfaz.
- Definir retención antes del piloto. Conservar historial operativo no significa guardar datos personales para siempre: las eliminaciones o anonimización seguirán un procedimiento explícito y registrado.

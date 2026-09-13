# Rondia · Guía de identidad e implementación

Identidad v1 seleccionada para implementación · 13/09/2026. Complementa el brief de negocio. Los ejemplos usan un evento y personas ficticias. La marca no está registrada ni aplicada todavía al producto operativo. La ejecución completa se especifica en [docs/10](10-implementacion-marca-mobile-first.md) y [docs/marca](marca/README.md).

## Sistema de marca

Nombre: **Rondia**. Logotipo: **rondia**, en minúsculas. Descriptor: «Consultas, avisos y seguimiento de pagos para eventos de familias». Frase: «Organizar juntos, con las cosas claras».

El símbolo es una ronda abierta con un punto coral. Sugiere un grupo y un lugar para participar. El trazo redondeado se repite en el logotipo. Es un dibujo vectorial propio de esta propuesta; su exclusividad registral no fue evaluada. No animarlo como un indicador de carga.

El logotipo se entrega en curvas, sin dependencia de fuentes. Usar el archivo horizontal principal sobre fondos claros, el inverso sobre verde profundo y el monocromo cuando solo haya una tinta. No reconstruirlo escribiendo el nombre con la tipografía de la interfaz.

### Tamaños y resguardo

- Logotipo horizontal: mínimo 112 px de ancho en pantalla y 30 mm en impresión.
- Símbolo aislado: mínimo 24 px; favicon simplificado probado a 16 y 32 px.
- Margen libre alrededor del conjunto: al menos el diámetro del punto del símbolo.
- Conservar proporciones. No aplicar contornos, sombras, degradados, giros o colores ajenos a las variantes.
- En producto, marca de 112–144 px; debajo o al lado, nombre del evento. El nombre del evento puede ocupar dos líneas.
- No colocar la marca del colegio como si avalara el servicio sin autorización.

## Paleta y funciones

| Nombre | Valor | Uso |
|---|---|---|
| Bosque | `#173F35` | Marca, texto destacado y acción principal. Texto blanco en botones. |
| Bosque activo | `#0E2C25` | Hover y pulsación de acción principal. |
| Marfil | `#F6F3EA` | Fondo general y piezas editoriales. |
| Papel | `#FFFFFF` | Formularios, tarjetas y documentos. |
| Coral | `#F37556` | Punto de marca y acentos decorativos. No sustituye alertas o errores. |
| Brote | `#D8EBA3` | Superficies editoriales con texto Bosque. No significa pago recibido. |
| Tinta | `#203B34` | Texto de lectura. |
| Secundario | `#52645D` | Ayudas y metadatos legibles. |
| Borde | `#C9D0C5` | Separadores y tarjetas; no basta para identificar un input. |
| Borde de control | `#75877E` | Inputs, selects y controles sin relleno destacado. |

Distribución orientativa en piezas: base clara dominante, verde como estructura, acentos limitados. No es necesario aplicar porcentajes rígidos a cada pantalla.

El coral no lleva texto blanco pequeño. En superficie coral usar Bosque activo (#0E2C25). El contraste de pares concretos se registra en `brand/rondia/contrastes.json`; ese cálculo no certifica accesibilidad de toda la aplicación.

## Tipografía

Interfaz: **Segoe UI**, con alternativas `system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif`. Son fuentes locales; el sistema usa la disponible en cada dispositivo y no descarga archivos externos. Cuerpo 16 px / 1,5; ayudas 14 px / 1,5; subtítulos 20 px / 1,3; títulos de pantalla 28 px / 1,15. Pesos 400, 600 y 700. Cifras financieras con numerales tabulares.

Piezas de marca: **Georgia**, alternativa `Times New Roman, serif`, para titulares de 40–72 px con interlínea 1,08. La mezcla editorial aporta carácter en portadas y comunicación. En formularios se mantiene la fuente de interfaz.

Usar mayúsculas solo en rótulos breves. No convertir instrucciones completas a mayúsculas. Evitar textos funcionales menores a 14 px. Montos con moneda explícita: «UYU 2.500». Fechas con año y zona horaria donde exista un cierre.

## Geometría y componentes

Espaciado basado en 4 px: 4, 8, 12, 16, 24, 32, 48 y 64. Márgenes de pantalla móvil: 16 px. Ancho de formularios: máximo 640 px. Administración de escritorio: hasta 1120 px cuando el contenido lo justifica.

Tarjetas: fondo blanco, borde de 1 px, radio de 16 px y sombra mínima. Botones: altura mínima de 48 px, radio de 12 px, texto 16 px y peso 600. Inputs: mínimo 48 px de altura, etiqueta visible y borde de control. Un botón principal por bloque de decisión.

Diseñar primero para 360 px y verificar también 320 px. Tarjetas administrativas o filas que se apilan; ninguna tabla ancha puede ser el único acceso a una función. Permitir zoom, teclado y reducción de movimiento. Foco de 3 px con separación de 3 px, ajustado al fondo de cada superficie.

Iconos de trazo sencillo y consistente, acompañados de texto cuando representan acciones. Evitar emojis como sistema de navegación, ilustraciones infantiles y fotos genéricas de niños. Las piezas de marca pueden usar arcos y puntos recortados del símbolo, en baja densidad. Nunca usarlos detrás de texto de lectura.

## Estados que no se pueden confundir

| Estado | Texto visible | Apariencia y siguiente acción |
|---|---|---|
| Consulta sin responder | Pendiente de respuesta | Ámbar suave; Responder. |
| Respuesta aceptada por servidor | Respuesta guardada | Verde suave, fecha y posibilidad de editar si sigue abierta. |
| Consulta cerrada | Consulta cerrada | Neutro; Ver mi respuesta. |
| Transferencia todavía no informada | Pendiente de informar | Neutro o ámbar; Informar pago si está habilitado. |
| Informe recibido | Pago informado · Pendiente de verificación | Azul suave; Ver detalle. Nunca el estado «Pago recibido». |
| Revisión requerida | Hay un dato para revisar | Ámbar, motivo visible y Corregir informe si está habilitado. |
| Recepción comprobada por comité | Pago recibido | Verde suave, fecha de recepción y consulta del registro. |
| Fallo de guardado | No pudimos guardar la respuesta | Rojo suave, conservar valores y Reintentar. |

Todas las etiquetas combinan texto y color. No presentar como deuda pública el estado de una familia. El comité ve datos individuales por su función; las familias ven su participación y los resultados agregados expresamente publicados.

Los contadores distinguen «Te queda 1 respuesta por enviar» de «Tu pago espera verificación». Una familia puede no tener acciones pendientes y aún esperar la verificación del comité. No sumar informado y recibido como dos aportes distintos.

## Arquitectura de las pantallas

**Entrada pública:** marca, descripción breve y dos instrucciones diferenciadas. Organizador: acceso administrativo. Familia: abrir el enlace privado recibido. No ofrecer un registro de familia ni pedirle buscar un evento público.

**Inicio familiar:** nombre del evento y familia visibles; próximas acciones; consultas en el orden del comité; pago con estado propio; acceso a consultas de ayuda. La marca ocupa un lugar secundario frente al evento.

**Responder:** una columna, opciones táctiles completas, fecha exacta de cierre y Guardar respuesta. La confirmación de guardado se muestra solo cuando responde el servidor. Si otra persona de la familia modificó la respuesta, explicar el conflicto.

**Pago:** mostrar importe, moneda e instrucciones; Informar pago describe la acción familiar. Separar visualmente fecha de transferencia, presentación del informe y recepción verificada. No poner un botón «Pagar» que sugiera una pasarela inexistente.

**Administración:** identificar el evento y «Organización». Resumen con consultas, participación y pagos por revisar. Conteos con denominadores. Familias, consultas, pagos y ayuda pueden adaptarse a tarjetas desde el celular. No añadir cambio de rol a familia.

**Cierre o anulación:** consecuencias y motivo cuando corresponde. No ocultar efectos importantes en un icono o aviso fugaz.

## Voz y textos

Voseo rioplatense como propuesta inicial: «Entrá», «Revisá», «Podés». Nombrar a «tu familia» y «el comité». Usar «consulta» en el recorrido familiar cuando «etapa» resulte abstracto; mantener la entidad técnica sin cambios de modelo.

| Situación | Texto de referencia |
|---|---|
| Bienvenida | «Este es el espacio de tu familia para la Fiesta de la generación». |
| Guardado | «Respuesta guardada. Podés modificarla hasta el 20 de octubre de 2026, a las 20:00 (Uruguay)». |
| Pago informado | «Recibimos tu informe. El comité va a revisar la transferencia». |
| Pago recibido | «El comité confirmó la recepción de UYU 2.500». |
| Error | «No pudimos guardar. Lo que escribiste sigue acá; intentá de nuevo». |
| Acceso inválido | «Este enlace ya no está disponible. Pedile uno nuevo al comité». |
| Revisión | «El importe informado no coincide con el aporte del evento. Revisá el detalle». |
| Pendientes del comité | «62 de 80 familias respondieron. Quedan 18 respuestas pendientes». |

Evitar «familias morosas», «usuario inválido», «operación exitosa», «sincronización completada» y frases que culpen a quien usa el sistema. «Tu respuesta quedó guardada» es más útil que una felicitación genérica.

### Comunicación comercial propuesta

Titular: «El próximo encuentro empieza con las cosas claras».

Apoyo: «Reuní las consultas, los avisos y el seguimiento de pagos del evento. Cada familia entra con su enlace y el comité puede ver qué falta».

Llamada a la acción comercial futura: «Conocer Rondia». No presentar autoservicio, prueba gratis, resultados medidos o testimonios que todavía no existen.

Mensaje preparado de muestra, para copiar y enviar manualmente: «Hola, familias. Ya está abierta la consulta de asistencia para la Fiesta de la generación. Podemos responder hasta el 20 de octubre, a las 20:00 (Uruguay). Entren desde el enlace privado de su familia que les compartió el comité». Un mensaje grupal nunca incluye enlaces familiares secretos.

## Aplicación al desarrollo

Los recursos están en `brand/rondia/`. El archivo `tokens.css` conserva los nombres de las variables existentes e incorpora las variantes que algunas pantallas hoy resuelven con colores de respaldo. Es un candidato para integrar; no está importado por la aplicación.

| Área | Trabajo previsto |
|---|---|
| `src/styles/tokens.css` | Incorporar paleta, tipografía, radios y estados del kit. |
| `src/styles/globals.css` | Revisar anchos, foco, tamaños y comportamiento móvil. |
| `src/components/Header.tsx` | Añadir marca discreta y conservar evento e identidad de sesión. |
| `Button`, `Card`, `Input`, `Badge` | Unificar alturas, bordes y variantes. Sustituir valores aislados. |
| `src/app/page.tsx`, `src/app/layout.tsx` | Nombre, descripción, icono y entrada de familia/organizador. |
| Rutas familiares | Estados, textos, cierre, guardado y revisión de pagos. |
| Administración | Datos privados autorizados, listas móviles y acciones de revisión. |
| Plantillas y exportaciones | Marca discreta; conservar datos, atribución y formatos. |

Orden recomendado: corregir protección de datos y conciliar decisiones de acceso; integrar variables y componentes; aplicar recorridos familiares; aplicar administración; actualizar comunicaciones y metadatos; validar recorridos y accesibilidad. Este orden no habilita despliegue ni mensajería real.

Criterios para dar por aplicada la marca: todas las rutas usan el sistema; logotipo legible; estados coherentes; texto editable ampliable; recorridos a 360 px sin desborde; foco y contraste revisados; ninguna alteración de permisos, plazos o registros de pago; revisión con personas del segmento. El dossier visual no reemplaza esas pruebas.

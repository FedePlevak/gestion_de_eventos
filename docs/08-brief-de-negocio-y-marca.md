# Rondia · Brief de negocio y marca

Documento creado el 13 de septiembre de 2026. Rondia y su identidad quedaron seleccionadas como base de implementación ese día. La validación registral y de dominio sigue pendiente. Posicionamiento, segmento inicial, oferta y precio continúan como hipótesis a validar con clientes. Este documento distingue lo observado en el repositorio de esas hipótesis.

## 1. Qué es el producto

Una plataforma web para coordinar eventos de grupos de familias. El comité publica información y consultas, define plazos, identifica pendientes y registra qué aportes fueron recibidos. Cada familia entra con su enlace privado, responde, consulta su participación e informa una transferencia. El comité verifica la recepción por separado.

La unidad de participación es la familia dentro de un evento. Esa decisión organiza el producto entero: una respuesta compartida, un acceso propio y una obligación de pago. Los organizadores se identifican individualmente y solo deben administrar sus eventos.

El primer caso documentado es una fiesta de fin de año de una generación escolar: aproximadamente 80 familias y entre 5 y 10 organizadores. La estructura prevista admite varios espacios, grupos y eventos. El blueprint inicial es un antecedente; prevalecen las decisiones posteriores de docs/01 a docs/07.

## 2. Qué necesidad cubre

El trabajo difícil ocurre durante la preparación: reconstruir acuerdos, contar respuestas, recordar plazos, revisar comprobantes y explicar el estado del evento. Cuando esa información está repartida entre conversaciones, formularios y planillas, alguien termina sosteniendo una versión manual de todo.

La necesidad funcional es tener un registro común y vigente por familia. La necesidad emocional es reducir la preocupación de olvidarse de alguien o equivocarse con dinero ajeno. La necesidad social es poder rendir cuentas al grupo con información atribuible, sin exponer innecesariamente a otras familias.

Trabajo que el cliente busca resolver: «Cuando me hago cargo del evento de la generación, quiero saber qué falta y compartir esa información con el comité, para llegar a la fecha con las respuestas y los aportes revisados».

El valor aparece si se reduce el trabajo de seguimiento. Publicar formularios por sí solo no demuestra ese valor. Hay que medir tareas repetidas, tiempo de gestión y cantidad de dudas durante el piloto.

## 3. Qué encontré en el desarrollo

Existe implementación de pantallas, rutas y servicios para accesos, grupos, eventos, consultas, pagos, resultados, soporte, mensajes preparados y exportación. Hay componentes visuales compartidos y variables de estilo. El README conservaba una descripción anterior que decía que todavía no existía aplicación; se actualizó durante esta entrega para reflejar el estado observado y sus límites.

La inspección realizada es de producto y código fuente. No se conectó a producción, no se leyeron datos de familias y no se certificó el funcionamiento completo. La existencia de un módulo o de una prueba no significa que todos sus criterios de aceptación estén cumplidos.

| Evidencia observada | Implicación para el negocio |
|---|---|
| Accesos familiar y administrativo separados; servicios específicos para cada uno. | Una experiencia adecuada para comités cuyos integrantes también participan como familia. |
| Consultas con estados, plazos, respuestas y versiones. | Permite coordinar decisiones durante la preparación, además de comunicar la fecha del evento. |
| Pagos con estados informado, revisión y verificado. | Aporta seguimiento; el producto no procesa dinero ni confirma depósitos por sí mismo. |
| Mensajes preparados para WhatsApp, soporte y exportación. | Puede incorporarse a la forma actual de trabajar del comité. El envío sigue siendo manual. |
| Colores, botones y tarjetas compartidos, con muchos estilos dentro de las pantallas. | Hay una base para aplicar marca, pero cambiar solo la paleta dejaría inconsistencias. |

### Brechas que afectan la promesa comercial

1. **Autorización en la página administrativa.** `src/app/admin/events/[eventId]/page.tsx` obtiene datos con Firebase Admin, busca el identificador en varios espacios y entrega participantes, pagos y consultas al componente cliente. En esa página no se valida sesión ni pertenencia antes de leer. El único layout localizado tampoco agrega esa protección y no se encontró middleware. Es un hallazgo estático prioritario: requiere corrección y pruebas de acceso anónimo y de otro evento antes de un piloto real. No se intentó acceder a datos para demostrarlo.
2. **Acceso administrativo diferente al acordado.** `src/app/admin/page.tsx` y `src/app/api/admin/auth/login/route.ts` usan correo y contraseña. docs/07 define enlace por correo. El diseño debe reflejar la decisión que se reconcilie, sin anunciar hoy acceso administrativo sin contraseña.
3. **Progreso familiar ambiguo.** `src/app/e/[eventId]/page.tsx` considera el pago informado como una etapa completada y puede mostrar un mensaje global de finalización. Puede ser correcto que la familia ya no tenga una acción pendiente, pero debe seguir viendo «Pendiente de verificación». El diseño propuesto distingue trabajo familiar terminado y dinero recibido.
4. **Evidencia de pruebas parcial.** Las suites usan sustitutos de Firestore en memoria; varias reemplazan además la autorización administrativa. Sirven para comprobar lógica aislada. No certifican rutas, aislamiento real, almacenamiento, concurrencia de Firestore o recorridos móviles. El registro de aceptación debe distinguir esas capas.

La marca debe acompañar un producto que cumpla estas reglas. No usar «seguridad garantizada», «conciliación automática» o «listo para cualquier colegio» como argumentos comerciales.

## 4. Cliente al que conviene dirigirse

### Segmento inicial recomendado

Comités de familias que organizan una fiesta de generación, cierre de curso o encuentro escolar con varias consultas previas y un aporte único por familia. Conviene empezar con eventos similares al piloto conocido. Uruguay es una hipótesis de lanzamiento razonable por la zona horaria y moneda del proyecto; no hay investigación que pruebe demanda local.

El criterio de selección más útil es conductual: ya hay una persona centralizando respuestas y pagos, el comité reconoce ese trabajo, falta tiempo para el evento y tiene capacidad para aprobar un gasto compartido.

| Papel | Persona o grupo | Qué necesita para aceptar |
|---|---|---|
| Impulsor y usuario principal | Familiar que coordina el comité. | Ver pendientes sin mantener otra planilla y repartir tareas de seguimiento. |
| Decisor de compra | Comité o comisión que aprueba gastos. | Precio cerrado, alcance claro y una demostración con su caso. |
| Pagador | Quien administra el presupuesto común o la asociación de familias. | Un mecanismo de contratación y comprobante comercial, a definir fuera del MVP. |
| Usuario de seguimiento financiero | Integrante que verifica transferencias. | Separar informado de recibido y conservar correcciones. No constituye un rol con permisos especiales. |
| Usuario invitado | Adultos que comparten el enlace familiar. | Entrar desde el celular, entender qué hacer y comprobar que se guardó. |
| Facilitador o futuro comprador | Colegio, asociación o club. | Confianza, continuidad entre comités y evidencia de uso. No asumir que el colegio autoriza o paga el piloto. |

### Avatar de trabajo: Alex, integrante del comité

Persona ficticia para orientar diseño y ventas. Edad propuesta: 41 años; no es un requisito de segmentación. Trabaja, tiene responsabilidades familiares y aceptó coordinar la fiesta de la generación. Usa WhatsApp todos los días y puede manejar una planilla, pero no quiere administrar un sistema complejo.

Su disparador de compra es darse cuenta de que se acercan los plazos y todavía hay respuestas o transferencias sin revisar. Su objeción principal: «Si las familias no lo usan, voy a tener el doble de trabajo». También pregunta quién conserva los datos, cómo recupera la información y quién la ayuda si algo falla.

La demostración que necesita: cargar una lista ficticia, abrir un enlace familiar, guardar una respuesta, encontrar a quienes faltan y ver la diferencia entre pago informado y recibido. Su señal de éxito es poder resolver el seguimiento desde el celular sin pedirle a otra persona que le arme un reporte.

### Expansión posible

Tras validar el primer segmento, probar asociaciones de familias con eventos recurrentes y clubes con encuentros financiados mediante un aporte por familia. Un contrato institucional anual puede mejorar la continuidad entre generaciones, pero requiere validar compra, acompañamiento y permisos.

No priorizar inicialmente productoras de festivales, congresos, bodas profesionales o viajes financiados en cuotas. Esos casos suelen exigir entradas, proveedores, presupuestos, múltiples tarifas o pagos parciales que quedan fuera del alcance actual. Tampoco vender el producto como gestión académica escolar.

## 5. Alternativas y lugar en el mercado

Consulta exploratoria de fuentes públicas, 13/09/2026. No es un estudio exhaustivo ni una estimación del tamaño de mercado.

| Alternativa | Qué ofrece o resuelve | Enfoque recomendado para Rondia |
|---|---|---|
| WhatsApp + formularios + planilla | Es la combinación que el problema documentado busca ordenar. | Conservar WhatsApp como canal y concentrar el registro por familia. Su uso real y costo de cambio deben investigarse. |
| Cheddar Up | Cobros e información de grupos; permite pagar sin cuenta o descarga. [Descripción oficial](https://support.cheddarup.com/hc/en-us/articles/360035586691-What-Cheddar-Up-does). | El acceso sencillo no es una diferenciación exclusiva. Enfatizar coordinación por etapas y registro de transferencias verificadas por el comité. |
| Konstella | Comunidad privada para organizaciones de familias, comunicación, actividades y voluntariado. [Sitio oficial](https://www.konstella.com/). | Proponer una incorporación acotada al evento. No exigir adoptar una plataforma escolar completa. |
| Eventbrite | Venta de entradas, difusión y herramientas para organizadores. [Presentación oficial](https://www.eventbrite.com/organizer/overview/). | Vender preparación y seguimiento de un grupo ya convocado. No competir por descubrimiento público o ticketing. |

La oportunidad inferida es especializar el recorrido de comités hispanohablantes. La combinación de identidad familiar, consultas con cierre y verificación administrativa constituye el enfoque; todavía no demuestra una ventaja difícil de copiar. La defensa comercial tendría que construirse con facilidad de uso, acompañamiento repetible y recomendaciones entre comités.

## 6. Oferta y modelo comercial propuestos

Empezar con una tarifa fija por evento que paga el comité. Las familias invitadas no pagan por acceder. Incorporar puesta en marcha asistida y una explicación breve al comité. El dinero del evento se transfiere a la cuenta indicada por sus organizadores; la plataforma registra el seguimiento.

La tarifa por evento acompaña un uso temporal y evita cobrar por cada organizador. No se recomienda comisión sobre aportes mientras Rondia no procesa dinero. Una suscripción institucional podría evaluarse después de observar repetición de eventos.

**Hipótesis de precio para una prueba: UYU 4.900 por evento comparable al piloto.** Es una cifra propuesta para entrevistar y cotizar de forma experimental, no una tarifa validada, un precio de mercado ni una oferta publicada. Con 80 familias equivale a UYU 61,25 por familia como referencia del costo compartido; no implica cobrarles individualmente.

Ejercicio económico ilustrativo, con importes antes de impuestos, comisiones de cobro del servicio y costos fijos: si de UYU 4.900 se asignan UYU 400 a infraestructura y 3 horas a UYU 600 de acompañamiento, quedan UYU 2.700 antes de adquisición y estructura. Si el acompañamiento consume 8 horas, el resultado pasa a -UYU 300. Los costos son supuestos, no mediciones. El tiempo de soporte puede determinar la viabilidad más que el alojamiento.

Antes de vender, definir duración de acceso, conservación posterior, alcance del soporte y quién puede contratar. Preparar manualmente contratación y cobro del servicio; suscripciones, facturación automática y autoservicio siguen fuera del software acordado.

### Adquisición y validación

1. Entrevistar a 6 responsables de comités sobre el último evento real: qué hicieron, cuántas veces repitieron tareas, qué errores hubo, quién aprobó gastos y cuánto tiempo consumió. No pedir nombres o comprobantes de familias.
2. Hacer pruebas de uso con 3 personas en rol familiar y 2 en organización, como propone docs/03. Observar acceso, respuesta, corrección y pago informado; no ayudar antes de registrar el bloqueo.
3. Tras resolver los bloqueos técnicos, ofrecer 3 pilotos acompañados a comités comparables. Llevar una cotización concreta para comprobar disposición de compra. No contactar ni enviar invitaciones como parte de esta entrega.
4. Captar los primeros casos a través de presentaciones personales a comités y asociaciones. Probar después recomendaciones a la siguiente generación y acuerdos con instituciones. Postergar publicidad amplia hasta observar conversión y costo de soporte.

Registrar por piloto: familias convocadas y que acceden, respuestas antes del cierre, asistencia requerida, horas de preparación del comité, horas de soporte del proveedor, errores de conciliación y voluntad de volver a contratar. Comparar con el evento anterior cuando haya datos fiables; si no, registrar una línea de base prospectiva.

Umbrales propuestos para decidir otra ronda: 2 de 3 comités aceptan pagar el precio probado; las 5 personas completan sus tareas críticas sin ayuda tras las correcciones; cero accesos indebidos en pruebas de aislamiento; soporte registrado de hasta 3 horas por evento. Son criterios de decisión iniciales, no evidencia estadística ni compromisos de servicio.

## 7. Brief creativo

**Nombre seleccionado para la implementación:** Rondia. En el logotipo se escribe `rondia`; en texto corrido, Rondia. Pronunciación prevista: «RON-dia», sin tilde. Evoca una ronda y la participación de un grupo; es una asociación creativa, no una etimología. La selección de producto no sustituye la validación registral.

**Categoría:** organización de eventos de familias.

**Descriptor:** Consultas, avisos y seguimiento de pagos para eventos de familias.

**Frase de marca:** Organizar juntos, con las cosas claras.

**Posicionamiento:** Para comités de familias que preparan un evento compartido, Rondia reúne consultas, plazos y seguimiento de aportes en un espacio que las familias pueden abrir desde su enlace. El comité mantiene el control de las decisiones y la verificación de pagos.

**Personalidad:** cercana al explicar, precisa al registrar y serena cuando algo requiere revisión. Trata a los adultos como personas capaces. No infantiliza por estar vinculada a colegios.

**Promesa a validar:** que el comité pueda saber qué falta sin reconstruir conversaciones, y que cada familia pueda comprobar el estado de su participación.

**Razones para creer:** estados explícitos, una identidad por familia, registro de cambios, resultados publicados por el comité y acceso pensado para celular. Su uso comercial depende de verificar los recorridos reales.

**Dirección estética:** verde profundo para estructura y acciones; fondo marfil; coral para identificación de marca; verde claro para superficies editoriales. Tipografía de interfaz familiar y legible, con títulos editoriales de serif en piezas de marca. El evento es protagonista dentro del producto; la marca acompaña.

## 8. Nombre: exploración y límites

Se exploraron Enronda, Juntiva, Juntara, Aunalia y Rondia. Enronda ya identifica una plataforma de bienestar y experiencias; Juntiva aparece como software de actas; Juntara como agencia de servicios digitales. Se descartaron por coincidencias visibles. [Enronda](https://www.enronda.com/), [Juntiva](https://www.juntivacr.com/), [Juntara](https://www.juntaragroup.com/). Aunalia también mostró antecedentes de uso; no se profundizó al descartarla.

Las búsquedas «Rondia», «Rondia app eventos» y «Rondia software app marca eventos dominio» no mostraron una coincidencia evidente del mismo tipo de producto entre los resultados consultados. Aparecieron usos personales y geográficos. Esto no prueba disponibilidad ni originalidad exclusiva.

Un [registro WHOIS publicado por un tercero](https://www.asanrayan.com/whois/rondia.com) indica que rondia.com está registrado. Es una señal para no dar por disponible ese dominio; no se verificó la situación en un registrador en tiempo real. `usarondia.com` y `rondia.uy` son alternativas para comprobar, sin disponibilidad verificada. No se compró ni reservó ningún dominio o usuario social.

Antes de adoptar públicamente el nombre: verificar antecedentes denominativos y gráficos, posibles similitudes, dominios y usuarios sociales en los mercados elegidos. La búsqueda exploratoria realizada no sustituye esa validación. Probar también recuerdo, escritura y pronunciación con 5 personas del segmento.

## 9. Entrega y decisiones pendientes

Se entrega este brief, guía de identidad, logotipos vectoriales, icono de aplicación, pieza social de muestra, variables de diseño, dossier visual y vistas de referencia del producto con datos ficticios. La propuesta permite revisar y luego aplicar la marca sin decidir nuevamente cada color o estado.

El kit no cambia por sí solo los recorridos de la aplicación, no agrega funciones comerciales y no publica un sitio. Rondia fue seleccionada para implementarse. Quedan pendientes la validación registral y de dominio, el precio experimental y la ejecución completa definida en [docs/10](10-implementacion-marca-mobile-first.md). Las correcciones funcionales deben abordarse con sus pruebas antes de habilitar el piloto.

## Fuentes del proyecto

README y docs/01 a docs/07; blueprint conservado como antecedente; `src/app/page.tsx`, `src/app/layout.tsx`, páginas familiares y administrativas; módulos de accesos, etapas, pagos y sus tipos; componentes y estilos compartidos; suites de pruebas existentes. La revisión se hizo sobre el árbol de trabajo disponible el 13/09/2026.

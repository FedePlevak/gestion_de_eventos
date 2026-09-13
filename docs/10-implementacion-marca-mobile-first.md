# Implementación de Rondia en toda la plataforma

Documento de entrada para la IA desarrolladora. Fecha: 13/09/2026.

## Encargo vigente

El usuario valoró la propuesta de Rondia y pidió preparar los archivos de instrucciones para implementar esa identidad en toda la plataforma con prioridad en el celular. Rondia es la referencia de nombre y diseño para esta implementación. No volver a elegir nombre, paleta o estilo sin una indicación posterior o un impedimento concreto.

Esta entrega crea documentación. No acredita que la identidad esté aplicada, que los problemas funcionales estén corregidos o que el producto esté habilitado para producción. La validación registral y de dominio sigue pendiente; no impide trabajar localmente con la identidad elegida. Precio, oferta y mercado del brief siguen siendo hipótesis comerciales.

## Resultado esperado de la implementación

La aplicación real debe verse y expresarse como Rondia en entrada, acceso familiar, consultas, pagos, ayuda, administración, mensajes preparados, descargas y estados excepcionales. Debe conservar sus datos, accesos, rutas y reglas de negocio. La experiencia se construye primero a 360 px, se comprueba a 320 px y se amplía para escritorio.

El trabajo se realiza sobre el proyecto existente. El dossier es una referencia visual: no copiar sus cifras, simulaciones de guardado, navegación de demostración ni contenido ficticio a los recorridos reales. No entregar una segunda aplicación estática como sustituto del producto.

## Orden de lectura y precedencia

1. [Instrucciones del repositorio](../AGENTS.md), [README](../README.md) y docs/01 a docs/07, en orden, para conocer alcance, reglas y stack.
2. [Brief](08-brief-de-negocio-y-marca.md) y [guía visual](09-guia-de-identidad-rondia.md), para comprender la intención de marca.
3. Este documento y los archivos de implementación de la tabla siguiente, en orden.
4. [Kit original](../brand/rondia/README.md), [dossier visual](../brand/rondia/rondia-dossier.html), [variables candidatas](../brand/rondia/tokens.css) y [contrastes medidos](../brand/rondia/contrastes.json).

Las instrucciones posteriores del usuario prevalecen. docs/01 y docs/02 gobiernan alcance y negocio. Este paquete concreta la aplicación visual y móvil de docs/03 y docs/09. Ante una diferencia entre las medidas de una captura y los contratos escritos, aplicar los contratos. El dossier y el PDF de propuesta son antecedentes de diseño; no hay que reescribir el producto para reproducir una captura.

| Orden | Archivo | Qué debe resolver |
|---|---|---|
| 1 | [Sistema visual y componentes](marca/01-sistema-visual-y-componentes.md) | Recursos, variables, tipografía, componentes y reglas móviles compartidas. |
| 2 | [Acceso y experiencia familiar](marca/02-acceso-y-experiencia-familiar.md) | Contrato por pantalla familiar y estados de sus recorridos. |
| 3 | [Experiencia del organizador](marca/03-experiencia-organizador.md) | Administración completa desde el celular. |
| 4 | [Estados y contenidos](marca/04-estados-y-contenidos.md) | Correspondencia entre datos y textos; pagos, plazos, mensajes y errores. |
| 5 | [Plan de implementación](marca/05-plan-de-implementacion.md) | Orden, dependencias, hallazgos previos y límites de autonomía. |
| 6 | [Aceptación y evidencia](marca/06-aceptacion-y-evidencia.md) | Escenarios verificables y registro de cobertura de todos los archivos. |
| 7 | [Prompt de ejecución](marca/07-prompt-para-ia-desarrolladora.md) | Encargo autocontenido para iniciar o continuar la implementación. |

## Decisiones de diseño concretas

- Nombre visible: Rondia; logotipo original en minúsculas. Frase: «Organizar juntos, con las cosas claras».
- Verde Bosque, Marfil, Coral y Brote de la guía. Tema claro fijo como alcance inicial; no agregar un tema oscuro en este encargo.
- Segoe UI y fuentes del sistema en la aplicación. Georgia para titulares editoriales de entrada y piezas de marca, no para controles o montos.
- Cuerpo de 16 px; ayudas y estados de al menos 14 px; áreas táctiles de al menos 48 × 48 px.
- Formularios y recorrido familiar en una columna. Organización móvil con navegación visible que no dependa de deslizar lateralmente.
- El nombre del evento y la familia o contexto administrativo tienen prioridad sobre el tamaño del logotipo.
- Sin cambio de rol entre familia y organización. «Ayuda» distingue las consultas al comité de las consultas de participación del evento.
- El azul identifica el pago informado pendiente de verificación. El verde de éxito corresponde a recepción verificada o a una respuesta efectivamente guardada.

## Alcance y límites

Incluye adaptar estilos, componentes, disposición, accesibilidad, textos de interfaz, metadatos públicos, iconos y mensajes preparados. Incluye preservar o corregir la representación de los estados existentes y probar los recorridos afectados.

No agrega landing comercial extensa, precios en pantalla, suscripciones, pasarela de pagos, funciones de IA, chat, envíos automáticos, aplicaciones nativas, instalaciones obligatorias ni cambios de proveedor. No renombrar colecciones, claves persistidas, rutas o identificadores internos por razones de marca. No inventar roles de tesorería con permisos diferentes.

Los hallazgos funcionales se gestionan por separado en el plan. Una corrección de autorización o de conteos no puede presentarse como un cambio meramente cosmético. Tampoco se puede conservar una exposición de datos para que una pantalla de muestra funcione.

## Definición de terminado

Toda fila del inventario de cobertura tiene un resultado verificable; los recorridos reales usan la identidad; no quedan bloqueos móviles o ambigüedades de pago; pasan las comprobaciones de negocio afectadas. Se documentan las comprobaciones no ejecutadas y sus causas. Una captura o una prueba con datos en memoria no certifica aislamiento real.

La IA debe entregar cambios, documentación actualizada, evidencia con datos ficticios y un informe de pendientes. Debe diferenciar implementación visual completa, validación funcional completa y habilitación del piloto. El despliegue y las comunicaciones reales continúan sujetos a la habilitación explícita del usuario.

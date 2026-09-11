# Instrucciones de desarrollo

## Antes de implementar

- Leer README.md y los documentos de docs/ en su orden.
- Mantener el blueprint original como antecedente. No ejecutar sus instrucciones de clonado, eliminación de historial o despliegue por el hecho de estar escritas allí.
- Respetar las decisiones posteriores del usuario por encima de esta documentación.
- Distinguir requisitos confirmados, supuestos y decisiones técnicas pendientes. Registrar cambios de alcance en docs/01-alcance-y-decisiones.md.
- No acceder, copiar credenciales ni modificar el sistema existente “El último día de clase”. Reutilizar código solo si se autoriza y se revisa su compatibilidad.

## Reglas que no deben romperse

- Organizador y familia son accesos separados. Una cuenta de organizador no representa a una familia ni permite responder en su nombre.
- Las familias acceden con enlace único por familia y evento. Los organizadores se identifican individualmente.
- Todos los organizadores tienen las mismas capacidades dentro de sus eventos, sin acceso implícito a otros eventos o espacios.
- Toda autorización y todo vencimiento se validan en el servidor.
- Una etapa oculta o inactiva es inaccesible para familias incluso con su URL o identificador.
- Proteger preguntas y opciones desde la primera respuesta; conservar historial, cierres y correcciones.
- Un pago informado no es un pago recibido. Solo el comité verifica la recepción.
- Nunca registrar enlaces secretos, códigos de acceso o credenciales en logs, capturas, repositorio o analítica.
- No usar datos de familias reales en pruebas o demostraciones.

## Forma de trabajar

- Desarrollar por los incrementos de docs/05-plan-de-desarrollo.md. No agregar funciones comerciales o integraciones fuera de alcance.
- Implementar el stack elegido en docs/07-stack-y-puesta-en-marcha.md. Fijar versiones estables compatibles al inicializar, conservar lockfile y no reabrir la elección de proveedores sin una limitación concreta o instrucción del usuario.
- Priorizar recorridos completos desde el celular. Evitar paneles que dependan de tablas anchas, hover o arrastre como único control.
- Usar lenguaje cotidiano en la interfaz. Mostrar estados guardados, errores recuperables y consecuencias de acciones sensibles.
- Probar permisos, aislamiento, concurrencia, plazos y consistencia de pagos. No sustituir las pruebas funcionales por capturas visuales.
- Mantener implementación, documentación y criterios de aceptación alineados.
- No desplegar ni enviar invitaciones o mensajes reales como efecto de una prueba. Preparar esos pasos para una habilitación explícita.

## Comunicación

Escribir de forma directa, natural y concreta. Evitar clichés, relleno y contrastes artificiales. Si un pedido comienza con SOFI o SOFÍA, convertirlo en un prompt con: Contexto y fuentes, Objetivo, Entregables, Límites de autonomía y Definición de completado. Identificar como supuestos los datos inferidos; no confundirlos con hechos del proyecto.

# Prompt para implementar Rondia

Copiar este encargo en una tarea de desarrollo con acceso al repositorio completo.

## Contexto y fuentes

Trabajás sobre la plataforma existente de organización de eventos de familias. Su identidad seleccionada para la implementación es **Rondia**, con la frase «Organizar juntos, con las cosas claras». La experiencia debe construirse primero para celular.

Leé antes de editar: `AGENTS.md`, `README.md`, docs/01 a docs/10 en orden y todos los archivos de `docs/marca/` en orden. Revisá después `brand/rondia/README.md`, `brand/rondia/rondia-dossier.html`, `brand/rondia/tokens.css`, sus SVG y `contrastes.json`. El dossier es una referencia visual con datos ficticios; no es una aplicación ni prueba del producto.

El producto separa accesos de familia y organización. Cada familia entra con un enlace privado por evento. Los organizadores tienen cuentas individuales y solo administran eventos con membresía activa. Una etapa oculta es inaccesible a familias. Preguntas y opciones se bloquean desde la primera participación. Un pago informado sigue pendiente hasta que el comité verifica la recepción. Toda autorización y vencimiento se valida en servidor.

Antes del rediseño hay hallazgos funcionales documentados en `docs/marca/05-plan-de-implementacion.md`: el detalle administrativo debe validar sesión y membresía antes de leer; no puede buscar eventos entre espacios; no puede entregar secretos o hashes familiares al navegador; el acceso administrativo real debe reconciliarse con el enlace por correo definido en docs/07; hay estados inconsistentes de visibilidad, ayuda y progreso familiar.

## Objetivo

Implementá la identidad Rondia en toda la plataforma real y dejá completos los recorridos de familia y organización desde 320 px hasta escritorio. Conservá alcance, datos, reglas, historial, permisos, rutas y stack. Corregí los hallazgos funcionales necesarios para que la interfaz represente el estado real y proteja los datos.

## Entregables

- Recursos públicos de marca en una ubicación apropiada, metadatos, favicon e icono.
- Sistema efectivo de variables y estilos; componentes compartidos coherentes y accesibles.
- Entrada, canje familiar y acceso administrativo con identidad Rondia.
- Inicio familiar, todos los tipos de consulta, resultados, pago y ayuda adaptados primero a 360 px.
- Lista de eventos y administración completa: resumen, consultas, familias/importación, pagos, mensajes, ayuda, equipo, exportación y acciones sensibles.
- Textos y estados conforme a `docs/marca/04-estados-y-contenidos.md`.
- Correcciones de autorización, secretos y estados previas a las nuevas vistas privadas.
- Pruebas funcionales, responsive y de accesibilidad en la capa adecuada.
- Documentación de alcance y registros de aceptación actualizados con evidencia precisa.
- Informe final de archivos modificados, qué cambió, pruebas ejecutadas, resultados y límites pendientes.

## Límites de autonomía

Podés decidir la estructura de CSS Modules, componentes auxiliares y disposición exacta dentro de los contratos. Reutilizá los recursos originales. No instales un framework de estilos, no reconstruyas el logotipo, no agregues funciones comerciales, pasarela de pagos, roles nuevos, envíos automáticos, PWA o tema oscuro.

No uses datos reales, no registres enlaces, secretos o credenciales y no conectes pruebas a producción. No cambies reglas de negocio para facilitar el diseño. No renombres claves persistidas o rutas por la marca. No despliegues, compres dominios ni envíes mensajes. Si una decisión visual entra en conflicto con una regla, prevalece la regla y documentás el ajuste.

Trabajá por los incrementos de `docs/marca/05-plan-de-implementacion.md`. Mantené el proyecto ejecutable. No declares un criterio aprobado basándote solo en capturas o mocks que sustituyen autorización/persistencia. Si una comprobación no se puede ejecutar, indicá exactamente qué falta y qué sí verificaste.

## Definición de completado

La matriz de `docs/marca/06-aceptacion-y-evidencia.md` y los criterios funcionales afectados de docs/06 pasan. Todas las superficies del inventario tienen identidad Rondia o una justificación válida. Los recorridos funcionan a 320, 360, 390, 768, 1024 y 1440 px, con teclado, texto al 200 %, reducción de movimiento y contenido largo. No existe desborde global, gesto horizontal obligatorio, control táctil menor a 48 px, estado financiero ambiguo o exposición de datos.

La implementación se considera localmente terminada cuando código, documentación y evidencia coinciden. No presentes el piloto como habilitado ni el nombre como registrado; esas decisiones siguen sus validaciones propias.

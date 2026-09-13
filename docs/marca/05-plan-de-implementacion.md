# Plan de implementación de la identidad Rondia

La IA desarrolladora debe ejecutar incrementos completos. Cada incremento deja el producto ejecutable y aporta evidencia. No hacer un reemplazo masivo de colores y declarar terminado.

## 0. Línea de base

1. Leer los documentos indicados en [el encargo](../10-implementacion-marca-mobile-first.md).
2. Revisar el estado de Git y preservar cambios existentes. No regenerar el kit ni editar sus fuentes de construcción salvo necesidad documentada.
3. Ejecutar pruebas y build actuales. Registrar versión, entorno y fallos previos.
4. Crear un inventario final de rutas y componentes a partir del repositorio. Compararlo con [aceptación](06-aceptacion-y-evidencia.md).
5. Preparar únicamente datos ficticios. No conectar una revisión visual a producción.

Salida: línea de base reproducible y alcance confirmado. Un fallo previo no se oculta como efecto de la marca.

## 1. Bloqueos funcionales previos

Resolver antes de poner datos privados en nuevas pantallas administrativas:

### Autorización del detalle administrativo

`src/app/admin/events/[eventId]/page.tsx` lee con Admin SDK y busca el evento en varios espacios sin validar primero la sesión y membresía. Cambiar el flujo para obtener contexto de organizador, usar su espacio autorizado, validar membresía activa y recién entonces leer el evento y sus subcolecciones. No enumerar espacios para resolver un identificador.

Añadir pruebas de integración de la ruta o de su cargador: anónimo, organizador ajeno, membresía revocada, evento de otro espacio y autorizado. Los mocks unitarios de `validateOrganizerEventAccess` no bastan para esta página.

### Datos de acceso familiar

La página administrativa prepara `secret: accessSecret || tokenHash` para el cliente. Trazar dónde se usa. El hash nunca es un enlace y no se entrega como si lo fuera. Un secreto original no debe estar persistido en claro según docs/04. Diseñar generación o reemplazo para revelar un nuevo enlace solamente en el momento autorizado y evitar persistirlo o registrarlo. Conservar compatibilidad solo si se puede hacer sin mantener la exposición.

### Acceso de organizadores

Resolver la diferencia entre correo y contraseña del código y enlace por correo de docs/07. La decisión vigente de producto es enlace por correo verificado. Implementar el flujo completo o, si existe un impedimento concreto, registrarlo en docs/01 antes de cambiar la decisión. No limitarse a cambiar el texto del formulario.

### Estados inconsistentes

- Visibilidad de etapas: los tipos usan `visible`/`hidden`; el resumen actual filtra `public`.
- Ayuda: los tipos usan `new`/`in_progress`/`resolved`; evitar condiciones sobre `closed` sin contrato.
- Progreso familiar: separar respuestas y lecturas de la verificación del pago.
- README y evidencia de pruebas: no afirmar cobertura real basándose únicamente en sustitutos en memoria.

Salida: autorizaciones y estados coherentes, con pruebas suficientes. Estos cambios se reportan como correcciones funcionales relacionadas, no como estilo.

## 2. Base visual y recursos

1. Copiar recursos públicos elegidos a `public/brand/rondia/`.
2. Integrar variables de `brand/rondia/tokens.css` en la fuente real `src/styles/tokens.css`.
3. Rehacer las bases de `globals.css` para los anchos familiar y administrativo.
4. Migrar Header, Button, Input, Card, Badge y StageCountdown a estilos consistentes. Priorizar CSS Modules y conservar sus contratos o migrar todos los consumidores en el mismo incremento.
5. Añadir favicon, icono y metadatos de Rondia.

Eliminar valores de color aislados, tamaños táctiles menores a 48 px y `transition: all` de los recorridos en alcance. No sustituir automáticamente todo valor numérico; mantener estilos que expresen estado dinámico o necesidades propias del componente.

Salida: catálogo mínimo de componentes probado de 320 a 1440 px, sin cambiar aún toda la composición de las pantallas.

## 3. Entrada y acceso

Aplicar Rondia a `src/app/page.tsx`, `/f` y `/admin`. Completar estados de carga, error, acceso y sesión. Implementar el mecanismo administrativo reconciliado en el incremento 1. Verificar que secretos se limpien y no aparezcan en mensajes, consola o capturas.

Salida: ambos accesos se distinguen y funcionan desde 320 px, sin selector de rol.

## 4. Recorrido familiar completo

Aplicar [02-acceso-y-experiencia-familiar](02-acceso-y-experiencia-familiar.md) en inicio del evento, todos los tipos de consulta, resultados, pago y ayuda. Corregir textos y cálculo del resumen. Mantener valores escritos ante error y representar conflicto, cierre y verificación.

Salida: una familia puede entrar, responder, modificar, confirmar lectura, informar pago, ver revisión/recepción y crear una consulta de ayuda desde 360 px. Etapas no autorizadas siguen protegidas en servidor.

## 5. Administración completa

Aplicar [03-experiencia-organizador](03-experiencia-organizador.md) en lista de eventos y cada sección. Comenzar por navegación y resumen; después consultas, familias/importación, pagos, mensajes, ayuda, equipo, exportación y ajustes sensibles.

No esperar al final para probar listas largas, textos extensos, cifras grandes y teclado móvil. Las vistas de escritorio pueden usar tablas como complemento, con equivalencia móvil.

Salida: todos los recorridos administrativos críticos funcionan con tacto y teclado desde 360 px, y aprovechan hasta 1120 px en escritorio.

## 6. Contenido y superficies secundarias

Actualizar mensajes preparados, metadatos, estados de error, descargas y textos residuales. Buscar nombres anteriores, «Gestión de Eventos», estilos de azul anterior, emojis de navegación, `font-size: 11px`, botones menores de 48 px, `outline: none`, hexadecimales y descripciones que confundan pago informado con recibido.

Revisar el resultado de la búsqueda uno por uno. No reemplazar palabras dentro de contratos, claves, datos o pruebas sin comprender su función.

Salida: no quedan superficies visibles de la identidad anterior ni textos incompatibles con los contratos.

## 7. Validación y cierre

Ejecutar la matriz de [aceptación](06-aceptacion-y-evidencia.md). Probar 320, 360, 390, 768, 1024 y 1440 px. Incluir teclado, zoom al 200 %, reducción de movimiento, errores, contenido largo y permisos.

Actualizar docs/01 si cambió alcance, docs/03 si cambió un recorrido y docs/06 con evidencia precisa. Actualizar README para declarar la identidad aplicada solo cuando se cumpla toda la definición de terminado.

Salida: informe de implementación, pruebas y pendientes reales. No desplegar, comprar dominio o enviar mensajes.

## Límites de autonomía

La IA puede decidir estructura de CSS Modules, nombres internos de componentes nuevos y disposición exacta dentro de los contratos. Puede corregir defectos necesarios para que la identidad represente fielmente el producto y sea segura, documentando su alcance.

No puede cambiar reglas de acceso, aceptar pagos parciales, agregar roles, procesar dinero, enviar comunicaciones, contratar servicios, usar datos reales, eliminar historia o reducir pruebas críticas. Una decisión que amplíe el producto se registra como pendiente y no se implementa por conveniencia visual.

# Plan de desarrollo

## Forma de entrega

Trabajar por recorridos funcionales completos. Cada incremento debe ser demostrable con datos ficticios y actualizar la documentación si una decisión cambia. El stack está elegido en el documento 07; falta estimar tareas y consumo para presupuestar el total.

## 0. Preparación técnica y diseño

- Validar estos documentos y registrar ajustes concretos sin reabrir decisiones ya confirmadas.
- Inicializar el stack del documento 07, fijar versiones estables compatibles y validar integración de sesiones, transacciones, correo y archivos privados. No volver a abrir la selección de proveedores sin un impedimento concreto.
- Diseñar pantallas móviles de entrada familiar, etapa, pago, creación de etapa y revisión administrativa.
- Preparar datos ficticios: dos espacios, varios grupos, dos eventos en un mismo espacio, organizadores con accesos distintos y familias compartidas entre eventos.
- Aplicar la identidad Rondia conforme a [docs/10](10-implementacion-marca-mobile-first.md) y [docs/marca](marca/README.md). Resolver primero los bloqueos funcionales que afecten la veracidad o privacidad de las nuevas pantallas.

Salida: decisiones técnicas registradas y recorridos revisables. Sin invitaciones reales ni dependencia del sistema existente.

## 1. Accesos, grupos y convocatoria

- Persistencia, migraciones o configuración equivalente, errores y auditoría base.
- Cuentas de organizadores, invitaciones, membresías y revocación.
- Gestión de grupos/familias e importación con revisión de duplicados.
- Crear evento desde grupo, ajustar participantes y designar comité.
- Enlaces familiares por evento, canje, sesiones y regeneración.

Salida: una familia solo ve su evento autorizado; un organizador solo administra los suyos; cambios en grupos no alteran convocatorias existentes.

## 2. Etapas y participación

- Editor por tipos con campos complementarios simples, borrador y vista previa.
- Publicación, visibilidad, orden y vencimiento opcional.
- Apertura, lectura confirmada, respuestas y versiones.
- Cierre automático efectivo, cierre manual, reapertura y copia final.
- Bloqueo semántico tras respuestas, aclaraciones, duplicación y anulación.
- Concurrencia entre dispositivos y entre cierre/edición/respuesta.

Salida: circuito completo de consulta y resultado final; etapas ocultas protegidas también en servidor.

## 3. Seguimiento y comunicación

- Resumen por etapa, filtros y pendientes con denominadores correctos.
- Publicación explícita de resultados agregados y copias fechadas.
- Plantillas para WhatsApp, copia y apertura sin atribuir envío.
- Exportación de respuestas y participación.
- Soporte: creación familiar, responsable, estados, notas internas y resolución visible.

Salida: el comité puede identificar pendientes, preparar recordatorios y gestionar consultas sin reconstruir conversaciones externas.

## 4. Pago y recepción

- Cobro único, moneda e instrucciones, lista de familias incluidas.
- Informe familiar y almacenamiento privado de comprobantes.
- Revisión, corrección familiar habilitada y recepción administrativa.
- Reversión justificada de verificación y resúmenes consistentes.
- Exportación financiera y pruebas de idempotencia/concurrencia.

Salida: no se confunde dinero informado con recibido; ningún reintento duplica una recepción.

## 5. Preparación del piloto

- Archivo de evento, exportaciones finales y restauración controlada.
- Revisar permisos, adjuntos privados, manejo de errores y recuperación.
- Completar escenarios de aceptación y pruebas móviles.
- Hacer prueba de usabilidad y corregir bloqueos.
- Completar la cobertura y evidencia de [aceptación de Rondia](marca/06-aceptacion-y-evidencia.md), incluidos 320/360 px, teclado y texto al 200 %.
- Validar datos reales, conservación, presupuesto y responsables operativos.
- Preparar despliegue, respaldo, reversión e invitaciones para habilitación explícita.

Salida: MVP apto para el piloto según docs/06-aceptacion-y-pruebas.md. Publicación y comunicaciones reales requieren que se habilite su ejecución.

## Orden de prioridades

Primero aislamiento y persistencia; después participación con plazos; luego seguimiento y pago. La accesibilidad y experiencia móvil se revisan en cada incremento, no solo al final.

Si es necesario reducir esfuerzo, postergar mejoras visuales secundarias o variantes del editor antes que aislamiento, trazabilidad, cierre fiable o verificación de pagos. Cualquier recorte de una función incluida se documenta y se acuerda.

## Entrega de cada incremento

- Funciones implementadas y forma de probarlas.
- Pruebas ejecutadas y resultado.
- Limitaciones reales y decisiones pendientes, sin declarar completado lo que sigue simulado.
- Documentación actualizada y datos ficticios reproducibles.

# Plataforma de organización de eventos

Documentación del MVP · 7 de septiembre de 2026

## Propósito

Centralizar la comunicación, las consultas a familias y el registro de cobros de eventos grupales. El primer piloto es una fiesta de fin de año de una generación de colegio, con aproximadamente 80 familias y entre 5 y 10 organizadores.

El producto debe admitir distintos grupos, eventos y comités. La experiencia desde el celular y la facilidad de uso para personas poco habituadas a herramientas digitales son requisitos de aceptación.

## Orden de lectura

1. [Alcance y decisiones](docs/01-alcance-y-decisiones.md): qué se construye, qué queda afuera y qué se asume.
2. [Reglas de negocio](docs/02-reglas-de-negocio.md): comportamiento de grupos, accesos, etapas, respuestas, pagos y soporte.
3. [Experiencia de usuario](docs/03-experiencia-de-usuario.md): pantallas, recorridos y pautas mobile-first.
4. [Arquitectura y datos](docs/04-arquitectura-y-datos.md): límites de acceso, modelo conceptual y operaciones del servidor.
5. [Plan de desarrollo](docs/05-plan-de-desarrollo.md): entregas incrementales y dependencias.
6. [Aceptación y pruebas](docs/06-aceptacion-y-pruebas.md): escenarios verificables y condiciones para habilitar el piloto.
7. [Stack y puesta en marcha](docs/07-stack-y-puesta-en-marcha.md): tecnologías elegidas, servicios, costos y configuración inicial.
8. [Brief de negocio y marca](docs/08-brief-de-negocio-y-marca.md): cliente inicial, propuesta de valor, nombre y oferta a validar.
9. [Guía de identidad](docs/09-guia-de-identidad-rondia.md): sistema visual, voz y aplicación general.
10. [Implementación de marca](docs/10-implementacion-marca-mobile-first.md): documento rector para aplicar Rondia con prioridad móvil.

La especificación operativa de la marca continúa en [docs/marca](docs/marca/README.md).

[AGENTS.md](AGENTS.md) contiene instrucciones para quienes implementen el proyecto.

## Estado

Stack elegido: **TypeScript + Next.js (React), Cloud Firestore, Firebase Authentication, Cloud Storage for Firebase y despliegue en Netlify**. La decisión y sus límites están en el documento 07. No hace falta volver a elegir proveedores para empezar; las versiones exactas se fijan al inicializar el proyecto.

Existe una implementación inicial de la aplicación, con pantallas, rutas, servicios y pruebas. La revisión de producto del 13 de septiembre de 2026 identificó diferencias respecto de la documentación y brechas que deben resolverse antes de habilitar el piloto. La existencia de código no acredita por sí sola el cumplimiento de todos los criterios de aceptación; no se verificó el estado de un despliegue durante esa revisión.

Las decisiones del usuario y los supuestos de implementación están diferenciados en el documento de alcance. Los supuestos permiten avanzar, pero no deben presentarse como decisiones expresas del usuario.

## Relación con el blueprint inicial

[blueprint_evento_independiente.md](blueprint_evento_independiente.md) se conserva como antecedente, sin modificaciones. Describía una aplicación independiente por evento y excluía votaciones. Esas partes fueron reemplazadas por los acuerdos posteriores: una plataforma con varios grupos y eventos, etapas configurables y participación de familias.

Sus versiones de herramientas, promesas de costo cero, plazo de un día, procedimientos de copia y configuración de infraestructura no son compromisos vigentes ni instrucciones para ejecutar. El documento 07 reemplaza la elección de servicios del blueprint con una decisión verificada el 7 de septiembre de 2026; antes de contratar se reconfirman precios y condiciones.

Ante una contradicción, prevalecen las instrucciones posteriores del usuario. Entre estos archivos, el alcance define el compromiso de producto; las reglas de negocio precisan su comportamiento y los demás documentos lo implementan.

## Propuesta de negocio e identidad

El [brief de negocio y marca](docs/08-brief-de-negocio-y-marca.md) y la [guía de identidad](docs/09-guia-de-identidad-rondia.md) presentan el cliente inicial recomendado y la identidad visual. Rondia quedó seleccionada para implementarse en la plataforma; la validación registral y de dominio continúa pendiente. El [kit de marca](brand/rondia/README.md) incluye recursos y vistas de referencia. La identidad todavía no está aplicada a las pantallas operativas; su implementación se define en [docs/10](docs/10-implementacion-marca-mobile-first.md) y [docs/marca](docs/marca/README.md).

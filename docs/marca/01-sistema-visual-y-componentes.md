# Sistema visual y componentes de Rondia

Parte del [encargo de implementación](../10-implementacion-marca-mobile-first.md). Aplicar junto con las reglas de negocio; las medidas de este documento son contratos de diseño del proyecto.

## Recursos y única fuente de estilos

Usar los originales de `brand/rondia/`. Crear, como ubicación propuesta, `public/brand/rondia/` y copiar únicamente los recursos públicos necesarios. No servir públicamente el dossier, el brief interno, los registros de verificación, scripts de construcción ni archivos de familias.

| Original existente | Uso en la aplicación |
|---|---|
| `logo-principal.svg` | Cabeceras y superficies claras. |
| `logo-inverso.svg` | Superficies oscuras de marca. |
| `logo-monocromo.svg` | Contextos que requieran una sola tinta. |
| `simbolo.svg` | Identificación compacta cuando el nombre ya está presente. |
| `favicon.svg`, `favicon-32.png` | Iconos del navegador mediante las convenciones del proyecto. |
| `app-icon.svg`, `app-icon-512.png` | Recurso para accesos guardados; no implica agregar PWA o instalación. |
| `pieza-social.png` | Antecedente visual. Contiene «Propuesta de marca»; no usar como imagen pública final sin adaptar ese texto. |

Conservar proporciones. Logotipo horizontal de 112 a 144 px en la cabecera; nunca menor a 112 px. Símbolo de al menos 24 px, salvo favicon. Dar resguardo equivalente al diámetro del punto en la escala utilizada. Asignar dimensiones para evitar desplazamientos mientras carga. Nombre accesible «Rondia» si es el único identificador; imagen decorativa si el enlace ya tiene ese nombre accesible. No recrear el logotipo con una fuente ni animarlo como indicador de carga.

Integrar `brand/rondia/tokens.css` en `src/styles/tokens.css` después de comparar las variables usadas en el repositorio. La fuente operativa de estilos será `src/styles/tokens.css`; el archivo del kit queda como referencia. Evitar dos `:root` rivales importados a la vez.

Mantener nombres de variables compatibles. Reemplazar valores aislados repetidos por variables semánticas. Para la nueva composición, usar CSS Modules conforme al stack. Los valores dinámicos de progreso pueden continuar como estilos calculados. No instalar un framework de estilos ni una biblioteca de componentes para aplicar la marca.

## Color y jerarquía

| Uso | Valor o par |
|---|---|
| Acción principal y marca | Bosque `#173F35`, texto `#FFFFFF`; interacción `#0E2C25`. |
| Fondo | Marfil `#F6F3EA`; tarjetas y formularios `#FFFFFF`. |
| Texto | Principal `#203B34`; secundario `#52645D`. |
| Superficie secundaria | `#EFEEE6`; borde decorativo `#C9D0C5`. |
| Controles | Borde `#75877E`; no usar el borde decorativo como única señal de un input. |
| Acento de marca | Coral `#F37556`; sobre coral, texto `#0E2C25`. No texto blanco pequeño. |
| Acento editorial | Brote `#D8EBA3`, texto Bosque. No utilizarlo para inventar un estado de éxito. |
| Guardado o recepción verificada | Fondo `#EAF4EC`, texto `#24543A`. |
| Pendiente o revisión | Fondo `#FFF2D9`, texto `#795014`. |
| Informe de pago recibido | Fondo `#EAF0FA`, texto `#30557C`. |
| Error recuperable | Fondo `#FBEAE6`, texto `#9A3829`. |

Usar las variables del kit para bordes de estado y variantes. Todo estado debe tener texto comprensible. No mostrar estados financieros individuales de otras familias en la experiencia familiar. Los tonos decorativos no sustituyen el significado del estado.

## Tipografía, espacio y movimiento

- Interfaz: `"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif`. No descargar fuentes.
- Cuerpo e inputs: 16 px / 1,5. Ayudas, etiquetas y estados: mínimo 14 px / 1,5. Títulos de pantalla: 28 px / 1,15; se pueden reducir a 24 px a 320 px. Subtítulos: 20 px / 1,3. Pesos 400, 600 y 700.
- Titular editorial de entrada: Georgia con alternativa serif, entre 36 y 56 px según el ancho. El resto de los formularios conserva la fuente de interfaz.
- Montos y métricas: numerales tabulares. Nunca reducir una cifra hasta hacerla ilegible para que entre en una fila.
- Espaciado en múltiplos de 4 px. Pantalla móvil: margen lateral 16 px; separación de bloques 24 px; tarjetas 16 px de relleno. Radio de tarjeta 16 px y de botón/input 12 px.
- Transiciones de color u opacidad de 150 ms. No `transition: all`, animaciones decorativas continuas ni scroll suave forzado con movimiento reducido.
- En badges usar oración, no mayúsculas transformadas. Eliminar emojis usados como iconos de navegación; conservar texto o usar iconografía vectorial coherente y local si es necesaria. Un icono solo necesita nombre accesible y un área táctil completa.

## Composición mobile-first

| Ancho de comprobación | Regla |
|---|---|
| 320, 360 y 390 px | Una columna. Acciones largas se apilan. Texto y errores pueden crecer. Ninguna acción exige desplazamiento horizontal. |
| 768 px | Ampliar márgenes a 24 px. Formularios siguen limitados a 640 px. Se pueden usar dos columnas de tarjetas si ambas conservan legibilidad. |
| 1024 y 1440 px | Administración hasta 1120 px; formularios hasta 640 px. No cambiar permisos, orden o significado por el ancho. |

Implementar estilos base para móvil y ampliaciones con `min-width`. Usar `min-width: 0` en hijos de grids y flex, texto largo que pueda saltar de línea y ancho máximo en adjuntos. No resolver desbordes con `overflow-x: hidden` en todo el documento.

En listas largas, conservar búsqueda y filtros útiles existentes; mostrar el número de resultados. Si se añade paginación por necesidad real, su obtención y autorización se resuelven en servidor; no cargar datos de otros eventos para filtrar en el cliente.

Evitar apilar varias barras sticky. En móvil la navegación administrativa estará en el flujo normal. Una cabecera sticky es opcional únicamente si no tapa títulos, campos, foco o errores. No depender del `top: 56px` actual con una cabecera que puede crecer.

Con teclado virtual abierto, el campo y la acción de guardado deben seguir siendo alcanzables mediante scroll. No basar formularios en una altura fija de `100vh`. Si se utiliza barra de acción inferior, contemplar el área segura y reservar espacio suficiente; no es un requisito añadirla.

## Contratos de componentes compartidos

| Archivo actual | Cambio exigido | Comprobación |
|---|---|---|
| `src/components/Header.tsx` | Incorporar recurso de marca, nombre del evento y contexto de acceso. Entrada pública no se rotula «Espacio familiar». Puede ampliarse su API manteniendo compatibles los usos hasta migrarlos. | Familia y organizador se distinguen. Nombre de evento largo ocupa varias líneas sin tapar acciones. |
| `src/components/Button.tsx` | Conservar variantes `primary`, `secondary`, `danger`, `outline`, `fullWidth`, `isLoading` y propiedades nativas. Llevar interacción a clases. Mantener 48 px; retirar overrides de 32–38 px. | Teclado, foco, disabled y espera funcionan; no cambia el ancho al guardar. Nombre de acción sigue siendo reconocible durante la espera. |
| `src/components/Input.tsx` | Quitar el `outline: none` que tapa el foco global. Borde de control. Identificadores únicos y estables incluso con etiquetas repetidas. Etiqueta, ayuda y error asociados. | Dos campos del mismo tipo no comparten ID. Texto 16 px, foco visible y error anunciado. No usar placeholder como única etiqueta. |
| `src/components/Card.tsx` | Estructura y acciones adaptables; permitir jerarquía de título adecuada. Migrar el `article` con `onClick` a un enlace o botón semántico en sus usos interactivos. | Sin acción disponible solo con mouse; sin botones dentro de enlaces que engloban toda la tarjeta. |
| `src/components/Badge.tsx` | Conservar variantes; quitar transformación a mayúsculas y espaciado excesivo. Texto mínimo 14 px y posibilidad de envolver. | Etiquetas largas no se recortan. `reported` usa `info`, no `success`. |
| `src/components/StageCountdown.tsx` | Fecha y hora exactas junto al estado. Diferenciar consulta cerrada de contador agotado. | No anunciar cada segundo; al llegar al plazo no se acepta un guardado local como válido. |
| `src/styles/globals.css` | Base móvil, foco, ancho familiar y variante administrativa; normalización de controles. | Zoom y scroll vertical; no estrechar toda la administración a 640 px en escritorio ni ensanchar formularios. |

Si hace falta reutilización, crear componentes pequeños para alerta, vacío, campo multilínea, selector, bloque de monto y diálogo. Son ubicaciones propuestas, no archivos existentes. No convertir toda la aplicación a cliente para compartir componentes visuales. Mantener las lecturas y autorizaciones privadas en servidor.

## Cargas, errores y diálogos

Carga con texto breve y `aria-busy` cuando corresponde; éxito mediante un mensaje persistente cercano a la acción y anunciado de forma no intrusiva. No vaciar formularios al fallar. Errores de campos asociados y resumen si hay varios.

Los diálogos tienen nombre accesible, foco inicial deliberado, navegación de teclado contenida, cierre disponible cuando sea seguro y retorno del foco al control de origen. Cerrar accidentalmente no puede descartar sin aviso lo escrito. En móvil se pueden convertir en sección expandida o página de formulario si resulta más robusto. Nunca esconder la única acción bajo el teclado.

Objetivos internos: contraste de texto de al menos 4,5:1 y de controles/foco de 3:1 con el fondo adyacente. Texto ampliado al 200 %, reflujo a 320 px y navegación íntegra por teclado. Las mediciones del kit no certifican los pares nuevos, overlays o estados disabled de la aplicación.

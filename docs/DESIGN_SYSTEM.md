# Diseño y experiencia

## Dirección visual

Terminal moderna, oscura y directa. Debe sentirse propia y tecnológica, no como una terminal incómoda ni como una broma visual.

## Identidad

- Nombre exacto: `transcefrencias`.
- Siempre en minúsculas.
- Se puede resaltar `cef` mediante color, peso o subrayado sin modificar el texto.
- Fondo principal: negro puro `#000000`, aprovechando pantallas AMOLED.
- Sin `border-radius` en componentes.

## Tokens iniciales a validar

- Fondo: `#000000`.
- Superficie elevada: gris casi negro, claramente distinguible del fondo mediante borde.
- Texto principal: blanco suave de alto contraste.
- Texto secundario: gris legible.
- Primario: verde terminal.
- Advertencia: amarillo/ámbar.
- Error/deuda: rojo accesible.
- Crédito/cobro: verde; no depender solo del color, acompañar con signo y texto.
- Bordes: grises o verdes de baja intensidad.

Los valores definitivos deben superar contraste WCAG AA.

## Tipografía

- Fuente monoespaciada legible y optimizada para UI.
- Cargarla de forma eficiente o usar una pila segura.
- Números tabulares para alinear importes.
- No convertir todos los textos a mayúsculas; reservarlas para acciones primarias puntuales.

## Mobile-first

- Área táctil mínima aproximada de 44×44 px.
- Acciones primarias al alcance del pulgar.
- No depender de hover.
- Evitar tablas horizontales en celular; usar tarjetas/filas apiladas.
- Teclado numérico solo cuando el usuario pulsa deliberadamente el monto.
- Mantener visible el resumen del gasto mientras se eligen participantes.

## Selector de importe

- Monto central grande.
- Botones físicos visuales con incrementos y decrementos de $500 y $1.000.
- Feedback inmediato y opción de mantener pulsado solo si se implementa sin producir saltos accidentales.
- Mostrar `10k` como formato compacto, pero exponer `$10.000` a lector de pantalla y en contexto de confirmación.
- Al editar manualmente, mostrar cómo se redondeará antes de guardar.

## Selección de participantes

- Todos seleccionados inicialmente.
- Acción visible `DESELECCIONAR TODOS` y `SELECCIONAR TODOS`.
- Cada persona debe ser fácil de destildar con un toque en toda la fila.
- Mostrar contador `12 DE 14 PARTICIPAN`.
- Diferenciar claramente pagador y consumidores.
- Advertir, sin bloquear, cuando el pagador no está entre consumidores.

## Estados y feedback

Cada operación remota debe contemplar:

- carga;
- éxito;
- error accionable;
- estado vacío;
- reintento cuando corresponda.

Usar confirmación para eliminar, reabrir o cambiar de etapa. No usar alertas nativas del navegador como interfaz final.

## Versión

Mostrar `v0.1.0` discretamente al final de la navegación o página. Debe ser visible pero no competir con acciones.

## Accesibilidad

- Foco de teclado siempre visible.
- Etiquetas reales para inputs y controles.
- No comunicar saldo solamente mediante rojo/verde.
- Respetar reducción de movimiento.
- Modales con foco controlado y cierre accesible.
- El nombre real al pulsar un apodo debe funcionar también con teclado y lector de pantalla.

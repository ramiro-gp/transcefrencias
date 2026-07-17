# transcefrencias — instrucciones para agentes

Este repositorio contiene **transcefrencias**, una PWA mobile-first para dividir gastos entre grupos pequeños de amigos. Cada gasto se reparte solamente entre las personas que participaron de ese gasto y el resultado final reduce la cantidad de transferencias necesarias.

Repositorio: `https://github.com/ramiro-gp/transcefrencias.git`

## Antes de trabajar

1. Lee este archivo completo.
2. Lee `docs/MISSION.md`, `docs/PRODUCT_SPEC.md` y el documento específico de la tarea.
3. Inspecciona el repositorio y confirma su estado real. La documentación no reemplaza la verificación del código.
4. Para una tarea no trivial, presenta un plan breve y espera aprobación.
5. Si una decisión no está documentada y cambia producto, datos, seguridad o UX, pregunta. No inventes.

## Stack obligatorio

- React + Vite.
- TypeScript estricto. No usar `any` sin una justificación localizada.
- Tailwind CSS 4.
- pnpm exclusivamente.
- Supabase: Auth, PostgreSQL y Row Level Security.
- Vercel para producción.
- Vitest + Testing Library para tests.
- PWA instalable con estrategia de actualización explícita.

No reemplazar el stack ni incorporar frameworks, ORMs, gestores de estado o librerías grandes sin explicar la necesidad y recibir aprobación.

## Comandos esperados

Una vez inicializado el proyecto, mantener scripts equivalentes a:

- `pnpm dev` — desarrollo local.
- `pnpm build` — build de producción.
- `pnpm lint` — análisis estático.
- `pnpm typecheck` — verificación TypeScript.
- `pnpm test` — tests automatizados.
- `pnpm test:coverage` — cobertura, especialmente del motor financiero.

Antes de cerrar una tarea deben pasar, como mínimo, `lint`, `typecheck`, `test` y `build`.

## Reglas de producto innegociables

- Un evento contiene todos los gastos de una juntada. No crear un evento por categoría o subconjunto de personas.
- Cada gasto tiene un único pagador y su propio conjunto de participantes.
- El pagador puede no haber consumido y, por lo tanto, puede quedar fuera de los participantes del gasto.
- Al crear un gasto, seleccionar por defecto a todos los participantes activos; permitir destildarlos antes de guardar y editarlos después.
- Una persona incorporada más tarde no se agrega retroactivamente a gastos existentes.
- Importes enteros, positivos y múltiplos de $500. Sin centavos.
- Moneda única visible como `$`; no agregar selector ni sigla de moneda.
- Los movimientos informados son opcionales y admiten importes parciales. Son transferencias entre un origen y un destino, no confirmaciones obligatorias de una sugerencia del optimizador.
- No exigir confirmación del receptor para que la app sea utilizable.
- Conservar historial auditable de altas, ediciones, eliminaciones y movimientos.
- Preservar históricos: no eliminar físicamente entidades relacionadas con gastos o pagos.

Las reglas completas están en `docs/PRODUCT_SPEC.md` y `docs/CALCULATION_ENGINE.md`.

## Seguridad

- No subir `.env`, claves, tokens, secretos ni credenciales.
- Incluir `.env.example` solo con nombres de variables y valores ficticios.
- Toda tabla expuesta debe tener RLS habilitado y políticas verificadas.
- No confiar en permisos ocultos solamente desde la UI.
- Validar entradas en cliente y servidor/base de datos.
- Los enlaces de invitación deben usar identificadores no predecibles y no almacenar su secreto en texto plano.
- Nunca usar la `service_role` de Supabase en el frontend.
- Revisar que un usuario solo pueda acceder a eventos de los que es miembro o cuya invitación válida abrió para unirse.

## Código y arquitectura

- Separar UI, casos de uso, acceso a datos y lógica de dominio.
- El motor de cálculo debe ser puro, determinista y no depender de React ni Supabase.
- El dinero se representa con enteros, nunca con punto flotante.
- Centralizar tipos y validaciones. Evitar duplicar reglas entre pantallas.
- Componentes pequeños y accesibles; no abstraer prematuramente.
- Preferir nombres claros en inglés para código y español para textos visibles.
- Mantener el diseño mobile-first y usable con una mano.

## UI/UX

- Nombre visible exacto: `transcefrencias`, siempre en minúsculas.
- Puede resaltarse visualmente la subcadena `cef`, sin cambiar la escritura.
- Fondo base negro puro `#000000`.
- Estética de terminal profesional, fuente monoespaciada, bordes rectos y cero `border-radius`.
- La estética nunca debe reducir legibilidad, accesibilidad ni tamaño táctil.
- Mostrar siempre feedback de carga, éxito, error y estado vacío.
- Confirmar operaciones destructivas.
- No usar animaciones llamativas ni abusar del efecto de escritura.
- La versión debe aparecer discretamente al pie en formato `v0.1.0`.

## Git y commits

- Autor esperado: `Ramiro García <ramiroariel_carp@hotmail.com>`.
- No modificar configuración global de Git. Configurar el repositorio local si hace falta.
- Commits pequeños, coherentes y descriptivos.
- Usar Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- No hacer `push`, merge, rebase, force-push, crear tags o desplegar sin autorización explícita para esa acción.
- No mezclar cambios ajenos ni reescribir trabajo existente.
- Nunca subir archivos de entorno ni secretos.

## Versionado y documentación

- Usar SemVer: `MAJOR.MINOR.PATCH`.
- Durante desarrollo comenzar en `0.1.0`; `1.0.0` representa la primera versión estable.
- No aumentar versión por cada commit. Hacerlo por entrega funcional o corrección publicable.
- Toda feature o cambio relevante debe actualizar:
  - `CHANGELOG.md`;
  - `docs/IMPLEMENTATION_LOG.md`;
  - la especificación afectada, si cambió el comportamiento.
- Registrar fecha, alcance, archivos/áreas afectadas, decisiones, migraciones, pruebas y pendientes.
- Mantener `docs/DECISIONS.md` para decisiones arquitectónicas relevantes.

## Definición de terminado

Una tarea está terminada únicamente cuando:

- cumple la especificación y los permisos;
- contempla carga, error, vacío y éxito;
- tiene tests proporcionales al riesgo;
- `lint`, `typecheck`, `test` y `build` pasan;
- no introduce secretos ni debilita RLS;
- la documentación correspondiente está actualizada;
- se informa con precisión qué cambió, qué se verificó y qué queda pendiente.

## Prohibiciones

- No inventar funciones no solicitadas.
- No agregar pagos online, múltiples monedas, comprobantes, chat, emails de invitación ni internacionalización en el MVP.
- No rediseñar por iniciativa propia las reglas financieras.
- No borrar datos históricos para simplificar una implementación.
- No usar componentes redondeados.
- No hacer refactors masivos junto con una feature.
- No declarar que algo funciona sin ejecutar verificaciones pertinentes.

# transcefrencias

PWA mobile-first para dividir gastos de una juntada de manera justa: cada gasto se reparte solo entre quienes participaron y el resultado reduce transferencias innecesarias.

La implementación actual incluye la base de la Etapa 1 y el motor financiero aislado completo de la Etapa 2. Reparte gastos, explica balances, aplica movimientos y optimiza transferencias exactamente para el rango habitual. No existe fallback productivo ni se usa greedy como resultado. Todavía no incluye autenticación, Supabase, eventos persistidos ni UI financiera.

## Stack actual

- React 19, Vite 8 y TypeScript estricto.
- React Router para rutas de cliente.
- Tailwind CSS 4 para estilos.
- Vitest, Testing Library y jsdom para pruebas.
- `vite-plugin-pwa` y Workbox para instalación y actualización explícita.
- pnpm como único gestor de paquetes.

## Requisitos

- Node.js `24.x`
- pnpm `11.7.0`

## Desarrollo

```bash
pnpm install
pnpm dev
```

`pnpm-workspace.yaml` conserva exclusiones versionadas y limitadas a los artefactos de Vite 8.1.5 y Tailwind 4.3.3 que la política activa de antigüedad mínima bloqueó al crear esta base. No desactiva ni relaja esa política global.

## Verificación

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm benchmark:finance
pnpm build
```

`pnpm benchmark:finance` mide el optimizador exacto con presupuestos explícitos. No forma parte del test rápido ni activa un fallback.

`pnpm benchmark:finance:corpus` ejecuta o reanuda el corpus amplio por lotes aislados. `pnpm benchmark:finance:corpus:fresh` descarta checkpoints locales y reinicia la medición. Los resultados temporales se guardan en `.benchmark-results/` y no se versionan.

`pnpm benchmark:finance:hybrid` reproduce o reanuda la medición del optimizador híbrido; `pnpm benchmark:finance:hybrid:fresh` la reinicia. Incluye el corpus completo, el adversarial y escalado controlado de 14 a 20 balances no nulos.

## PWA

El service worker precachea el app shell y recursos versionados. No cachea respuestas de datos ni encola escrituras. Cuando detecta una versión nueva, la interfaz ofrece `ACTUALIZAR`; la actualización ocurre únicamente al confirmarla.

## Entorno

Las variables de Supabase se incorporarán en la Etapa 3. Copiá `.env.example` a un archivo local de entorno cuando corresponda. Nunca incluyas secretos del servidor en variables `VITE_*`.

## Documentación

- [Misión](docs/MISSION.md)
- [Especificación funcional](docs/PRODUCT_SPEC.md)
- [Motor de cálculo](docs/CALCULATION_ENGINE.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Decisiones](docs/DECISIONS.md)

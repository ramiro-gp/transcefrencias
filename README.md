# transcefrencias

PWA mobile-first para dividir gastos de una juntada de manera justa: cada gasto se reparte solo entre quienes participaron y el resultado reduce transferencias innecesarias.

La implementación actual corresponde a la Etapa 1: base visual, routing, tests y PWA. Todavía no incluye autenticación, Supabase, eventos, gastos, movimientos ni motor financiero.

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
pnpm build
```

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

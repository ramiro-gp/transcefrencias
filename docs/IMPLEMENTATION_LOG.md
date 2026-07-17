# Registro de implementación

Este archivo registra qué se hizo realmente. No incluir planes como si ya estuvieran implementados.

## Plantilla

### AAAA-MM-DD — Título breve

- **Versión:** `Unreleased` o versión concreta.
- **Objetivo:** qué problema se resolvió.
- **Implementado:** cambios funcionales y técnicos.
- **Áreas/archivos:** módulos principales afectados.
- **Base de datos:** migraciones, políticas o `Sin cambios`.
- **Verificaciones:** comandos y pruebas ejecutadas con resultado.
- **Decisiones:** enlaces o referencias a `DECISIONS.md`.
- **Pendientes/riesgos:** trabajo explícitamente no terminado.
- **Commit:** hash cuando exista.

## Registros

### 2026-07-16 — Etapa 0 y base de aplicación

- **Versión:** `0.1.0`.
- **Objetivo:** cerrar las decisiones iniciales y crear una base ejecutable sin funcionalidades financieras ni acceso remoto.
- **Implementado:** documentación de movimientos libres sobre saldos pendientes, roles, fusiones, invitaciones, estados, privacidad y conectividad; corrección del ejemplo A-F; React, Vite, TypeScript, React Router, Tailwind CSS 4, lint, formato, pruebas, PWA con actualización explícita, layout terminal y versión visible desde `package.json`.
- **Áreas/archivos:** configuración raíz, `src/app/`, `src/components/`, `src/pages/`, `src/styles/`, `public/`, documentación y README.
- **Base de datos:** sin cambios; Supabase no fue conectado.
- **Verificaciones:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:coverage`, `pnpm build` y `pnpm format:check` correctos.
- **Decisiones:** ADR-006 a ADR-010.
- **Pendientes/riesgos:** implementar motor financiero en Etapa 2; definir mediante medición el umbral y fallback del optimizador; añadir Supabase, RLS y autenticación en Etapa 3.
- **Commit:** pendiente.

### 2026-07-16 — Revisión final de Etapas 0 y 1

- **Versión:** `0.1.0`.
- **Objetivo:** dejar la base preparada para revisión visual y primer commit sin ampliar el alcance.
- **Implementado:** eliminado `@testing-library/user-event` sin uso; removida la declaración innecesaria de `border-radius`; documentadas las excepciones mínimas y versionadas de la política de antigüedad de pnpm; ampliada una prueba del aviso de actualización para comprobar su descarte.
- **Áreas/archivos:** `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, README, estilos, pruebas, changelog y este registro.
- **Base de datos:** sin cambios.
- **Verificaciones:** `pnpm install`, rutas locales `/` y `/ruta-inexistente` con respuesta `200`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (3 tests correctos), `pnpm test:coverage`, `pnpm build`, `git diff --check` y `pnpm audit` sin vulnerabilidades conocidas.
- **Decisiones:** ADR-010 se mantiene; no se agregaron dependencias ni funcionalidades de producto.
- **Pendientes/riesgos:** configurar reglas SPA de Vercel y desplegar solo en Etapa 8; implementar motor financiero en Etapa 2.
- **Commit:** pendiente.

### 2026-07-16 — Corrección responsive de la base visual

- **Versión:** `0.1.0`.
- **Objetivo:** corregir la composición central de escritorio y la ergonomía de la pantalla 404 sin ampliar el alcance funcional.
- **Implementado:** contenedor interno responsive y centrado para el área principal; header y footer con padding consistente; 404 centrada verticalmente y alineada a la izquierda como Home, con acción de retorno de ancho completo.
- **Áreas/archivos:** `src/components/app-layout.tsx`, `src/pages/not-found-page.tsx`, `src/styles/index.css`, prueba de 404, changelog y este registro.
- **Base de datos:** sin cambios.
- **Verificaciones:** `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (4 tests correctos), `pnpm build` y `git diff --check` correctos.
- **Decisiones:** se preserva la alineación izquierda para pantallas funcionales; el centrado se reserva para la 404.
- **Pendientes/riesgos:** validar visualmente en los anchos objetivo; no se agregaron eventos, formularios ni lógica financiera.
- **Commit:** pendiente.

### 2026-07-16 — Definición inicial

- **Versión:** `Unreleased`.
- **Objetivo:** documentar el alcance inicial de transcefrencias.
- **Implementado:** todavía no existe implementación de producto.
- **Áreas/archivos:** especificaciones iniciales.
- **Base de datos:** sin cambios.
- **Verificaciones:** revisión de consistencia documental.
- **Decisiones:** alcance MVP, stack, roles, cálculo, diseño y roadmap.
- **Pendientes/riesgos:** validar arquitectura y comenzar Etapa 1.
- **Commit:** pendiente.

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

### 2026-07-17 — Optimizador exacto híbrido

- **Versión:** `0.2.0`.
- **Objetivo:** garantizar el mínimo matemático en el rango habitual de 14–15 sin depender de millones de estados.
- **Implementado:** solver separado con sumas precalculadas, bitmasks, DP memoizada, anclaje canónico, reconstrucción lexicográfica, detección directa irreducible, transferencias deterministas y métricas; selección por particiones hasta 15 no nulos y backtracking para tamaños mayores; presupuestos discriminables sin fallback.
- **Áreas/archivos:** solver y optimizador financiero, referencia greedy extraída, tests, benchmark recuperable, scripts y documentación.
- **Base de datos:** sin cambios.
- **Verificaciones:** 1.000/1.000 realistas y 40/40 sintéticos exactos; 876/876 coincidencias con backtracking previamente demostrado; adversarial resuelto en 13 transferencias; escalado protegido hasta 20; `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (44 tests), `pnpm test:coverage`, `pnpm build`, `git diff --check` y `pnpm audit` correctos; cobertura global 87,50 % statements, 78,96 % branches, 87,64 % functions y 89,34 % lines; motor financiero 90,53 %, 80,49 %, 98,57 % y 92,55 %, respectivamente.
- **Decisiones:** ADR-015.
- **Pendientes/riesgos:** Web Worker al integrar React; mantener medición protegida para grupos mayores de 15; no existe fallback productivo.
- **Commit:** pendiente; no se creó commit en esta intervención.

### 2026-07-17 — Segunda medición reproducible del optimizador

- **Versión:** `0.2.0`.
- **Objetivo:** ampliar el corpus y separar costo determinista, tiempo y memoria antes de aprobar presupuesto o fallback.
- **Implementado:** runner reanudable por lotes de cinco casos en procesos separados; checkpoints ignorados por Git; 1.000 eventos derivados de 17.176 gastos válidos y 40 sintéticos; agregación por presupuesto y perfil; calidad greedy; escalada adversarial hasta 2 millones; evaluación de backtracking, Web Worker, particiones cero e híbrido exacto.
- **Áreas/archivos:** `scripts/run-finance-corpus.mjs`, benchmark de corpus, scripts de paquete, `.gitignore` y documentación financiera.
- **Base de datos:** sin cambios.
- **Verificaciones:** corpus completo de 1.040 casos sin fallos; `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (35 tests), `pnpm build` y `git diff --check` correctos.
- **Decisiones:** ADR-013 permanece pendiente de segunda aprobación; no se cambió ningún contrato ni algoritmo productivo.
- **Pendientes/riesgos:** elegir presupuesto; decidir fallback; medir un posible preanálisis exacto de subconjuntos; medir en celulares reales antes de fijar expectativas de tiempo.
- **Commit:** pendiente; no se creó commit en esta intervención.

### 2026-07-17 — Primera parte del motor financiero aislado

- **Versión:** `0.2.0`.
- **Objetivo:** implementar e instrumentar el cálculo financiero puro antes de decidir un fallback productivo.
- **Implementado:** tipos y errores de dominio; validaciones de enteros seguros; reparto determinista de remanentes; balances originales con explicación por gasto; movimientos históricos agregados y advertencias independientes del orden; validación de altas y reemplazos; optimizador exacto con poda, memoización, métricas y presupuesto discriminable; test A-F; propiedades con `fast-check`; oracle independiente; benchmark reproducible y referencia greedy sin uso productivo.
- **Áreas/archivos:** `src/domain/finance/`, configuración de cobertura, scripts, dependencias y documentación financiera.
- **Base de datos:** sin cambios; no se conectó Supabase.
- **Verificaciones:** `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (35 tests), `pnpm test:coverage`, `pnpm build`, `git diff --check` y `pnpm audit` correctos; oracle coincidente en 500 casos generados; cobertura global 86,46 % statements, 78,1 % branches, 84,5 % functions y 88,19 % lines; cobertura del motor 90,85 %, 80,31 %, 98,07 % y 92,8 %, respectivamente; benchmark ejecutado con casos de 14–15 participantes.
- **Decisiones:** ADR-011 a ADR-014.
- **Pendientes/riesgos:** segunda aprobación para presupuesto y fallback; el adversarial de 15 participantes agotó 250.000 estados en aproximadamente 1,3 s; no existe fallback productivo ni límite funcional de participantes.
- **Commit:** pendiente; no se creó commit en esta intervención.

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

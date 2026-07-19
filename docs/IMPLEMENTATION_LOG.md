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

### 2026-07-19 — Corrección multipagador e importes exactos

- **Versión:** `0.5.0`.
- **Implementado:** tabla de aportes, migraciones correctivas, motor multipagador, importes enteros exactos y consolidación derivada de identidades fusionadas.
- **Base de datos:** sin balances persistidos; RLS y RPC se conservan.
- **Verificaciones:** reset y tipos Supabase locales, pgTAP (128 pruebas), integración Supabase JS, formato, lint, TypeScript, Vitest (132 pruebas), cobertura, build, auditoría de dependencias y `git diff --check` correctos. Cobertura global: 66,64 % statements, 56,10 % branches, 54,87 % functions y 67,86 % lines; `features/expenses`: 80,64 %, 66,19 %, 79,76 % y 83,54 %.

### 2026-07-19 — Gastos de Etapa 5

- **Versión:** `0.5.0` al cerrar la revisión humana aprobada.
- **Objetivo:** cargar gastos por subconjunto de personas sin adelantar liquidación ni movimientos.
- **Implementado inicialmente:** CRUD con concepto, categorías cerradas, pagador independiente y consumidores; esa primera granularidad de $500 y pagador único fue reemplazada durante la misma etapa por la corrección multipagador de ADR-024. Se conservan rutas, eliminación lógica, revisión optimista y snapshots auditables.
- **Áreas/archivos:** migración de gastos, RLS/RPC, tipos Supabase, `features/expenses`, rutas, página de evento, estilos y pgTAP.
- **Base de datos:** `20260719090000_create_expenses.sql` crea `expenses`, `expense_participants`, índices, integridad por evento, auditoría de gasto y operaciones transaccionales. No hay balances persistidos ni cambios funcionales de invitaciones.
- **Verificaciones:** `pnpm supabase:reset`, generación local de tipos, pgTAP (125 pruebas), `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (99 pruebas), `pnpm test:coverage`, `pnpm build` y `git diff --check` correctos.
- **Decisiones:** ADR-022 y ADR-023; ADR-003 queda reemplazada por ADR-024 y se preservan ADR-002 y ADR-020.
- **Pendientes/riesgos:** liquidación, transiciones de estado y movimientos pertenecen a etapas posteriores. La revisión humana debe validar ergonomía del selector en celular.
- **Commit:** creado al cerrar Etapa 5.

### 2026-07-18 — Eventos y participantes de Etapa 4

- **Versión:** `0.4.0`.
- **Objetivo:** permitir organizar juntadas y sus identidades participantes sin adelantar gastos, liquidación o movimientos.
- **Implementado:** eventos con estado inicial único, listado, apertura y renombrado; roles propietario/coadministrador/miembro; salida y reingreso por invitación; enlace estable recuperable solo por el owner interno, fragmento URL limpiado antes de login y unión explícita; participantes manuales, desactivación, vinculación/fusión con miembros activos e historial visible con snapshot de actor.
- **Revisión manual:** la invitación se prioriza al inicio para ADMIN y se copia a ancho completo con feedback accesible. ADMIN y COADMIN pueden expulsar cuentas; solo ADMIN desbloquea el reingreso, que nunca es automático.
- **Ajuste UX final:** las acciones que quitan acceso, rol o participación usan un diálogo nativo accesible, con foco controlado, Escape, restauración al disparador y error dentro del modal. No se agregaron dependencias, migraciones ni cambios remotos.
- **Áreas/archivos:** migración de eventos, RLS/RPC, tipos Supabase, `features/events`, rutas y páginas de eventos/invitación, estilos y pruebas pgTAP.
- **Base de datos:** migración `20260718190000_create_events.sql` crea `events`, `event_members`, `participants`, `audit_log` e invitaciones privadas; las correctivas `20260718210000_review_stable_invitations_and_audit_actors.sql` y `20260718220000_add_member_expulsion.sql` estabilizan el enlace, agregan snapshots y bloqueo de reingreso. La visibilidad de perfiles queda limitada a miembros activos.
- **Verificaciones:** `pnpm supabase:reset`, generación local de tipos, pgTAP (112 pruebas), `pnpm lint`, `pnpm typecheck`, `pnpm test` (96 pruebas), `pnpm test:coverage`, `pnpm build`, integración Supabase JS local y `git diff --check` correctos.
- **Decisiones:** ADR-019 y ADR-020; se preserva ADR-002.
- **Pendientes/riesgos:** no incluye gastos, transiciones de estado, archivado, movimientos ni servicios remotos. Quien posea el enlace puede solicitar unirse, pero requiere cuenta, sesión y `UNIRME`.
- **Commit:** creado durante el cierre de Etapa 4.

### 2026-07-18 — Flujos de autenticación y perfil de Etapa 3

- **Versión:** `Unreleased`; `package.json` permanece en `0.2.0`.
- **Objetivo:** completar los flujos cliente de Auth y perfil sobre la infraestructura local ya validada.
- **Implementado:** `QueryClient` efímero con retry acotado; `AuthProvider` con eventos Auth, limpieza de caché por cambio/logout, sesión local y recovery restringido; guards y retorno interno seguro; registro, login, logout, solicitud/confirmación de recuperación, cambio de contraseña, inicio privado y perfil propio; schemas Zod/RHF; servicios estrechos de Auth/Profile; componente accesible de apodo/nombre; feedback y estilos mobile-first.
- **Ajustes UX posteriores:** corregida la carrera entre cierre de sesión temporal y guard de recovery mediante éxito efímero de navegación; header compacto con acceso por sesión; indicador de conectividad solo offline; acciones de contenido alineadas con la jerarquía principal/secundaria. Los enlaces secundarios de Login, Registro, Recuperación y Perfil forman bloques alineados a la derecha. El estado local de cierre se restablece al completar o fallar `signOut`, evitando que `SALIENDO...` persista en un login posterior sin recarga.
- **Áreas/archivos:** `src/app/`, `src/features/auth/`, `src/features/profile/`, `src/pages/`, layout, estilos, tests y script de integración local.
- **Base de datos:** sin migraciones nuevas ni cambios a la RLS aprobada. El script local amplía la prueba real con Mailpit, verificación GoTrue, redirect implicit, cambio de contraseña y login posterior.
- **Verificaciones:** `pnpm format:check`, `pnpm lint` sin warnings, `pnpm typecheck`, `pnpm test` (90 tests), `pnpm test:coverage`, `pnpm build`, `pnpm supabase db reset`, pgTAP (64 tests), integración local completa con Mailpit, generación de tipos, `git diff --check` y `pnpm audit` correctos. Cobertura global: 75,87 % statements, 65,84 % branches, 67,74 % functions y 75,87 % lines. El chunk inicial actual es 581,14 kB sin comprimir, menor que los 642,23 kB previos a la carga diferida.
- **Decisiones:** se preserva ADR-016 a ADR-018; no se incorpora `sessionStorage` como autorización de recovery.
- **Pendientes/riesgos:** Supabase remoto, SMTP remoto y Vercel no están configurados; no hay eventos, invitaciones ni visibilidad entre miembros. Vite informa un chunk inicial por encima de 500 kB; queda como optimización futura y no bloquea este cierre.
- **Commit:** pendiente; no se creó commit en esta intervención.

### 2026-07-18 — Infraestructura local y perfiles de Etapa 3

- **Versión:** `Unreleased`; `package.json` permanece en `0.2.0`.
- **Objetivo:** establecer una base local reproducible y comprobable para Supabase Auth y perfiles sin implementar todavía las pantallas de autenticación.
- **Implementado:** Supabase CLI fijada; stack Docker local con Auth email/password sin confirmación, registro anónimo desactivado y Mailpit; migración de `public.profiles`; trigger transaccional con metadata no confiable; constraints, timestamps, grants por columna, RLS propia y funciones internas protegidas; cliente Supabase tipado con flujo `implicit`; validación de variables públicas; scripts de ciclo local; tipos generados; pgTAP e integración real por Supabase JS.
- **Áreas/archivos:** `supabase/`, `src/lib/supabase/`, `scripts/test-supabase-local.mjs`, configuración de entorno y paquete, README y documentación de arquitectura/seguridad.
- **Base de datos:** migración `20260718160449_create_profiles.sql`; schema `private`; tabla `public.profiles`; policies `profiles_select_own` y `profiles_update_own`; no se creó proyecto remoto ni seed.
- **Verificaciones:** Docker Desktop 29.6.1 y daemon WSL2 operativos; `pnpm supabase db reset`, 64 tests pgTAP, integración local con Auth/JWT/PostgREST/refresh/RLS y generación de tipos correctos; `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (53 tests), `pnpm test:coverage`, `pnpm build`, `git diff --check` y `pnpm audit` correctos; cobertura global 86,70 % statements, 79,33 % branches, 87,77 % functions y 88,39 % lines.
- **Decisiones:** ADR-016 a ADR-018.
- **Pendientes/riesgos:** pantallas, formularios, AuthProvider, guards y recuperación pertenecen a la segunda mitad de Etapa 3; SMTP remoto y proyecto hospedado siguen sin configurar; la visibilidad entre miembros se posterga hasta Etapa 4.
- **Commit:** pendiente; no se creó commit en esta intervención.

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

# Changelog

Todos los cambios relevantes de **transcefrencias** se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

### Added

- Supabase CLI local reproducible con Auth email/password, Mailpit, migraciones, generación de tipos y scripts pnpm.
- Esquema `profiles` creado transaccionalmente desde `auth.users`, con validación de metadata no confiable, timestamps, grants mínimos y RLS de acceso propio.
- 64 pruebas pgTAP y una integración local mediante Supabase JS para Auth, JWT, PostgREST, constraints y aislamiento de permisos.
- Cliente Supabase único y tipado, validación de configuración pública y flujo Auth `implicit` explícito para la SPA.

### Security

- Revocados INSERT, DELETE, cambios de identidad/timestamps y ejecución directa de funciones internas para clientes anónimos o autenticados.
- Verificado que `FORCE RLS` no agrega defensa efectiva con el owner local `postgres` dotado de `BYPASSRLS`; se conserva `ENABLE RLS` con políticas y tests reales.

## [0.2.0] - 2026-07-17

### Added

- Motor financiero puro con reparto exacto, balances explicables, movimientos agregados, optimizador exacto instrumentado y caso de referencia A-F.
- Tests generativos con `fast-check`, oracle independiente para casos pequeños y benchmark reproducible para 14–15 participantes.
- Segunda medición reproducible sobre 1.040 casos, con checkpoints reanudables, procesos aislados, comparación exacto/greedy y escalada adversarial hasta 2 millones de estados.
- Optimizador exacto híbrido con DP de subconjuntos cero para hasta 15 balances no nulos, reconstrucción determinista, detección irreducible y backtracking para tamaños mayores.
- Corpus híbrido 100 % exacto en 1.000 casos realistas y 40 sintéticos; adversarial anterior resuelto en 13 transferencias exactas.

### Changed

- Corregido el ejemplo financiero A-F para que todos los gastos sean múltiplos de $500.
- Aclarada la granularidad: solo los gastos son múltiplos de $500; cuotas, movimientos y sugerencias usan pesos enteros exactos.

## [0.1.0] - 2026-07-16

### Added

- Documentación inicial de producto, arquitectura, cálculo, diseño y roadmap.
- Base ejecutable con React, Vite, TypeScript, rutas, Tailwind CSS 4, PWA y pruebas.
- Layout terminal mobile-first, estado de conectividad y aviso explícito de actualización del service worker.
- Decisiones de movimientos, roles, participantes, invitaciones, estados, privacidad y dependencias bajo demanda.

### Changed

- Eliminada una dependencia de pruebas sin uso y documentadas las exclusiones versionadas de la política de antigüedad de paquetes.
- Corregida la composición responsive del contenido principal y de la página 404.

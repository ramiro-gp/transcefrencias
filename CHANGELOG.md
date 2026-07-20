# Changelog

Todos los cambios relevantes de **transcefrencias** se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

## [0.7.0] - 2026-07-20

### Added

- Archivado y restauración auditados desde `Cargando gastos` y `Hora de pagar`, con estado anterior preservado, listado separado y detalle financiero de solo lectura.
- Revisión optimista uniforme para cerrar, reabrir, archivar y restaurar; los miembros activos conservan lectura del archivo.

### Changed

- Etapa 7 cubre archivado, restauración auditada y solo lectura; Etapa 8 concentra QA y producción directa a `1.0.0`.
- Retirados los contratos y tests aislados de registro de transferencias que no llegaron a integrarse con la aplicación ni persistirse; se conservan el cálculo original y la optimización usados.
- La documentación histórica mantiene las referencias verdaderas al alcance anterior y ADR-026 deja explícito que ya no define el producto vigente.
- La revisión manual prioriza `CREAR EVENTO`, renombra la acción de cálculo a `DIVIDIR GASTOS` con una explicación breve y mueve `ARCHIVAR EVENTO` al final del detalle activo.

### Security

- Las RPC y triggers bloquean toda mutación relacionada con un evento archivado; el enlace estable informa el archivo sin permitir `UNIRME`.
- `join_event` rechaza membresías ya activas y protege al propietario permanente; revisiones nulas, cero u obsoletas se rechazan explícitamente.

## [0.6.0] - 2026-07-19

### Added

- Transición auditada entre carga de gastos y hora de pagar, liquidación explicable y transferencias exactas derivadas sin persistir balances.
- Vistas personal y general, explicaciones por gasto y cálculo exacto aislado en Web Worker con continuación y cancelación explícitas.

### Security

- Durante `Hora de pagar` se bloquean en base de datos y UI gastos, unión, salida, expulsión y cambios de identidades económicas; solo una reapertura administrativa permite modificarlos.

## [0.5.0] - 2026-07-19

### Changed

- Los gastos admiten múltiples pagadores y aportes en pesos enteros exactos; los botones rápidos no restringen importes persistidos.

### Added

- CRUD de gastos con categorías cerradas, selector táctil de importe, consumidores por gasto, eliminación lógica y rutas de alta/edición.
- Auditoría de gastos con snapshots estructurados mínimos y control de concurrencia por revisión.

### Security

- RLS, grants de solo lectura y RPC transaccionales para crear, editar y eliminar gastos según membresía, rol, autoría y estado del evento.

## [0.4.0] - 2026-07-18

### Added

- Eventos con creación, listado, apertura, renombrado y estado inicial `Cargando gastos`.
- Membresías con propietario, coadministrador y miembro; salida/reingreso conservando identidad económica.
- Invitación estable recuperable y copiable solo por el admin, con fragmento URL, limpieza inmediata y unión explícita.
- Participantes manuales, desactivación lógica, vinculación administrativa con miembros activos e historial auditable visible.

### Security

- RLS, grants mínimos, RPC transaccionales y pruebas pgTAP para aislamiento de eventos, perfiles compartidos e invitación estable.
- Snapshots de apodo/nombre en auditoría para conservar el actor visible sin guardar emails ni ampliar perfiles accesibles.
- Expulsión por ADMIN o COADMIN, bloqueo de reingreso, habilitación posterior exclusiva de ADMIN y preservación de identidad económica.
- Las membresías inactivas solo quedan visibles al ADMIN; miembros comunes no pueden consultarlas mediante la API.
- Confirmaciones accesibles en modal para expulsar, salir, desactivar personas y quitar coadmins, con foco, Escape, estado pendiente y errores localizados.

## [0.3.0] - 2026-07-18

### Added

- Supabase CLI local reproducible con Auth email/password, Mailpit, migraciones, generación de tipos y scripts pnpm.
- Esquema `profiles` creado transaccionalmente desde `auth.users`, con validación de metadata no confiable, timestamps, grants mínimos y RLS de acceso propio.
- 64 pruebas pgTAP y una integración local mediante Supabase JS para Auth, JWT, PostgREST, constraints y aislamiento de permisos.
- Cliente Supabase único y tipado, validación de configuración pública y flujo Auth `implicit` explícito para la SPA.
- Providers de sesión y TanStack Query, rutas protegidas y destinos de retorno internos seguros.
- Registro, login, logout local, recuperación de contraseña por Mailpit, nueva contraseña, inicio privado y edición del perfil propio.
- Formularios accesibles con React Hook Form y Zod, feedback de carga/error/éxito y revelado accesible del nombre real desde un apodo.
- Carga diferida de pantallas de autenticación, perfil, inicio y 404 para reducir el bundle inicial.
- Corregida la transición posterior a recuperación de contraseña y reorganizada la navegación de sesión en el header.

### Fixed

- El cierre de sesión pendiente ya no persiste al volver a iniciar sesión sin recargar la aplicación.
- Los enlaces secundarios de Auth y Perfil se alinean de forma consistente a la derecha.

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
- Aclarada entonces la granularidad de gastos en pasos de $500; esta regla histórica fue reemplazada en `Unreleased` por ADR-024.

## [0.1.0] - 2026-07-16

### Added

- Documentación inicial de producto, arquitectura, cálculo, diseño y roadmap.
- Base ejecutable con React, Vite, TypeScript, rutas, Tailwind CSS 4, PWA y pruebas.
- Layout terminal mobile-first, estado de conectividad y aviso explícito de actualización del service worker.
- Decisiones de movimientos, roles, participantes, invitaciones, estados, privacidad y dependencias bajo demanda.

### Changed

- Eliminada una dependencia de pruebas sin uso y documentadas las exclusiones versionadas de la política de antigüedad de paquetes.
- Corregida la composición responsive del contenido principal y de la página 404.

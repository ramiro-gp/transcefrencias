# Roadmap inicial

Cada etapa debe aprobarse, implementarse, verificarse y documentarse antes de avanzar. No ejecutar todo el roadmap en una sola intervención.

## Etapa 0 — Validación y decisiones técnicas

- Leer toda la documentación.
- Inspeccionar repositorio.
- Confirmar versiones estables compatibles del stack.
- Proponer dependencias mínimas y justificar cada una.
- Definir estrategia de routing, datos remotos, formularios, tests y PWA.
- Instalar dependencias solo en la primera etapa que les dé uso real.
- Entregar plan; todavía sin código si no fue aprobado.

## Etapa 1 — Base de aplicación

- Inicializar React + Vite + TypeScript con pnpm.
- Configurar Tailwind CSS 4, lint, format, typecheck y tests. Instalar únicamente React, routing y tooling de esta base; no instalar acceso remoto ni librerías de formularios sin uso.
- Implementar tokens base, layout terminal y rutas vacías.
- Incorporar versión visible `v0.1.0`.
- Crear `.env.example`, `.gitignore` y README real.
- Configurar PWA base sin simular capacidades offline inexistentes.

## Etapa 2 — Motor financiero aislado

- Tipos de dominio.
- Reparto exacto de pesos enteros.
- Balances por subconjunto de participantes.
- Optimizador exacto híbrido sin fallback productivo para el rango habitual.
- Suite exhaustiva de tests e invariantes.
- Demo local de casos, incluido el ejemplo A–F.

No conectar Supabase hasta que este motor sea confiable.

Estado al 2026-07-17: motor exacto híbrido implementado e instrumentado. El rango habitual de 14–15 completó 100 % exacto y no requiere fallback; Web Worker e integración permanecían para etapas posteriores. Los contratos experimentales de registro de transferencias incluidos entonces se retiraron del alcance por ADR-026; no llegaron a integrarse con producto ni persistencia.

## Etapa 3 — Supabase y autenticación

- Crear/configurar proyecto Supabase cuando el propietario lo autorice.
- Incorporar Supabase JS y TanStack Query al comenzar acceso remoto y autenticación.
- Schema inicial y migraciones versionadas.
- RLS y pruebas de permisos.
- Registro sin confirmación de email.
- Login, logout y recuperación de contraseña.
- Perfil con nombre y apodo.

Estado al 2026-07-18: completada en `0.3.0` y probada localmente con Docker, Mailpit, pgTAP, integración Supabase JS y formularios cliente. Incluye perfiles con RLS, registro sin confirmación de email, login/logout, recuperación, guards, Query Cache acotada y navegación mobile-first. Supabase remoto, SMTP remoto y Vercel permanecen pendientes y no forman parte de esta etapa.

## Etapa 4 — Eventos y participantes

- Crear/listar/abrir eventos.
- Enlace de invitación y acción `UNIRME`.
- Salir y volver a unirse.
- Roles propietario/coadministrador/miembro.
- Participantes manuales y vinculación administrativa con miembros activos.
- Enlace de invitación estable, visible y copiable por el admin; visibilidad mínima entre miembros e historial auditable.
- Expulsión administrativa, bloqueo explícito de reingreso y habilitación posterior por el admin.

Estado al 2026-07-18: completada en `0.4.0` y validada localmente con migraciones versionadas, RLS/pgTAP, integración Supabase JS, invitación estable, roles, personas manuales, historial, expulsión y diálogos accesibles. Gastos, transiciones de estado, servicios remotos y despliegue permanecen fuera de esta etapa.

## Etapa 5 — Gastos

- CRUD con permisos e historial.
- React Hook Form, Zod y sus resolvers ya se incorporaron en Etapa 3; reutilizarlos en formularios de gastos.
- Categorías definidas.
- Selector de importe sin teclado por defecto.
- Selección inicial de todos los participantes.
- Resumen por gasto y validaciones.
- Múltiples pagadores con aportes explícitos y resumen personal derivado, sin transferencias sugeridas.

Estado al 2026-07-19: completada en `0.5.0` con gastos auditables, múltiples pagadores, importes enteros exactos, RLS/RPC, consolidación de identidades fusionadas y pruebas locales. Liquidación y transiciones de estado quedaron fuera de esta etapa; el registro de transferencias previsto entonces fue retirado posteriormente por ADR-026.

## Etapa 6 — Hora de pagar

- Cambio de estado y aviso interno.
- Balances explicables.
- Transferencias optimizadas.
- Reapertura con advertencias.
- Vista personal y vista general.

Estado al 2026-07-19: completada en `0.6.0` con transición auditada y serializada, bloqueos por estado en RLS/RPC y UI, balances consolidados y explicables, transferencias exactas en Worker, presupuesto protegido, cancelación, vistas mobile-first y revisión humana aprobada. Archivado permanece fuera de esta etapa; el registro de transferencias y el estado final previstos entonces fueron retirados posteriormente por ADR-026.

## Etapa 7 — Archivado y restauración

- Archivar desde `Cargando gastos` u `Hora de pagar` mediante confirmación administrativa.
- Conservar el estado anterior para una restauración administrativa exacta.
- Mantener los eventos archivados en solo lectura.
- Auditar archivado y restauración sin destruir gastos ni membresías históricas.

Estado al 2026-07-20: completada en `0.7.0` con revisión uniforme, RPC transaccionales, solo lectura defensiva, listados separados, invitación bloqueada, retiro del dominio cancelado, ajustes UX aprobados y verificación local completa. Etapa 8 queda reservada para QA y producción autorizadas.

## Etapa 8 — QA y producción directa a 1.0.0

- Instalación Android/escritorio.
- Actualización del service worker desde la app.
- QA responsive y accesible.
- Pruebas de RLS con varias cuentas.
- Pruebas con un evento representativo de 14 personas.
- Configuración Vercel y despliegue autorizado.
- QA integral y preparación directa de `1.0.0` solo cuando el producto sea estable.
- No publicar `0.8.0`: Etapa 7 cerró como `0.7.0` y Etapa 8 pasará directamente a `1.0.0` solo después de QA y producción aprobadas.
- Revisar el chunk inicial que Vite informa por encima de 500 kB como optimización futura; no bloquea la Etapa 3.

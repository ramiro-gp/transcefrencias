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

Estado al 2026-07-17: motor exacto híbrido implementado e instrumentado. El rango habitual de 14–15 completó 100 % exacto y no requiere fallback; Web Worker e integración permanecen para etapas posteriores.

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
- Roles admin/coadmin/miembro.
- Participantes manuales y futura vinculación.

## Etapa 5 — Gastos

- CRUD con permisos e historial.
- Incorporar React Hook Form, Zod y sus resolvers al implementar formularios reales.
- Categorías definidas.
- Selector de importe sin teclado por defecto.
- Selección inicial de todos los participantes.
- Resumen por gasto y validaciones.

## Etapa 6 — Hora de pagar

- Cambio de estado y aviso interno.
- Balances explicables.
- Transferencias optimizadas.
- Reapertura con advertencias.
- Vista personal y vista general.

## Etapa 7 — Movimientos opcionales

- Informar pago o cobro.
- Pagos parciales.
- Detección/gestión de posibles duplicados.
- Saldo original, movimientos y pendiente.
- Marcado manual de evento saldado.

## Etapa 8 — PWA, QA y producción

- Instalación Android/escritorio.
- Actualización del service worker desde la app.
- QA responsive y accesible.
- Pruebas de RLS con varias cuentas.
- Pruebas con un evento representativo de 14 personas.
- Configuración Vercel y despliegue autorizado.
- Preparación de `1.0.0` solo cuando el producto sea estable.
- Revisar el chunk inicial que Vite informa por encima de 500 kB como optimización futura; no bloquea la Etapa 3.

# transcefrencias

PWA mobile-first para dividir gastos de una juntada de manera justa: cada gasto se reparte solo entre quienes participaron y el resultado reduce transferencias innecesarias.

La implementación actual incluye la base de la Etapa 1, el motor financiero aislado de la Etapa 2, autenticación/perfiles de la Etapa 3 y eventos/participantes de la Etapa 4 sobre Supabase local. Incluye invitación estable, roles, personas manuales, historial auditable, expulsión/reingreso y RLS probada. Los gastos y la UI financiera pertenecen a la siguiente etapa; Supabase remoto, SMTP remoto y Vercel permanecen sin configurar.

## Stack actual

- React 19, Vite 8 y TypeScript estricto.
- React Router para rutas de cliente.
- Tailwind CSS 4 para estilos.
- Vitest, Testing Library y jsdom para pruebas.
- `vite-plugin-pwa` y Workbox para instalación y actualización explícita.
- Supabase JS, Supabase CLI y PostgreSQL local para Auth, perfiles y RLS.
- TanStack Query, React Hook Form y Zod en uso para sesión, perfil y formularios Auth.
- pnpm como único gestor de paquetes.

## Requisitos

- Node.js `24.x`
- pnpm `11.7.0`
- Docker Desktop o un runtime compatible con Docker API

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

## Flujo de etapas con OpenCode

Los comandos de proyecto aceptan el número o nombre de la etapa y separan planificación, implementación, revisión y cierre:

```text
/stage-plan 4 -> aprobación -> /stage-build 4 -> revisión humana -> /stage-review 4 -> /stage-close 4
```

`stage-close` se ejecuta únicamente después de aprobar la revisión humana; realiza las verificaciones finales, actualiza la versión de la entrega, crea un commit y hace push a la rama y upstream ya configurados. Los demás comandos no hacen commit ni push.

## Supabase local

```bash
pnpm supabase:start
pnpm supabase:reset
pnpm supabase:test:db
pnpm test:integration:supabase
pnpm supabase:types
pnpm supabase:stop
```

El stack local expone por defecto la API en `http://127.0.0.1:54321`, Studio en `http://127.0.0.1:54323` y Mailpit en `http://127.0.0.1:54324`. `pnpm supabase status -o env` informa las claves públicas locales necesarias para `.env.local`; las claves secretas solo se usan dinámicamente como preparación de la integración local y nunca se incorporan al cliente.

`pnpm supabase:reset` recrea PostgreSQL desde las migraciones versionadas. No hay seed. `pnpm supabase:test:db` ejecuta pgTAP y `pnpm test:integration:supabase` verifica Auth, JWT, PostgREST y RLS contra servicios reales locales.

Para probar la interfaz local, iniciá Supabase, copiá los valores públicos mostrados por `pnpm supabase status -o env` a `.env.local` y ejecutá `pnpm dev`. El flujo de recuperación se inspecciona en Mailpit, sin SMTP remoto.

## PWA

El service worker precachea el app shell y recursos versionados. No cachea respuestas de datos ni encola escrituras. Cuando detecta una versión nueva, la interfaz ofrece `ACTUALIZAR`; la actualización ocurre únicamente al confirmarla.

## Entorno

El cliente requiere `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Ambas son configuración pública del navegador; nunca deben contener una secret key o `service_role`. `.env.example` contiene únicamente valores ficticios o locales no secretos.

## Documentación

- [Misión](docs/MISSION.md)
- [Especificación funcional](docs/PRODUCT_SPEC.md)
- [Motor de cálculo](docs/CALCULATION_ENGINE.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Decisiones](docs/DECISIONS.md)

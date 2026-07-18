# Arquitectura propuesta

## Objetivo

Una arquitectura sencilla para el MVP, pero con límites claros entre interfaz, dominio y persistencia. No construir microservicios ni un backend separado innecesario.

## Capas

```text
src/
  app/             configuración, rutas y providers
  components/      componentes compartidos de UI
  features/        funcionalidades por dominio
  domain/          cálculo financiero y reglas puras
  lib/             clientes e infraestructura compartida
  pages/           composición de pantallas/rutas
  styles/          tokens y estilos globales
  test/            utilidades de test
```

Dentro de cada feature, separar componentes, hooks, esquemas, servicios y tipos cuando sea útil. Evitar una estructura ceremonial con carpetas vacías.

El motor financiero implementado en `src/domain/finance/` no importa React, DOM ni Supabase. Sus módulos separan reparto, balances originales, movimientos, optimización exacta híbrida, solver de particiones cero, backtracking, tipos, errores y validaciones. Los balances son resultados derivados y serializables, no estado persistido.

## Entidades sugeridas

- `profiles`
- `events`
- `event_members`
- `participants`
- `expenses`
- `expense_participants`
- `settlement_movements`
- `audit_log`

### Identidad de participante

`participants` representa la identidad económica dentro de un evento. Puede apuntar opcionalmente a un `profile`.

Esto permite que:

- una cuenta tenga su participante en el evento;
- una persona manual exista sin cuenta;
- luego se vincule sin reescribir gastos;
- salir del evento no destruya el historial económico.

No usar directamente `user_id` como única referencia en gastos.

## Supabase

- Versionar esquema y migraciones en `supabase/migrations/`.
- Mantener tipos de base de datos generados y actualizables.
- Habilitar RLS en todas las tablas públicas.
- Escribir políticas por rol y membresía, no depender del frontend.
- Para operaciones complejas/auditadas, considerar funciones SQL `security definer` cuidadosamente limitadas y con `search_path` seguro.
- No almacenar balances como fuente primaria. Derivarlos de gastos y movimientos; si luego se cachean, deben poder reconstruirse.

La infraestructura implementada inicia Supabase local mediante la CLI fijada y Docker. `public.profiles` referencia `auth.users`, no duplica email y se crea mediante un trigger transaccional en el schema no expuesto `private`. La función usa `security definer`, `search_path` vacío, nombres calificados y ejecución revocada; la metadata de Auth se trata solo como entrada de perfil validada.

`profiles` habilita RLS pero no FORCE RLS. El owner efectivo `postgres` tiene `BYPASSRLS`, por lo que FORCE fue probado y no añadió aislamiento para ese owner. Los clientes solo reciben SELECT y UPDATE de `full_name`/`nickname`, sujetos a policies de identidad propia. INSERT, DELETE, identidad y timestamps no son privilegios cliente.

### Flujo Auth de la SPA

El cliente configura el flujo `implicit` de manera explícita. Es adecuado para la SPA sin servidor y permite que un enlace de recuperación se abra fuera del navegador que lo solicitó. PKCE evita entregar tokens directamente en la URL, pero requiere intercambiar un código junto con un verifier almacenado en el dispositivo inicial; por eso puede fallar al abrir el email en otro dispositivo.

Supabase JS procesa el fragmento Auth y persiste la sesión y su refresh token mediante su storage estándar. `autoRefreshToken` renueva access tokens de vida corta y la rotación local permanece habilitada. La aplicación no crea copias de tokens. Si se incorpora SSR o backend, se reevaluará PKCE.

## RLS mínima a diseñar y probar

- Perfil: cada usuario edita el propio; miembros de un evento pueden ver los datos mínimos de otros miembros de ese evento.
- Evento: visible para miembros; el enlace válido solo expone lo mínimo necesario para la pantalla de unión.
- Membresías: un usuario puede crear su unión válida; solo admins gestionan roles ajenos.
- Participantes manuales: miembros crean; admins desactivan/vinculan.
- Gastos: miembros crean; autor edita/elimina el propio durante carga; admins gestionan todos.
- Movimientos: origen, destino y administradores pueden informar; el creador o administradores editan/anulan; miembros del evento consultan el estado necesario.
- Auditoría: insertada de forma controlada y no editable por usuarios comunes.

Agregar tests o verificaciones reproducibles de RLS antes de producción.

## Estado del cliente

- Estado remoto mediante una solución liviana y bien justificada; evaluar TanStack Query antes de implementar caché manual compleja.
- Estado de formularios local.
- No duplicar en un store global los datos que ya son estado remoto.
- Persistir solo preferencias seguras; nunca sesiones manualmente fuera del mecanismo de Supabase.

## Validación

- Esquemas compartidos para formularios y límites de dominio.
- Constraints de base de datos para importes positivos y consistencia.
- El motor financiero valida precondiciones y falla explícitamente ante datos inválidos.

## PWA

- Configuración compatible con Vite.
- Cachear el app shell y recursos versionados.
- No cachear de forma ciega respuestas sensibles de Supabase.
- Mostrar estado offline y errores recuperables, sin cola de escrituras ni promesa de lectura completa offline.
- Implementar prompt de actualización cuando haya un service worker nuevo.

## Entornos

- `.env.local` ignorado.
- `.env.example` documenta `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con valores ficticios/locales públicos.
- Producción configurada en Vercel.
- No usar secretos del servidor en variables `VITE_*`.

## Invitaciones

- Mantener tokens de invitación en una tabla o esquema no expuesto por PostgREST.
- Generar secretos aleatorios de al menos 256 bits y guardar solo un hash para su comparación.
- Validar y unir mediante una función SQL controlada; las tablas de secretos no tendrán políticas de consulta directa del cliente.
- El fragmento de URL puede transportar el secreto para evitar que llegue al servidor o a encabezados `Referer`; eliminarlo de la URL inmediatamente y conservarlo, si hiciera falta tras login, solo en `sessionStorage`.

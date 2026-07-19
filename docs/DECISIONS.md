# Decisiones técnicas y de producto

Registrar aquí decisiones que tengan alternativas relevantes o consecuencias futuras. No usarlo como duplicado del changelog.

## ADR-001 — Un evento contiene gastos con distintos participantes

- **Estado:** aceptada.
- **Fecha:** 2026-07-16.
- **Decisión:** una juntada completa es un evento; cada gasto define su propio subconjunto de consumidores.
- **Motivo:** evita dividir injustamente consumos de comida, bebida, alcohol u otros entre personas que no participaron.
- **Consecuencia:** el cálculo debe operar por gasto antes de acumular balances.

## ADR-002 — Participante económico separado de la cuenta

- **Estado:** aceptada.
- **Fecha:** 2026-07-16.
- **Decisión:** los gastos referencian participantes del evento, que opcionalmente se vinculan a una cuenta.
- **Motivo:** admitir personas manuales y vincularlas posteriormente sin perder historial.
- **Consecuencia:** salir de un evento o desactivar una persona no elimina datos económicos.

## ADR-003 — Dinero entero y entrada redondeada a $500

- **Estado:** aceptada.
- **Fecha:** 2026-07-16.
- **Decisión:** los gastos se ingresan como enteros múltiplos de $500; las cuotas internas se reparten en pesos enteros exactos.
- **Motivo:** carga rápida y adecuada al uso informal actual en Argentina, sin perder consistencia contable.
- **Consecuencia:** el redondeo ocurre al ingresar el gasto, nunca al repartir cada cuota.

## ADR-004 — Movimientos de pago opcionales

- **Estado:** aceptada.
- **Fecha:** 2026-07-16.
- **Decisión:** informar pago/cobro es opcional y no requiere confirmación obligatoria.
- **Motivo:** el producto está pensado para grupos pequeños con confianza y coordinación externa por WhatsApp.
- **Consecuencia:** un administrador puede declarar saldado un evento aun sin todos los movimientos registrados.

## ADR-005 — Identidad visual terminal AMOLED

- **Estado:** aceptada.
- **Fecha:** 2026-07-16.
- **Decisión:** fondo negro puro, tipografía monoespaciada, geometría cuadrada y nombre `transcefrencias` en minúsculas.
- **Motivo:** identidad propia, preferencia visual y aprovechamiento de pantallas AMOLED.
- **Consecuencia:** la accesibilidad y legibilidad siguen teniendo prioridad sobre efectos decorativos.

## ADR-006 — Movimientos libres sobre saldos pendientes

- **Estado:** aceptada.
- **Fecha:** 2026-07-16.
- **Decisión:** las transferencias optimizadas son recomendaciones. Un movimiento puede conectar cualquier origen deudor pendiente con cualquier destino acreedor pendiente por hasta el mínimo entre deuda total pendiente del origen y crédito total pendiente del destino.
- **Motivo:** el grupo puede acordar una transferencia distinta de la sugerida sin perder consistencia contable.
- **Consecuencia:** tras crear, editar o anular un movimiento se recalculan recomendaciones sobre saldos pendientes; editar gastos conserva movimientos y puede producir advertencias sin alterarlos.

## ADR-007 — Roles, invitaciones y estados del evento

- **Estado:** aceptada.
- **Fecha:** 2026-07-16.
- **Decisión:** el creador es propietario permanente; solo él gestiona coadministradores e invitaciones. Los enlaces activos son reutilizables, revocables y no expiran. Los estados y restauración se limitan a las transiciones de la especificación.
- **Motivo:** mantener un modelo de permisos simple y trazable para el MVP.
- **Consecuencia:** coadministradores mantienen permisos operativos, pero no administran roles ni al propietario; archivado es solo lectura y se restaura al estado anterior.

## ADR-008 — Fusión segura de participantes

- **Estado:** aceptada.
- **Fecha:** 2026-07-16.
- **Decisión:** una cuenta solo puede tener un participante activo por evento. Si una cuenta ya está asociada, vincular una identidad manual requiere una fusión administrativa atómica que mantiene activa la identidad con cuenta.
- **Motivo:** evitar duplicar personas, importes o participaciones sin perder historia.
- **Consecuencia:** gastos, movimientos e historial se preservan; la identidad manual queda desactivada y referencia su destino de fusión.

## ADR-009 — Secretos de invitación con hash y fragmento URL

- **Estado:** reemplazada por ADR-020.
- **Fecha:** 2026-07-16.
- **Decisión:** guardar solo el hash de tokens de invitación de 256 bits y transportar el token en el fragmento de URL, removiéndolo de inmediato y manteniéndolo temporalmente solo en `sessionStorage` durante login.
- **Motivo:** reducir exposición del secreto en base de datos, logs de servidor y referencias.
- **Consecuencia:** la validación requiere una operación controlada y la interfaz no puede recuperar el token después de generarlo.

## ADR-010 — Dependencias bajo demanda

- **Estado:** aceptada.
- **Fecha:** 2026-07-16.
- **Decisión:** Etapa 1 instala solo React, routing y tooling de construcción, estilo, pruebas y PWA. Query y Supabase se agregan en Etapa 3; librerías de formularios y validación, al primer formulario real.
- **Motivo:** evitar abstracciones, providers y dependencias sin uso real.
- **Consecuencia:** la estructura inicial no incluye adaptadores de datos, providers remotos ni formularios ficticios.

## ADR-011 — Granularidad monetaria interna y movimientos

- **Estado:** aceptada.
- **Fecha:** 2026-07-17.
- **Decisión:** solo los gastos ingresados deben ser múltiplos de $500. Cuotas, balances, movimientos y transferencias sugeridas admiten cualquier entero positivo de pesos.
- **Motivo:** los remanentes de una división exacta pueden producir cuotas no divisibles por $500 y deben poder saldarse sin perder ni inventar dinero.
- **Consecuencia:** toda cantidad usa `number` con validación de entero seguro; el motor rechaza volúmenes agregados no representables con seguridad.

## ADR-012 — Aplicación agregada de movimientos históricos

- **Estado:** aceptada.
- **Fecha:** 2026-07-17.
- **Decisión:** los movimientos históricos activos se aplican algebraicamente mediante totales enviados y recibidos, con independencia del orden. Las advertencias se derivan del resultado agregado. Un reemplazo se valida excluyendo exactamente el movimiento anterior.
- **Motivo:** conservar historia auditable y evitar que el orden accidental cambie saldos o advertencias.
- **Consecuencia:** editar gastos puede invertir saldos y generar una recomendación de devolución sin modificar movimientos retroactivamente.

## ADR-013 — Optimización exacta instrumentada antes del fallback

- **Estado:** reemplazada por ADR-015.
- **Fecha:** 2026-07-17.
- **Decisión:** implementar primero búsqueda exacta determinista con poda, memoización, métricas y presupuesto opcional de estados. Agotar el presupuesto devuelve un resultado discriminado y nunca activa una solución aproximada silenciosa.
- **Motivo:** un timeout rompería determinismo y un fallback no medido podría degradar innecesariamente la optimalidad.
- **Consecuencia:** sirvió para medir el backtracking y fundamentar ADR-015. No se habilitó fallback.

## ADR-014 — fast-check para invariantes financieras

- **Estado:** aceptada.
- **Fecha:** 2026-07-17.
- **Decisión:** incorporar `fast-check` como dependencia de desarrollo para verificar propiedades contables y comparar el optimizador con un oracle independiente en casos pequeños.
- **Motivo:** generación reproducible y reducción automática de contraejemplos en lógica financiera de alto riesgo.
- **Consecuencia:** la suite mantiene seeds reproducibles por Vitest/fast-check y complementa ejemplos unitarios, no los reemplaza.

## ADR-015 — Optimizador exacto híbrido por particiones cero

- **Estado:** aceptada.
- **Fecha:** 2026-07-17.
- **Decisión:** `optimizeTransfers` usa el solver exacto de particiones para hasta 15 balances no nulos y conserva backtracking exacto para cantidades mayores.
- **Motivo:** 1.040/1.040 casos habituales completaron exacto, con máximo de 25,12 ms y menos de 0,57 MB estimados para el solver; el adversarial de más de 2 millones de estados se resolvió en 1,01 ms.
- **Consecuencia:** 15 es un umbral algorítmico, no un límite funcional. No se incorpora fallback para el rango habitual; entradas mayores siguen siendo aceptadas y pueden devolver agotamiento discriminable si se usa presupuesto.

## ADR-016 — Perfil transaccional mediante trigger de Auth

- **Estado:** aceptada.
- **Fecha:** 2026-07-18.
- **Decisión:** un trigger `security definer` sobre `auth.users` crea `public.profiles` dentro de la transacción del alta. Nombre y apodo llegan como metadata no confiable, se validan y normalizan, y nunca participan de autorización.
- **Motivo:** evitar usuarios Auth huérfanos que podrían aparecer si el cliente ejecutara dos escrituras independientes.
- **Consecuencia:** un perfil inválido bloquea y revierte el alta completa. No existe INSERT cliente, RPC de reparación, email duplicado, avatar, rol ni historial detallado del perfil en esta etapa.

## ADR-017 — Flujo Auth implicit para la SPA

- **Estado:** aceptada.
- **Fecha:** 2026-07-18.
- **Decisión:** el cliente configura explícitamente `flowType: 'implicit'`, `persistSession: true`, `autoRefreshToken: true` y `detectSessionInUrl: true`.
- **Motivo:** la aplicación es una SPA puramente cliente. A diferencia de PKCE, la recuperación implicit no depende de un code verifier guardado en el dispositivo que solicitó el email y puede abrirse en otra pestaña o dispositivo.
- **Consecuencia:** el callback recibe tokens en el fragmento URL, que no se envía al servidor pero sí debe ser procesado y limpiado por Supabase JS. El refresh posterior usa refresh-token rotation en ambos flujos. PKCE deberá reevaluarse si aparece SSR o un backend capaz de completar el intercambio; con PKCE, abrir el enlace fuera del navegador que conserva el verifier puede fallar.

## ADR-018 — ENABLE RLS sin FORCE para profiles

- **Estado:** aceptada.
- **Fecha:** 2026-07-18.
- **Decisión:** `public.profiles` usa `ENABLE ROW LEVEL SECURITY` y no `FORCE ROW LEVEL SECURITY`.
- **Motivo:** la tabla y la función de alta pertenecen al rol local `postgres`, que posee `BYPASSRLS`. Una prueba temporal con FORCE confirmó que el trigger funciona, los clientes siguen aislados y el owner continúa omitiendo policies; FORCE no agrega defensa efectiva en este entorno.
- **Consecuencia:** la seguridad cliente depende de grants mínimos y policies probadas con `anon` y JWT autenticados. Los roles administrativos permanecen fuera del frontend y la suite comprueba que FORCE continúa desactivado para evitar seguridad aparente.

## ADR-019 — Membresías, invitaciones y participantes de Etapa 4

- **Estado:** aceptada.
- **Fecha:** 2026-07-18.
- **Decisión:** el propietario no puede salir; salir desactiva la membresía y el participante vinculado, un coadministrador vuelve como miembro y el reingreso exige invitación vigente con acción explícita `UNIRME`. Los manuales usan un nombre libre no único y solo se vinculan administrativamente a cuentas ya activas en el evento. Las acciones de esta etapa quedan auditadas y visibles para miembros activos.
- **Motivo:** preservar historia económica, evitar búsqueda global de perfiles o exposición de emails y mantener permisos simples para grupos pequeños.
- **Consecuencia:** la UI captura y elimina el fragmento antes de redirigir a login; no hay incorporación automática, reclamo unilateral ni vinculación a cuentas externas al evento.

## ADR-020 — Invitación estable y actor preservado

- **Estado:** aceptada.
- **Fecha:** 2026-07-18.
- **Decisión:** cada evento conserva un único enlace de invitación estable. Su identificador aleatorio queda solamente en `private.event_invitations` y la RPC de lectura se limita al owner interno. El enlace usa fragmento URL, que la SPA limpia antes de redirects. La auditoría guarda el apodo o nombre visible del actor como snapshot transaccional, sin email.
- **Motivo:** un grupo personal necesita recuperar y copiar su enlace desde cualquier sesión sin sumar infraestructura, mientras protege el enlace de consultas no autorizadas y el historial de cambios posteriores de perfil o membresía.
- **Consecuencia:** se elimina regeneración/revocación; tener el enlace permite solicitar unión, nunca ingresar automáticamente. La interfaz usa `PERSONAS` para identidades económicas, `MIEMBROS` para cuentas unidas y muestra `ADMIN`/`COADMIN` como roles.

## ADR-021 — Expulsión y reingreso bloqueado

- **Estado:** aceptada.
- **Fecha:** 2026-07-18.
- **Decisión:** ADMIN y COADMIN pueden expulsar cuentas activas que no sean el owner ni ellas mismas. La expulsión desactiva membresía y persona, reduce el rol a miembro, bloquea la RPC de unión y audita actor y persona. Solo ADMIN puede permitir un reingreso posterior, que sigue requiriendo invitación y `UNIRME`.
- **Motivo:** permitir moderación compartida sin borrar historia ni convertir una invitación permanente en un bypass de seguridad.
- **Consecuencia:** las cuentas expulsadas aparecen solo para ADMIN en una sección administrativa discreta; salida voluntaria y expulsión quedan diferenciadas en historial.

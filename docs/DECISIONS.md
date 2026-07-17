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

- **Estado:** aceptada.
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

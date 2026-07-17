# Especificación funcional

## 1. Identidad y autenticación

- Registro mediante email y contraseña con Supabase Auth.
- El alta no requiere confirmación por email.
- Debe existir recuperación de contraseña por email.
- Perfil con nombre obligatorio y apodo opcional.
- En el evento se muestra el apodo cuando existe; al pulsarlo se revela el nombre real de forma accesible.
- Un usuario autenticado puede crear eventos y unirse mediante enlace.

> Configuración operativa: desactivar `Confirm email` para el registro en Supabase. La recuperación de contraseña sí depende del envío de email y debe probarse en el entorno configurado.

## 2. Eventos

Datos mínimos:

- nombre;
- creador;
- código/enlace de invitación no predecible;
- estado;
- fechas de creación, actualización y archivo.

Estados visibles:

1. `Cargando gastos`.
2. `Hora de pagar`.
3. `Saldado`.
4. `Archivado`.

El creador es el propietario permanente durante el MVP. Solo él puede nombrar y remover coadministradores, regenerar o revocar la invitación. Transferir la propiedad queda fuera del MVP.

### Unión mediante enlace

- Para unirse es obligatorio iniciar sesión.
- Tras autenticarse, el usuario vuelve al evento solicitado.
- El enlace no lo incorpora automáticamente.
- Debe pulsar `UNIRME`.
- Un miembro puede salir.
- Si tiene relaciones históricas, la membresía se desactiva pero no se destruye.
- Si vuelve, recupera su identidad e historial dentro del evento.

## 3. Roles y permisos

### Propietario y coadministrador

- Editar el evento.
- Editar/eliminar cualquier gasto.
- Eliminar o desactivar participantes manuales.
- Pasar a `Hora de pagar` mediante `TODOS LOS GASTOS FUERON CARGADOS`.
- Reabrir el evento para corregir gastos.
- Marcarlo como saldado o archivarlo.

El propietario puede además nombrar o remover coadministradores, regenerar o revocar la invitación. Un coadministrador no puede modificar al propietario ni gestionar roles.

### Miembro

- Ver el evento y sus cuentas.
- Crear gastos.
- Editar o eliminar sus propios gastos mientras se cargan gastos.
- Crear participantes manuales.
- Informar pagos o cobros opcionalmente.
- Salir del evento.

Durante `Hora de pagar`, los miembros comunes no modifican gastos. Un administrador debe reabrir el evento y aceptar la advertencia de recálculo.

## 4. Participantes manuales

- Representan personas sin cuenta o sin acceso a la aplicación.
- Todos los miembros pueden crearlos.
- Solo administradores/coadministradores pueden desactivarlos.
- Pueden pagar, consumir, deber y recibir igual que una cuenta.
- Si tienen historial, nunca se eliminan físicamente.
- Un administrador puede vincularlos posteriormente con una cuenta real.
- La vinculación conserva gastos, saldos y movimientos y debe quedar auditada.
- No permitir que un usuario reclame unilateralmente una identidad manual.
- Una cuenta no puede tener dos participantes activos en el mismo evento. Si la cuenta ya tiene uno, una fusión administrativa atómica conserva como activo al asociado con la cuenta, desactiva el manual, preserva las referencias económicas sin duplicarlas y registra la fusión.

## 5. Gastos

Campos mínimos:

- evento;
- concepto obligatorio;
- categoría;
- importe;
- un pagador;
- uno o más participantes consumidores;
- notas opcionales;
- creador y marcas temporales.

Categorías iniciales cerradas:

- Comida
- Bebida
- Alcohol
- Porro
- Otros

### Reglas

- El pagador y los consumidores son conceptos independientes.
- El pagador puede quedar destildado si no consumió.
- Al iniciar la carga se seleccionan todos los participantes activos actuales.
- El usuario puede destildar participantes antes de guardar.
- Una incorporación posterior no altera gastos anteriores.
- Antes de confirmar, mostrar total de seleccionados y cuota estimada.
- Los gastos pueden editarse y eliminarse de forma lógica con historial.

## 6. Selector de importe

Objetivo: cargar el monto habitual sin abrir el teclado del celular.

- Mostrar un monto grande y legible, abreviado cuando corresponda: `$10k` y su valor completo accesible `$10.000`.
- Controles táctiles:
  - `− $500`
  - `− $1k`
  - `+ $1k`
  - `+ $500`
- El orden visual final debe priorizar ergonomía y evitar errores; probarlo en celular.
- Pulsar el monto permite abrir teclado numérico como alternativa.
- Al salir de la edición manual, redondear al múltiplo de $500 más cercano.
- Ejemplos: `$1.600 → $1.500`; `$1.900 → $2.000`.
- Definir explícitamente el empate: `$1.750 → $2.000` (mitad hacia arriba).
- Solo aceptar enteros positivos y múltiplos de $500 al guardar.
- No usar inputs numéricos nativos con flechas pequeñas.

## 7. Liquidación

- El administrador pulsa `TODOS LOS GASTOS FUERON CARGADOS` y confirma.
- El estado pasa a `Hora de pagar`.
- Todos ven un aviso interno y su resumen personal.
- Se muestran saldos y transferencias optimizadas.
- La explicación debe permitir rastrear el resultado hasta los gastos.
- Un administrador puede reabrir; se advierte que los resultados pueden cambiar.

## 8. Movimientos opcionales

- La herramienta funciona aunque nadie marque movimientos.
- `YA PAGUÉ` y `YA COBRÉ` registran el mismo tipo de dato: `origen transfirió importe a destino`.
- El origen, el destino, el propietario o un coadministrador pueden crearlo. Registrar autor y acción de origen.
- Admitir pagos parciales.
- Un movimiento puede conectar cualquier participante deudor pendiente con cualquier participante acreedor pendiente, aunque esa pareja no aparezca en la recomendación actual.
- El importe de un movimiento es un entero positivo de pesos; no necesita ser múltiplo de $500 porque cuotas y saldos internos pueden contener pesos de remanente.
- Al crear o editar, el importe no puede superar `min(deuda pendiente total del origen, crédito pendiente total del destino)`.
- Después de crear, editar o anular, recalcular recomendaciones sobre los balances pendientes.
- El creador puede editar o anular el movimiento. El propietario y coadministradores pueden editar o anular cualquiera. La contraparte no puede hacerlo si no fue creadora.
- Los movimientos se anulan lógicamente y no se eliminan físicamente.
- Advertir sobre posibles duplicados solo si coinciden evento, origen, destino e importe dentro de una proximidad temporal configurable. Nunca combinar, confirmar, bloquear ni eliminar automáticamente.
- No exigir confirmación de contraparte.
- Si gastos posteriores generan sobrepago, inversión de saldo o inconsistencias, conservar el movimiento y mostrar advertencias.
- Un administrador puede marcar el evento como saldado aunque los movimientos opcionales no estén completos.

## 9. Historial

Registrar acciones relevantes:

- creación, edición y eliminación lógica de gastos;
- cambios de participantes de un gasto;
- creación/desactivación/vinculación de participante manual;
- cambios de roles y estados;
- pagos o cobros informados, editados o anulados.

Mostrar autor, fecha y resumen comprensible. No guardar secretos ni datos innecesarios en el historial.

## 10. PWA y actualización

- Instalable en Android y escritorio compatible.
- Manifest, iconos y colores coherentes con el diseño.
- La interfaz principal debe funcionar de forma resiliente ante conectividad intermitente.
- El app shell ya cargado puede abrirse sin conexión. No prometer lectura completa ni edición offline, ni implementar escrituras silenciosas o cola de sincronización.
- Mostrar claramente falta de conexión, conservar formularios en pantalla cuando sea razonablemente posible y permitir reintento al recuperarla.
- Cuando exista una nueva versión del service worker, avisar y ofrecer `ACTUALIZAR` sin obligar a reinstalar.
- Evitar servir indefinidamente una versión vieja.

## 11. Versionado visible

- Mostrar al pie `vMAJOR.MINOR.PATCH`, por ejemplo `v0.4.2`.
- Fuente única de verdad compartida con `package.json` o generada desde él.
- SemVer: feature compatible aumenta `MINOR`; corrección aumenta `PATCH`; ruptura aumenta `MAJOR`.
- `1.0.0` será la primera versión estable acordada.

## 12. Invitaciones y privacidad

- Un evento tiene un enlace de invitación activo, reutilizable y no predecible que no expira automáticamente.
- Solo el propietario puede regenerarlo o revocarlo. Regenerarlo invalida inmediatamente el anterior.
- Abrir un enlace requiere autenticación; luego se vuelve al evento y se debe pulsar `UNIRME`.
- No enviar invitaciones por email.
- Miembros de un mismo evento pueden consultar apodo, nombre al pulsar el apodo, un eventual avatar e información económica correspondiente al evento.
- Nunca mostrar el email de otra persona. Usuarios ajenos al evento no pueden consultar esos perfiles desde la aplicación ni Supabase.

## 13. Estados del evento

Transiciones permitidas:

1. `Cargando gastos` → `Hora de pagar`.
2. `Hora de pagar` → `Cargando gastos`, mediante reapertura administrativa.
3. `Hora de pagar` → `Saldado`, mediante un propietario o coadministrador.
4. `Saldado` → `Hora de pagar`, mediante un propietario o coadministrador.
5. `Cargando gastos`, `Hora de pagar` o `Saldado` → `Archivado`.
6. `Archivado` → estado inmediatamente anterior, mediante restauración administrativa.

Todos los cambios se auditan. Un evento archivado es de solo lectura.

# Especificación funcional

## 1. Identidad y autenticación

- Registro mediante email y contraseña con Supabase Auth.
- El alta no requiere confirmación por email.
- Debe existir recuperación de contraseña por email.
- Perfil con nombre obligatorio y apodo opcional.
- El nombre se recorta en los extremos, admite hasta 100 caracteres y no admite caracteres de control.
- El apodo se recorta en los extremos, admite hasta 50 caracteres, no es único y un valor vacío se guarda como ausente.
- La contraseña requiere al menos 8 caracteres.
- En el evento se muestra el apodo cuando existe; al pulsarlo se revela el nombre real de forma accesible.
- Un usuario autenticado puede crear eventos y unirse mediante enlace.

> Configuración operativa: desactivar `Confirm email` para el registro en Supabase. La recuperación de contraseña sí depende del envío de email y debe probarse en el entorno configurado.

El login conserva solamente destinos internos válidos. Las rutas de autenticación, URLs absolutas, protocolos y rutas inválidas no se usan como destino de retorno. El cierre de sesión afecta solo la sesión local actual.

## 2. Eventos

Datos mínimos:

- nombre;
- creador;
- código/enlace de invitación no predecible;
- estado;
- revisión optimista y estado anterior cuando está archivado;
- fechas de creación, actualización y archivo.

Estados visibles:

1. `Cargando gastos`.
2. `Hora de pagar`.
3. `Archivado`.

El creador es el propietario permanente durante el MVP. Solo él puede nombrar y remover coadministradores y consultar/copiar el enlace estable de invitación. Transferir la propiedad queda fuera del MVP.

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
- Dividir los gastos mediante `DIVIDIR GASTOS` para pasar a `Hora de pagar` y mostrar resultados.
- Reabrir el evento para corregir gastos.
- Archivarlo y restaurarlo.

El propietario puede además nombrar o remover coadministradores y consultar/copiar la invitación. Un coadministrador no puede modificar al propietario ni gestionar roles.

El propietario y coadministrador pueden expulsar a un miembro o coadministrador activo, nunca al propietario ni a sí mismos. La expulsión desactiva la membresía y su persona, conserva la historia y bloquea el reingreso hasta que el propietario lo permita. Permitir el reingreso no une automáticamente: la cuenta debe volver a abrir la invitación y pulsar `UNIRME`, recuperando su persona como miembro.

### Miembro

- Ver el evento y sus cuentas.
- Crear gastos.
- Editar o eliminar sus propios gastos mientras se cargan gastos.
- Crear participantes manuales.
- Salir del evento.

Durante `Hora de pagar`, los miembros comunes no modifican gastos. Un propietario o coadministrador debe reabrir el evento y aceptar la advertencia de recálculo.

Durante `Hora de pagar` también se congelan unión, salida, expulsión y altas, bajas o vinculaciones de personas. Renombrar el evento, copiar la invitación y administrar roles no altera balances y permanece disponible según los permisos existentes. La invitación puede abrirse, pero `UNIRME` requiere que el evento vuelva a `Cargando gastos`.

Durante `Archivado`, el evento es completamente de solo lectura. No se modifican nombre, roles, membresías, invitación, personas ni gastos. Los miembros activos conservan acceso de lectura; exmiembros, cuentas expulsadas y usuarios ajenos no recuperan acceso. Propietario y coadministradores pueden restaurarlo al estado exacto anterior.

## 4. Participantes manuales

- Representan personas sin cuenta o sin acceso a la aplicación.
- Todos los miembros pueden crearlos.
- Solo propietarios/coadministradores pueden desactivarlos.
- Pueden pagar, consumir, deber y recibir igual que una cuenta.
- Si tienen historial, nunca se eliminan físicamente.
- Un propietario o coadministrador puede vincularlos posteriormente con una cuenta real que ya sea miembro activo del evento.
- La vinculación conserva gastos y saldos y debe quedar auditada.
- No permitir que un usuario reclame unilateralmente una identidad manual.
- Una cuenta no puede tener dos participantes activos en el mismo evento. Si la cuenta ya tiene uno, una fusión administrativa atómica conserva como activo al asociado con la cuenta, desactiva el manual, preserva las referencias económicas sin duplicarlas y registra la fusión.

## 5. Gastos

Campos mínimos:

- evento;
- concepto obligatorio;
- categoría;
- importe;
- uno o más pagadores con aporte explícito;
- uno o más participantes consumidores;
- creador y marcas temporales.

Categorías iniciales cerradas:

- Comida
- Bebida
- Alcohol
- Porro
- Otros

### Reglas

- Los pagadores y consumidores son conceptos independientes; sus aportes suman exactamente el total.
- Un pagador puede quedar destildado si no consumió.
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
- La edición manual conserva el peso entero exacto; `10k` equivale a `$10.000`.
- Solo aceptar enteros positivos y seguros al guardar.
- No usar inputs numéricos nativos con flechas pequeñas.

## 7. Liquidación

- Durante `Cargando gastos`, el administrador ve la explicación `Cuando hayan cargado todos los gastos, dividilos para calcular quién le paga a quién.` inmediatamente antes de la acción principal `DIVIDIR GASTOS`.
- Al confirmar `DIVIDIR GASTOS`, se calculan y muestran los resultados.
- El estado pasa a `Hora de pagar`.
- Todos ven un aviso interno y su resumen personal.
- Se muestran saldos y transferencias optimizadas.
- La explicación debe permitir rastrear el resultado hasta los gastos.
- Un administrador puede reabrir; se advierte que los resultados pueden cambiar.
- Para más de 15 saldos no nulos, el primer cálculo exacto usa un presupuesto determinista de 250.000 estados. Si se agota, se muestran balances sin sugerencias incompletas y se puede continuar el cálculo exacto, con advertencia y cancelación explícita.

## 8. Historial

Registrar acciones relevantes:

- creación, edición y eliminación lógica de gastos;
- cambios de participantes de un gasto;
- creación/desactivación/vinculación de participante manual;
- cambios de roles y estados;

Mostrar actor, fecha y resumen comprensible. El actor conserva un snapshot de apodo o nombre al realizar la acción, aun si luego cambia su perfil o sale; no guardar email ni datos innecesarios.

## 9. PWA y actualización

- Instalable en Android y escritorio compatible.
- Manifest, iconos y colores coherentes con el diseño.
- La interfaz principal debe funcionar de forma resiliente ante conectividad intermitente.
- El app shell ya cargado puede abrirse sin conexión. No prometer lectura completa ni edición offline, ni implementar escrituras silenciosas o cola de sincronización.
- Mostrar claramente falta de conexión, conservar formularios en pantalla cuando sea razonablemente posible y permitir reintento al recuperarla.
- Cuando exista una nueva versión del service worker, avisar y ofrecer `ACTUALIZAR` sin obligar a reinstalar.
- Evitar servir indefinidamente una versión vieja.

## 10. Versionado visible

- Mostrar al pie `vMAJOR.MINOR.PATCH`, por ejemplo `v0.4.2`.
- Fuente única de verdad compartida con `package.json` o generada desde él.
- SemVer: feature compatible aumenta `MINOR`; corrección aumenta `PATCH`; ruptura aumenta `MAJOR`.
- `1.0.0` será la primera versión estable, preparada directamente en Etapa 8 después de completar QA y autorizar producción.

## 11. Invitaciones y privacidad

- Un evento tiene un único enlace de invitación estable, reutilizable, no predecible y sin vencimiento automático.
- Solo el propietario puede consultarlo o copiarlo desde cualquier sesión. El enlace no se muestra a miembros, exmiembros, usuarios ajenos ni anónimos.
- Abrir un enlace requiere autenticación; luego se vuelve al evento y se debe pulsar `UNIRME`.
- Quien posea el enlace puede solicitar unirse, pero siempre necesita una cuenta, sesión y la acción explícita `UNIRME`.
- No enviar invitaciones por email.
- Miembros de un mismo evento pueden consultar apodo, nombre al pulsar el apodo, un eventual avatar e información económica correspondiente al evento.
- Nunca mostrar el email de otra persona. Usuarios ajenos al evento no pueden consultar esos perfiles desde la aplicación ni Supabase.
- Mientras el evento está archivado, la interfaz oculta la sección de invitación incluso al propietario. El enlace estable no se modifica; si alguien abre uno previamente compartido, ve `Archivado` y no puede usar `UNIRME`.

## 12. Listado y archivo

- El inicio muestra solamente eventos activos, ordenados por actividad reciente.
- Después del listado o estado vacío, el inicio presenta primero la acción principal `CREAR EVENTO` y luego `VER EVENTOS ARCHIVADOS` como acción secundaria separada.
- `VER EVENTOS ARCHIVADOS` abre un listado separado, ordenado por fecha de archivo reciente y sin tabla horizontal.
- Cada archivo muestra `Archivado` y el estado anterior con lenguaje visible.
- Si no hay resultados, mostrar `NO HAY EVENTOS ARCHIVADOS`.
- El detalle archivado mantiene gastos, personas, historial, balances, resumen personal/general, transferencias exactas y explicaciones por gasto.
- En un evento activo, `ARCHIVAR EVENTO` aparece al final completo del detalle, después de `HISTORIAL`, y se alcanza mediante scroll normal.

## 13. Estados del evento

Transiciones permitidas:

1. `Cargando gastos` → `Hora de pagar`.
2. `Hora de pagar` → `Cargando gastos`, mediante reapertura administrativa.
3. `Cargando gastos` o `Hora de pagar` → `Archivado`, mediante un propietario o coadministrador.
4. `Archivado` → estado inmediatamente anterior, mediante restauración administrativa.

Todos los cambios se auditan. Un evento archivado es de solo lectura.

Cerrar, reabrir, archivar y restaurar bloquean la fila del evento y exigen la revisión positiva exacta leída por el cliente. Una revisión ausente, cero u obsoleta se rechaza y requiere recargar. Cada operación activa incrementa la revisión del evento exactamente una vez por transacción.

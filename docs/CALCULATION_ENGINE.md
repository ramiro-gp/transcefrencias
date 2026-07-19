# Motor de cálculo financiero

## Objetivo

Calcular cuánto debe o recibe cada participante respetando la participación particular de cada gasto y proponer pocas transferencias para saldar el conjunto.

El motor debe ser puro, determinista, testeable y trabajar únicamente con enteros.

## Modelo conceptual

Para cada gasto:

- `amount`: importe entero, positivo y seguro.
- `payers`: uno o más participantes y sus aportes, cuya suma coincide con el total.
- `participantIds`: consumidores que comparten el gasto.

Cada pagador recibe crédito por su aporte. Cada consumidor asume una cuota del gasto. Un pagador solo asume cuota si también está incluido entre los consumidores.

## Reparto sin centavos

Sea un gasto de importe `A` entre `N` consumidores:

1. `base = floor(A / N)`
2. `remainder = A % N`
3. Cada consumidor recibe inicialmente `base`.
4. Se agrega $1 a exactamente `remainder` consumidores.

Gastos, aportes y cuotas usan pesos enteros exactos. No redondear cuotas porque alteraría el total real del gasto.

La asignación del remanente debe ser determinista. Ordenar por un identificador estable antes de distribuirlo, nunca por el orden accidental de la interfaz.

Invariante obligatoria: la suma de cuotas debe ser exactamente igual al importe.

## Balance

Convención recomendada:

- balance positivo: debe recibir dinero;
- balance negativo: debe pagar;
- balance cero: está saldado.

Por cada gasto:

1. Para cada pagador: `balance[participantId] += aporte`
2. Para cada consumidor: `balance[id] -= share[id]`

Invariantes:

- La suma de balances de un evento es siempre cero.
- Ninguna cuota es negativa.
- Un participante ajeno al gasto no cambia su balance.
- Editar o eliminar un gasto recalcula desde la fuente, no mediante parches acumulativos frágiles.

## Ejemplo de referencia

### Tarde

- A pagó $1.000.
- B pagó $0.
- C pagó $2.000.
- D pagó $3.000.
- A, B, C y D participaron de esos $6.000.
- Cuota: $1.500 cada uno.

Balances de tarde:

- A: −$500.
- B: −$1.500.
- C: +$500.
- D: +$1.500.

### Noche

- A pagó $500.
- B pagó $500.
- E pagó $4.000.
- F pagó $0.
- Participaron A, B, E y F.
- Total: $5.000; cuota: $1.250.

Balances de noche:

- A: −$750.
- B: −$750.
- E: +$2.750.
- F: −$1.250.

### Resultado acumulado

- A debe $1.250.
- B debe $2.250.
- C recibe $500.
- D recibe $1.500.
- E recibe $2.750.
- F debe $1.250.

Total deudores = total acreedores = $4.750.

## Optimización de transferencias

Para el tamaño habitual del producto, buscar una solución con el mínimo exacto mediante una estrategia híbrida sobre balances no nulos:

- hasta 15 balances no nulos, maximizar grupos disjuntos de suma cero mediante el solver de particiones;
- para cantidades mayores, conservar el backtracking exacto con poda y memoización;
- el umbral selecciona algoritmo y no impone un límite funcional al evento.

La demostración, reconstrucción y mediciones están en `HYBRID_OPTIMIZER_REPORT.md`.

Requisitos:

- resultado determinista ante varias soluciones óptimas;
- no crear transferencias de $0;
- cada transferencia conecta un deudor con un acreedor;
- la suma transferida por cada persona salda exactamente su balance;
- no presentar una solución aproximada como exacta;
- conservar un resultado discriminable si una búsqueda protegida no completa.

No afirmar que un algoritmo voraz produce siempre el mínimo matemático. Debe medirse y probarse el optimizador exacto con casos de hasta aproximadamente 15 participantes, que es el uso habitual, sin codificar 15 como límite funcional.

## Movimientos informados

Los pagos/cobros opcionales son accesos de UX a un único movimiento del libro contable: un participante transfiere un importe a otro. No son mutaciones destructivas de los gastos ni confirmaciones obligatorias de transferencias sugeridas.

- Conservar el cálculo bruto derivado de gastos.
- Un movimiento puede ser informado por el origen, el destino, un administrador o un coadministrador. Se registra el autor y la acción desde la que fue informado.
- Un movimiento puede unir cualquier origen deudor pendiente con cualquier destino acreedor pendiente; no está limitado a una pareja propuesta por el optimizador.
- Su importe puede ser cualquier entero positivo de pesos, igual que gastos y aportes.
- Su importe no puede superar `min(deuda pendiente total del origen, crédito pendiente total del destino)` al crearlo o editarlo.
- Después de crear, editar, anular o aplicar un movimiento, recalcular las transferencias optimizadas sobre los balances pendientes.
- Advertir sobre un posible duplicado cuando coincidan evento, origen, destino e importe dentro de una ventana temporal configurable. La advertencia no combina, confirma, bloquea ni elimina movimientos automáticamente.
- El creador puede editar o anular su movimiento; propietario, administradores y coadministradores pueden editar o anular cualquiera. La contraparte no puede modificarlo solo por ser contraparte.
- Los movimientos se anulan lógicamente y nunca se eliminan físicamente.
- Mostrar por separado `saldo original`, `movimientos registrados` y `saldo pendiente`.
- Un pago parcial reduce el saldo pendiente por su importe exacto.
- Reabrir y editar gastos recalcula el saldo original y conserva los movimientos, mostrando advertencias si generan sobrepago, inversión de saldo o inconsistencias. Nunca modifica movimientos retroactivamente.

### Aplicación determinista

Los movimientos históricos activos se agregan sin depender de su orden de entrada. Para cada participante:

1. `enviado = suma de movimientos donde es origen`.
2. `recibido = suma de movimientos donde es destino`.
3. `saldo pendiente = saldo original + enviado - recibido`.

Las advertencias se derivan al final desde el saldo original, los importes agregados y el saldo pendiente. Nunca se decide sobrepago ni validez histórica aplicando movimientos secuencialmente. Un movimiento estructuralmente válido se conserva aunque una edición posterior de gastos haga que su origen ya no sea deudor, su destino ya no sea acreedor o aparezca una transferencia de devolución.

Al validar el reemplazo de un movimiento se excluye exactamente el movimiento anterior, se reconstruye el pendiente base y recién entonces se valida el reemplazo. Los movimientos existentes con identificadores duplicados son datos inválidos y no se reparan silenciosamente.

## Contratos implementados en Etapa 2

- `splitExpense`: valida y reparte un gasto.
- `calculateOriginalBalances`: reconstruye saldos y explicaciones por gasto.
- `applyMovements`: aplica movimientos históricos agregados y produce advertencias deterministas.
- `validateProposedMovement`: valida altas y reemplazos contra deuda y crédito pendientes.
- `optimizeTransfers`: selecciona solver de particiones o backtracking exacto e informa métricas o agotamiento de presupuesto.
- `solveTransfersByZeroSumPartitions`: expone el solver exacto separado con métricas detalladas y protecciones.
- `calculateSettlement`: compone saldo original, pendiente y optimización.

Todas las salidas se ordenan mediante comparación lexicográfica de identificadores con `<` y `>`, nunca con `localeCompare`. La salida de balances incluye participantes con saldo cero.

### Presupuesto del optimizador exacto

`optimizeTransfers` acepta opcionalmente un `stateBudget` entero no negativo:

- sin presupuesto, la búsqueda exacta continúa hasta demostrar el mínimo y no consulta tiempo de pared;
- con presupuesto, cada estado nuevo consume una unidad determinista;
- si se agota, devuelve `status: budget-exceeded`, métricas y el presupuesto recibido;
- nunca devuelve una solución parcial como exacta;
- no activa un fallback silencioso.

La salida exacta informa cantidad mínima, transferencias, estados explorados, estados memoizados y profundidad máxima. El solver separado agrega subconjuntos, transiciones y memoria estimada. No existe fallback productivo y las mediciones híbridas no lo justifican para el rango habitual de 14–15.

## Medición inicial del optimizador exacto

Medición del 2026-07-17 con Node `24.12.0`, pnpm `11.7.0`, Vitest `4.1.10`, Windows 11 Pro, AMD Ryzen 7 9800X3D de 8 núcleos/16 procesadores lógicos y 31,2 GiB de RAM. Cada benchmark usó 5 iteraciones de calentamiento como mínimo, presupuesto explícito de 250.000 estados y 20 muestras como mínimo.

| Caso                           | Participantes | Resultado           | Estados |    Memo | Profundidad | Transferencias | Greedy de referencia | Media después de warm-up |
| ------------------------------ | ------------: | ------------------- | ------: | ------: | ----------: | -------------: | -------------------: | -----------------------: |
| Representativo                 |            14 | exacto              |  35.377 |  35.377 |          10 |             10 |                   11 |                171,38 ms |
| Representativo con uno saldado |            15 | exacto              |  35.377 |  35.377 |          10 |             10 |                   11 |                182,23 ms |
| Representativo, todos activos  |            15 | exacto              |       1 |       1 |           0 |              8 |                    8 |                 0,007 ms |
| Muchas particiones             |            14 | exacto              |   1.343 |   1.343 |          10 |              8 |                   13 |                  5,85 ms |
| Adversarial, todos activos     |            15 | presupuesto agotado | 250.000 | 249.993 |          11 | no determinada |                   14 |              1.305,34 ms |

La medición demuestra que 14 o 15 participantes no determinan por sí solos el costo: la estructura de los saldos es decisiva. Este informe histórico quedó reemplazado por el optimizador híbrido y sus mediciones en `HYBRID_OPTIMIZER_REPORT.md`. No existe fallback productivo.

## Suite mínima de tests

- Un gasto, uno o varios pagadores y todos consumidores.
- Pagador fuera de consumidores.
- Varios gastos con subconjuntos superpuestos.
- Personas que llegan o se van entre gastos.
- División exacta y con remanente.
- Evento de referencia de A a F.
- Edición y eliminación lógica.
- Pago parcial.
- Sobrepago después de reabrir.
- Balances ya saldados.
- Múltiples soluciones óptimas y determinismo.
- Comparación del optimizador con búsqueda exhaustiva en casos pequeños generados.
- Invariantes con tests generativos/property-based si se incorpora una dependencia liviana aprobada.

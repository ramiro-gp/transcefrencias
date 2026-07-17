# Motor de cálculo financiero

## Objetivo

Calcular cuánto debe o recibe cada participante respetando la participación particular de cada gasto y proponer pocas transferencias para saldar el conjunto.

El motor debe ser puro, determinista, testeable y trabajar únicamente con enteros.

## Modelo conceptual

Para cada gasto:

- `amount`: importe entero, positivo y múltiplo de 500.
- `payerId`: participante que adelantó el dinero.
- `participantIds`: consumidores que comparten el gasto.

El pagador recibe crédito por el total abonado. Cada consumidor asume una cuota del gasto. El pagador solo asume cuota si también está incluido entre los consumidores.

## Reparto sin centavos

Sea un gasto de importe `A` entre `N` consumidores:

1. `base = floor(A / N)`
2. `remainder = A % N`
3. Cada consumidor recibe inicialmente `base`.
4. Se agrega $1 a exactamente `remainder` consumidores.

Aunque los gastos ingresados sean múltiplos de $500, las cuotas individuales pueden ser cualquier cantidad entera de pesos. No redondear cada cuota a $500 porque alteraría el total real del gasto.

La asignación del remanente debe ser determinista. Ordenar por un identificador estable antes de distribuirlo, nunca por el orden accidental de la interfaz.

Invariante obligatoria: la suma de cuotas debe ser exactamente igual al importe.

## Balance

Convención recomendada:

- balance positivo: debe recibir dinero;
- balance negativo: debe pagar;
- balance cero: está saldado.

Por cada gasto:

1. `balance[payerId] += amount`
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

Para el tamaño habitual del producto, buscar una solución con el mínimo exacto de transferencias mediante backtracking con poda y memoización sobre balances no nulos.

Requisitos:

- resultado determinista ante varias soluciones óptimas;
- no crear transferencias de $0;
- cada transferencia conecta un deudor con un acreedor;
- la suma transferida por cada persona salda exactamente su balance;
- considerar un fallback determinista de emparejamiento por mayor saldo si el problema supera un umbral medido de tiempo/estados, sin imponer límite de participantes al producto;
- documentar cuándo se usó el fallback.

No afirmar que un algoritmo voraz produce siempre el mínimo matemático. Debe medirse y probarse el optimizador exacto con casos de hasta aproximadamente 15 participantes, que es el uso habitual, sin codificar 15 como límite funcional.

## Movimientos informados

Los pagos/cobros opcionales son accesos de UX a un único movimiento del libro contable: un participante transfiere un importe a otro. No son mutaciones destructivas de los gastos ni confirmaciones obligatorias de transferencias sugeridas.

- Conservar el cálculo bruto derivado de gastos.
- Un movimiento puede ser informado por el origen, el destino, un administrador o un coadministrador. Se registra el autor y la acción desde la que fue informado.
- Un movimiento puede unir cualquier origen deudor pendiente con cualquier destino acreedor pendiente; no está limitado a una pareja propuesta por el optimizador.
- Su importe no puede superar `min(deuda pendiente total del origen, crédito pendiente total del destino)` al crearlo o editarlo.
- Después de crear, editar, anular o aplicar un movimiento, recalcular las transferencias optimizadas sobre los balances pendientes.
- Advertir sobre un posible duplicado cuando coincidan evento, origen, destino e importe dentro de una ventana temporal configurable. La advertencia no combina, confirma, bloquea ni elimina movimientos automáticamente.
- El creador puede editar o anular su movimiento; propietario, administradores y coadministradores pueden editar o anular cualquiera. La contraparte no puede modificarlo solo por ser contraparte.
- Los movimientos se anulan lógicamente y nunca se eliminan físicamente.
- Mostrar por separado `saldo original`, `movimientos registrados` y `saldo pendiente`.
- Un pago parcial reduce el saldo pendiente por su importe exacto.
- Reabrir y editar gastos recalcula el saldo original y conserva los movimientos, mostrando advertencias si generan sobrepago, inversión de saldo o inconsistencias. Nunca modifica movimientos retroactivamente.

## Suite mínima de tests

- Un gasto, un pagador y todos consumidores.
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

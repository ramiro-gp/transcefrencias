# Motor de cálculo financiero

## Objetivo

Calcular cuánto debe o recibe cada participante respetando la participación particular de cada gasto y proponer pocas transferencias para equilibrar el conjunto.

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
- balance cero: está equilibrado.

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

## Contratos implementados en Etapa 2

- `splitExpense`: valida y reparte un gasto.
- `calculateOriginalBalances`: reconstruye saldos y explicaciones por gasto.
- `optimizeTransfers`: selecciona solver de particiones o backtracking exacto e informa métricas o agotamiento de presupuesto.
- `solveTransfersByZeroSumPartitions`: expone el solver exacto separado con métricas detalladas y protecciones.

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
| Representativo con uno en cero |            15 | exacto              |  35.377 |  35.377 |          10 |             10 |                   11 |                182,23 ms |
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
- Balances ya equilibrados.
- Múltiples soluciones óptimas y determinismo.
- Comparación del optimizador con búsqueda exhaustiva en casos pequeños generados.
- Invariantes con tests generativos/property-based si se incorpora una dependencia liviana aprobada.

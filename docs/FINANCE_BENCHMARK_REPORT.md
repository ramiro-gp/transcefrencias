# Segunda medición del motor financiero

> Informe histórico del backtracking inicial. Sus recomendaciones fueron reemplazadas por el optimizador exacto híbrido y las mediciones de `HYBRID_OPTIMIZER_REPORT.md`.

## Alcance

Medición reproducible ejecutada el 2026-07-17 sin modificar el algoritmo financiero, sus contratos ni los tests funcionales. El comando completo y reanudable es:

```bash
pnpm benchmark:finance:corpus
```

`pnpm benchmark:finance:corpus:fresh` elimina checkpoints anteriores y reinicia. Los checkpoints se guardan en `.benchmark-results/`, están ignorados por Git y contienen lotes de cinco casos. Cada lote corre en un proceso separado para recuperar memoria al terminar.

Entorno de referencia: Node `24.12.0`, pnpm `11.7.0`, Vitest `4.1.10`, Windows 11 Pro, AMD Ryzen 7 9800X3D de 8 núcleos/16 procesadores lógicos y 31,2 GiB de RAM. Los tiempos son observaciones de este equipo, no límites deterministas ni mediciones de celular.

## Corpus

- 1.000 eventos realistas derivados mediante `calculateOriginalBalances` desde 17.176 gastos válidos.
- 500 eventos con 14 participantes y 500 con 15 participantes.
- 200 casos por perfil: `mixed`, `sparse-zero`, `dense-overlap`, `exact-components` y `repeated-balances`.
- 40 balances sintéticos separados: 10 `greedy-hard`, 10 `equal-balances`, 10 `partition-rich` y 10 `irreducible`.
- Total: 1.040 casos, 520 de cada tamaño, sin fallos.
- Gastos por evento realista: mínimo 6, mediana 11 y máximo 45.
- El pagador también consumió en 53,03 % de los gastos.
- 203 casos incluyeron saldos cero y 338 saldos no nulos repetidos.
- Subconjuntos propios de suma cero: 580 casos sin ninguno, 35 con 1–10 y 425 con más de 10; máximo observado 3.430.
- Seed base: `1592598566` (`0x5eed2026`).
- Seed realista: `(baseSeed + participantCount * 10000 + index * 7919) >>> 0`.

Los porcentajes describen este corpus estratificado. No deben interpretarse como distribución estadística de todos los eventos futuros.

## Presupuestos en eventos realistas

Los estados son deterministas. Cuando un caso completó exacto con un presupuesto menor, el resultado y el tiempo observado de esa ejecución se reutilizaron para presupuestos mayores porque el recorrido no cambia.

| Presupuesto | Exactos | Agotados | Estados mediana |     p90 |     p95 |     p99 |  Máximo | Tiempo mediana |  Tiempo p95 | Tiempo máximo |
| ----------: | ------: | -------: | --------------: | ------: | ------: | ------: | ------: | -------------: | ----------: | ------------: |
|      50.000 |  56,3 % |   43,7 % |          13.801 |  50.000 |  50.000 |  50.000 |  50.000 |       46,56 ms |   204,95 ms |     256,17 ms |
|     100.000 |  62,2 % |   37,8 % |          13.801 | 100.000 | 100.000 | 100.000 | 100.000 |       46,56 ms |   375,86 ms |     460,03 ms |
|     250.000 |  73,4 % |   26,6 % |          13.801 | 250.000 | 250.000 | 250.000 | 250.000 |       46,56 ms |   967,76 ms |   1.228,17 ms |
|     500.000 |  83,6 % |   16,4 % |          13.801 | 500.000 | 500.000 | 500.000 | 500.000 |       46,56 ms | 1.995,87 ms |   2.374,74 ms |

Estados requeridos solamente por los casos que sí demostraron el mínimo:

| Presupuesto | Mediana |     p90 |     p95 |     p99 |  Máximo |
| ----------: | ------: | ------: | ------: | ------: | ------: |
|      50.000 |       1 |  14.905 |  31.688 |  45.578 |  49.951 |
|     100.000 |       1 |  46.747 |  66.754 |  93.061 |  99.873 |
|     250.000 |       1 | 155.474 | 192.457 | 230.702 | 249.872 |
|     500.000 |   2.518 | 271.126 | 355.982 | 435.025 | 488.441 |

La profundidad máxima fue 11. Los perfiles con componentes exactos o saldos repetidos completaron 100 % en un estado. `mixed` y `dense-overlap` fueron los difíciles: con 500.000 estados completaron 58,5 % y 59,5 %, respectivamente. `sparse-zero` completó 73,5 % con 50.000, 91,5 % con 100.000 y 100 % con 500.000.

## Corpus sintético

Los 40 sintéticos completaron exacto antes de 50.000 estados. Mediana 303, p90 2.659, p95 7.739, p99 y máximo 25.018. Tiempo mediano 2,49 ms, p95 33,14 ms y máximo 107,36 ms. Este resultado no contradice el caso adversarial separado: el corpus sintético cubre categorías conocidas, pero no agota el espacio de balances difíciles.

## Calidad del greedy

Solo se compara donde el mínimo exacto quedó demostrado dentro de 500.000 estados.

| Corpus         | Exacto conocido | Coincide | Greedy peor | Diferencia media total | Media cuando pierde | Peor diferencia |
| -------------- | --------------: | -------: | ----------: | ---------------------: | ------------------: | --------------: |
| Realista       |             836 |  97,37 % |      2,63 % |                  0,026 |                   1 |               1 |
| Sintético      |              40 |     75 % |        25 % |                  1,125 |                 4,5 |               5 |
| Total conocido |             876 |  96,35 % |      3,65 % |                  0,076 |               2,094 |               5 |

En los 22 eventos realistas donde perdió, greedy agregó exactamente una transferencia. El peor sintético conocido requirió 8 transferencias exactas y greedy produjo 13. Los 164 realistas que no completaron con 500.000 estados no participan de esta comparación; por lo tanto, 97,37 % no es una garantía sobre todos los casos.

## Escalada adversarial

Caso de 15 participantes que ya había agotado 250.000 estados:

| Presupuesto | Resultado | Memoizados | Profundidad |      Tiempo |
| ----------: | --------- | ---------: | ----------: | ----------: |
|     500.000 | agotado   |    499.991 |          11 | 2.105,10 ms |
|   1.000.000 | agotado   |    999.990 |          11 | 4.507,87 ms |
|   2.000.000 | agotado   |  1.999.991 |          11 | 9.273,92 ms |

La escalada se detuvo en 2.000.000 según lo acordado. No se demostró el mínimo. Greedy devuelve 14 transferencias, pero su optimalidad es desconocida.

## Memoria y ejecución recuperable

- 208 procesos de cinco casos.
- RSS máximo por proceso: mediana 600,0 MB, p95 1.037,3 MB y máximo 1.167,6 MB.
- Crecimiento de RSS por proceso: mediana 532,7 MB, p95 970,3 MB y máximo 1.101,0 MB.
- Máximo determinista de estados memoizados en el corpus presupuestado: 499.996.

RSS incluye runtime, Vitest, JIT y memoria aún no recuperada por GC; no equivale al tamaño puro del memo. Sí confirma que mantener muchas búsquedas grandes en un único proceso es inapropiado. La primera ejecución monolítica no conservó código de salida ni crash dump de OOM; terminó bajo el límite externo de 15 minutos sin informe. Por lo tanto, la causa inmediata demostrable es el timeout externo, con presión de memoria acumulable como riesgo medido, no un OOM confirmado. La ejecución por lotes completó 1.000 realistas antes del timeout externo de 30 minutos y reanudó los 40 sintéticos sin repetir checkpoints.

## Alternativas exactas

### Backtracking actual

Conserva exactitud, reconstruye transferencias directamente y funciona muy bien cuando la cota greedy coincide con la inferior o existen cancelaciones evidentes. Su peor caso sigue siendo exponencial y 500.000 estados no resuelven 16,4 % del corpus realista.

### Web Worker

No reduce estados, tiempo total ni memoria. Evita bloquear React y permite cancelar o reemplazar un cálculo obsoleto. Es recomendable para la integración futura, pero no corrige la explosión combinatoria ni garantiza que un celular pueda sostener cientos de MB.

### Particiones de subconjuntos cero

Para `n` balances no nulos, el mínimo es `n - máximo número de grupos disjuntos de suma cero`. Precalcular sumas cuesta `O(n * 2^n)` y encontrar la mejor partición mediante submáscaras cuesta hasta `O(3^n)`, con memoria `O(2^n)`. Para 15 participantes hay 32.768 subconjuntos y el peor orden de 3^15 es aproximadamente 14,3 millones de combinaciones.

Esta formulación aporta una mejora concreta: 580 de 1.040 casos no tienen subconjunto propio de suma cero. Enumerar 32.768 subconjuntos puede demostrar inmediatamente que necesitan `n - 1` transferencias, mientras el adversarial actual superó 2 millones de estados. Todavía debe resolverse y medir la reconstrucción canónica de transferencias.

### Híbrido exacto

La opción más prometedora es un preanálisis de subconjuntos: resolver componentes cero evidentes, detectar el caso irreducible y elegir luego backtracking o DP de particiones según cantidad/densidad de subconjuntos cero. Mantiene determinismo y podría elevar mucho la tasa exacta antes del fallback. Cambiaría el algoritmo y exige una intervención y benchmark separados.

## Recomendaciones pendientes de aprobación

- Para el backtracking actual, 50.000 estados es el límite provisional más defendible en móvil: 100.000 solo agrega 5,9 puntos porcentuales de exactitud y casi duplica p95/costo potencial; 250.000 y 500.000 son demasiado costosos para ejecución interactiva.
- Aun con 50.000, el cálculo debe ejecutarse en Web Worker; en el equipo de referencia el máximo fue 256 ms. Usando un factor conservador no medido de 4–10× para un celular medio, el máximo estimado sería aproximadamente 1,0–2,6 s. Con 100.000 sería aproximadamente 1,8–4,6 s. Son estimaciones, no mediciones reales.
- Hace falta fallback para mantener disponibilidad: 43,7 % agota 50.000 y el adversarial agota 2 millones. Greedy mayor-deuda/mayor-crédito es contablemente correcto y suele igualar al exacto en los casos realistas resueltos, pero debe marcarse como no óptimo porque pierde hasta cinco transferencias en sintéticos.
- Antes de fijar definitivamente presupuesto y fallback, conviene medir un prototipo exacto híbrido con preanálisis de subconjuntos cero. No fue implementado en esta intervención.

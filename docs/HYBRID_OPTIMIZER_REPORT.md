# Optimizador exacto híbrido

## Demostración matemática

Sean `n` participantes con balance no nulo y suma total cero. Toda liquidación puede representarse como un grafo cuyos vértices son participantes y cuyas aristas son transferencias.

1. Cada componente conexa del grafo debe sumar cero: si no sumara cero, necesitaría flujo hacia otra componente y ambas estarían conectadas.
2. Por lo tanto, las componentes de cualquier liquidación forman una partición de los participantes en grupos disjuntos de suma cero.
3. Una componente con `m` vértices necesita al menos `m - 1` aristas para ser conexa.
4. Si una liquidación tiene `k` componentes, necesita al menos `Σ(m_i - 1) = n - k` transferencias.
5. Recíprocamente, cualquier grupo de suma cero puede liquidarse en como máximo `m - 1` transferencias: se emparejan determinísticamente un deudor y un acreedor por el mínimo de sus saldos absolutos; cada transferencia salda al menos un vértice.
6. Si se maximiza la cantidad `k` de grupos disjuntos de suma cero, cada grupo resultante es irreducible. Si tuviera un subconjunto propio de suma cero podría dividirse y aumentar `k`.
7. En un grupo irreducible la construcción anterior usa exactamente `m - 1`, porque usar menos contradiría la cota de conectividad.

En consecuencia, el mínimo matemático es `n - máximoNúmeroDeGruposCero`. Si no existe ningún subconjunto propio de suma cero, `k = 1` y el mínimo es directamente `n - 1`.

## Solver por particiones

`src/domain/finance/zero-sum-partition.ts`:

- elimina balances cero y ordena por `participantId` mediante comparación con `<` y `>`;
- representa subconjuntos con bitmasks para hasta 20 balances no nulos;
- precalcula las `2^n - 1` sumas en un `Float64Array`;
- indexa máscaras de suma cero por participante;
- fija en cada estado el participante de menor índice aún disponible;
- solo considera grupos cero que contienen ese participante;
- maximiza grupos mediante DP memoizada;
- conserva la primera máscara según orden lexicográfico de participantes para desempatar;
- reconstruye la partición y genera transferencias deterministas dentro de cada grupo;
- devuelve métricas de subconjuntos, estados, transiciones, profundidad y memoria estimada;
- admite presupuestos separados para subconjuntos, estados de partición y transiciones.

La capacidad de bitmask no es un límite funcional del evento. `optimizeTransfers` usa este solver hasta el umbral medido y conserva backtracking exacto para entradas mayores.

## Estrategia híbrida

- Hasta 15 balances no nulos: solver exacto por particiones.
- Más de 15 balances no nulos: backtracking exacto existente.
- `stateBudget` conserva su semántica pública de estados de búsqueda, no cuenta subconjuntos ni transiciones internas.
- Agotar un presupuesto devuelve `status: budget-exceeded` y nunca presenta greedy como exacto.
- No existe fallback productivo.

El umbral 15 no rechaza participantes ni eventos. Selecciona algoritmo según la cantidad de balances pendientes no nulos.

## Corpus de 1.040 casos

Entorno: Node `24.12.0`, Windows 11 Pro, AMD Ryzen 7 9800X3D y 31,2 GiB RAM. El corpus y seeds son los documentados en `FINANCE_BENCHMARK_REPORT.md`.

| Corpus    | Casos | Exactos | Agotados | Tiempo mediana |      p90 |      p95 |      p99 |   Máximo |
| --------- | ----: | ------: | -------: | -------------: | -------: | -------: | -------: | -------: |
| Realista  | 1.000 |   100 % |      0 % |        0,75 ms | 13,37 ms | 22,45 ms | 23,26 ms | 25,12 ms |
| Sintético |    40 |   100 % |      0 % |        1,29 ms | 18,00 ms | 21,63 ms | 25,17 ms | 25,17 ms |

Separación realista:

| Participantes | Casos | Exactos | Tiempo mediana |      p90 |      p95 |      p99 |   Máximo |
| ------------: | ----: | ------: | -------------: | -------: | -------: | -------: | -------: |
|            14 |   500 |   100 % |        0,64 ms | 22,45 ms | 22,85 ms | 23,45 ms | 25,12 ms |
|            15 |   500 |   100 % |        0,83 ms | 11,97 ms | 12,21 ms | 12,68 ms | 13,37 ms |

Trabajo determinista sobre los 1.040 casos:

| Métrica                     | Mediana |    p90 |    p95 |    p99 | Máximo |
| --------------------------- | ------: | -----: | -----: | -----: | -----: |
| Subconjuntos + transiciones |  32.767 | 63.571 | 63.571 | 63.571 | 63.571 |
| Subconjuntos evaluados      |  16.383 | 32.767 | 32.767 | 32.767 | 32.767 |
| Estados de partición        |       1 |  1.716 |  1.716 |  1.716 |  1.716 |
| Transiciones de partición   |       0 | 47.188 | 47.188 | 47.188 | 47.188 |

En 580 casos se aplicó la demostración directa de irreducibilidad. Memoria de trabajo estimada del solver: mediana 421.568 bytes, p95 y máximo 569.632 bytes. RSS total por proceso, incluyendo Node/Vitest/JIT: mediana 76,7 MB, p95 77,2 MB y máximo 78,0 MB.

## Adversarial anterior

El caso que agotó backtracking en 2.000.000 de estados fue resuelto en 1,01 ms:

- 32.767 subconjuntos;
- 13 subconjuntos cero;
- 7 estados de partición;
- 13 transiciones;
- mínimo exacto: 13 transferencias;
- greedy: 14 transferencias.

## Comparaciones

- Los 876 casos previamente demostrados por backtracking coincidieron 876/876 con el solver híbrido.
- En los 1.000 realistas ahora exactos, greedy coincidió en 972 (97,2 %).
- En los 28 restantes, greedy agregó exactamente una transferencia.
- En sintéticos, greedy coincidió 75 % y perdió hasta cinco transferencias.

## Escalado controlado

Cada tamaño usó tres estructuras: irreducible, saldos repetidos y muchas particiones. El solver por particiones tuvo 20.000.000 de transiciones como protección; backtracking tuvo 500.000 estados.

| No nulos | Caso        | Particiones             |       Tiempo | Backtracking           |   Tiempo |
| -------: | ----------- | ----------------------- | -----------: | ---------------------- | -------: |
|       14 | irreducible | exacto                  |      0,55 ms | exacto, 1.410 estados  | 11,43 ms |
|       14 | repetidos   | exacto                  |     21,75 ms | exacto, 1 estado       |  0,05 ms |
|       15 | irreducible | exacto                  |      0,68 ms | exacto, 863 estados    |  6,81 ms |
|       15 | repetidos   | exacto                  |      0,26 ms | exacto, 303 estados    |  1,61 ms |
|       16 | irreducible | exacto                  |      0,87 ms | exacto, 10.953 estados | 59,88 ms |
|       16 | repetidos   | exacto                  |    123,54 ms | exacto, 1 estado       |  0,08 ms |
|       18 | irreducible | exacto                  |      1,92 ms | exacto, 606 estados    |  8,20 ms |
|       18 | repetidos   | exacto                  |    997,23 ms | exacto, 1 estado       |  0,08 ms |
|       20 | irreducible | exacto                  |      5,30 ms | exacto, 1.744 estados  | 18,65 ms |
|       20 | repetidos   | agotó 20 M transiciones | 10.208,86 ms | exacto, 1 estado       |  0,11 ms |

Los casos con muchas particiones tardaron 4,29 ms a 14, 0,81 ms a 15, 20,01 ms a 16, 90,31 ms a 18 y 535,41 ms a 20. El caso repetido de 20 estimó 29,5 MB de trabajo antes de agotar el presupuesto.

## Conclusiones

- Umbral propuesto: 15 balances no nulos.
- Para 14–15, no se recomienda fallback: el corpus completo fue exacto con tiempo y memoria acotados.
- Para tamaños mayores se conserva backtracking exacto y `budget-exceeded`; no se rechazan eventos.
- Web Worker sigue siendo recomendable al integrar React para evitar bloquear un frame en celulares. Con un factor estimado, no medido, de 4–10×, el máximo habitual observado equivaldría aproximadamente a 100–251 ms en un celular medio.
- Presupuesto, fallback y estrategia para grupos mayores de 15 requieren mediciones adicionales si pasan a ser uso habitual.

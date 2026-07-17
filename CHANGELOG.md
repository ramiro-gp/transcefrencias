# Changelog

Todos los cambios relevantes de **transcefrencias** se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

## [0.2.0] - 2026-07-17

### Added

- Motor financiero puro con reparto exacto, balances explicables, movimientos agregados, optimizador exacto instrumentado y caso de referencia A-F.
- Tests generativos con `fast-check`, oracle independiente para casos pequeños y benchmark reproducible para 14–15 participantes.
- Segunda medición reproducible sobre 1.040 casos, con checkpoints reanudables, procesos aislados, comparación exacto/greedy y escalada adversarial hasta 2 millones de estados.
- Optimizador exacto híbrido con DP de subconjuntos cero para hasta 15 balances no nulos, reconstrucción determinista, detección irreducible y backtracking para tamaños mayores.
- Corpus híbrido 100 % exacto en 1.000 casos realistas y 40 sintéticos; adversarial anterior resuelto en 13 transferencias exactas.

### Changed

- Corregido el ejemplo financiero A-F para que todos los gastos sean múltiplos de $500.
- Aclarada la granularidad: solo los gastos son múltiplos de $500; cuotas, movimientos y sugerencias usan pesos enteros exactos.

## [0.1.0] - 2026-07-16

### Added

- Documentación inicial de producto, arquitectura, cálculo, diseño y roadmap.
- Base ejecutable con React, Vite, TypeScript, rutas, Tailwind CSS 4, PWA y pruebas.
- Layout terminal mobile-first, estado de conectividad y aviso explícito de actualización del service worker.
- Decisiones de movimientos, roles, participantes, invitaciones, estados, privacidad y dependencias bajo demanda.

### Changed

- Eliminada una dependencia de pruebas sin uso y documentadas las exclusiones versionadas de la política de antigüedad de paquetes.
- Corregida la composición responsive del contenido principal y de la página 404.

---
description: Audita una etapa de transcefrencias y propone un plan para aprobación.
agent: plan
---

Planificá la etapa `$ARGUMENTS` de **transcefrencias** sin modificar archivos.

1. Leé primero `AGENTS.md`; después `docs/ROADMAP.md`, `docs/MISSION.md`, `docs/PRODUCT_SPEC.md` y la documentación relacionada con la etapa. Si `$ARGUMENTS` está vacío o no identifica una etapa de forma inequívoca, detenete y preguntá.
2. Revisá `git status`, el diff existente y la implementación real. Preservá cambios ajenos o no relacionados.
3. Auditá el alcance y detectá contradicciones, dependencias, decisiones faltantes y diferencias entre documentación y código. Detenete ante decisiones de producto no documentadas, acciones destructivas, servicios remotos, cambios de coste o ampliaciones importantes del alcance.
4. Proponé alcance incluido y excluido, modelo de datos y RLS si corresponden, enfoque de implementación, riesgos, tests y criterios de salida. Aplicá seguridad rigurosa a autenticación, permisos, RLS y dinero.
5. Mantené la solución personal, gratuita y adecuada para grupos pequeños, compatible con los planes gratuitos de Supabase y Vercel. Evitá arquitectura empresarial, abstracciones prematuras, telemetría y optimizaciones sin evidencia.

No edites ni crees archivos, no instales dependencias y no hagas commit, push, deploy ni configuración remota. Terminá informando archivos modificados (debe ser ninguno), verificaciones realizadas, advertencias y estado Git, y solicitá aprobación explícita antes de construir.

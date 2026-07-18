---
description: Implementa una etapa aprobada de transcefrencias de extremo a extremo.
agent: build
---

Implementá exclusivamente la etapa `$ARGUMENTS` de **transcefrencias**.

1. Leé primero `AGENTS.md`; después `docs/ROADMAP.md`, `docs/MISSION.md`, `docs/PRODUCT_SPEC.md` y la documentación relacionada con la etapa. Si `$ARGUMENTS` está vacío o es ambiguo, detenete y preguntá.
2. Revisá `git status`, el diff existente y la implementación real. Preservá cambios ajenos o no relacionados; no los reviertas ni los incluyas en el alcance.
3. Confirmá que exista un plan aprobado en el contexto de trabajo y documentación suficiente. Si falta aprobación o una decisión de producto, datos, seguridad o UX, detenete y preguntá.
4. Implementá el plan aprobado de extremo a extremo y corregí defectos propios de esa implementación, sin adelantar etapas ni agregar funcionalidades. Priorizá simplicidad, mobile-first, accesibilidad y seguridad rigurosa en autenticación, permisos, RLS y dinero.
5. Conservá el alcance personal y gratuito para grupos pequeños y los planes gratuitos de Supabase y Vercel. Evitá arquitectura empresarial, abstracciones prematuras, telemetría y optimizaciones no demostradas.
6. Ejecutá verificaciones proporcionales al riesgo, incluidos tests de RLS o exactitud financiera cuando correspondan. Actualizá `CHANGELOG.md`, `docs/IMPLEMENTATION_LOG.md` y solo los documentos realmente afectados.

No aumentes la versión ni hagas commit, push, deploy o configuración de servicios remotos salvo instrucción expresa. No versiones secretos, `.env.local`, credenciales, tokens, temporales, `dist`, `coverage` ni `node_modules`. Detenete ante acciones destructivas, servicios remotos, cambios de coste o ampliaciones importantes del alcance.

Al terminar, informá archivos modificados, verificaciones y resultados, advertencias, estado Git e instrucciones concretas y breves para la revisión manual; luego detenete.

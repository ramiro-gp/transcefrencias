---
description: Cierra una etapa aprobada de transcefrencias con versión, commit y push.
agent: build
---

Cerrá la etapa `$ARGUMENTS` de **transcefrencias**. La invocación voluntaria de este comando confirma que la revisión humana ya fue aprobada y autoriza únicamente el commit y push descriptos aquí.

1. Leé primero `AGENTS.md`; después `docs/ROADMAP.md`, `docs/MISSION.md`, `docs/PRODUCT_SPEC.md`, `CHANGELOG.md`, `docs/IMPLEMENTATION_LOG.md` y la documentación relacionada con la etapa. Si `$ARGUMENTS` está vacío o es ambiguo, detenete y preguntá.
2. Revisá `git status`, la rama y upstream configurados, y el diff completo de la etapa. Preservá cambios ajenos o no relacionados; si no pueden separarse con seguridad, detenete y preguntá.
3. Auditá alcance, regresiones, seguridad, RLS, exactitud financiera, UX móvil, accesibilidad, documentación y migraciones según corresponda. No agregues funcionalidades ni adelantes etapas.
4. Ejecutá la suite final completa aplicable: como mínimo formato, lint, typecheck, tests, cobertura y build, más pruebas de base de datos, integración o finanzas requeridas por el riesgo. Si cualquier verificación falla, no hagas commit ni push.
5. Verificá que no se versionen secretos, `.env.local`, credenciales, tokens, temporales, `dist`, `coverage` ni `node_modules`, y que los archivos generados o sensibles estén ignorados correctamente.
6. Determiná el siguiente incremento SemVer según `AGENTS.md`, `CHANGELOG.md` y el alcance real. Si existe ambigüedad, detenete y preguntá antes de cambiar la versión. Actualizá la fuente de versión, `CHANGELOG.md`, `docs/IMPLEMENTATION_LOG.md` y los documentos de cierre realmente afectados.
7. Repetí las verificaciones afectadas por el cierre. Creá un único commit Conventional Commits con solo los cambios de la etapa y hacé push únicamente de la rama actual a su upstream y remoto ya configurados. No configures remotos ni hagas force-push.

Mantené el producto personal y gratuito para grupos pequeños, compatible con los planes gratuitos de Supabase y Vercel. Detenete ante decisiones no documentadas, acciones destructivas, servicios remotos adicionales, cambios de coste o ampliaciones importantes del alcance. No crees tags, releases ni deploys.

Informá versión final, tests y cobertura, archivos incluidos, commit, resultado del push, advertencias y `git status` final.

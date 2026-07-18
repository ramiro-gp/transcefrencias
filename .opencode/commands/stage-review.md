---
description: Revisa y corrige los cambios sin commit de una etapa de transcefrencias.
agent: build
---

Revisá los cambios sin commit de la etapa `$ARGUMENTS` de **transcefrencias**.

1. Leé primero `AGENTS.md`; después `docs/ROADMAP.md`, `docs/MISSION.md`, `docs/PRODUCT_SPEC.md` y la documentación relacionada con la etapa. Si `$ARGUMENTS` está vacío o es ambiguo, detenete y preguntá.
2. Revisá `git status`, el diff completo y la implementación real. Identificá y preservá cambios ajenos o no relacionados.
3. Priorizá defectos reales y regresiones: seguridad, autenticación, permisos, RLS, exactitud financiera, integridad e historial de datos, UX móvil, accesibilidad y estados de carga, error, vacío y éxito, según corresponda.
4. Ejecutá tests y verificaciones relevantes. Corregí solo defectos confirmados dentro del alcance de la etapa y agregá tests proporcionales al riesgo; no agregues funcionalidades ni adelantes etapas.
5. Verificá que la solución siga siendo simple, personal, gratuita para grupos pequeños y compatible con los planes gratuitos de Supabase y Vercel, sin telemetría, arquitectura empresarial, abstracciones u optimizaciones injustificadas.
6. Mantené actualizados `CHANGELOG.md`, `docs/IMPLEMENTATION_LOG.md` y solo los documentos realmente afectados.

No cambies la versión ni hagas commit, push, deploy o configuración remota. No versiones secretos, `.env.local`, credenciales, tokens, temporales, `dist`, `coverage` ni `node_modules`. Detenete ante decisiones no documentadas, acciones destructivas, servicios remotos, cambios de coste o ampliaciones importantes del alcance.

Entregá hallazgos por severidad, correcciones realizadas, archivos modificados, verificaciones, advertencias, estado Git y una lista breve de revisión manual para el usuario.

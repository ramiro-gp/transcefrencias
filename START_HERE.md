# Inicio del proyecto con OpenCode

## Preparación manual

1. Clona el repositorio vacío:

   ```bash
   git clone https://github.com/ramiro-gp/transcefrencias.git
   cd transcefrencias
   ```

2. Copia `AGENTS.md`, `CHANGELOG.md` y la carpeta `docs/` de este paquete en la raíz del repositorio.
3. Abre esa carpeta en Warp y ejecuta `opencode`.
4. Verifica que OpenCode leyó `AGENTS.md` antes de autorizar cambios.

## Primer prompt para OpenCode

```text
Estamos iniciando desde cero el repositorio público de transcefrencias.

Antes de escribir código:
1. Lee AGENTS.md y todos los archivos actuales de docs/.
2. Inspecciona el estado real del repositorio.
3. Resume con tus palabras el producto, las reglas financieras, el stack, los permisos, la estética y las restricciones.
4. Propone un plan por etapas basado en docs/ROADMAP.md.
5. Señala contradicciones, riesgos o datos faltantes.

En este primer paso no instales dependencias, no crees la aplicación, no hagas commits y no hagas push. Espera mi aprobación después de presentar el resumen y el plan.
```

## Segundo prompt sugerido

Usarlo solamente después de revisar y aprobar el plan:

```text
Implementa únicamente la Etapa 0 y la Etapa 1 definidas en docs/ROADMAP.md.

Respeta AGENTS.md. Usa pnpm, React, Vite, TypeScript estricto y Tailwind CSS 4. No conectes todavía un proyecto real de Supabase ni inventes credenciales. Deja .env.example seguro.

Antes de cambiar archivos, presenta el plan concreto de esta etapa y espera mi aprobación. Al finalizar ejecuta lint, typecheck, test y build, actualiza CHANGELOG.md y docs/IMPLEMENTATION_LOG.md, y muéstrame el resultado. No hagas commit ni push hasta que yo revise los cambios.
```

## Forma de trabajo recomendada

- Una etapa o feature acotada por prompt.
- Revisar el resumen y las capturas/preview antes de commitear.
- Autorizar el commit después de validar.
- Autorizar el push de manera separada cuando corresponda.
- No entregar todo el roadmap en un único prompt.

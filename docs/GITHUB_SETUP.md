# Preparación del repositorio público

La conexión GitHub actual permite leer la identidad de la cuenta y escribir archivos en repositorios autorizados, pero **no permite crear un repositorio nuevo** por sí sola.

1. Ir a https://github.com/new e indicar `pokemon-tcg-atlas`.
2. Visibilidad: **Public**. No guardar secretos, archivos de entorno ni datos de la base de datos.
3. Inicializar con `README.md` o dejar vacío; la publicación debe adaptarse a la rama que quede creada.
4. Entrar en https://github.com/settings/installations y otorgar al conector utilizado permiso para este repositorio (preferiblemente solo este).
5. Confirmar que el repositorio aparece en las herramientas GitHub de la conversación antes de cualquier subida.

## Propuesta de commits iniciales

- `chore(repo): initial Hatchable source snapshot`
- `refactor(core): separate store validation and presenter modules`
- `refactor(ui): extract scan progress component and styles`
- `test(api): add private diagnostics endpoint`
- `docs: document architecture security and contribution rules`

Para cambios posteriores, cada unidad funcional debe tener su commit; un cambio aislado en documentación no debe mezclar cambios de lógica. Los mensajes de despliegue de Hatchable no son commits de GitHub.

## Exclusiones de una publicación

- Nunca incluir claves, contraseñas, `.env`, cookies, exportaciones SQL con datos reales ni contenido privado de usuarios.
- No confundir migraciones del esquema (sí) con volcados de la base de datos (no).
- `AGENTS.md` de Hatchable es un manifiesto autogenerado y no forma parte del código necesario para ejecutar la aplicación.
- Mantener avisos/licencias de Leaflet, OpenStreetMap y datos geográficos según corresponda.

## Sincronización futura

Una actualización en Hatchable se versionará en GitHub **cuando** la integración tenga acceso al repositorio y se ejecute una operación explícita de sincronización. No existe sincronización continua o en segundo plano configurada en este proyecto.
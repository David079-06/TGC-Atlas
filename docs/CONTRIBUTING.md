# Cambios, revisiones y commits

## Convenciones

Usar [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/):

- `feat(discovery): ...` para funcionalidades nuevas.
- `fix(stores): ...` para errores.
- `refactor(core): ...` para reorganización sin cambios funcionales.
- `test(api): ...` para comprobaciones.
- `docs: ...` para documentación.
- `chore(deps): ...` para mantenimiento.
- `security: ...` para endurecimiento relevante.

Una tarea puede requerir varios commits pequeños en vez de uno monolítico. No etiquetar como `feat` un cambio puramente cosmético.

## Flujo de una entrega

1. Editar en una rama de trabajo o preparar el cambio en Hatchable.
2. Revisar que no aparecen secretos, claves API, datos personales, archivos `.env`, volcados SQL o copias de la base de datos.
3. Ejecutar comprobaciones sintácticas, `dry_run_deploy`, pruebas de rutas de usuario y de acceso público rechazado.
4. Probar el ciclo seleccionar país → resultados temporales → ficha → añadir → borrar, conservando los datos originales.
5. Preparar commits separados con título y alcance claros.
6. Publicar y verificar las rutas desplegadas antes de sincronizar GitHub.
7. Comparar el estado real del repositorio GitHub con el estado desplegado para evitar divergencias.

## Importante

Hatchable no sincroniza automáticamente los despliegues con GitHub mediante esta configuración. Para futuros commits automáticos debe existir un repositorio remoto, una conexión autorizada con permisos de escritura y un mecanismo de sincronización explícito. No se debe incluir una clave GitHub en código público.
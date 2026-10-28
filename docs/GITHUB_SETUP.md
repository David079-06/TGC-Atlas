# Preparación y sincronización GitHub

Repositorio público: https://github.com/David079-06/TGC-Atlas

La integración de GitHub dispone de acceso de escritura y se han publicado commits convencionales. **GitHub no es la fuente automática de despliegue**: el sitio operativo permanece en Hatchable.

## Flujo de actualizaciones
1. Modificar el proyecto Hatchable.
2. Revisar cambios, credenciales y privacidad.
3. Ejecutar `dry_run_deploy` y pruebas de API/frontend.
4. Publicar la versión en Hatchable y comprobarla.
5. Sincronizar los archivos afectados al repositorio con un commit convencional, sin sobrescribir trabajo remoto de terceros.
6. Confirmar el resultado del commit y la versión desplegada.

El repositorio es público pero la aplicación y su base de datos siguen privadas. No exportar datos de usuario, tokens ni respaldos SQL.

El historial utiliza `feat`, `fix`, `refactor`, `test`, `docs`, `chore` y `security` según la naturaleza del cambio.

Las futuras actualizaciones que realicemos en esta conversación pueden acompañarse de sus commits, pero **no hay sincronización automática continua** sin una integración adicional.

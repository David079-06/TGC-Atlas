# Pokémon TCG Atlas

Código fuente de una aplicación web privada para localizar y evaluar comercios relacionados con Pokémon TCG.

> La publicación del código no hace pública la aplicación ni sus datos. No es un censo mundial de tiendas y sus etiquetas no garantizan que una compra sea segura.

## Estructura

- `public/`: interfaz estática HTML, JavaScript y CSS.
- `api/`: endpoints Hatchable protegidos por permisos.
- `lib/`: reglas reutilizables, acceso a datos y servicios.
- `migrations/`: esquema PostgreSQL.
- `hatchable.toml`: configuración del despliegue y la tarea programada.
- `public/dev/`: documentación, seguridad y registro de cambios.

## Cómo funciona

1. Selección de país y planificación de áreas geográficas de investigación.
2. Descubrimiento temporal de tiendas y fuentes.
3. Verificación individual de la información disponible.
4. Clasificación cautelosa según evidencias independientes.
5. Guardado **solo cuando el usuario pulsa Añadir a Mis tiendas**.

Las búsquedas no prometen exhaustividad; el porcentaje mide la ronda de áreas planificada.

## Desarrollo

El proyecto se despliega con Hatchable sin compilación. El cambio debe superar validación, pruebas de rutas y comprobación del acceso privado. Consulta [ARCHITECTURE.md](./docs/ARCHITECTURE.md), [CONTRIBUTING.md](./docs/CONTRIBUTING.md) y [SECURITY.md](./docs/SECURITY.md).

## GitHub

Los commits seguirán Conventional Commits. Para publicar, crear primero un repositorio público y autorizar la conexión con GitHub. Los despliegues de Hatchable **no** sincronizan automáticamente sus archivos con GitHub; consultar [GITHUB_SETUP.md](./docs/GITHUB_SETUP.md).

Antes de un repositorio público se deben revisar dependencias vendorizadas y atribuciones cartográficas, y excluir datos operativos, credenciales y el manifiesto `AGENTS.md` autogenerado.
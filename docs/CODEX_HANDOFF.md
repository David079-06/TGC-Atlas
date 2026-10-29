# TCG Atlas — traslado del desarrollo a Codex

**Fecha de preparación:** 2026-10-29. **GitHub:** https://github.com/David079-06/TGC-Atlas

## Dónde está el encargo completo para Codex
- **`docs/CODEX_MASTER_PROMPT.md`:** prompt listo para pegar en Codex Cloud.
- **`docs/PRODUCT_REQUIREMENTS.md`:** todas las ideas y el orden acordado: tiendas, productos, inversión, reventa, preventas, fuentes y UX.
- **`docs/TOOLING_AND_PLUGINS.md`:** complementos conectados, alternativas gratuitas y herramientas de pruebas.
- **`AGENTS.md`:** normas que Codex debe aplicar al trabajar en el repositorio.
- **PR #1** `codex/cloudflare-free-migration`: prototipo de migración cerrado, *no* apto para producción.

## Lo que está preparado
- El repositorio del proyecto es accesible a Codex Cloud tras la conexión de GitHub.
- `AGENTS.md` contiene decisiones del producto, reglas de seguridad, costes y pruebas.
- `package.json` proporciona `npm run verify` sin dependencias externas.
- GitHub Actions ejecuta validación de sintaxis/activos y pruebas de verificación comercial.
- La aplicación de producción **sigue en Hatchable**; el código no se convierte automáticamente en una app Cloudflare.

## Pasos en Codex Cloud (usuario)
1. Abrir https://chatgpt.com/codex y elegir crear un entorno Cloud.
2. Autorizar GitHub si Codex lo solicita. La conexión de GitHub de este chat puede no ser la misma conexión que Codex Cloud.
3. Seleccionar **David079-06/TGC-Atlas**. No elegir un repositorio nuevo o vacío.
4. Usar Node 22; instalación: **no necesita instalación de paquetes** para las pruebas de la fase actual. Validación: `npm run verify`.
5. Revisar el entorno, guardarlo y publicarlo desde Codex Cloud; iniciar una tarea con el mensaje de `AGENTS.md`.
6. Trabajar con ramas y pull requests, **sin dar acceso a credenciales de Hatchable o de la base de datos de producción**.
7. Pegar el encargo de `docs/CODEX_MASTER_PROMPT.md` como primera tarea. Seleccionar `main` para leer toda la especificación; la rama de migración está separada.
8. Para Cloudflare, conectar el repositorio en la consola Cloudflare **solo cuando exista un adaptador funcional y protegido**.

## Estado de la migración
La migración es un proyecto aparte; no está terminada hasta demostrar:
- las rutas administrativas bloqueadas para visitantes, incluso en preview;
- equivalencia de registros y migraciones, con copia de seguridad protegida;
- resultados idénticos de etiquetas y fuentes en todas las fichas;
- búsqueda automática pausada y solo 2 candidatas de Perú;
- listas personales y datos privados intactos;
- panel y navegación utilizables en PC/móvil;
- cron y verificaciones dentro de cuotas gratuitas;
- pruebas repetibles y posibilidad de rollback a Hatchable.

## Complementos
**GitHub** y **Figma** ya están conectados en el chat. **Superpowers** se ha ofrecido como complemento opcional para TDD/depuración; **Context7** se ofreció anteriormente para documentación reciente. Ninguno es un requisito para ejecutar las pruebas. Para elegir otras herramientas y revisar sus cuotas consulta `docs/TOOLING_AND_PLUGINS.md`. No hay conexión Cloudflare directa disponible en este chat. No existe actualmente en este chat una conexión directa para desplegar en Cloudflare.

## Advertencias
- No incluir volcados reales de PostgreSQL en el repositorio público.
- `store_registry` contiene datos de tiendas guardadas por el propietario; consultar solo mediante autenticación.
- Evitar publicar la interfaz sin auth aunque no se muestren productos: los endpoints de administración también deben estar protegidos.
- Si falta algo para conectar Codex Cloud o Cloudflare, se requiere el permiso explícito del usuario desde la interfaz de cada servicio.

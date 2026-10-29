# Cloudflare staging (no desplegar aún)

Este directorio contiene **solo un prototipo de migración seguro por defecto**. No es una copia funcional de TCG Atlas y no debe sustituir Hatchable.

- Worker: `src/index.mjs`. `GET /__migration_health` expone únicamente el estado de migración, sin datos de tiendas; **todas** las demás rutas responden 503.
- Configuración: `wrangler.jsonc`. `workers_dev: false` evita generar automáticamente una URL pública accesible.
- `migrations/0001_initial.sql`: estructura D1/SQLite vacía; no contiene datos operativos.
- Pruebas sin librerías externas: `npm --prefix cloudflare test`.

**NO** crear un despliegue público ni conectar una base de datos productiva hasta cumplir los criterios de `../docs/CLOUDFLARE_MIGRATION.md`.

## Pruebas locales

En el repositorio:
```sh
npm --prefix cloudflare test
npm --prefix cloudflare run check
```

Para probar Wrangler en un entorno aislado **cuando el propietario tenga Cloudflare conectado**, se puede usar `npx wrangler dev --config cloudflare/wrangler.jsonc`. No es necesario para las pruebas estáticas y no requiere datos reales.

## Qué falta
1. Autenticación privada (p. ej. Cloudflare Access en producción; configurar y comprobar antes de habilitar `/api/*`).
2. D1 con migraciones de los módulos realmente utilizados y adaptadores para PostgreSQL/SQL.
3. Rutas de tiendas, fuentes, portfolio, catálogos y verificación con pruebas de paridad.
4. Procesos cron bajo cuotas Free; no usar GitHub Actions para almacenar credenciales en código.
5. Copia de datos segura, rollback y decisión explícita de cambiar producción.

Ningún script de este directorio crea cuentas, contrata planes ni ejecuta despliegues.

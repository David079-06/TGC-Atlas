# Registro de versiones

## v70 — refactorización de arquitectura (preparada)

- Separación de validación de URLs/comercios, SQL/presentación de tiendas y métricas de investigación.
- Panel de escaneo extraído del controlador principal, con sus estilos propios.
- Retirada de parte del código de verificación de conectores que ya no era utilizado.
- Diagnóstico interno de salud con acceso restringido y sin datos personales.
- Documentación del proyecto, seguridad y convenciones de commits.

## v69 — cobertura geográfica

- Planificación de regiones y localidades; resultados temporales separados del directorio.
- Porcentajes referidos a la ronda de escaneo, no al total de tiendas del país.
- Comprobación individual y registro de errores.
- Directorio vacío para pruebas desde cero.
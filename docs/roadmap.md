# Roadmap

## Prioridad inmediata

### 1. Cerrar validacion end-to-end Guardian

- publicar fixtures oficiales compartidos entre firmware y backend
- probar uplinks reales sobre `dev/{deviceId}/uplink`
- validar replay, nonce mismatch y payload truncado en entorno integrado

### 2. Endurecer configuracion y secretos

- sacar defaults sensibles de archivos versionados
- definir estrategia de secretos para local, WSL y homelab
- conectar `CORS_ORIGIN` al runtime real

### 3. Consolidar stack backend + frontend

- validar `docker-compose.wsl.yml` con el repo frontend real
- comprobar `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` y compatibilidad COP
- documentar un smoke test reproducible para demo y regression checks

### 4. Operacionalizar external sources

- agregar scheduling controlado
- exponer mejor estado de ultima sincronizacion, error y retry
- definir TTL y refresh por dataset

## Prioridad posterior

- cerrar bounded contexts hoy importados pero aun no operativos como producto
- decidir si Guardian E2E seguira por clave de flota o por clave por dispositivo
- revisar si algunos modulos merecen extraerse del monolito por carga o por ownership

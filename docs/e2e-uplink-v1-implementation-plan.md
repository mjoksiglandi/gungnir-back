# Plan de Implementacion: Guardian E2E Uplink V1

## Contexto

Este plan toma como fuente el RFC [`RFC_E2E_UPLINK_V1.md`](C:\Users\juan.cornejo\Documents\PlatformIO\Projects\Guardian V2\docs\RFC_E2E_UPLINK_V1.md) y contrasta ese contrato con el estado actual de:

- Backend NestJS en `C:\Users\juan.cornejo\Documents\gugnir back`
- Firmware PlatformIO en `C:\Users\juan.cornejo\Documents\PlatformIO\Projects\Guardian V2`

## Resumen del gap actual

### Firmware

El firmware ya implementa AES-256-GCM, secuencia monotona persistida y derivacion de nonce compatibles con el RFC, pero todavia no cumple el contrato completo de transporte ni de payload:

- El plaintext actual usa `PlaintextV1` acoplado a struct interno en [include/e2e_crypto.h](C:\Users\juan.cornejo\Documents\PlatformIO\Projects\Guardian V2\include\e2e_crypto.h:15).
- El AAD actual usa `channel` compacto de un caracter (`g` / `i`) en vez de `gsm` / `iridium`, segun [src/e2e_crypto.cpp](C:\Users\juan.cornejo\Documents\PlatformIO\Projects\Guardian V2\src\e2e_crypto.cpp:188).
- El envelope JSON actual usa campos abreviados (`i`, `s`, `e`, `v`, `q`, `n`, `c`, `g`) en vez de `type`, `schema`, `device_id`, `channel`, `sent_at_utc`, `e2e.*`, segun [src/modem_manager.cpp](C:\Users\juan.cornejo\Documents\PlatformIO\Projects\Guardian V2\src\modem_manager.cpp:608).
- El payload Iridium actual tambien usa formato compacto legacy, segun [src/modem_manager.cpp](C:\Users\juan.cornejo\Documents\PlatformIO\Projects\Guardian V2\src\modem_manager.cpp:644).
- El plaintext sigue usando timestamp compacto `YYMMDDhhmmss` en vez de `fix_time_unix`, segun [src/modem_manager.cpp](C:\Users\juan.cornejo\Documents\PlatformIO\Projects\Guardian V2\src\modem_manager.cpp:600).

### Backend

El backend actual no consume el contrato E2E del RFC. Hoy espera JSON ya normalizado en otro topico y sin desencriptado:

- Se suscribe a `telemetry/+/state`, `cmd/+/response` y `device/+/status` en [src/infrastructure/mqtt/mqtt.service.ts](C:\Users\juan.cornejo\Documents\gugnir back\src\infrastructure\mqtt\mqtt.service.ts:26).
- Emite `mqtt.telemetry.state` para payloads `telemetry/*`, segun [src/infrastructure/mqtt/mqtt.service.ts](C:\Users\juan.cornejo\Documents\gugnir back\src\infrastructure\mqtt\mqtt.service.ts:33).
- `TelemetryService` espera `deviceId`, `timestamp`, `source`, `lat`, `lon` y campos ya parseados, segun [src/modules/telemetry/telemetry.service.ts](C:\Users\juan.cornejo\Documents\gugnir back\src\modules\telemetry\telemetry.service.ts:157).

## Decision de orquestacion

### Lead

- `Agents Orchestrator`: coordina el rollout por fases y mantiene el gate de compatibilidad entre firmware, MQTT y persistencia.

### Skills de apoyo

- `Backend Architect`: parser, decrypt pipeline, anti-replay, persistencia y observabilidad.
- `Embedded Firmware Engineer`: packed payload V1, envelope RFC, normalizacion de `channel` y compatibilidad Iridium.
- `API Tester`: fixtures cruzados firmware-backend, replay tests, vectors crypto y validacion end-to-end.

## Estrategia de implementacion

La ruta mas segura es implementar primero compatibilidad en backend y luego migrar firmware, para evitar una ventana donde los dispositivos publiquen mensajes que el servidor todavia no entiende.

### Fase 0: Cerrar decisiones pendientes del RFC

Bloqueos funcionales a confirmar antes de codear:

- Definir si la key E2E sera por dispositivo o por flota.
- Definir almacenamiento de `max_seq_accepted` por `device_id`.
- Confirmar si `sent_at_utc` sera requerido o solo recomendado.
- Confirmar semantica de ausencia para `battery_mv_div10`, `sat_count`, `hdop_x10`.
- Confirmar si Iridium usara el mismo envelope JSON del RFC o mantendra un sobre alternativo solo para transporte satelital.

Resultado esperado:

- Decision record corto en `docs/` con los valores elegidos.

### Fase 1: Backend preparado para RFC V1

Objetivo:

- Aceptar y validar `guardian.uplink.e2e` sin romper la ingesta legacy actual.

Trabajo:

- Extender el subscriber MQTT para escuchar `dev/+/uplink` ademas de `telemetry/+/state`.
- Introducir un router de mensajes entrantes:
  - ruta legacy `telemetry/*`
  - ruta E2E `guardian.uplink.e2e`
- Crear esquema DTO para envelope RFC:
  - `type`
  - `schema`
  - `device_id`
  - `channel`
  - `sent_at_utc`
  - `e2e.alg`
  - `e2e.version`
  - `e2e.seq`
  - `e2e.nonce`
  - `e2e.ciphertext`
  - `e2e.tag`
- Implementar modulo de crypto backend:
  - parse hex
  - FNV-1a 32-bit
  - recomposicion de nonce
  - construccion exacta de AAD
  - AES-256-GCM decrypt
- Implementar parser de payload binario V1 de 32 bytes con offsets fijos little-endian.
- Mapear payload V1 al `TelemetryIngestDto` actual.
- Persistir `max_seq_accepted` por `device_id`.
- Rechazar `schema` y `e2e.version` desconocidos.
- Agregar logs estructurados de observabilidad sin plaintext completo.

Entregables:

- Nuevo servicio `guardian-uplink-e2e` en backend.
- Tests unitarios para schema, nonce, AAD, decrypt y payload parser.
- Tests de replay y duplicate rejection.

### Fase 2: Compatibilidad de datos y persistencia

Objetivo:

- Guardar anti-replay y trazabilidad sin degradar el modelo actual de telemetria.

Trabajo:

- Agregar tabla o columnas para estado E2E por dispositivo:
  - `device_id`
  - `max_seq_accepted`
  - `last_valid_received_at`
  - metadatos opcionales del ultimo mensaje
- Evaluar si `raw_payload` actual basta para auditoria o si hace falta una tabla de ingesta cruda.
- Guardar metadatos E2E en `raw_payload` o estructura dedicada:
  - `schema`
  - `channel`
  - `seq`
  - `payload_version`
  - estado de validacion

Entregables:

- Migracion Drizzle.
- Acceso transaccional que garantice chequeo `seq > max_seq_accepted`.

### Fase 3: Firmware alineado al RFC

Objetivo:

- Emitir envelopes y plaintext exactamente compatibles con el backend RFC V1.

Trabajo:

- Reemplazar `PlaintextV1` por una estructura packed de 32 bytes o un serializer manual por offsets.
- Agregar `payload_version` en offset `0`.
- Cambiar `speedKt` y `headingDeg` a las unidades del RFC:
  - `speed_kn_x10`
  - `heading_deg`
- Reemplazar `utcCompact` por `fix_time_unix`.
- Agregar `flags`, `sat_count`, `hdop_x10`, `battery_mv_div10`, `reserved`.
- Normalizar `channel` a `gsm` / `iridium` para AAD y envelope externo.
- Cambiar envelope JSON a:
  - `type: guardian.uplink.e2e`
  - `schema: guardian.e2e.v1`
  - `device_id`
  - `channel`
  - `sent_at_utc`
  - `e2e.alg`
  - `e2e.version`
  - `e2e.seq`
  - `e2e.nonce`
  - `e2e.ciphertext`
  - `e2e.tag`
- Revisar estrategia Iridium:
  - si cabe el JSON completo, unificar formato
  - si no cabe, documentar y versionar un envelope satelital separado

Entregables:

- Serializer binario V1 en firmware.
- Vectores de prueba reproducibles desde firmware.
- Logging local de `seq`, `nonce`, `payload_version` y tamanos.

### Fase 4: Validacion cruzada E2E

Objetivo:

- Demostrar interoperabilidad real entre ambos repositorios.

Trabajo:

- Crear fixtures oficiales:
  - plaintext binario V1 conocido
  - key conocida
  - `device_id`, `channel`, `seq`, `nonce`, `aad`, `ciphertext`, `tag`
- Validar que firmware y backend produzcan y consuman exactamente los mismos vectores.
- Agregar tests de:
  - replay
  - nonce mismatch
  - AAD mismatch
  - `schema` desconocido
  - `e2e.version` desconocido
  - `payload_version` desconocido
  - payload truncado
  - hex invalido

Entregables:

- Suite de compatibilidad cruzada.
- Checklist de salida a campo.

## Orden recomendado de ejecucion

1. Cerrar decisiones pendientes del RFC.
2. Implementar parser E2E y anti-replay en backend.
3. Agregar migracion de persistencia para `max_seq_accepted`.
4. Crear fixtures oficiales y tests cruzados.
5. Migrar firmware al payload binario V1 y envelope RFC.
6. Habilitar rollout controlado en ambiente de prueba.
7. Retirar compatibilidad legacy cuando haya confirmacion de campo.

## Backlog inicial

### Backend

- Crear `guardian-uplink-e2e.schema.ts` con validacion Zod del envelope RFC.
- Crear `guardian-uplink-e2e.crypto.ts` con `fnv1a32`, `buildNonceV1`, `buildAadV1`, `decryptAes256Gcm`.
- Crear `guardian-uplink-e2e.payload-v1.ts` con parser binario de 32 bytes.
- Crear `guardian-uplink-e2e.service.ts` para orquestar validacion, decrypt, anti-replay e ingest.
- Extender `MqttService` para suscribirse a `dev/+/uplink`.
- Crear migracion Drizzle para estado anti-replay.
- Agregar tests unitarios y de integracion.

### Firmware

- Crear serializer manual `payload_v1`.
- Adaptar `buildEncryptedJson`.
- Adaptar `buildEncryptedIridium` o definir su reemplazo RFC.
- Cambiar `buildAad` a texto completo `gsm` / `iridium`.
- Introducir conversion a `fix_time_unix`.
- Mapear flags y campos opcionales con defaults seguros.
- Agregar tests de tamaño fijo y offsets.

## Riesgos principales

- Iridium puede no tolerar el JSON RFC completo dentro del limite practico del payload.
- La validacion anti-replay requiere persistencia atomica para evitar carreras.
- `sent_at_utc` y `fix_time_unix` pueden divergir si el firmware no tiene reloj confiable.
- El cambio de topico MQTT puede romper dashboards o integraciones que dependan del topico legacy.
- Si el backend actualiza `max_seq_accepted` antes de completar el ingest, puede descartar retries legitimos tras fallos parciales.

## Criterios de salida por fase

### Backend listo

- El backend acepta un fixture RFC valido y genera una fila de telemetria correcta.
- El mismo mensaje repetido es rechazado por replay.
- Un `nonce` incorrecto o `tag` incorrecto falla de manera observable.

### Firmware listo

- El firmware emite plaintext de exactamente 32 bytes.
- El envelope JSON coincide byte a byte con el contrato esperado.
- Backend y firmware comparten un vector de prueba exitoso.

### Integracion lista

- Un dispositivo de prueba publica por MQTT y el backend persiste la telemetria sin adaptadores manuales.
- El fallback satelital queda validado o explicitamente diferido en un RFC complementario.

## Siguiente iteracion recomendada

La siguiente tarea de implementacion deberia enfocarse en backend primero:

1. Suscripcion a `dev/+/uplink`.
2. DTO/schema RFC V1.
3. Decrypt pipeline AES-256-GCM.
4. Parser binario V1.
5. Anti-replay persistido.

Con eso listo, el firmware puede migrar contra un receptor ya preparado y con tests de compatibilidad listos.

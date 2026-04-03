# Auditoría: Datasheet → `fortigate_specs` + dimensionamiento FortiGate

## 1. Columnas reales en `Datasheet` (modelo Sequelize)

| Columna | Uso |
|---------|-----|
| `id` | PK |
| `UNIT` | Identidad comercial del modelo (obligatorio en tabla) |
| `SKU` | Código recomendado en salida del sizing (obligatorio en tabla) |
| `Firewall_Throughput_UDP` | Throughput |
| `IPSec_VPN_Throughput` | Throughput |
| `IPS_Throughput_Enterprise_Mix` | Throughput |
| `NGFW_Throughput_Enterprise_Mix` | Throughput |
| `Threat_Protection_Throughput` | Throughput |
| `Firewall_Latency` | Informativo (no usado en `evaluateModel` hoy) |
| `Concurrent_Sessions` | Límite numérico (sesiones) |
| `New_Sessions_Per_Second` | Límite numérico |
| `Firewall_Policies` | No usado en sizing |
| `Max_Gateway_To_Gateway_IPSec_Tunnels` | Límite túneles |
| `Max_Client_To_Gateway_IPSec_Tunnels` | No usado en sizing |
| `SSL_VPN_Throughput` | Throughput |
| `Concurrent_SSL_VPN_Users` | Límite usuarios |
| `SSL_Inspection_Throughput` | Throughput |
| `Application_Control_Throughput` | Derivado vía `capacities` (no entra en checks directos salvo ngfw path) |
| `Max_FortiAPs` … `Variants` | No usados en el motor de sizing actual |
| timestamps | Auditoría |

**Nota arquitectónica:** En el catálogo nuevo, **UNIT / SKU** viven en `product_models` (`unit`, `sku_base`); las métricas técnicas van en `fortigate_specs` (`product_model_id` único). El motor sigue recibiendo **una fila “legacy”** con claves PascalCase (`UNIT`, `SKU`, …) generada por `mapFortigateSpecToLegacyEvalRow`.

---

## 2. Archivos que hoy tocan `Datasheet` en el flujo FortiGate

| Archivo | Rol |
|---------|-----|
| `Backend/src/services/fortigate/fortigateCatalog.read.service.js` | **Fallback** si `fortigate_specs` está vacío: `Datasheet.findAll` + `isFortigateUnitOrSkuRow` |
| `Backend/src/services/Datasheet.service.js` | Carga Excel; filas no-FG a `Datasheet`; `getDatasheetByUnit` → SP o catálogo |
| `Backend/src/models/Datasheet.model.js` | Definición ORM |
| Otros (agente, comparación, columnas) | `DatasheetService`, `columnasAgente`, etc. — **no** son el loop de sizing |

**Flujo de sizing (orquestación):**

- `Backend/src/services/fortigate/fortigate.flow.js` → obtiene candidatos y llama `evaluateModel` / `buildRecommendedOnly`.
- `Backend/src/services/fortigate/fortigate.engine.js` → `evaluateModel(modelRow, answers, headroom)` — **único consumidor estructural de métricas**.

---

## 3. Columnas que consulta `evaluateModel` (obligatoriedad lógica)

El objeto `modelRow` debe exponer **exactamente** estas propiedades **PascalCase** (como en Datasheet):

| Propiedad | Uso en motor |
|-----------|----------------|
| `UNIT` | Identificación / logs / mensaje final |
| `SKU` | Mensaje “código recomendado” |
| `Firewall_Throughput_UDP` | Perfil `firewall` |
| `IPS_Throughput_Enterprise_Mix` | Perfil `ips` |
| `NGFW_Throughput_Enterprise_Mix` | Perfil `ngfw` |
| `Threat_Protection_Throughput` | Perfil `threat` |
| `IPSec_VPN_Throughput` | VPN IPsec / both |
| `SSL_VPN_Throughput` | SSL-VPN / both |
| `SSL_Inspection_Throughput` | Inspección SSL |
| `Application_Control_Throughput` | Objeto `capacities` (coherencia con perfiles) |
| `Concurrent_Sessions` | Check sesiones (o skip si null) |
| `New_Sessions_Per_Second` | Check NPS (o skip si null) |
| `Max_Gateway_To_Gateway_IPSec_Tunnels` | Check túneles (o skip si null) |
| `Concurrent_SSL_VPN_Users` | Check usuarios SSL-VPN (o skip si null) |
| `Virtual_Domains` | Check VDOMs (o skip si null) |

**Ninguna es obligatoria en BD** en el sentido de NOT NULL: si falta un dato, el motor **omite el check** (`skipped: true`) o marca **issue** según el caso (p. ej. throughput IPsec requerido por respuestas y ausente → fallo).

Para **mismo resultado recomendado** que con Datasheet, los valores numéricos/throughput deben ser **idénticos** en la fila legacy mapeada desde `fortigate_specs`.

---

## 4. Funciones que dependen de esos datos

- `parseThroughputToMbps` / `parseSessions` — interpretan strings tipo datasheet.
- `getProfileField` — elige columna de throughput según perfil.
- `computeNeededMbps`, `getIpsecRequiredMbps`, etc. — no leen BD; solo `modelRow`.
- `buildRecommendedOnly` — ordena por `sortCapacity` (throughput del perfil elegido).

---

## 5. Equivalencia `Datasheet` ↔ `fortigate_specs`

Definido en `fortigateSpecRowMap.js` (`pascalDatasheetRowToFortigateSpecColumns` / `mapFortigateSpecToLegacyEvalRow`). La tabla `fortigate_specs` ya cubre **todas** las columnas técnicas de Datasheet listadas arriba (salvo identidad, en `product_models`).

---

## 6. Migración de datos

- Script principal: `Backend/Docs/sql/migrations/20260311_migrate_datasheet_fortigate_to_catalog.sql`
- Crea/actualiza `product_models` y hace upsert en `fortigate_specs` por `product_model_id`.
- **No borra** `Datasheet`.

---

## 7. Capa de lectura para sizing

- `getFortiGateSpecs()` — pares `{ productModel, fortigateSpec }` (catálogo).
- `getFortiGateCandidates()` — filas legacy listas para `evaluateModel`.
- Prioridad: **catálogo**; si no hay filas, **fallback temporal** a `Datasheet` (salvo `FORTIGATE_SIZING_STRICT_CATALOG_ONLY=true`).

---

## 8. Validación comparativa (recomendado)

1. Antes de migrar: exportar lista de `(UNIT, SKU)` “ganadores” para N escenarios fijos (script manual o captura).
2. Ejecutar migración SQL.
3. Con `FORTIGATE_SIZING_STRICT_CATALOG_ONLY=true`, repetir mismos escenarios; el modelo recomendado (UNIT/SKU) debería coincidir si los datos migrados son los mismos representantes por UNIT (`MAX(id)` en script).

---

## 9. Patrón para el resto de tablas `*_specs`

- **Una fila por modelo** vía `product_model_id` (único por solución).
- **Columnas propias** de la solución (no copiar FortiGate a FortiAP).
- **Catálogo:** `product_models` + `solutions.code` / `solution_type`.
- **Ingest:** PDF/Excel/ETL escriben en la tabla `*_specs` correspondiente.
- **Dimensionamiento / agente:** servicio de lectura que mapea a la forma que consuma el motor (si aplica).

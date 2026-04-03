# Campos que usa el motor de dimensionamiento FortiGate

`evaluateModel()` en `fortigate.engine.js` lee **solo** las propiedades **PascalCase** de cada fila candidata (hoy mapeadas desde `fortigate_specs` + `product_models`).

## Identificación / salida al usuario

| Campo legacy | Uso |
|--------------|-----|
| `UNIT` | Filtro visual, mensaje de recomendación |
| `SKU` | Código recomendado en el mensaje final |

## Throughputs (texto → Mbps vía `parseThroughputToMbps`)

| Campo legacy | Uso en motor |
|--------------|----------------|
| `Firewall_Throughput_UDP` | Perfil **firewall** |
| `IPS_Throughput_Enterprise_Mix` | Perfil **ips** |
| `NGFW_Throughput_Enterprise_Mix` | Perfil **ngfw** (default si falta mapa) |
| `Threat_Protection_Throughput` | Perfil **threat** |
| `IPSec_VPN_Throughput` | VPN IPsec / both |
| `SSL_VPN_Throughput` | VPN SSL / both |
| `SSL_Inspection_Throughput` | SSL inspection yes/unknown |
| `Application_Control_Throughput` | Incluido en objeto `capacities` (coherencia futura) |

## Conteos numéricos (`parseSessions`)

| Campo legacy | Uso |
|--------------|-----|
| `Concurrent_Sessions` | Check vs usuarios estimados |
| `New_Sessions_Per_Second` | Check vs tráfico |
| `Max_Gateway_To_Gateway_IPSec_Tunnels` | Túneles IPsec |
| `Concurrent_SSL_VPN_Users` | Usuarios SSL-VPN |
| `Virtual_Domains` | VDOMs |

## No usados directamente por el motor (sí en catálogo / UI / futuro)

`Firewall_Latency`, `Firewall_Policies`, `Max_Client_To_Gateway_IPSec_Tunnels`, `Max_FortiAPs`, `Max_FortiSwitches`, `Max_FortiTokens`, `Interfaces`, `Local_Storage`, `Power_Supplies`, `Form_Factor`, `Variants` — se migran a `fortigate_specs` para paridad con Datasheet y otros flujos.

## Mapeo a `fortigate_specs` (snake_case)

Ver `mapFortigateSpecToLegacyEvalRow` / `pascalDatasheetRowToFortigateSpecColumns` en `fortigateSpecsSizing.service.js`.

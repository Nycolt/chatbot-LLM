# Carga Product Matrix Fortinet (PDF)

## FortiGate – Datasheet

Archivo: **`Fortinet_Product_Matrix_FortiGate_Datasheet.sql`**

- Inserta modelos FortiGate del PDF *Fortinet_Product_Matrix* (Feb 2026) en la tabla **`Datasheet`**.
- Campos alineados con el motor de dimensionamiento actual (throughput, sesiones, VPN, VDOMs, etc.).

**Ejecutar en MySQL (chat_db):**

```bash
# Desde Docker (contenedor mysql_db)
Get-Content "Backend\Docs\sql\Fortinet_Product_Matrix_FortiGate_Datasheet.sql" -Raw | docker exec -i mysql_db mysql -u chat_user -p12345 chat_db
```

O importar el archivo desde phpMyAdmin en la base `chat_db`.

---

## Otras soluciones – Matriz y criterios para motores

Resumen extraído del PDF para definir los motores de decisión (preguntas + rangos).

### FortiAnalyzer (FAZ)

| Modelo    | GB Logs/Día | Analytic (logs/s) | Collector (logs/s) |
|-----------|-------------|-------------------|---------------------|
| FAZ-150G  | 25          | 500               | 750                 |
| FAZ-300G  | 100         | 2,000             | 3,000               |
| FAZ-810G  | 200         | 4,000             | 6,000               |
| FAZ-1000G | 660         | 20,000            | 30,000              |
| FAZ-3100G | 3,000       | 42,000            | 60,000              |
| FAZ-3510G | 5,000       | 60,000            | 90,000              |
| FAZ-3700G | 8,300       | 100,000           | 150,000             |
| FAZ-VM    | 1 a 2,000   | —                 | —                   |

**Motor sugerido:** Preguntar volumen de logs (GB/día o logs/s) y número de dispositivos/fuentes; comparar con Analytic/Collector y GB Logs/Día.

---

### FortiManager (FMG)

| Modelo   | Devices/VDOMs (Max) | Sustained Log Rates | GB/Day |
|----------|----------------------|---------------------|--------|
| FMG-200G | 30                   | 50                  | 2      |
| FMG-410G | 150                  | 50                  | 2      |
| FMG-1000G| 1,000                | 50                  | 2      |
| FMG-3100G| 4,000+               | 150                 | 10     |
| FMG-3700G| 10,000+              | 150                 | 10     |
| FMG-VM   | 10 to Unlimited      | Hardware dependent  | 1-50   |

**Motor sugerido:** Preguntar cantidad de dispositivos (y opcionalmente VDOMs); elegir el modelo que cumpla Devices/VDOMs (y log rate si aplica).

---

### FortiSwitch (FSW)

| Serie    | Main Port Speed | Main Port Count | Uplink   | PoE     |
|----------|-----------------|-----------------|----------|---------|
| 100      | 1 Gbps          | 8, 24, 48       | 1 or 10 Gbps | • |
| 200      | 1 Gbps          | 24, 48          | 1 Gbps   | •       |
| 400      | 1 Gbps          | 24, 48          | 10 Gbps  | •       |
| 500      | 1 Gbps          | 24, 48          | 10 Gbps  | •       |
| 600      | 2.5/5 Gbps      | 24, 48          | 25 Gbps  | •       |
| 1000     | 10 Gbps         | 24, 48          | 40/100 Gbps | • |
| 2048F/B2F| 25 Gbps         | 48              | 100 Gbps | —       |
| 3032G    | 40/100 Gbps     | 32              | n/a      | —       |

**Motor sugerido:** Preguntar número de puertos, necesidad de PoE, velocidad de acceso (1G/2.5G/10G) y uplink; mapear a serie/modelo.

---

### FortiMail (FML)

| Modelo   | Email Routing (Msg/Hr) | Enterprise ATP (Msg/Hr) | Email Domains | Mailboxes |
|----------|-------------------------|--------------------------|---------------|-----------|
| FML-200F | 50,000                  | 30,000                   | 20            | 150       |
| FML-400F | 250,000                 | 150,000                  | 70            | 400       |
| FML-900G | 1.3 Mil                 | 650,000                  | 500           | 1,500     |
| FML-2000F| 1.6 Mil                 | 800,000                  | 1,000         | 2,000     |
| FML-3000F| 3.5 Mil                | 2.1 Mil                  | 2,000         | 3,000     |

**Motor sugerido:** Preguntar mensajes/hora (o usuarios estimados), dominios y si necesitan ATP; comparar con Email Routing y Enterprise ATP.

---

### FortiWeb (FWB)

| Modelo   | Throughput (HTTP) | Interfaces |
|----------|-------------------|------------|
| FWB-100F | 100 Mbps          | 4x GE RJ45 |
| FWB-400F | 500 Mbps          | 4x GE RJ45, 4x GE SFP |
| FWB-600F | 1 Gbps            | 2+2 bypass GE, 4x GE SFP |
| FWB-1000F| 2.5 Gbps          | 2x 10GE SFP+, 4x GE, bypass |
| FWB-2000F| 5 Gbps            | 4x 10GE SFP+, 4x GE bypass |
| FWB-3000F| 10 Gbps           | 10x 10GE SFP+, 8x GE bypass |
| FWB-4000F| 70 Gbps           | 2x 40GE, 10x 10GE, 8x GE bypass |

**Motor sugerido:** Preguntar throughput HTTP esperado (Mbps/Gbps) y número de aplicaciones; elegir el modelo que cumpla throughput.

---

### FortiAP (Wireless)

- **FortiAP Series:** gestionados por FortiGate o Cloud; seguridad vía FortiGate.
- **FortiAP-HD Series:** WLAN Controller (FortiAP-HD).

**Motor sugerido:** Preguntar número de usuarios simultáneos, densidad (área), si ya tienen FortiGate; recomendar Serie o HD según gestión.

---

### FortiGate VM

- Matriz de soporte en PDF: VMware, Xen, KVM, Hyper-V, Nutanix AHV, AWS, Azure, OCI, GCP, Alibaba.
- **Motor sugerido:** Preguntar hipervisor/cloud y throughput deseado; recomendar tamaño de VM según throughput (usar misma lógica que FortiGate físico con rangos de throughput).

---

## Próximos pasos

1. Ejecutar **Fortinet_Product_Matrix_FortiGate_Datasheet.sql** en `chat_db` para tener todos los FortiGate del PDF en `Datasheet`.
2. Para FAZ, FMG, FSW, FML, FWB: crear tablas o columnas adicionales si se quieren almacenar en BD, o mantener rangos en código (archivos `*.ranges.js` y `*.engine.js` por solución) usando las tablas de este documento como referencia.

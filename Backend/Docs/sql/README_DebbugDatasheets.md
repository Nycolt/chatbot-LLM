# Uso del Stored Procedure DebbugDatasheets

## 📋 Descripción

El SP `DebbugDatasheets` sincroniza datos desde la tabla temporal `DatasheetTemporal` hacia la tabla principal `Datasheet`.

## 🎯 Flujo de trabajo

```
1. Cargar datos → DatasheetTemporal (tabla temporal)
                          ↓
2. Ejecutar SP → DebbugDatasheets
                          ↓
3. Resultados → - Actualiza registros existentes
                - Inserta nuevos registros
                - Limpia tabla temporal
```

## 🚀 Instalación

### 1. Crear el Stored Procedure en MySQL

```bash
# Desde la raíz del proyecto
mysql -u root -p nycolt_db < Docs/sql/DebbugDatasheets.sql
```

O desde MySQL Workbench:
1. Abrir el archivo `Docs/sql/DebbugDatasheets.sql`
2. Ejecutar el script completo

### 2. Verificar instalación

```sql
-- Ver stored procedures de la base de datos
SHOW PROCEDURE STATUS WHERE Db = 'nycolt_db';

-- Ver código del SP
SHOW CREATE PROCEDURE DebbugDatasheets;
```

## 💻 Uso desde Node.js

### Opción 1: Usar el servicio (Recomendado)

```javascript
import DatasheetService from './services/Datasheet.service.js';

// Array de datasheets a cargar
const datasheets = [
  {
    id: 1,
    Firewall_Throughput_UDP: '10 Gbps',
    IPSec_VPN_Throughput: '5 Gbps',
    IPS_Throughput_Enterprise_Mix: '8 Gbps',
    // ... más campos
  },
  // ... más datasheets
];

// 1. Cargar en tabla temporal
await DatasheetService.bulkCreateDatasheets(datasheets, {
  useChunks: true,
  chunkSize: 500
});

// 2. Sincronizar a tabla principal
const result = await DatasheetService.syncDatasheetsFromTemp();

console.log(result);
// {
//   status: 'success',
//   inserted: 10,      // Nuevas datasheets
//   updated: 5,        // Datasheets actualizadas
//   deleted: 0,        // Registros eliminados de temporal
//   total_affected: 15 // Total de registros procesados
// }
```

### Opción 2: Llamada directa al SP

```javascript
import TransactSQL from './services/TransactSQL.js';

const result = await TransactSQL.singleQuery('DebbugDatasheets');
console.log(result);
```

## 📊 Respuesta del SP

### Éxito
```json
{
  "status": "success",
  "inserted": 10,
  "updated": 5,
  "deleted": 0,
  "total_affected": 15
}
```

### Error
```json
{
  "status": "Error en la sincronización de datasheets",
  "inserted": 0,
  "updated": 0,
  "deleted": 0
}
```

## 🔍 Detalles técnicos

### Operaciones que realiza

1. **UPDATE (Actualización)**
   - Actualiza registros existentes comparando por ID
   - Usa `COALESCE` para mantener valores existentes si el nuevo es NULL
   - Actualiza el campo `updatedAt`

2. **INSERT (Inserción)**
   - Inserta solo registros nuevos (que no existen en la tabla principal)
   - Usa `LEFT JOIN` para identificar registros nuevos

3. **TRUNCATE (Limpieza)**
   - Limpia completamente la tabla temporal después de la sincronización

### Transaccionalidad

- ✅ Usa `START TRANSACTION` y `COMMIT`
- ✅ `ROLLBACK` automático en caso de error
- ✅ Handler de errores SQL

## 🧪 Ejemplo completo

```javascript
import DatasheetService from './services/Datasheet.service.js';

async function importDatasheets() {
  try {
    // Datos de ejemplo
    const datasheets = [
      {
        id: 101,
        Firewall_Throughput_UDP: '10 Gbps',
        IPSec_VPN_Throughput: '5 Gbps',
        Form_Factor: '1U Rack Mount'
      },
      {
        id: 102,
        Firewall_Throughput_UDP: '20 Gbps',
        IPSec_VPN_Throughput: '10 Gbps',
        Form_Factor: '2U Rack Mount'
      }
    ];

    // 1. Cargar en temporal (con chunks para grandes volúmenes)
    console.log('Cargando datasheets en tabla temporal...');
    await DatasheetService.bulkCreateDatasheets(datasheets, {
      useChunks: true,
      chunkSize: 500
    });
    console.log('✓ Cargados en temporal');

    // 2. Sincronizar
    console.log('Sincronizando a tabla principal...');
    const result = await DatasheetService.syncDatasheetsFromTemp();
    
    console.log('✓ Sincronización completada');
    console.log(`  - Insertados: ${result.inserted}`);
    console.log(`  - Actualizados: ${result.updated}`);
    console.log(`  - Total procesados: ${result.total_affected}`);

    return result;
    
  } catch (error) {
    console.error('Error en importación:', error.message);
    throw error;
  }
}

// Ejecutar
importDatasheets();
```

## 🛠️ Mantenimiento

### Recrear el SP

Si necesitas actualizar el SP:

```sql
-- 1. Eliminar el existente
DROP PROCEDURE IF EXISTS DebbugDatasheets;

-- 2. Crear el nuevo (ejecutar el script completo)
SOURCE Docs/sql/DebbugDatasheets.sql;
```

### Ver logs de ejecución

```sql
-- Ver últimas modificaciones en Datasheet
SELECT * FROM Datasheet 
ORDER BY updatedAt DESC 
LIMIT 10;

-- Verificar tabla temporal está vacía
SELECT COUNT(*) FROM DatasheetTemporal;
```

## ⚠️ Consideraciones

1. **ID única**: El campo `id` debe ser único y es usado para identificar registros
2. **NULL values**: El SP usa `COALESCE`, los valores NULL en temporal no sobrescriben valores existentes
3. **Limpieza automática**: La tabla temporal se limpia después de cada sincronización
4. **Transaccional**: Todo o nada, no quedan sincronizaciones parciales

## 📚 Ver también

- [STORED_PROCEDURES.md](./STORED_PROCEDURES.md) - Documentación general de SPs
- [Datasheet.service.js](../src/services/Datasheet.service.js) - Servicio de datasheets

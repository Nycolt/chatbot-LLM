# Por qué NO eliminar `ProductoTemporal` ni `DatasheetTemporal` (hoy)

1. **`priceListUpload.service.js`** inserta filas parseadas del Excel en `ProductoTemporal` y luego el flujo histórico usa el SP **`DebbugProductos`** para volcar a `Producto`.
2. **`Datasheet.service.js`** inserta en **`DatasheetTemporal`** y **`DebbugDatasheets`** sincroniza hacia **`Datasheet`**.

Mientras esos procedimientos almacenados y rutas API existan, **eliminar las tablas temporales rompe la carga masiva**.

### Cuándo sí podrías eliminarlas (futuro)

- Sustituir los SPs por transacciones en Node (bulk upsert directo a tablas finales).
- Actualizar controladores y servicios para no referenciar `ProductTemp` / `DatasheetTemp`.
- Solo entonces: `DROP TABLE ProductoTemporal`, `DROP TABLE DatasheetTemporal`, y `DROP PROCEDURE` de los `Debbug*` correspondientes.

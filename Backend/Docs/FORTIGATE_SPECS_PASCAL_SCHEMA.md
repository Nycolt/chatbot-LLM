# `fortigate_specs` — esquema PascalCase (FortiGate)

El backend asume que la tabla física **`fortigate_specs`** tiene **las mismas columnas** que la antigua tabla **`Datasheet`** para FortiGate (`UNIT`, `SKU`, `Firewall_Throughput_UDP`, …, `createdAt`/`updatedAt` según tu instancia).

- **Modelo Sequelize:** `Backend/src/models/FortigateSpecs.model.js`
- **No** se usa el modelo snake_case + `product_model_id` en esta tabla (ese diseño quedó descartado en código).

Si en MySQL aún existe una `fortigate_specs` con columnas `firewall_throughput_udp`, `product_model_id`, etc., hay que **alinear la base** (p. ej. renombrar/respaldo y recrear la tabla con el esquema PascalCase, o `RENAME TABLE Datasheet TO fortigate_specs` si ya era el layout correcto).

Tras el cambio, **vuelve a desplegar** el SP `GetDatasheetByUnit` desde `Docs/sql/GetDatasheetByUnit.sql` (lee desde `fortigate_specs`).

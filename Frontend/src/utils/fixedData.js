export const fixedDataProductos = (data) => {
    return data.map(row => (
        {
            UNIT: row.UNIT || 'N/A',
            SKU: row.SKU || 'N/A',
            Descripcion: row.Description || 'N/A',
            Price: row.Price || 0,
            OneYearContract: row['1YrContract'] || 0,
            ThirdYearContract: row['3YrContract'] || 0,
            FiveYearContract: row['5YrContract'] || 0,
            Familia: row.familia
        }
    ));
}

export const fixedDataDatasheets = (data) => {
    return data.map(row => {
        delete row.familia; // Eliminar propiedad innecesaria
        return row;
    });
}
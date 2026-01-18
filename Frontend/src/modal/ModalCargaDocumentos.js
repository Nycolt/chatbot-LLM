import { validateContractExcel } from '../utils/excelValidator.js';

export const ModalCargaDocumentos = (
    title = "Cargar archivo Excel",
    excelTemplate = null,
    optionsInput = { accept: ".xlsx,.xls,.csv" },
    funExito,
    funError = () => { },
    sheetName = null,
    funValidacion = null
) => {
    // Devuelve una Promise que resuelve con un array de objetos (contenido del primer sheet)
    return new Promise((resolve, reject) => {

        let droppedFile = null;

        Swal.fire({
            background: '#1e293b',
            html: `
              <h2 class="text-white text-xl font-semibold mb-4">${title}</h2>
              <div class="my-2 text-gray-300 text-sm">
                <p>Para obtener la plantilla de carga, haz clic <a href="${excelTemplate == null ? '#' : excelTemplate}" target="_blank" class="text-red-500 underline">aquí</a>.</p>
              </div>
              <div id="drop-zone" style="min-height:120px;" class="border-2 border-dashed  border-gray-400 rounded p-4 flex flex-col items-center justify-center text-sm">
                <div id="dz-text" class="text-white">Arrastra el archivo aquí o haz clic para seleccionar (${optionsInput.accept})</div>
                <input id="file-input" type="file" accept="${optionsInput.accept}" style="display:none" />
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Cargar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: 'transparent',
            focusConfirm: false,
            didOpen: () => {
                const popup = Swal.getPopup();
                const drop = popup.querySelector('#drop-zone');
                const input = popup.querySelector('#file-input');
                const dzText = popup.querySelector('#dz-text');

                drop.addEventListener('click', () => input.click());

                drop.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    drop.classList.add('bg-gray-700');
                });
                drop.addEventListener('dragleave', () => {
                    drop.classList.remove('bg-gray-700');
                });
                drop.addEventListener('drop', (e) => {
                    e.preventDefault();
                    drop.classList.remove('bg-gray-700');
                    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
                    if (f) {
                        droppedFile = f;
                        dzText.textContent = `Archivo: ${f.name}`;
                    }
                });

                input.addEventListener('change', (e) => {
                    const f = e.target.files && e.target.files[0];
                    if (f) {
                        droppedFile = f;
                        dzText.textContent = `Archivo: ${f.name}`;
                    }
                });
            },
            preConfirm: () => {
                const popup = Swal.getPopup();
                const input = popup.querySelector('#file-input');
                const file = (input.files && input.files[0]) || droppedFile;
                if (!file) {
                    Swal.showValidationMessage('Selecciona un archivo');
                    return false;
                }

                // Verificar si es modo Excel o modo genérico
                const isExcelMode = optionsInput.accept && /xlsx|xls|csv/i.test(optionsInput.accept);

                if (isExcelMode) {
                    // Validar extensión para Excel
                    const name = (file.name || '').toLowerCase();
                    if (!/\.(xlsx|xls|csv)$/i.test(name)) {
                        Swal.showValidationMessage('Solo se permiten archivos Excel (.xlsx, .xls, .csv)');
                        return false;
                    }
                }

                return new Promise((res, rej) => {
                    const reader = new FileReader();
                    reader.onerror = (err) => {
                        rej(err);
                    };
                    reader.onload = (e) => {
                        try {
                            const data = new Uint8Array(e.target.result);

                            // Si es modo Excel, procesar con XLSX
                            if (isExcelMode) {
                                const workbook = XLSX.read(data, { type: 'array' });
                                
                                let result = [];
                                
                                // Función helper para limpiar espacios de todas las propiedades
                                const trimObjectValues = (obj) => {
                                    const trimmed = {};
                                    for (const key in obj) {
                                        const value = obj[key];
                                        if (typeof value === 'string') {
                                            trimmed[key.trim()] = value.trim();
                                        } else {
                                            trimmed[key.trim()] = value;
                                        }
                                    }
                                    return trimmed;
                                };
                                
                                // Si se especificó sheetName, usar solo esa hoja
                                if (sheetName) {
                                    if (workbook.SheetNames.includes(sheetName)) {
                                        const worksheet = workbook.Sheets[sheetName];
                                        const json = XLSX.utils.sheet_to_json(worksheet, { defval: null });
                                        // Agregar la propiedad 'familia' a cada registro y aplicar trim
                                        result = json.map(row => trimObjectValues({
                                            ...row,
                                            familia: sheetName
                                        }));
                                    } else {
                                        rej(new Error(`Hoja no encontrada: ${sheetName}`));
                                        return;
                                    }
                                } else {
                                    // Capturar de todas las hojas
                                    workbook.SheetNames.forEach(shName => {
                                        const worksheet = workbook.Sheets[shName];
                                        const json = XLSX.utils.sheet_to_json(worksheet, { defval: null });
                                        // Agregar la propiedad 'familia' a cada registro y aplicar trim
                                        const dataWithFamilia = json.map(row => trimObjectValues({
                                            ...row,
                                            familia: shName
                                        }));
                                        result = result.concat(dataWithFamilia);
                                    });
                                }
                                
                                // Validar datos del Excel si se especificó función de validación
                                const validacion = funValidacion ? funValidacion(result) : { valid: true };
                                if (!validacion.valid) {
                                    let errorMsg = validacion.message + '\n\n';
                                    validacion.errors.forEach(error => {
                                        errorMsg += `• ${error.message || error}\n`;
                                    });
                                    rej(new Error(errorMsg));
                                    return;
                                }
                                
                                res(result);
                            } else {
                                // Modo genérico: retornar los bytes del archivo
                                res({
                                    file: file,
                                    name: file.name,
                                    size: file.size,
                                    type: file.type,
                                    data: data,
                                    arrayBuffer: e.target.result
                                });
                            }
                        } catch (err) {
                            rej(err);
                        }
                    };
                    reader.readAsArrayBuffer(file);
                });
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                // result.value contiene el array de objetos
                const data = result.value;
                try { funExito(data); } catch (e) { /* ignore callback errors */ }
                resolve(data);
            } else {
                const err = new Error('cancelled');
                try { funError(err); } catch (e) { }
                reject(err);
            }
        }).catch((err) => {
            // Mostrar error de validación al usuario
            Swal.fire({
                icon: 'error',
                title: 'Error de validación',
                text: err.message || 'Error al procesar el archivo',
                background: '#1e293b',
                color: '#fff',
                confirmButtonColor: '#dc2626'
            });
            try { funError(err); } catch (e) { }
            reject(err);
        });
    });
};


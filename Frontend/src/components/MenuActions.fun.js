import { removeTokenStorage } from "../config/localStorage.js";
import { localStorageKeys } from "../config/variables.js";
import { ModalCargaDocumentos } from "../modal/ModalCargaDocumentos.js";
import { fixedDataDatasheets, fixedDataProductos } from "../utils/fixedData.js";
import { ValidarProducto, ValidarDatasheets } from "../utils/excelValidator.js";

import ExcelService from "../services/ExcelService.js";

// Ruta a la plantilla de Excel
const excelTemplate = "./Docs/python/Fortinet_Products.xlsx";
const datasheetTemplate = "./Docs/DatasheetTemplate/Datasheet_Template.xlsx";

/**
 * Función cargar producto
 */
const CargarProducto = () => {
    //Abrir modal de carga de documentos - Cargar producto
    ModalCargaDocumentos(
        "Cargar productos desde Excel", excelTemplate,
        { accept: ".xlsx,.xls,.csv" },
        async (data) => {
            //Envio de datos al Backend
            const fixedDataResult = fixedDataProductos(data);

            const response = await ExcelService.InsertarProductos(fixedDataResult).catch(err => {
                if(err && err.response && err.response.status === 401){
                    // Token inválido o expirado, manejar cierre de sesión
                    removeTokenStorage(localStorageKeys.tokenAuth);
                    Swal.fire({
                        icon: 'error',
                        title: 'Sesión expirada',
                        text: 'Por favor, inicia sesión nuevamente.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            });
            
            if (response && response.success) {
                await Swal.fire({ icon: 'success', title: 'Documento cargado con exito!', timer: 1500, showConfirmButton: false });
            }
            else {
                await Swal.fire({ icon: 'error', title: 'Error al cargar el documento', text: response.message || 'Inténtalo de nuevo.' });
            }

        },
        (err) => { console.error('Error en carga de documentos', err); }
        , null, ValidarProducto
    );
}

/**
 * Función cargar Datasheet
 */
const CargarDatasheet = () => {
    //Abrir modal de carga de documentos - Cargar producto
    ModalCargaDocumentos(
        "Cargar datasheets desde Excel", datasheetTemplate,
        { accept: ".xlsx,.xls,.csv" },
        async (data) => {
            //Envio de datos al Backend
            const fixedDataResult = fixedDataDatasheets(data);
            
            const response = await ExcelService.InsertarDatasheets(fixedDataResult).catch(err => {
                if(err && err.response && err.response.status === 401){
                    // Token inválido o expirado, manejar cierre de sesión
                    removeTokenStorage(localStorageKeys.tokenAuth);
                    Swal.fire({
                        icon: 'error',
                        title: 'Sesión expirada',
                        text: 'Por favor, inicia sesión nuevamente.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            });
            
            if (response && response.success) {
                await Swal.fire({ icon: 'success', title: 'Documento cargado con exito!', timer: 1500, showConfirmButton: false });
            }
            else {
                await Swal.fire({ icon: 'error', title: 'Error al cargar el documento', text: response.message || 'Inténtalo de nuevo.' });
            }

        },
        (err) => { console.error('Error en carga de documentos', err); }
        , null, ValidarDatasheets
    );
}


/**
 * Maneja el cierre de sesión
 */
const handleCerrarSesion = async () => {
    const result = await Swal.fire({
        title: '¿Cerrar sesión?',
        text: 'Se cerrará tu sesión actual',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, cerrar sesión',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed) {
        removeTokenStorage(localStorageKeys.tokenAuth);
        await Swal.fire({
            icon: 'success',
            title: 'Sesión cerrada',
            text: 'Has cerrado sesión correctamente',
            timer: 1500,
            showConfirmButton: false
        });
    }
};


export {
    CargarProducto,
    handleCerrarSesion,
    CargarDatasheet
}
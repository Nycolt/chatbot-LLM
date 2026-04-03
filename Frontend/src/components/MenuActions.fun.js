import { removeTokenStorage } from "../config/localStorage.js";
import { localStorageKeys } from "../config/variables.js";
import { ModalCargaDocumentos } from "../modal/ModalCargaDocumentos.js";
import PriceListService from "../services/PriceListService.js";
import DatasheetPdfService from "../services/DatasheetPdfService.js";
import { openModalCargaDatasheetPdf } from "../modal/ModalCargaDatasheetPdf.js";

/**
 * Datasheet PDF por solución (FortiGate, FortiAP, etc.) — distinto del Excel de precios.
 */
const CargarDatasheetPdf = async () => {
    try {
        const { file, solutionType } = await openModalCargaDatasheetPdf();
        const response = await DatasheetPdfService.uploadDatasheetPdf(file, solutionType).catch((err) => {
            if (err?.response?.status === 401) {
                removeTokenStorage(localStorageKeys.tokenAuth);
                Swal.fire({
                    icon: 'error',
                    title: 'Sesión expirada',
                    text: 'Por favor, inicia sesión nuevamente.',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
            throw err;
        });

        if (response && response.success) {
            const warnings = response.data?.report?.warnings;
            if (Array.isArray(warnings) && warnings.length) {
                const lines = warnings.slice(0, 8).map((w) => `• ${w.message || w.code || 'Aviso'}`).join('\n');
                await Swal.fire({
                    icon: 'warning',
                    title: 'PDF procesado — revisa avisos',
                    text: lines,
                    background: '#1e293b',
                    color: '#fff',
                    confirmButtonColor: '#dc2626',
                });
            } else {
                await Swal.fire({ icon: 'success', title: 'Datasheet PDF cargado', timer: 1800, showConfirmButton: false });
            }
        } else {
            await Swal.fire({
                icon: 'error',
                title: 'Error al procesar el PDF',
                text: response?.message || 'Inténtalo de nuevo.',
            });
        }
    } catch (e) {
        if (e?.message === 'cancelled') return;
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: e?.message || 'No se pudo subir el datasheet PDF.',
        });
    }
};

/**
 * Cargar Excel oficial Fortinet (Main Price List) para actualizar precios del chatbot.
 */
const CargarPriceListFortinet = () => {
    ModalCargaDocumentos(
        "Cargar Price List Fortinet (Main Price List)",
        null,
        { accept: ".xlsx,.xls", parseExcel: false },
        async (payload) => {
            const file = payload?.file;
            const response = await PriceListService.uploadFortinetPriceList(file).catch((err) => {
                if (err?.response?.status === 401) {
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
                throw err;
            });

            if (response && response.success) {
                const batchId = response?.data?.batch_id;
                const status = response?.data?.status;
                console.log('[PriceList] upload response:', response);
                await Swal.fire({
                    icon: 'success',
                    title: 'Price list cargada y procesada!',
                    text: batchId ? `Batch: ${batchId} (${status || 'ok'})` : (status ? `Status: ${status}` : 'OK'),
                    timer: 12000,
                    showConfirmButton: true,
                    confirmButtonText: 'OK'
                });
            } else {
                await Swal.fire({ icon: 'error', title: 'Error al cargar la price list', text: response?.message || 'Inténtalo de nuevo.' });
            }
        },
        (err) => { console.error('Error en carga de price list', err); }
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
    handleCerrarSesion,
    CargarDatasheetPdf,
    CargarPriceListFortinet
}

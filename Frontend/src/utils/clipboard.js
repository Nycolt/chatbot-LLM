/**
 * Copia un texto al portapapeles
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>} - true si se copió exitosamente, false si hubo error
 */
export const copyToClipboard = async (text) => {
    try {
        // Usar la API moderna del Clipboard si está disponible
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback para navegadores antiguos o contextos no seguros
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            return successful;
        }
    } catch (err) {
        console.error('Error al copiar al portapapeles:', err);
        return false;
    }
};

/**
 * Copia texto al portapapeles y muestra un mensaje con SweetAlert
 * @param {string} text - Texto a copiar
 * @param {string} successMessage - Mensaje de éxito (opcional)
 * @param {string} errorMessage - Mensaje de error (opcional)
 * @returns {Promise<boolean>}
 */
export const copyWithNotification = async (
    text, 
    successMessage = 'Copiado al portapapeles',
    errorMessage = 'No se pudo copiar al portapapeles'
) => {
    const success = await copyToClipboard(text);
    
    if (success) {
        Swal.fire({
            icon: 'success',
            title: successMessage,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            background: '#1e293b',
            color: '#fff'
        });
    } else {
        Swal.fire({
            icon: 'error',
            title: errorMessage,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            background: '#1e293b',
            color: '#fff'
        });
    }
    
    return success;
};

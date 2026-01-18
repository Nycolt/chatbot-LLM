import { sweetAlertDefaults } from '../config/sweetalert.js';
import AuthService from '../services/AuthService.js';

export const ModalAutenticacion = (

    funExito,
    funUnAut = () => { },
    funError = () => { }

) => {

    // callbacks por defecto
    funExito = typeof funExito === 'function' ? funExito : () => { };
    funUnAut = typeof funUnAut === 'function' ? funUnAut : () => { };
    funError = typeof funError === 'function' ? funError : () => { };

    // función de autenticación usando AuthService
    const authenticate = async (usuario, password) => {
        return await AuthService.login(usuario, password);
    };

    // Usar SweetAlert2
    Swal.fire({
        ...sweetAlertDefaults,
        html:
            '<h2 class="text-white text-xl font-semibold mb-4">Iniciar sesión</h2>' +
            '<input id="swal-username" class="swal2-input text-white" placeholder="Usuario">' +
            '<input id="swal-password" type="password" class="swal2-input text-white" placeholder="Contraseña">',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Iniciar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const usuario = document.getElementById('swal-username').value.trim();
            const password = document.getElementById('swal-password').value;
            if (!usuario || !password) {
                Swal.showValidationMessage('Completa usuario y contraseña');
                return false;
            }
            return { usuario, password };
        }
    }).then(async (result) => {
        if (result.isConfirmed && result.value) {
            const { usuario, password } = result.value;
            try {
                const res = await authenticate(usuario, password);
                if (res && res.success) {
                    if (res.message == "Inicio de sesión exitoso") {
                        await Swal.fire({ icon: 'success', title: 'Autenticado', timer: 900, showConfirmButton: false });
                        funExito(res.data);
                    }
                    else {
                        await Swal.fire({ icon: 'error', title: 'No autorizado', text: res.message || 'Usuario o contraseña incorrectos' });
                        funUnAut();
                    }
                } else {
                    await Swal.fire({ icon: 'error', title: 'No autorizado', text: 'Usuario o contraseña incorrectos' });
                    funUnAut();
                }
            } catch (err) {
                if(err.response.status === 401){
                    await Swal.fire({ icon: 'error', title: 'No autorizado', text: 'Usuario o contraseña incorrectos' });
                    funUnAut();
                    return;
                }
                await Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error en la autenticación' });
                funError(err);
            }
        }
    });
};
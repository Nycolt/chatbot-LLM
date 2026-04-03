/**
 * SweetAlert2 se carga globalmente vía CDN en index.html (no usar import 'sweetalert2').
 */
import { DATASHEET_PDF_SOLUTION_OPTIONS } from '../config/datasheetPdfSolutions.js';

/**
 * Modal: solución obligatoria + archivo PDF. No parsea Excel.
 * @returns {Promise<{ file: File, solutionType: string }>}
 */
export function openModalCargaDatasheetPdf() {
  return new Promise((resolve, reject) => {
    let droppedFile = null;

    const optionsHtml = [
      '<option value="">— Selecciona solución —</option>',
      ...DATASHEET_PDF_SOLUTION_OPTIONS.map(
        (o) => `<option value="${o.value}">${o.label}</option>`,
      ),
    ].join('');

    Swal.fire({
      background: '#1e293b',
      html: `
        <h2 class="text-white text-xl font-semibold mb-3">Cargar datasheet PDF</h2>
        <p class="text-gray-400 text-sm mb-4 text-left">
          Indica a qué solución pertenece el documento antes de elegir el PDF.
          Este flujo es independiente del Excel de precios o de datasheets en Excel.
        </p>
        <label class="block text-left text-gray-300 text-sm mb-1" for="pdf-solution-type">Solución <span class="text-red-400">*</span></label>
        <select
          id="pdf-solution-type"
          class="swal2-input mb-4 text-left bg-slate-700 text-white border border-slate-500 rounded px-2 py-2 w-full"
          style="height:auto;"
        >
          ${optionsHtml}
        </select>
        <div id="drop-zone-pdf" style="min-height:120px;" class="border-2 border-dashed border-gray-400 rounded p-4 flex flex-col items-center justify-center text-sm cursor-pointer">
          <div id="dz-text-pdf" class="text-white text-center">Arrastra el PDF aquí o haz clic para seleccionar</div>
          <input id="file-input-pdf" type="file" accept="application/pdf,.pdf" style="display:none" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Subir y procesar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: 'transparent',
      focusConfirm: false,
      didOpen: () => {
        const popup = Swal.getPopup();
        const drop = popup.querySelector('#drop-zone-pdf');
        const input = popup.querySelector('#file-input-pdf');
        const dzText = popup.querySelector('#dz-text-pdf');

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
          const f = e.dataTransfer?.files?.[0];
          if (f) {
            droppedFile = f;
            dzText.textContent = `Archivo: ${f.name}`;
          }
        });

        input.addEventListener('change', (e) => {
          const f = e.target.files?.[0];
          if (f) {
            droppedFile = f;
            dzText.textContent = `Archivo: ${f.name}`;
          }
        });
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        const select = popup.querySelector('#pdf-solution-type');
        const input = popup.querySelector('#file-input-pdf');
        const solutionType = select?.value?.trim() || '';

        if (!solutionType) {
          Swal.showValidationMessage('Selecciona la solución a la que pertenece el datasheet.');
          return false;
        }

        const file = (input.files && input.files[0]) || droppedFile;
        if (!file) {
          Swal.showValidationMessage('Selecciona un archivo PDF.');
          return false;
        }

        const name = (file.name || '').toLowerCase();
        if (!name.endsWith('.pdf')) {
          Swal.showValidationMessage('Solo se permiten archivos .pdf');
          return false;
        }

        return { file, solutionType };
      },
    })
      .then((result) => {
        if (result.isConfirmed && result.value) {
          resolve(result.value);
        } else {
          reject(new Error('cancelled'));
        }
      })
      .catch(reject);
  });
}

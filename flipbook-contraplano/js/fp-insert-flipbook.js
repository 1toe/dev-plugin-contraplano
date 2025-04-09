/**
 * Script para añadir un botón "Insertar Flipbook" en el editor clásico de WordPress
 */
(function($) {
    'use strict';
    
    // Cuando el DOM esté listo
    $(document).ready(function() {
        // Verificar si tenemos datos de flipbooks
        if (!fpInsertData || !fpInsertData.flipbooks) {
            console.error('No se pudieron cargar los datos de flipbooks');
            return;
        }
        
        // Crear el botón
        const $insertButton = $('<button></button>', {
            'id': 'insert-flipbook-button',
            'class': 'button',
            'text': fpInsertData.button_text || 'Insertar Flipbook'
        }).css({
            'margin-left': '10px'
        });
        
        // Añadir el botón después del "Agregar medios"
        $('#wp-content-media-buttons').append($insertButton);
        
        // Crear el modal
        const $modalOverlay = $('<div></div>', {
            'id': 'fp-modal-overlay',
            'class': 'fp-modal-overlay'
        }).css({
            'display': 'none',
            'position': 'fixed',
            'z-index': '100050', // Mayor que el admin bar de WordPress
            'top': '0',
            'left': '0',
            'right': '0',
            'bottom': '0',
            'background': 'rgba(0,0,0,0.7)',
            'overflow': 'auto',
            'padding': '20px'
        });
        
        const $modal = $('<div></div>', {
            'id': 'fp-modal',
            'class': 'fp-modal'
        }).css({
            'background': '#fff',
            'position': 'relative',
            'margin': '5% auto',
            'padding': '20px',
            'width': '50%',
            'max-width': '500px',
            'border-radius': '4px',
            'box-shadow': '0 3px 6px rgba(0,0,0,0.3)'
        });
        
        const $modalHeader = $('<div></div>', {
            'class': 'fp-modal-header'
        }).css({
            'border-bottom': '1px solid #eee',
            'padding-bottom': '10px',
            'margin-bottom': '15px'
        });
        
        $modalHeader.append(
            $('<h3></h3>', {
                'text': fpInsertData.modal_title || 'Seleccionar un Flipbook'
            })
        );
        
        const $modalBody = $('<div></div>', {
            'class': 'fp-modal-body'
        }).css({
            'margin-bottom': '15px'
        });
        
        // Crear select para elegir flipbook
        const $select = $('<select></select>', {
            'id': 'fp-select-flipbook',
            'class': 'widefat'
        }).css({
            'width': '100%'
        });
        
        // Añadir opciones al select
        if (fpInsertData.flipbooks.length === 0) {
            $select.append(
                $('<option></option>', {
                    'text': 'No hay flipbooks disponibles',
                    'value': ''
                })
            );
        } else {
            $select.append(
                $('<option></option>', {
                    'text': 'Seleccione un flipbook...',
                    'value': ''
                })
            );
            
            fpInsertData.flipbooks.forEach(function(flipbook) {
                $select.append(
                    $('<option></option>', {
                        'text': flipbook.title,
                        'value': flipbook.id
                    })
                );
            });
        }
        
        $modalBody.append(
            $('<p>Por favor, seleccione un Flipbook de la lista:</p>'),
            $select
        );
        
        const $modalFooter = $('<div></div>', {
            'class': 'fp-modal-footer'
        }).css({
            'text-align': 'right',
            'border-top': '1px solid #eee',
            'padding-top': '10px'
        });
        
        const $cancelButton = $('<button></button>', {
            'type': 'button',
            'class': 'button',
            'text': fpInsertData.cancel_button || 'Cancelar'
        });
        
        const $insertModalButton = $('<button></button>', {
            'type': 'button',
            'class': 'button button-primary',
            'text': fpInsertData.modal_button || 'Insertar'
        });
        
        $modalFooter.append($cancelButton, ' ', $insertModalButton);
        
        $modal.append($modalHeader, $modalBody, $modalFooter);
        $modalOverlay.append($modal);
        $('body').append($modalOverlay);
        
        // Función para cerrar el modal
        function closeModal() {
            $modalOverlay.hide();
        }
        
        // Evento para abrir el modal
        $insertButton.on('click', function(e) {
            e.preventDefault();
            $modalOverlay.show();
        });
        
        // Eventos para cerrar el modal
        $cancelButton.on('click', closeModal);
        $modalOverlay.on('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
        
        // Evento para insertar el shortcode
        $insertModalButton.on('click', function() {
            const flipbookId = $('#fp-select-flipbook').val();
            
            if (!flipbookId) {
                alert('Por favor, seleccione un Flipbook');
                return;
            }
            
            const shortcode = '[flipbook id=' + flipbookId + ']';
            
            // Insertar en el editor (funciona con TinyMCE y editor de texto)
            if (typeof window.tinyMCE !== 'undefined' && window.tinyMCE.activeEditor && !window.tinyMCE.activeEditor.isHidden()) {
                window.tinyMCE.activeEditor.execCommand('mceInsertContent', false, shortcode);
            } else {
                const $textarea = $('#content');
                const currentContent = $textarea.val();
                const caretPos = $textarea[0].selectionStart;
                
                $textarea.val(
                    currentContent.substring(0, caretPos) +
                    shortcode +
                    currentContent.substring(caretPos)
                );
            }
            
            closeModal();
        });
    });
})(jQuery);

/**
 * Custom Zoom Functionality for Flipbook
 */

document.addEventListener('DOMContentLoaded', function() {
    const containers = document.querySelectorAll('.flipbook-container');
    
    containers.forEach(container => {
        const pdfViewer = container.querySelector('.fp-pdf-viewer');
        
        if (!pdfViewer) return;
        
        let currentZoom = 1;
        const MIN_ZOOM = 0.5;
        const MAX_ZOOM = 3;
        const ZOOM_STEP = 0.1;
        
        // Mantener el seguimiento del estado del zoom
        let isZoomed = false;
        
        // Función para aplicar zoom
        function applyZoom(newZoom, originX, originY) {
            // Limitar zoom a los valores mínimos y máximos
            newZoom = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
            
            // Si no hay cambio, no hacer nada
            if (newZoom === currentZoom) return;
            
            // Determinar si estamos haciendo zoom o reducción
            const zoomingIn = newZoom > currentZoom;
            
            // Actualizar clases para cambiar el cursor
            if (newZoom > 1) {
                pdfViewer.classList.add('fp-zooming');
                if (zoomingIn) {
                    pdfViewer.classList.remove('fp-zooming-out');
                } else {
                    pdfViewer.classList.add('fp-zooming-out');
                }
            } else {
                pdfViewer.classList.remove('fp-zooming', 'fp-zooming-out');
            }
            
            // Aplicar el nuevo zoom
            pdfViewer.style.transform = `scale(${newZoom})`;
            currentZoom = newZoom;
            
            // Actualizar el estado del zoom
            isZoomed = newZoom > 1;
            
            // Actualizar el valor del slider de zoom si existe
            const zoomSlider = container.querySelector('.fp-zoom-slider');
            if (zoomSlider) {
                zoomSlider.value = newZoom * 100;
                
                // Disparar evento de cambio para actualizar UI
                const event = new Event('input');
                zoomSlider.dispatchEvent(event);
            }
        }
        
        // Gestionar eventos de la rueda del ratón
        pdfViewer.addEventListener('wheel', function(e) {
            // Solo interceptar si la tecla Ctrl está presionada o si ya estamos en un estado de zoom
            if (e.ctrlKey || isZoomed) {
                e.preventDefault(); // Evitar el zoom del navegador
                
                const delta = e.deltaY > 0 ? -1 : 1;
                const newZoom = currentZoom + (delta * ZOOM_STEP);
                
                // Calcular el punto de origen del zoom (posición del cursor)
                const rect = pdfViewer.getBoundingClientRect();
                const x = (e.clientX - rect.left) / currentZoom;
                const y = (e.clientY - rect.top) / currentZoom;
                
                applyZoom(newZoom, x, y);
            }
        }, { passive: false });
        
        // Resetear zoom con doble clic
        pdfViewer.addEventListener('dblclick', function() {
            if (isZoomed) {
                applyZoom(1, 0, 0);
            }
        });
        
        // Conectar con controles existentes
        const zoomInBtn = container.querySelector('.fp-zoom-in');
        const zoomOutBtn = container.querySelector('.fp-zoom-out');
        const zoomSlider = container.querySelector('.fp-zoom-slider');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                applyZoom(currentZoom + ZOOM_STEP, 0, 0);
            });
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                applyZoom(currentZoom - ZOOM_STEP, 0, 0);
            });
        }
        
        if (zoomSlider) {
            zoomSlider.addEventListener('input', () => {
                const zoomValue = parseFloat(zoomSlider.value) / 100;
                if (zoomValue !== currentZoom) {
                    applyZoom(zoomValue, 0, 0);
                }
            });
        }
        
        // Escuchar eventos de pantalla completa para ajustar el zoom
        document.addEventListener('fullscreenchange', resetZoomOnFullscreenChange);
        document.addEventListener('webkitfullscreenchange', resetZoomOnFullscreenChange);
        document.addEventListener('mozfullscreenchange', resetZoomOnFullscreenChange);
        document.addEventListener('MSFullscreenChange', resetZoomOnFullscreenChange);
        
        function resetZoomOnFullscreenChange() {
            if (document.fullscreenElement || 
                document.webkitFullscreenElement || 
                document.mozFullScreenElement ||
                document.msFullscreenElement) {
                // Si entramos en pantalla completa, resetear el zoom
                applyZoom(1, 0, 0);
            }
        }
    });
    
    // Prevenir el comportamiento de zoom predeterminado en todo el documento cuando Ctrl está presionado
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === '0') {
            // Interceptar Ctrl+0 (reseteo de zoom del navegador)
            e.preventDefault();
        }
    });
});

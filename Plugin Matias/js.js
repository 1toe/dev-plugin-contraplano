// js/fp-front.js
jQuery(document).ready(function ($) {

    // Configurar la ruta del worker de PDF.js (pasada desde PHP via wp_localize_script)
    if (typeof pdfjsLib !== 'undefined' && typeof fpConfig !== 'undefined' && fpConfig.pdfWorkerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = fpConfig.pdfWorkerSrc;
        // console.log('PDF.js worker source set to:', fpConfig.pdfWorkerSrc);
    } else {
        console.error('PDF.js library or worker source configuration not found.');
        return; // Salir si PDF.js no está listo
    }

    // Procesar cada instancia de flipbook en la página
    $('.flipbook-container').each(function () {
        var $container = $(this);
        var pdfUrl = $container.data('pdf');
        var containerId = $container.attr('id'); // e.g., flipbook-container-9816-123
        var postId = containerId.split('-')[2]; // Extraer el Post ID si es necesario, aunque usaremos IDs completos

        var $viewer = $container.find('.fp-pdf-viewer'); // Buscar dentro del contenedor actual
        var $pagesContainer = $container.find('.fp-pages-container');
        var $loadingMessage = $container.find('.fp-loading');
        // var $interactiveAreasContainer = $container.find('.fp-interactive-areas'); // Futuro

        if (!pdfUrl) {
            console.error('No PDF URL found for flipbook:', containerId);
            $loadingMessage.text('Error: PDF no encontrado.');
            return; // Saltar al siguiente contenedor si no hay PDF
        }

        if (typeof pdfjsLib === 'undefined') {
            console.error('PDF.js library is not loaded.');
            $loadingMessage.text('Error: Librería PDF no cargada.');
            return;
        }
        if (typeof $.fn.turn === 'undefined') {
            console.error('Turn.js library is not loaded.');
            $loadingMessage.text('Error: Librería Turn.js no cargada.');
            return;
        }

        // console.log('Initializing Flipbook:', containerId, 'with PDF:', pdfUrl);

        var loadingTask = pdfjsLib.getDocument(pdfUrl);
        loadingTask.promise.then(function (pdf) {
            // console.log('PDF loaded for', containerId);
            var totalPages = pdf.numPages;
            var pagePromises = []; // Para saber cuándo todas las páginas están listas para Turn.js

            // Limpiar contenedor de páginas (por si acaso)
            $pagesContainer.html('');

            // Procesar cada página
            for (var i = 1; i <= totalPages; i++) {
                (function (pageNum) {
                    var pagePromise = pdf.getPage(pageNum).then(function (page) {
                        var desiredWidth = $viewer.width() / 2; // Ancho deseado para una página (mitad del visor)
                        if (desiredWidth <= 0) desiredWidth = 400; // Fallback si el ancho no está definido aún

                        var viewport = page.getViewport({ scale: 1 });
                        var scale = desiredWidth / viewport.width;
                        var scaledViewport = page.getViewport({ scale: scale });

                        var canvas = document.createElement('canvas');
                        canvas.className = 'fp-page-canvas';
                        canvas.width = Math.floor(scaledViewport.width);
                        canvas.height = Math.floor(scaledViewport.height);
                        // Guardar número de página para referencia futura (ej. áreas interactivas)
                        canvas.dataset.pageNumber = pageNum;

                        var context = canvas.getContext('2d');
                        var renderContext = {
                            canvasContext: context,
                            viewport: scaledViewport
                        };

                        // Renderizar la página y devolver la promesa de renderizado
                        return page.render(renderContext).promise.then(function () {
                            // Crear el div de la página para Turn.js
                            var pageDiv = $('<div class="fp-page"></div>').css({
                                width: canvas.width + 'px',
                                height: canvas.height + 'px'
                            }).append(canvas);

                            // Almacenar temporalmente para ordenar después
                            return { pageNum: pageNum, element: pageDiv };
                        });
                    });
                    pagePromises.push(pagePromise);
                })(i);
            }

            // Esperar a que todas las páginas se rendericen
            Promise.all(pagePromises).then(function (renderedPages) {
                // console.log('All pages rendered for', containerId);

                // Ordenar las páginas por número antes de añadirlas al DOM
                renderedPages.sort(function (a, b) { return a.pageNum - b.pageNum; });

                // Añadir las páginas ordenadas al contenedor
                $.each(renderedPages, function (index, pageData) {
                    $pagesContainer.append(pageData.element);
                });

                // Obtener dimensiones de la primera página para Turn.js
                var firstPage = renderedPages[0].element;
                var pageWidth = firstPage.width();
                var pageHeight = firstPage.height();

                // Ocultar mensaje de carga y mostrar contenedor de páginas
                $loadingMessage.hide();
                $pagesContainer.show();

                // Inicializar Turn.js
                $pagesContainer.turn({
                    width: pageWidth * 2, // Ancho total para dos páginas
                    height: pageHeight,
                    autoCenter: true,
                    // display: 'double', // Mostrar dos páginas por defecto
                    // acceleration: true, // Usar aceleración por hardware si está disponible
                    // gradients: true, // Mostrar gradientes en el pliegue
                    elevation: 50, // Sombra al pasar la página
                    when: {
                        turned: function (event, page, view) {
                            // console.log('Turned to page', page, 'in view', view, 'for', containerId);
                            // Futuro: Lógica para sincronizar audio o mostrar/ocultar áreas interactivas según la página 'page' o 'view'
                        }
                    }
                });

                // Ajustar tamaño si la ventana cambia (básico)
                $(window).on('resize', function () {
                    // Podrías necesitar recalcular el tamaño y reiniciar Turn.js aquí
                    // $pagesContainer.turn('size', newWidth, newHeight);
                }).trigger('resize'); // Trigger inicial

                // Futuro: Procesar áreas interactivas después de inicializar Turn.js
                // processInteractiveAreas($container, $interactiveAreasContainer, pageWidth, pageHeight);


            }).catch(function (reason) {
                console.error("Error rendering PDF pages for " + containerId + ": ", reason);
                $loadingMessage.text('Error al renderizar las páginas del PDF.');
            });

        }, function (reason) {
            console.error("Error loading PDF for " + containerId + ": ", reason);
            $loadingMessage.text('Error al cargar el archivo PDF.');
        });

    }); // Fin de .each('.flipbook-container')


    // Futuro: Función para procesar y posicionar áreas interactivas
    /*
    function processInteractiveAreas($container, $interactiveAreasContainer, pageWidth, pageHeight) {
        var areasData = $interactiveAreasContainer.data('areas');
        if (!areasData || !Array.isArray(areasData)) return;

        var $turnPagesContainer = $container.find('.fp-pages-container'); // El elemento donde Turn.js opera

        $.each(areasData, function (index, area) {
            // Validar datos básicos del área
            if (typeof area.page !== 'number' || typeof area.x !== 'number' || typeof area.y !== 'number' || typeof area.width !== 'number' || typeof area.height !== 'number' ) {
                console.warn('Invalid interactive area data:', area);
                return; // Saltar área inválida
            }

            var areaDiv = $('<div class="fp-interactive-area"></div>');
            areaDiv.css({
                position: 'absolute',
                left: area.x + 'px', // La posición necesita ajustarse según la página en Turn.js
                top: area.y + 'px',
                width: area.width + 'px',
                height: area.height + 'px',
                border: '2px dashed rgba(255, 0, 0, 0.7)', // Más visible
                cursor: 'pointer',
                zIndex: 10 // Asegurar que esté sobre el canvas
                // background: 'rgba(255, 255, 0, 0.3)', // Fondo para depuración
            });
             areaDiv.attr('title', area.type + (area.value ? ': ' + area.value : '')); // Tooltip

            // Asignar acción basada en tipo
            if (area.type === 'link' && area.value) { // 'linking' cambiado a 'link'
                areaDiv.on('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation(); // Evitar que el clic pase a Turn.js
                    if (confirm("Ir a: " + area.value + "?")) {
                        window.open(area.value, '_blank');
                    }
                });
            } else if (area.type === 'youtube' && area.value) {
                areaDiv.on('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Usar un lightbox o un método más elegante que window.open sería mejor
                    var youtubeURL = "https://www.youtube.com/embed/" + area.value + "?autoplay=1";
                    // Ejemplo simple con window.open:
                     window.open(youtubeURL, 'YouTube Video', 'width=800,height=600,resizable=yes,scrollbars=yes');
                     // Considera usar librerías como Fancybox, Magnific Popup, etc.
                });
            }
            // Añadir más tipos aquí (ej. 'popup', 'gotoPage', etc.)

            // --- Posicionamiento complejo con Turn.js ---
            // Esto es lo más difícil. El área debe mostrarse solo cuando su página está visible
            // y posicionarse correctamente dentro de esa página (izquierda o derecha).
            // Una estrategia es añadir el div del área al div de la página correspondiente (.fp-page)
            // antes de inicializar Turn.js, o usar los eventos 'turned' de Turn.js para mostrar/ocultar/reposicionar.

            // Estrategia 1: Añadir al div de la página (más simple si funciona bien)
             var targetPageDiv = $turnPagesContainer.find('.fp-page:nth-child(' + area.page + ')');
             if(targetPageDiv.length) {
                 targetPageDiv.css('position', 'relative'); // El contenedor de la página necesita ser relativo
                 targetPageDiv.append(areaDiv);
                 // console.log('Appended interactive area to page', area.page, areaDiv);
             } else {
                 console.warn('Could not find page div for page number', area.page);
             }

             // Estrategia 2 (más compleja, usando eventos):
             // Se necesitaría almacenar las áreas y en el evento 'turned',
             // verificar qué áreas corresponden a las páginas visibles (view[0], view[1])
             // y añadirlas/posicionarlas dinámicamente sobre $turnPagesContainer.
        });
    }
    */

});
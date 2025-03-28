fp-fribt.js

// js/fp-front.js
jQuery(document).ready(function ($) {
    // Verifica que PDF.js esté cargado y que se haya definido la variable fp_pdf_url
    if (typeof pdfjsLib !== 'undefined' && fp_pdf_url) {
        var loadingTask = pdfjsLib.getDocument(fp_pdf_url);
        loadingTask.promise.then(function (pdf) {
            var totalPages = pdf.numPages;
            var viewer = $('#fp-pdf-viewer');
            viewer.html(''); // Limpia el contenedor

            // Crea un contenedor para las páginas
            var pagesContainer = $('<div id="fp-pages-container"></div>');
            viewer.append(pagesContainer);

            // Para cada página, se crea un canvas donde se renderizará
            for (var i = 1; i <= totalPages; i++) {
                (function (pageNum) {
                    pdf.getPage(pageNum).then(function (page) {
                        var scale = 1.5;
                        var viewport = page.getViewport({ scale: scale });
                        var canvas = document.createElement('canvas');
                        canvas.className = 'fp-page-canvas';
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        var context = canvas.getContext('2d');
                        var renderContext = {
                            canvasContext: context,
                            viewport: viewport
                        };
                        page.render(renderContext).promise.then(function () {
                            // Cada canvas se envuelve en un contenedor (página) para Turn.js
                            var pageDiv = $('<div class="fp-page"></div>');
                            pageDiv.append(canvas);
                            $('#fp-pages-container').append(pageDiv);

                            // Una vez cargadas todas las páginas, se inicializa Turn.js
                            if ($('#fp-pages-container .fp-page').length === totalPages) {
                                $('#fp-pages-container').turn({
                                    width: viewport.width * 2,
                                    height: viewport.height,
                                    autoCenter: true
                                });
                            }
                        });
                    });
                })(i);
            }
        }, function (reason) {
            console.error("Error al cargar el PDF: ", reason);
        });
    }

    // Procesa las áreas interactivas definidas (se esperan coordenadas y propiedades en formato JSON)
    var areasData = $('#fp-interactive-areas').data('areas');
    if (areasData) {
        try {
            var areas = JSON.parse(areasData);
            // Por cada área definida, se crea un elemento superpuesto
            $.each(areas, function (index, area) {
                var areaDiv = $('<div class="fp-interactive-area"></div>');
                areaDiv.css({
                    position: 'absolute',
                    left: area.x + 'px',
                    top: area.y + 'px',
                    width: area.width + 'px',
                    height: area.height + 'px',
                    border: '2px dashed red',
                    cursor: 'pointer'
                });
                // Según el tipo de área, se asigna la acción
                if (area.type === 'linking') {
                    areaDiv.on('click', function (e) {
                        e.preventDefault();
                        // Muestra el link en un mensaje y, si se confirma, se abre en nueva pestaña
                        if (confirm("Ir a: " + area.value + "?")) {
                            window.open(area.value, '_blank');
                        }
                    });
                } else if (area.type === 'youtube') {
                    areaDiv.on('click', function (e) {
                        e.preventDefault();
                        // Abre el video de YouTube en una ventana emergente (popup)
                        var youtubeURL = "https://www.youtube.com/embed/" + area.value;
                        window.open(youtubeURL, 'YouTube Video', 'width=800,height=600');
                    });
                }
                // Se agrega el área sobre el visor (esto es una implementación básica; se puede mejorar posicionando según cada página)
                $('#fp-pdf-viewer').append(areaDiv);
            });
        } catch (err) {
            console.error("Error al interpretar el JSON de áreas interactivas: ", err);
        }
    }
});

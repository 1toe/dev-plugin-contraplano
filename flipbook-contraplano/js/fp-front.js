/**
 * Controlador principal del Flipbook Contraplano para WordPress
 * Versión: 1.5
 * Implementa funcionalidad de visualización PDF en formato flipbook
 */
jQuery(document).ready(function ($) {
    // Verificar dependencias cargadas
    if (typeof pdfjsLib === 'undefined') {
        console.error('PDF.js no está cargado. Asegúrese de que la biblioteca se cargue correctamente.');
        return;
    }

    // Configurar worker de PDF.js
    if (fpConfig && fpConfig.pdfWorkerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = fpConfig.pdfWorkerSrc;
    } else {
        console.warn('No se ha configurado la ruta del worker de PDF.js. Se usará el predeterminado.');
    }

    // Procesar cada instancia de flipbook en la página
    $('.flipbook-container').each(function () {
        // Elementos DOM y configuración
        const $container = $(this);
        const $viewerArea = $container.find('.fp-viewer-area');
        const $pdfViewer = $container.find('.fp-pdf-viewer');
        const $pagesContainer = $container.find('.fp-pages-container');
        const $loading = $container.find('.fp-loading');
        const $prevArrow = $container.find('.fp-arrow-left');
        const $nextArrow = $container.find('.fp-arrow-right');
        const $audioPlayer = $container.find('.fp-audio-player');
        const $pageInput = $container.find('.fp-page-input');
        const $totalPages = $container.find('.fp-total-pages');
        const $zoomSlider = $container.find('.fp-zoom-slider');
        const $zoomInBtn = $container.find('.fp-zoom-in');
        const $zoomOutBtn = $container.find('.fp-zoom-out');
        const $viewToggleBtn = $container.find('.fp-view-toggle');
        const $fullscreenBtn = $container.find('.fp-fullscreen');
        const $gotoPageBtn = $container.find('.fp-goto-page');

        // Estado del flipbook
        const pdfUrl = $container.data('pdf');
        let pdfDoc = null;
        let activeRenderTasks = {};
        let pages = [];
        let currentPageNum = 1;
        let totalPagesCount = 0;
        let zoomLevel = 1.0;
        let isRendering = false;
        let viewMode = $container.data('view-mode') || 'double';
        let isFullscreen = false;

        // Valores predefinidos para audios e interacciones
        const audios = fpConfig?.audios || [];
        const interactiveAreas = fpConfig?.interactiveAreas || [];

        // Cancelar tareas de renderizado anteriores para mejorar rendimiento
        function cancelRenderTasks() {
            Object.values(activeRenderTasks).forEach(task => {
                if (task && typeof task.cancel === 'function') {
                    task.cancel();
                }
            });
            activeRenderTasks = {};
        }

        // Renderizar una página del PDF
        async function renderPage(pageNumber, element, scale = 1) {
            if (!pdfDoc || pageNumber < 1 || pageNumber > totalPagesCount) {
                console.error(`Número de página inválido: ${pageNumber}`);
                return null;
            }

            const pageIndex = pageNumber - 1;
            const taskId = `page_${pageNumber}_${scale.toFixed(2)}`;

            // Cancelar renderizado previo de esta página
            if (activeRenderTasks[taskId]) {
                activeRenderTasks[taskId].cancel();
                delete activeRenderTasks[taskId];
            }

            try {
                // Obtener la página PDF
                const pdfPage = await pdfDoc.getPage(pageNumber);

                // Calcular viewport según escala
                const viewport = pdfPage.getViewport({ scale });

                // Crear o reutilizar canvas
                let canvas = $(element).find('canvas')[0];
                if (!canvas) {
                    canvas = document.createElement('canvas');
                    $(element).append(canvas);
                }

                // Configurar canvas para renderizado
                const context = canvas.getContext('2d');
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);

                // Contexto para renderizar
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                // Renderizar la página
                const renderTask = pdfPage.render(renderContext);
                activeRenderTasks[taskId] = renderTask;

                await renderTask.promise;
                delete activeRenderTasks[taskId];

                // Almacenar dimensiones y referencia a la página
                pages[pageIndex] = {
                    pageNum: pageNumber,
                    width: viewport.width,
                    height: viewport.height,
                    rendered: true,
                    element: $(element)
                };

                return {
                    element: $(element),
                    width: viewport.width,
                    height: viewport.height
                };
            } catch (error) {
                if (error instanceof pdfjsLib.RenderingCancelledException) {
                    console.log(`Renderizado de página ${pageNumber} cancelado`);
                } else {
                    console.error(`Error al renderizar página ${pageNumber}:`, error);
                }
                return null;
            }
        }

        // Inicializar el flipbook
        async function initFlipbook() {
            if (!pdfUrl) {
                $loading.text('Error: URL del PDF no encontrada');
                return;
            }

            try {
                $loading.show();

                // Cargar el PDF
                pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
                totalPagesCount = pdfDoc.numPages;

                // Inicializar array de páginas
                pages = new Array(totalPagesCount);

                // Actualizar UI con total de páginas
                $totalPages.text(totalPagesCount);
                $pageInput.attr('max', totalPagesCount);

                // Configurar contenedor para vista
                setupViewMode();

                // Renderizar páginas iniciales
                await renderCurrentView();
                preloadAdjacentPages();

                // Configurar eventos de interacción
                setupEventListeners();

                $loading.hide();
            } catch (error) {
                console.error('Error al cargar el PDF:', error);
                $loading.text(`Error al cargar el PDF: ${error.message}`);
            }
        }

        // Configurar modo de visualización (simple/doble)
        function setupViewMode() {
            $container.attr('data-view-mode', viewMode);

            // Actualizar UI del botón de modo
            if (viewMode === 'single') {
                $viewToggleBtn.attr('title', 'Cambiar a vista doble');
            } else {
                $viewToggleBtn.attr('title', 'Cambiar a vista simple');
            }
        }

        // Renderizar la vista actual según el modo y página actual
        async function renderCurrentView() {
            if (isRendering) return;
            isRendering = true;

            try {
                // Limpiar contenedor y preparar renderizado
                cancelRenderTasks();
                $prevArrow.prop('disabled', currentPageNum <= 1);
                $nextArrow.prop('disabled', currentPageNum >= totalPagesCount);

                // Actualizar input de página
                $pageInput.val(currentPageNum);

                if (viewMode === 'single') {
                    await renderSinglePageView();
                } else {
                    await renderDoublePageView();
                }

                // Actualizar audio para la página actual
                updateAudioForPage(currentPageNum);

                // Renderizar áreas interactivas
                renderInteractiveAreas();
            } catch (error) {
                console.error('Error al renderizar vista:', error);
            } finally {
                isRendering = false;
            }
        }

        // Renderizar vista de página individual
        async function renderSinglePageView() {
            // Limpiar contenedor
            $pagesContainer.empty();

            // Crear contenedor para la página
            const $pageElement = $('<div class="fp-page active"></div>');
            $pagesContainer.append($pageElement);

            // Definir dimensiones de la página
            const containerHeight = $pdfViewer.height() * 0.95;
            const containerWidth = $pdfViewer.width() * 0.9;

            try {
                // Obtener página para calcular proporciones
                const page = await pdfDoc.getPage(currentPageNum);
                const viewport = page.getViewport({ scale: 1.0 });

                // Calcular escala para ajustar al contenedor
                const scale = Math.min(
                    containerWidth / viewport.width,
                    containerHeight / viewport.height
                ) * zoomLevel;

                // Aplicar escala a la página
                await renderPage(currentPageNum, $pageElement, scale);

                // Centrar la página en el contenedor
                const scaledViewport = page.getViewport({ scale });
                $pageElement.css({
                    width: `${scaledViewport.width}px`,
                    height: `${scaledViewport.height}px`
                });
            } catch (error) {
                console.error(`Error al renderizar página ${currentPageNum}:`, error);
            }
        }

        // Renderizar vista de página doble
        async function renderDoublePageView() {
            // Limpiar contenedor
            $pagesContainer.empty();

            // Determinar páginas a mostrar (izq/der)
            let leftPageNum = currentPageNum % 2 === 0 ? currentPageNum - 1 : currentPageNum;
            let rightPageNum = leftPageNum + 1;

            // Manejar casos especiales (primera y última página)
            if (leftPageNum < 1) {
                leftPageNum = 1;
                rightPageNum = 2;
            }

            if (rightPageNum > totalPagesCount) {
                // Si estamos en la última página y es impar
                if (totalPagesCount % 2 !== 0 && currentPageNum === totalPagesCount) {
                    // Mostrar última página centrada
                    await renderSingleCenterPage(currentPageNum);
                    return;
                } else {
                    // Ajustar para evitar páginas fuera de rango
                    rightPageNum = totalPagesCount;
                    leftPageNum = rightPageNum - 1;
                    if (leftPageNum < 1) leftPageNum = 1;
                }
            }

            // Caso especial: primera página sola
            if (leftPageNum === 1 && fpConfig.startWithDoublePage !== true) {
                await renderSingleCenterPage(1);
                return;
            }

            // Crear elementos de página
            const $leftPage = $('<div class="fp-page left-page"></div>');
            const $rightPage = $('<div class="fp-page right-page"></div>');

            if (leftPageNum === currentPageNum || rightPageNum === currentPageNum) {
                // Marcar la página actual como activa
                if (leftPageNum === currentPageNum) {
                    $leftPage.addClass('active');
                } else {
                    $rightPage.addClass('active');
                }
            } else {
                // Si ninguna es la actual, activar la izquierda por defecto
                $leftPage.addClass('active');
                currentPageNum = leftPageNum; // Actualizar página actual
            }

            $pagesContainer.append($leftPage, $rightPage);

            // Dimensiones del contenedor
            const containerHeight = $pdfViewer.height() * 0.95;
            const containerWidth = $pdfViewer.width() * 0.9;

            try {
                // Obtener página para calcular proporciones
                const page = await pdfDoc.getPage(leftPageNum);
                const viewport = page.getViewport({ scale: 1.0 });

                // Calcular escala para ajustar ambas páginas
                const scale = Math.min(
                    (containerWidth / 2) / viewport.width,
                    containerHeight / viewport.height
                ) * zoomLevel;

                // Renderizar ambas páginas
                const leftResult = await renderPage(leftPageNum, $leftPage, scale);
                const rightResult = await renderPage(rightPageNum, $rightPage, scale);

                if (leftResult && rightResult) {
                    // Aplicar dimensiones
                    $leftPage.css({
                        width: `${leftResult.width}px`,
                        height: `${leftResult.height}px`
                    });

                    $rightPage.css({
                        width: `${rightResult.width}px`,
                        height: `${rightResult.height}px`
                    });
                }
            } catch (error) {
                console.error(`Error al renderizar páginas ${leftPageNum}/${rightPageNum}:`, error);
            }
        }

        // Renderizar página única centrada (primera o última)
        async function renderSingleCenterPage(pageNum) {
            // Limpiar contenedor
            $pagesContainer.empty();

            // Crear elemento de página
            const $page = $('<div class="fp-page single-center-page active"></div>');
            $pagesContainer.append($page);

            // Dimensiones del contenedor
            const containerHeight = $pdfViewer.height() * 0.95;
            const containerWidth = $pdfViewer.width() * 0.9;

            try {
                // Obtener página para calcular proporciones
                const page = await pdfDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.0 });

                // Calcular escala para ajustar al contenedor
                const scale = Math.min(
                    containerWidth / viewport.width,
                    containerHeight / viewport.height
                ) * zoomLevel;

                // Renderizar página
                const result = await renderPage(pageNum, $page, scale);

                if (result) {
                    // Aplicar dimensiones
                    $page.css({
                        width: `${result.width}px`,
                        height: `${result.height}px`
                    });
                }
            } catch (error) {
                console.error(`Error al renderizar página centrada ${pageNum}:`, error);
            }
        }

        // Precargar páginas adyacentes para navegación más fluida
        function preloadAdjacentPages() {
            const pageIndexes = [];

            if (viewMode === 'single') {
                // En modo simple, precargar página siguiente y anterior
                if (currentPageNum < totalPagesCount) pageIndexes.push(currentPageNum + 1);
                if (currentPageNum > 1) pageIndexes.push(currentPageNum - 1);
            } else {
                // En modo doble, determinar páginas lógicas adyacentes
                const isEven = currentPageNum % 2 === 0;
                const leftPage = isEven ? currentPageNum - 1 : currentPageNum;
                const rightPage = leftPage + 1;

                // Páginas anteriores
                if (leftPage > 2) pageIndexes.push(leftPage - 2);
                if (leftPage > 1) pageIndexes.push(leftPage - 1);

                // Páginas siguientes
                if (rightPage < totalPagesCount) pageIndexes.push(rightPage + 1);
                if (rightPage + 1 < totalPagesCount) pageIndexes.push(rightPage + 2);
            }

            // Programar precarga con baja prioridad
            setTimeout(() => {
                pageIndexes.forEach(pageNum => {
                    // Crear elemento oculto para precarga
                    const $pageElement = $('<div class="fp-page" style="display:none;"></div>');
                    $pagesContainer.append($pageElement);

                    // Renderizar con escala más baja para ahorrar memoria
                    renderPage(pageNum, $pageElement, zoomLevel * 0.8).then(() => {
                        // Almacenar para uso futuro
                        pages[pageNum - 1] = {
                            pageNum: pageNum,
                            element: $pageElement,
                            rendered: true
                        };
                    }).catch(err => {
                        // Eliminar elemento si falla la precarga
                        $pageElement.remove();
                    });
                });
            }, 500); // Retrasar para priorizar renderizado de página actual
        }

        // Actualizar audio para la página actual
        function updateAudioForPage(pageNum) {
            // Detener cualquier audio anterior
            $audioPlayer.removeClass('visible');
            $audioPlayer.attr('src', '');

            // Si hay un audio asociado a esta página
            if (audios && audios[pageNum - 1]) {
                const audioUrl = audios[pageNum - 1];
                if (audioUrl && audioUrl.trim() !== '') {
                    $audioPlayer.attr('src', audioUrl);
                    $audioPlayer.addClass('visible');
                }
            }
        }

        // Renderizar áreas interactivas
        function renderInteractiveAreas() {
            // Eliminar áreas anteriores
            $('.fp-interactive-area').remove();

            if (!interactiveAreas || interactiveAreas.length === 0) return;

            // Crear áreas para la página actual
            interactiveAreas.forEach((area, index) => {
                const areaPage = parseInt(area.page, 10);
                if (isCurrentlyVisiblePage(areaPage)) {
                    createInteractiveArea(area, index);
                }
            });

            // Vincular acciones de eventos
            $('.fp-interactive-area').on('click', handleAreaClick);
        }

        // Verificar si una página está visible actualmente
        function isCurrentlyVisiblePage(pageNum) {
            if (viewMode === 'single') {
                return pageNum === currentPageNum;
            } else {
                // En modo doble, pueden ser visibles dos páginas
                const isEven = currentPageNum % 2 === 0;
                const leftPage = isEven ? currentPageNum - 1 : currentPageNum;
                const rightPage = leftPage + 1;

                // Casos especiales: primera página sola, última página sola
                if (leftPage === 1 && fpConfig.startWithDoublePage !== true) {
                    return pageNum === 1;
                }

                if (rightPage > totalPagesCount && totalPagesCount % 2 !== 0) {
                    return pageNum === totalPagesCount;
                }

                return pageNum === leftPage || pageNum === rightPage;
            }
        }

        // Crear área interactiva en la página
        function createInteractiveArea(area, index) {
            const x = parseFloat(area.x);
            const y = parseFloat(area.y);
            const width = parseFloat(area.width);
            const height = parseFloat(area.height);
            const areaPage = parseInt(area.page, 10);
            const tooltip = area.tooltip || '';

            // Encontrar el elemento de página correspondiente
            let $targetPage;

            if (viewMode === 'single') {
                $targetPage = $pagesContainer.find('.fp-page.active');
            } else {
                if (areaPage % 2 === 1) {
                    $targetPage = $pagesContainer.find('.fp-page.left-page');
                } else {
                    $targetPage = $pagesContainer.find('.fp-page.right-page');
                }

                // Manejar caso especial: página única centrada
                if ($pagesContainer.find('.fp-page.single-center-page').length) {
                    $targetPage = $pagesContainer.find('.fp-page.single-center-page');
                }
            }

            if (!$targetPage.length) return;

            // Calcular posición escalada
            const pageWidth = $targetPage.width();
            const pageHeight = $targetPage.height();
            const scaleX = pageWidth / area.baseWidth || 1;
            const scaleY = pageHeight / area.baseHeight || 1;

            const scaledX = x * scaleX;
            const scaledY = y * scaleY;
            const scaledWidth = width * scaleX;
            const scaledHeight = height * scaleY;

            // Crear elemento para el área
            const $area = $('<div class="fp-interactive-area"></div>')
                .css({
                    left: `${scaledX}px`,
                    top: `${scaledY}px`,
                    width: `${scaledWidth}px`,
                    height: `${scaledHeight}px`
                })
                .attr({
                    'data-area-index': index,
                    'data-area-type': area.type || 'url',
                    'data-area-page': areaPage,
                    'data-target': area.url || area.target_page || area.youtube_url || area.audio_url || ''
                });

            // Añadir tooltip si existe
            if (tooltip) {
                $area.append(`<span class="fp-interactive-tooltip">${tooltip}</span>`);
            }

            // Clases específicas según tipo
            if (area.type === 'youtube') {
                $area.addClass('fp-youtube-area');
            } else if (area.type === 'page') {
                $area.addClass('fp-page-jump-area');
            } else if (area.type === 'audio') {
                $area.addClass('fp-audio-area');
                $area.append('<div class="fp-audio-icon"></div>');
            }

            // Añadir al DOM
            $targetPage.append($area);
        }

        // Manejar clic en área interactiva
        function handleAreaClick(e) {
            e.preventDefault();
            const $area = $(this);
            const areaIndex = $area.data('area-index');
            const areaType = $area.data('area-type');

            if (!interactiveAreas || !interactiveAreas[areaIndex]) return;

            const area = interactiveAreas[areaIndex];

            switch (areaType) {
                case 'url':
                    // Abrir URL
                    if (area.url) {
                        const target = area.new_tab ? '_blank' : '_self';
                        window.open(area.url, target);
                    }
                    break;

                case 'page':
                    // Ir a página
                    if (area.target_page) {
                        goToPage(parseInt(area.target_page, 10));
                    }
                    break;

                case 'youtube':
                    // Mostrar video de YouTube
                    if (area.youtube_url) {
                        showYouTubePopup(area.tooltip || 'Video', area.youtube_url);
                    }
                    break;

                case 'audio':
                    // Reproducir audio
                    if (area.audio_url) {
                        playAudio(area.audio_url);
                    }
                    break;
            }
        }

        // Mostrar popup con video de YouTube
        function showYouTubePopup(title, videoId) {
            // Limpiar videoId (permitir formatos completos de URL)
            if (videoId.indexOf('youtube.com') !== -1 || videoId.indexOf('youtu.be') !== -1) {
                // Extraer ID de URL completa
                const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
                const match = videoId.match(regex);
                videoId = match ? match[1] : videoId;
            }

            const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

            // Crear popup
            const $overlay = $('<div class="fp-popup-overlay"></div>');
            const $popup = $(`
                <div class="fp-popup">
                    <div class="fp-popup-header">
                        <h3>${title}</h3>
                        <button class="fp-popup-close">&times;</button>
                    </div>
                    <div class="fp-popup-body">
                        <div class="fp-video-container">
                            <iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>
                        </div>
                    </div>
                </div>
            `);

            $overlay.append($popup);
            $('body').append($overlay);

            // Manejar cierre
            $overlay.on('click', function (e) {
                if ($(e.target).is($overlay) || $(e.target).is('.fp-popup-close')) {
                    $overlay.remove();
                }
            });
        }

        // Reproducir audio
        function playAudio(audioUrl) {
            // Detener cualquier audio anterior
            $audioPlayer.removeClass('visible');
            $audioPlayer.attr('src', '');

            // Reproducir nuevo audio
            if (audioUrl && audioUrl.trim() !== '') {
                $audioPlayer.attr('src', audioUrl);
                $audioPlayer.addClass('visible');
                $audioPlayer[0].play();
            }
        }

        // Ir a una página específica
        function goToPage(pageNum) {
            if (pageNum < 1 || pageNum > totalPagesCount) return;

            // Actualizar página actual
            currentPageNum = pageNum;

            // Renderizar nueva vista
            renderCurrentView();
        }

        // Configurar eventos de interacción
        function setupEventListeners() {
            // Navegación con flechas
            $prevArrow.on('click', function () {
                if ($(this).prop('disabled')) return;

                if (viewMode === 'single') {
                    goToPage(currentPageNum - 1);
                } else {
                    // En modo doble, retroceder dos páginas
                    const isEven = currentPageNum % 2 === 0;
                    const targetPage = isEven ? currentPageNum - 2 : currentPageNum - 1;
                    goToPage(Math.max(1, targetPage));
                }
            });

            $nextArrow.on('click', function () {
                if ($(this).prop('disabled')) return;

                if (viewMode === 'single') {
                    goToPage(currentPageNum + 1);
                } else {
                    // En modo doble, avanzar dos páginas
                    const isEven = currentPageNum % 2 === 0;
                    const targetPage = isEven ? currentPageNum + 1 : currentPageNum + 2;
                    goToPage(Math.min(totalPagesCount, targetPage));
                }
            });

            // Entrada directa de página
            $pageInput.on('keypress', function (e) {
                if (e.which === 13) {
                    e.preventDefault();
                    const pageNum = parseInt($(this).val(), 10);
                    goToPage(pageNum);
                }
            });

            $gotoPageBtn.on('click', function () {
                const pageNum = parseInt($pageInput.val(), 10);
                goToPage(pageNum);
            });

            // Zoom
            $zoomSlider.on('input', function () {
                zoomLevel = parseFloat($(this).val());
                renderCurrentView();
            });

            $zoomInBtn.on('click', function () {
                zoomLevel = Math.min(3.0, zoomLevel + 0.1);
                $zoomSlider.val(zoomLevel);
                renderCurrentView();
            });

            $zoomOutBtn.on('click', function () {
                zoomLevel = Math.max(0.5, zoomLevel - 0.1);
                $zoomSlider.val(zoomLevel);
                renderCurrentView();
            });

            // Cambiar modo de vista
            $viewToggleBtn.on('click', function () {
                viewMode = viewMode === 'single' ? 'double' : 'single';
                setupViewMode();
                renderCurrentView();
            });

            // Pantalla completa
            $fullscreenBtn.on('click', function () {
                toggleFullscreen();
            });

            // Selector de tema claro/oscuro si está habilitado
            $('.fp-background-option').on('click', function () {
                const theme = $(this).data('theme');
                $('.fp-background-option').removeClass('active');
                $(this).addClass('active');

                $container.removeClass('dark-mode light-mode');
                $container.addClass(theme + '-mode');
            });

            // Eventos de teclado cuando el flipbook tiene foco
            $container.on('click', function () {
                $(this).addClass('has-focus');
            });

            $(document).on('keydown', function (e) {
                if (!$container.hasClass('has-focus')) return;

                switch (e.which) {
                    case 37: // Flecha izquierda
                        $prevArrow.trigger('click');
                        break;
                    case 39: // Flecha derecha
                        $nextArrow.trigger('click');
                        break;
                    case 36: // Inicio
                        goToPage(1);
                        break;
                    case 35: // Fin
                        goToPage(totalPagesCount);
                        break;
                }
            });

            // Perder foco al hacer clic fuera
            $(document).on('click', function (e) {
                if (!$(e.target).closest($container).length) {
                    $container.removeClass('has-focus');
                }
            });

            // Redimensionar ventana
            let resizeTimer;
            $(window).on('resize', function () {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function () {
                    renderCurrentView();
                }, 200);
            });
        }

        // Alternar pantalla completa
        function toggleFullscreen() {
            if (!isFullscreen) {
                if ($container[0].requestFullscreen) {
                    $container[0].requestFullscreen();
                } else if ($container[0].mozRequestFullScreen) {
                    $container[0].mozRequestFullScreen();
                } else if ($container[0].webkitRequestFullscreen) {
                    $container[0].webkitRequestFullscreen();
                } else if ($container[0].msRequestFullscreen) {
                    $container[0].msRequestFullscreen();
                } else {
                    // Fallback si las APIs nativas no están disponibles
                    $container.addClass('fullscreen-active');
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                } else {
                    // Fallback
                    $container.removeClass('fullscreen-active');
                }
            }
        }

        // Escuchar cambios en el estado de pantalla completa
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        function handleFullscreenChange() {
            isFullscreen = !!document.fullscreenElement ||
                !!document.mozFullScreenElement ||
                !!document.webkitFullscreenElement ||
                !!document.msFullscreenElement;

            if (isFullscreen) {
                $container.addClass('fullscreen-active');
                $fullscreenBtn.attr('title', 'Salir de pantalla completa');
            } else {
                $container.removeClass('fullscreen-active');
                $fullscreenBtn.attr('title', 'Pantalla completa');
            }

            // Re-renderizar para ajustar al nuevo tamaño
            setTimeout(renderCurrentView, 100);
        }

        // Iniciar flipbook
        initFlipbook();
    });
});
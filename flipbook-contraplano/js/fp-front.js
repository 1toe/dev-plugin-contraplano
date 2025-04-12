/**
 * Flipbook Contraplano - Controlador principal de frontend
 * Versión: 2.0
 * Implementa funcionalidad de visualización PDF en formato flipbook con Turn.js
 */
jQuery(document).ready(function ($) {
    'use strict';

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

    /**
     * Clase principal del Flipbook
     */
    class FlipbookController {
        /**
         * Constructor de la clase
         * @param {HTMLElement} container - El contenedor del flipbook
         */
        constructor(container) {
            // Elementos DOM
            this.$container = $(container);
            this.$viewerArea = this.$container.find('.fp-viewer-area');
            this.$pdfViewer = this.$container.find('.fp-pdf-viewer');
            this.$pagesContainer = this.$container.find('.fp-pages-container');
            this.$loading = this.$container.find('.fp-loading');
            this.$prevArrow = this.$container.find('.fp-arrow-left');
            this.$nextArrow = this.$container.find('.fp-arrow-right');
            this.$audioPlayer = this.$container.find('.fp-audio-player');
            this.$pageInput = this.$container.find('.fp-page-input');
            this.$totalPages = this.$container.find('.fp-total-pages');
            this.$zoomSlider = this.$container.find('.fp-zoom-slider');
            this.$zoomInBtn = this.$container.find('.fp-zoom-in');
            this.$zoomOutBtn = this.$container.find('.fp-zoom-out');
            this.$viewToggleBtn = this.$container.find('.fp-view-toggle');
            this.$fullscreenBtn = this.$container.find('.fp-fullscreen');
            this.$gotoPageBtn = this.$container.find('.fp-goto-page');
            
            // Estado del flipbook
            this.pdfUrl = this.$container.data('pdf');
            this.pdfDoc = null;
            this.activeRenderTasks = {};
            this.pages = [];
            this.pageCache = new Map(); // Cache para páginas renderizadas
            this.currentPageNum = 1;
            this.totalPagesCount = 0;
            this.zoomLevel = 1.0;
            this.isRendering = false;
            this.viewMode = this.$container.data('view-mode') || 'double';
            this.isFullscreen = false;
            this.turnJsInitialized = false;
            
            // Valores predefinidos para audios e interacciones
            this.audios = fpConfig?.audios || [];
            this.interactiveAreas = fpConfig?.interactiveAreas || [];
            this.indesignData = fpConfig?.indesignData || [];
            
            // Player de audio/video
            this.audioPlayer = null;
            
            // Inicializar
            this.init();
        }
        
        /**
         * Inicializar controlador
         */
        async init() {
            try {
                await this.loadPdf();
                this.setupEventListeners();
                
                // Intentar cargar una página guardada si existe
                const savedPage = parseInt(localStorage.getItem(`fp_last_page_${fpConfig?.postId}`), 10);
                if (!isNaN(savedPage) && savedPage > 0 && savedPage <= this.totalPagesCount) {
                    this.currentPageNum = savedPage;
                }
                
                // Inicializar interfaz
                await this.initializeFlipbook();
            } catch (error) {
                console.error('Error al inicializar el flipbook:', error);
                this.showError('Error al inicializar el flipbook: ' + error.message);
            }
        }
        
        /**
         * Cargar el PDF
         */
        async loadPdf() {
            if (!this.pdfUrl) {
                throw new Error('URL del PDF no encontrada');
            }
            
            this.$loading.show();
            
            try {
                // Cargar documento PDF
                const loadingTask = pdfjsLib.getDocument(this.pdfUrl);
                
                // Mostrar progreso de carga
                loadingTask.onProgress = (progressData) => {
                    if (progressData.total > 0) {
                        const percent = Math.round((progressData.loaded / progressData.total) * 100);
                        this.$loading.text(`Cargando PDF... ${percent}%`);
                    }
                };
                
                this.pdfDoc = await loadingTask.promise;
                this.totalPagesCount = this.pdfDoc.numPages;
                
                // Inicializar array de páginas
                this.pages = new Array(this.totalPagesCount);
                
                // Actualizar UI con total de páginas
                this.$totalPages.text(this.totalPagesCount);
                this.$pageInput.attr('max', this.totalPagesCount);
                
            } catch (error) {
                console.error('Error al cargar el PDF:', error);
                this.showError('Error al cargar el PDF: ' + error.message);
                throw error;
            }
        }
        
        /**
         * Inicializar el flipbook después de cargar el PDF
         */
        async initializeFlipbook() {
            this.$loading.show();
            
            try {
                if (this.viewMode === 'double') {
                    await this.initDoublePage();
                } else {
                    await this.initSinglePage();
                }
                
                // Actualizar la navegación
                this.updateNavigation();
                
                // Cargar audio para la página actual
                this.updateAudioForPage(this.currentPageNum);
                
                // Precargar algunas páginas adyacentes para mejorar rendimiento
                this.preloadAdjacentPages();
                
                // Ocultar loading cuando todo esté listo
                this.$loading.hide();
            } catch (error) {
                console.error('Error al inicializar el flipbook:', error);
                this.showError('Error al configurar el flipbook: ' + error.message);
            }
        }
        
        /**
         * Inicializar vista de página doble con Turn.js
         */
        async initDoublePage() {
            // Verificar si Turn.js está disponible
            if (typeof $.fn.turn === 'undefined') {
                throw new Error('Turn.js no está disponible');
            }
            
            // Preparar el contenedor para Turn.js
            this.$pagesContainer.empty();
            this.$pagesContainer.addClass('fp-turnjs-container');
            
            // Determinar número de páginas a precargar
            const initialPagesToLoad = Math.min(6, this.totalPagesCount);
            
            // Crear elementos de páginas iniciales
            for (let i = 1; i <= initialPagesToLoad; i++) {
                const $page = $('<div class="fp-page"><div class="fp-page-content"></div></div>');
                this.$pagesContainer.append($page);
                
                // Renderizar contenido de la página
                if (i <= initialPagesToLoad) {
                    await this.renderPage(i, $page.find('.fp-page-content'), this.zoomLevel);
                }
            }
            
            // Configurar opciones de Turn.js
            const turnOptions = {
                width: this.$pdfViewer.width() * 0.9,
                height: this.$pdfViewer.height() * 0.9,
                autoCenter: true,
                display: 'double',
                acceleration: true,
                elevation: 50,
                gradients: true,
                when: {
                    turning: (event, page, view) => {
                        this.handlePageTurning(page);
                    },
                    turned: (event, page, view) => {
                        this.handlePageTurned(page, view);
                    }
                }
            };
            
            // Casos especiales
            if (fpConfig.startWithDoublePage === false) {
                turnOptions.display = 'single';
                turnOptions.when.first = () => {
                    this.$pagesContainer.turn('display', 'single');
                };
                
                turnOptions.when.progress = (event, progress) => {
                    if (this.$pagesContainer.turn('page') > 1) {
                        this.$pagesContainer.turn('display', 'double');
                    }
                };
            }
            
            // Inicializar Turn.js
            this.$pagesContainer.turn(turnOptions);
            this.turnJsInitialized = true;
            
            // Ir a la página inicial
            setTimeout(() => {
                this.$pagesContainer.turn('page', this.currentPageNum);
            }, 100);
        }
        
        /**
         * Inicializar vista de página simple
         */
        async initSinglePage() {
            // Preparar el contenedor
            this.$pagesContainer.empty();
            
            // Crear contenedor para la página
            const $pageElement = $('<div class="fp-page active"><div class="fp-page-content"></div></div>');
            this.$pagesContainer.append($pageElement);
            
            // Renderizar la primera página
            await this.renderPage(this.currentPageNum, $pageElement.find('.fp-page-content'), this.zoomLevel);
            
            // Renderizar áreas interactivas
            this.renderInteractiveAreas();
        }
        
        /**
         * Manejar evento antes de cambiar de página
         */
        handlePageTurning(page) {
            // Actualizar número de página actual
            this.currentPageNum = page;
            
            // Guardar página actual en localStorage
            if (fpConfig?.postId) {
                localStorage.setItem(`fp_last_page_${fpConfig.postId}`, page.toString());
            }
            
            // Precargar páginas necesarias
            this.ensurePageLoaded(page);
            
            // Páginas adyacentes para precargar
            const pagesToEnsure = [];
            if (page > 1) pagesToEnsure.push(page - 1);
            if (page < this.totalPagesCount) pagesToEnsure.push(page + 1);
            if (page + 2 <= this.totalPagesCount) pagesToEnsure.push(page + 2);
            
            // Precargar en segundo plano
            setTimeout(() => {
                pagesToEnsure.forEach(pageNum => this.ensurePageLoaded(pageNum));
            }, 100);
            
            // Actualizar navegación
            this.updateNavigation();
        }
        
        /**
         * Manejar evento después de cambiar de página
         */
        handlePageTurned(page, view) {
            // Actualizar audio
            this.updateAudioForPage(page);
            
            // Renderizar áreas interactivas
            this.renderInteractiveAreas();
            
            // Actualizar input de página
            this.$pageInput.val(page);
            
            // Limpiar páginas distantes para ahorrar memoria
            this.cleanupDistantPages(page);
        }
        
        /**
         * Asegurar que una página está cargada en el DOM
         */
        async ensurePageLoaded(pageNum) {
            if (pageNum < 1 || pageNum > this.totalPagesCount) return;
            
            // Buscar si la página ya existe en Turn.js
            const $existingPage = this.$pagesContainer.find('.page-' + pageNum);
            if ($existingPage.length > 0) {
                return;
            }
            
            // Si usamos Turn.js, crear la página necesaria
            if (this.turnJsInitialized) {
                // Añadir página en Turn.js
                const $newPage = $('<div class="fp-page"><div class="fp-page-content"></div></div>');
                $newPage.addClass('page-' + pageNum);
                
                // Determinar dónde insertarla
                this.$pagesContainer.turn('addPage', $newPage, pageNum);
                
                // Renderizar contenido
                await this.renderPage(pageNum, $newPage.find('.fp-page-content'), this.zoomLevel);
            }
        }
        
        /**
         * Limpiar páginas distantes para optimizar memoria
         */
        cleanupDistantPages(currentPage) {
            if (!this.turnJsInitialized) return;
            
            // Mantener en memoria solo un rango de páginas cercanas
            const keepRange = 5; // Mantener N páginas antes y después
            
            // Iterar sobre todas las páginas del DOM
            this.$pagesContainer.find('.fp-page').each((idx, page) => {
                const $page = $(page);
                const pageNum = $page.data('page-number');
                
                // Si no tiene número de página, ignorar
                if (!pageNum) return;
                
                // Verificar si está fuera del rango a mantener
                if (Math.abs(pageNum - currentPage) > keepRange) {
                    // No eliminar la página del DOM ya que Turn.js las necesita
                    // Solo vaciar su contenido para ahorrar memoria
                    if (!$page.hasClass('fp-empty-placeholder')) {
                        $page.find('.fp-page-content').empty();
                        $page.addClass('fp-empty-placeholder');
                    }
                }
            });
        }
        
        /**
         * Renderizar una página específica del PDF
         */
        async renderPage(pageNumber, element, scale = 1) {
            if (!this.pdfDoc || pageNumber < 1 || pageNumber > this.totalPagesCount) {
                console.error(`Número de página inválido: ${pageNumber}`);
                return null;
            }
            
            // Crear una clave única para esta solicitud de renderizado
            const pageIndex = pageNumber - 1;
            const cacheKey = `page_${pageNumber}_${scale.toFixed(2)}`;
            
            // Verificar si ya tenemos esta página en caché
            if (this.pageCache.has(cacheKey)) {
                const cachedPage = this.pageCache.get(cacheKey);
                
                // Clonar el canvas cacheado si existe
                if (cachedPage.canvas) {
                    const canvas = cachedPage.canvas.cloneNode(true);
                    $(element).html(canvas);
                    
                    // Almacenar dimensiones y referencia
                    this.pages[pageIndex] = {
                        pageNum: pageNumber,
                        width: cachedPage.width,
                        height: cachedPage.height,
                        rendered: true,
                        element: $(element)
                    };
                    
                    return {
                        element: $(element),
                        width: cachedPage.width,
                        height: cachedPage.height
                    };
                }
            }
            
            // Cancelar tarea de renderizado anterior para esta página si existe
            if (this.activeRenderTasks[cacheKey]) {
                this.activeRenderTasks[cacheKey].cancel();
                delete this.activeRenderTasks[cacheKey];
            }
            
            try {
                // Obtener la página del PDF
                const pdfPage = await this.pdfDoc.getPage(pageNumber);
                
                // Calcular viewport según escala
                const viewport = pdfPage.getViewport({ scale });
                
                // Crear canvas para renderizado
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                
                // Configurar dimensiones
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                canvas.dataset.pageNumber = pageNumber;
                
                // Añadir canvas al DOM
                $(element).html(canvas);
                
                // Crear contexto de renderizado
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                
                // Renderizar la página
                const renderTask = pdfPage.render(renderContext);
                this.activeRenderTasks[cacheKey] = renderTask;
                
                await renderTask.promise;
                delete this.activeRenderTasks[cacheKey];
                
                // Guardar en caché
                this.pageCache.set(cacheKey, {
                    canvas: canvas,
                    width: viewport.width,
                    height: viewport.height
                });
                
                // Almacenar dimensiones y referencia
                this.pages[pageIndex] = {
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
        
        /**
         * Actualizar controles de navegación
         */
        updateNavigation() {
            // Actualizar estado de los botones de navegación
            this.$prevArrow.prop('disabled', this.currentPageNum <= 1);
            this.$nextArrow.prop('disabled', this.currentPageNum >= this.totalPagesCount);
            
            // Actualizar input de página
            this.$pageInput.val(this.currentPageNum);
            
            // Si estamos en página 1, considerar si debe ser vista simple o doble
            if (this.turnJsInitialized && this.currentPageNum === 1 && fpConfig.startWithDoublePage === false) {
                this.$pagesContainer.turn('display', 'single');
            }
        }
        
        /**
         * Precargar páginas adyacentes
         */
        preloadAdjacentPages() {
            const pagesToPreload = [];
            
            // Determinar páginas a precargar según el modo de vista
            if (this.viewMode === 'single') {
                // En modo simple, precargar página siguiente y anterior
                if (this.currentPageNum < this.totalPagesCount) pagesToPreload.push(this.currentPageNum + 1);
                if (this.currentPageNum > 1) pagesToPreload.push(this.currentPageNum - 1);
            } else {
                // En modo doble, considerar pares de páginas
                const isEven = this.currentPageNum % 2 === 0;
                const leftPage = isEven ? this.currentPageNum - 1 : this.currentPageNum;
                const rightPage = leftPage + 1;
                
                // Páginas anteriores
                if (leftPage > 2) pagesToPreload.push(leftPage - 2);
                if (leftPage > 1) pagesToPreload.push(leftPage - 1);
                
                // Páginas siguientes
                if (rightPage < this.totalPagesCount) pagesToPreload.push(rightPage + 1);
                if (rightPage + 1 < this.totalPagesCount) pagesToPreload.push(rightPage + 2);
            }
            
            // Programar precarga con baja prioridad
            setTimeout(() => {
                pagesToPreload.forEach(pageNum => {
                    // Si usamos Turn.js, asegurar que la página existe
                    if (this.turnJsInitialized) {
                        this.ensurePageLoaded(pageNum);
                    } else {
                        // Crear elemento oculto para precarga
                        const pageElement = document.createElement('div');
                        pageElement.style.display = 'none';
                        pageElement.className = 'fp-page-content preloaded';
                        document.body.appendChild(pageElement);
                        
                        // Renderizar con escala más baja para ahorrar memoria
                        this.renderPage(pageNum, pageElement, this.zoomLevel * 0.8)
                            .finally(() => {
                                // Eliminar después de cachear
                                setTimeout(() => {
                                    document.body.removeChild(pageElement);
                                }, 5000);
                            });
                    }
                });
            }, 500);
        }
        
        /**
         * Actualizar audio para la página actual
         */
        updateAudioForPage(pageNum) {
            // Detener cualquier audio anterior
            if (this.audioPlayer) {
                this.audioPlayer.pause();
            }
            
            this.$audioPlayer.removeClass('visible');
            this.$audioPlayer.attr('src', '');
            
            // Si hay un audio asociado a esta página
            if (this.audios && this.audios[pageNum - 1]) {
                const audioUrl = this.audios[pageNum - 1];
                if (audioUrl && audioUrl.trim() !== '') {
                    this.$audioPlayer.attr('src', audioUrl);
                    this.$audioPlayer.addClass('visible');
                    
                    // Inicializar plyr si está disponible
                    if (typeof Plyr !== 'undefined' && !this.audioPlayer) {
                        this.audioPlayer = new Plyr(this.$audioPlayer[0], {
                            controls: ['play', 'progress', 'current-time', 'mute', 'volume'],
                            autoplay: false
                        });
                    } else {
                        // Si no hay plyr, usar el reproductor nativo
                        this.$audioPlayer[0].load();
                    }
                }
            }
        }
        
        /**
         * Renderizar áreas interactivas en la página actual
         */
        renderInteractiveAreas() {
            // Eliminar áreas anteriores
            $('.fp-interactive-area').remove();
            
            if (!this.interactiveAreas || this.interactiveAreas.length === 0) return;
            
            // Crear áreas para página(s) visible(s)
            this.interactiveAreas.forEach((area, index) => {
                const areaPage = parseInt(area.page, 10);
                
                if (this.isCurrentlyVisiblePage(areaPage)) {
                    this.createInteractiveArea(area, index);
                }
            });
            
            // También añadir áreas de acciones de InDesign si existen
            if (this.indesignData && this.indesignData.length > 0) {
                this.indesignData.forEach((action, index) => {
                    const sourcePage = parseInt(action.sourcePage, 10);
                    
                    if (this.isCurrentlyVisiblePage(sourcePage)) {
                        this.createInDesignArea(action, index);
                    }
                });
            }
            
            // Vincular eventos de áreas
            $('.fp-interactive-area').on('click', (e) => this.handleAreaClick(e));
        }
        
        /**
         * Verificar si una página está visible actualmente
         */
        isCurrentlyVisiblePage(pageNum) {
            if (this.turnJsInitialized) {
                // Con Turn.js, obtener las páginas visibles del API
                const view = this.$pagesContainer.turn('view');
                return view.includes(pageNum);
            } else if (this.viewMode === 'single') {
                return pageNum === this.currentPageNum;
            } else {
                // En modo doble manual, calcular páginas visibles
                const isEven = this.currentPageNum % 2 === 0;
                const leftPage = isEven ? this.currentPageNum - 1 : this.currentPageNum;
                const rightPage = leftPage + 1;
                
                // Casos especiales
                if (leftPage === 1 && fpConfig.startWithDoublePage !== true) {
                    return pageNum === 1;
                }
                
                if (rightPage > this.totalPagesCount && this.totalPagesCount % 2 !== 0) {
                    return pageNum === this.totalPagesCount;
                }
                
                return pageNum === leftPage || pageNum === rightPage;
            }
        }
        
        /**
         * Crear área interactiva en la página
         */
        createInteractiveArea(area, index) {
            const x = parseFloat(area.x);
            const y = parseFloat(area.y);
            const width = parseFloat(area.width);
            const height = parseFloat(area.height);
            const areaPage = parseInt(area.page, 10);
            const tooltip = area.tooltip || '';
            
            // Encontrar elemento de página correcto
            let $targetPage;
            
            if (this.turnJsInitialized) {
                // Con Turn.js, encontrar la página por su número
                $targetPage = this.$pagesContainer.find('.page-' + areaPage);
                if (!$targetPage.length) {
                    $targetPage = this.$pagesContainer.find(`[data-page-number="${areaPage}"]`).closest('.fp-page, .page');
                }
                
                if (!$targetPage.length) {
                    return; // No se encontró la página
                }
            } else if (this.viewMode === 'single') {
                $targetPage = this.$pagesContainer.find('.fp-page.active');
            } else {
                if (areaPage % 2 === 1) {
                    $targetPage = this.$pagesContainer.find('.fp-page.left-page');
                } else {
                    $targetPage = this.$pagesContainer.find('.fp-page.right-page');
                }
                
                // Caso especial: página única centrada
                if (this.$pagesContainer.find('.fp-page.single-center-page').length) {
                    $targetPage = this.$pagesContainer.find('.fp-page.single-center-page');
                }
            }
            
            if (!$targetPage.length) return;
            
            // Obtener canvas o contenido de la página para dimensiones
            const $pageContent = $targetPage.find('.fp-page-content, canvas').first();
            if (!$pageContent.length) return;
            
            // Calcular dimensiones escaladas
            const pageWidth = $pageContent.width();
            const pageHeight = $pageContent.height();
            
            // Factores de escala (usar base calculada o proporcionada)
            const baseWidth = area.baseWidth || pageWidth;
            const baseHeight = area.baseHeight || pageHeight;
            const scaleX = pageWidth / baseWidth;
            const scaleY = pageHeight / baseHeight;
            
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
                    'data-area-page': areaPage
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
            
            // Añadir al contenedor de página adecuado
            if (this.turnJsInitialized) {
                $targetPage.find('.fp-page-content').append($area);
            } else {
                $targetPage.append($area);
            }
        }
        
        /**
         * Crear área para acciones de InDesign
         */
        createInDesignArea(action, index) {
            const sourcePage = parseInt(action.sourcePage, 10);
            const x = parseFloat(action.x);
            const y = parseFloat(action.y);
            const width = parseFloat(action.width);
            const height = parseFloat(action.height);
            
            // Encontrar elemento de página correcto (similar a createInteractiveArea)
            let $targetPage;
            
            if (this.turnJsInitialized) {
                $targetPage = this.$pagesContainer.find('.page-' + sourcePage);
                if (!$targetPage.length) {
                    $targetPage = this.$pagesContainer.find(`[data-page-number="${sourcePage}"]`).closest('.fp-page, .page');
                }
                
                if (!$targetPage.length) return;
            } else {
                // Lógica similar a createInteractiveArea para modo no-Turn.js
                if (this.viewMode === 'single') {
                    $targetPage = this.$pagesContainer.find('.fp-page.active');
                } else {
                    if (sourcePage % 2 === 1) {
                        $targetPage = this.$pagesContainer.find('.fp-page.left-page');
                    } else {
                        $targetPage = this.$pagesContainer.find('.fp-page.right-page');
                    }
                    
                    if (this.$pagesContainer.find('.fp-page.single-center-page').length) {
                        $targetPage = this.$pagesContainer.find('.fp-page.single-center-page');
                    }
                }
            }
            
            if (!$targetPage.length) return;
            
            // Obtener canvas o contenido para dimensiones
            const $pageContent = $targetPage.find('.fp-page-content, canvas').first();
            if (!$pageContent.length) return;
            
            // Calcular dimensiones escaladas
            const pageWidth = $pageContent.width();
            const pageHeight = $pageContent.height();
            const scaleX = pageWidth / 1000; // Suponiendo que InDesign usa base 1000
            const scaleY = pageHeight / 1000;
            
            const scaledX = x * scaleX;
            const scaledY = y * scaleY;
            const scaledWidth = width * scaleX;
            const scaledHeight = height * scaleY;
            
            // Crear elemento para el área
            const $area = $('<div class="fp-interactive-area fp-indesign-area"></div>')
                .css({
                    left: `${scaledX}px`,
                    top: `${scaledY}px`,
                    width: `${scaledWidth}px`,
                    height: `${scaledHeight}px`
                })
                .attr({
                    'data-area-index': `indesign-${index}`,
                    'data-area-type': action.type || 'goto',
                    'data-area-page': sourcePage,
                    'data-target-page': action.targetPage || '',
                    'data-url': action.url || '',
                    'data-new-tab': action.openInNewTab ? '1' : '0'
                });
            
            // Añadir al contenedor de página adecuado
            if (this.turnJsInitialized) {
                $targetPage.find('.fp-page-content').append($area);
            } else {
                $targetPage.append($area);
            }
        }
        
        /**
         * Manejar clic en área interactiva
         */
        handleAreaClick(e) {
            e.preventDefault();
            const $area = $(e.currentTarget);
            const areaIndex = $area.data('area-index');
            const areaType = $area.data('area-type');
            
            // Manejar áreas de InDesign
            if (String(areaIndex).startsWith('indesign-')) {
                const index = parseInt(areaIndex.replace('indesign-', ''), 10);
                const action = this.indesignData[index];
                
                if (!action) return;
                
                if (action.type === 'goto' && action.targetPage) {
                    this.goToPage(parseInt(action.targetPage, 10));
                } else if (action.type === 'url' && action.url) {
                    const target = action.openInNewTab ? '_blank' : '_self';
                    window.open(action.url, target);
                }
                
                return;
            }
            
            // Manejar áreas interactivas normales
            if (!this.interactiveAreas || !this.interactiveAreas[areaIndex]) return;
            
            const area = this.interactiveAreas[areaIndex];
            
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
                        this.goToPage(parseInt(area.target_page, 10));
                    }
                    break;
                
                case 'youtube':
                    // Mostrar video de YouTube
                    if (area.youtube_url) {
                        this.showYouTubePopup(area.tooltip || 'Video', area.youtube_url);
                    }
                    break;
                
                case 'audio':
                    // Reproducir audio
                    if (area.audio_url) {
                        this.playAudio(area.audio_url);
                    }
                    break;
            }
        }
        
        /**
         * Mostrar popup con video de YouTube usando SweetAlert2
         */
        showYouTubePopup(title, videoId) {
            // Limpiar videoId (permitir formatos completos de URL)
            if (videoId.indexOf('youtube.com') !== -1 || videoId.indexOf('youtu.be') !== -1) {
                // Extraer ID de URL completa
                const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
                const match = videoId.match(regex);
                videoId = match ? match[1] : videoId;
            }
            
            const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            
            // Usar SweetAlert2 si está disponible
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: title,
                    html: `<div class="fp-video-container"><iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`,
                    width: '80%',
                    padding: '1em',
                    showConfirmButton: false,
                    showCloseButton: true,
                    background: '#000',
                    customClass: {
                        container: 'fp-swal-container',
                        popup: 'fp-swal-popup',
                        header: 'fp-swal-header',
                        closeButton: 'fp-swal-close-button',
                        content: 'fp-swal-content'
                    }
                });
            } else {
                // Fallback a modal básico si SweetAlert2 no está disponible
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
                $overlay.on('click', function(e) {
                    if ($(e.target).is($overlay) || $(e.target).is('.fp-popup-close')) {
                        $overlay.remove();
                    }
                });
            }
        }
        
        /**
         * Reproducir audio
         */
        playAudio(audioUrl) {
            // Detener cualquier audio anterior
            if (this.audioPlayer) {
                this.audioPlayer.pause();
            }
            
            this.$audioPlayer.removeClass('visible');
            this.$audioPlayer.attr('src', '');
            
            // Reproducir nuevo audio
            if (audioUrl && audioUrl.trim() !== '') {
                this.$audioPlayer.attr('src', audioUrl);
                this.$audioPlayer.addClass('visible');
                
                // Usar Plyr si está disponible, sino el reproductor nativo
                if (typeof Plyr !== 'undefined' && !this.audioPlayer) {
                    this.audioPlayer = new Plyr(this.$audioPlayer[0], {
                        controls: ['play', 'progress', 'current-time', 'mute', 'volume'],
                        autoplay: true
                    });
                } else {
                    this.$audioPlayer[0].play();
                }
            }
        }
        
        /**
         * Ir a una página específica
         */
        goToPage(pageNum) {
            if (pageNum < 1 || pageNum > this.totalPagesCount) return;
            
            // Actualizar página actual
            this.currentPageNum = pageNum;
            
            // Navegar según el modo (Turn.js o estándar)
            if (this.turnJsInitialized) {
                this.$pagesContainer.turn('page', pageNum);
            } else {
                // Renderizar nueva vista en modo estándar
                if (this.viewMode === 'single') {
                    this.renderSinglePage();
                } else {
                    this.renderDoublePageView();
                }
                
                // Actualizar audio y navegación
                this.updateAudioForPage(pageNum);
                this.updateNavigation();
            }
        }
        
        /**
         * Renderizar vista de página individual sin Turn.js
         */
        async renderSinglePage() {
            // Implementación para modo simple sin Turn.js
            this.$pagesContainer.empty();
            
            const $pageElement = $('<div class="fp-page active"><div class="fp-page-content"></div></div>');
            this.$pagesContainer.append($pageElement);
            
            await this.renderPage(this.currentPageNum, $pageElement.find('.fp-page-content'), this.zoomLevel);
            
            this.renderInteractiveAreas();
        }
        
        /**
         * Renderizar vista de página doble sin Turn.js
         */
        async renderDoublePageView() {
            // Limpiar contenedor
            this.$pagesContainer.empty();
            
            // Determinar páginas a mostrar (izq/der)
            let leftPageNum = this.currentPageNum % 2 === 0 ? this.currentPageNum - 1 : this.currentPageNum;
            let rightPageNum = leftPageNum + 1;
            
            // Manejar casos especiales (primera y última página)
            if (leftPageNum < 1) {
                leftPageNum = 1;
                rightPageNum = 2;
            }
            
            if (rightPageNum > this.totalPagesCount) {
                // Si estamos en la última página y es impar
                if (this.totalPagesCount % 2 !== 0 && this.currentPageNum === this.totalPagesCount) {
                    // Mostrar última página centrada
                    await this.renderSingleCenterPage(this.currentPageNum);
                    return;
                } else {
                    // Ajustar para evitar páginas fuera de rango
                    rightPageNum = this.totalPagesCount;
                    leftPageNum = rightPageNum - 1;
                    if (leftPageNum < 1) leftPageNum = 1;
                }
            }
            
            // Caso especial: primera página sola
            if (leftPageNum === 1 && fpConfig.startWithDoublePage !== true) {
                await this.renderSingleCenterPage(1);
                return;
            }
            
            // Crear elementos de página
            const $leftPage = $('<div class="fp-page left-page"><div class="fp-page-content"></div></div>');
            const $rightPage = $('<div class="fp-page right-page"><div class="fp-page-content"></div></div>');
            
            if (leftPageNum === this.currentPageNum || rightPageNum === this.currentPageNum) {
                // Marcar la página actual como activa
                if (leftPageNum === this.currentPageNum) {
                    $leftPage.addClass('active');
                } else {
                    $rightPage.addClass('active');
                }
            } else {
                // Si ninguna es la actual, activar la izquierda por defecto
                $leftPage.addClass('active');
                this.currentPageNum = leftPageNum; // Actualizar página actual
            }
            
            this.$pagesContainer.append($leftPage, $rightPage);
            
            // Renderizar ambas páginas
            const leftResult = await this.renderPage(leftPageNum, $leftPage.find('.fp-page-content'), this.zoomLevel);
            const rightResult = await this.renderPage(rightPageNum, $rightPage.find('.fp-page-content'), this.zoomLevel);
            
            this.renderInteractiveAreas();
        }
        
        /**
         * Renderizar página única centrada (primera o última) sin Turn.js
         */
        async renderSingleCenterPage(pageNum) {
            // Limpiar contenedor
            this.$pagesContainer.empty();
            
            // Crear elemento de página
            const $page = $('<div class="fp-page single-center-page active"><div class="fp-page-content"></div></div>');
            this.$pagesContainer.append($page);
            
            // Renderizar página
            await this.renderPage(pageNum, $page.find('.fp-page-content'), this.zoomLevel);
            
            this.renderInteractiveAreas();
        }
        
        /**
         * Configurar eventos de interacción
         */
        setupEventListeners() {
            // Navegación con flechas
            this.$prevArrow.on('click', () => {
                if (this.$prevArrow.prop('disabled')) return;
                
                if (this.turnJsInitialized) {
                    this.$pagesContainer.turn('previous');
                } else if (this.viewMode === 'single') {
                    this.goToPage(this.currentPageNum - 1);
                } else {
                    // En modo doble, retroceder dos páginas
                    const isEven = this.currentPageNum % 2 === 0;
                    const targetPage = isEven ? this.currentPageNum - 2 : this.currentPageNum - 1;
                    this.goToPage(Math.max(1, targetPage));
                }
            });
            
            this.$nextArrow.on('click', () => {
                if (this.$nextArrow.prop('disabled')) return;
                
                if (this.turnJsInitialized) {
                    this.$pagesContainer.turn('next');
                } else if (this.viewMode === 'single') {
                    this.goToPage(this.currentPageNum + 1);
                } else {
                    // En modo doble, avanzar dos páginas
                    const isEven = this.currentPageNum % 2 === 0;
                    const targetPage = isEven ? this.currentPageNum + 1 : this.currentPageNum + 2;
                    this.goToPage(Math.min(this.totalPagesCount, targetPage));
                }
            });
            
            // Entrada directa de página
            this.$pageInput.on('keypress', (e) => {
                if (e.which === 13) {
                    e.preventDefault();
                    const pageNum = parseInt(this.$pageInput.val(), 10);
                    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= this.totalPagesCount) {
                        this.goToPage(pageNum);
                    }
                }
            });
            
            this.$gotoPageBtn.on('click', () => {
                const pageNum = parseInt(this.$pageInput.val(), 10);
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= this.totalPagesCount) {
                    this.goToPage(pageNum);
                }
            });
            
            // Zoom
            this.$zoomSlider.on('input', () => {
                this.zoomLevel = parseFloat(this.$zoomSlider.val());
                
                if (this.turnJsInitialized) {
                    // Aplicar zoom en Turn.js
                    this.$pagesContainer.turn('size',
                        this.$pdfViewer.width() * 0.9 * this.zoomLevel,
                        this.$pdfViewer.height() * 0.9 * this.zoomLevel
                    );
                } else {
                    // Re-renderizar para zoom sin Turn.js
                    if (this.viewMode === 'single') {
                        this.renderSinglePage();
                    } else {
                        this.renderDoublePageView();
                    }
                }
            });
            
            this.$zoomInBtn.on('click', () => {
                this.zoomLevel = Math.min(3.0, this.zoomLevel + 0.1);
                this.$zoomSlider.val(this.zoomLevel);
                this.$zoomSlider.trigger('input');
            });
            
            this.$zoomOutBtn.on('click', () => {
                this.zoomLevel = Math.max(0.5, this.zoomLevel - 0.1);
                this.$zoomSlider.val(this.zoomLevel);
                this.$zoomSlider.trigger('input');
            });
            
            // Cambiar modo de vista
            this.$viewToggleBtn.on('click', () => {
                if (this.turnJsInitialized) {
                    // Alternar modo en Turn.js
                    const currentDisplay = this.$pagesContainer.turn('display');
                    const newDisplay = currentDisplay === 'double' ? 'single' : 'double';
                    
                    this.$pagesContainer.turn('display', newDisplay);
                    this.viewMode = newDisplay;
                    
                    // Actualizar UI del botón
                    if (newDisplay === 'single') {
                        this.$viewToggleBtn.attr('title', 'Cambiar a vista doble');
                    } else {
                        this.$viewToggleBtn.attr('title', 'Cambiar a vista simple');
                    }
                } else {
                    // Sin Turn.js, cambiar modelo y re-renderizar
                    this.viewMode = this.viewMode === 'single' ? 'double' : 'single';
                    this.$container.attr('data-view-mode', this.viewMode);
                    
                    if (this.viewMode === 'single') {
                        this.renderSinglePage();
                    } else {
                        this.renderDoublePageView();
                    }
                    
                    // Actualizar UI del botón
                    if (this.viewMode === 'single') {
                        this.$viewToggleBtn.attr('title', 'Cambiar a vista doble');
                    } else {
                        this.$viewToggleBtn.attr('title', 'Cambiar a vista simple');
                    }
                }
            });
            
            // Pantalla completa
            this.$fullscreenBtn.on('click', () => {
                this.toggleFullscreen();
            });
            
            // Selector de tema claro/oscuro si está habilitado
            $('.fp-background-option').on('click', (e) => {
                const theme = $(e.currentTarget).data('theme');
                $('.fp-background-option').removeClass('active');
                $(e.currentTarget).addClass('active');
                
                this.$container.removeClass('dark-mode light-mode');
                this.$container.addClass(theme + '-mode');
            });
            
            // Eventos de teclado cuando el flipbook tiene foco
            this.$container.on('click', () => {
                this.$container.addClass('has-focus');
            });
            
            $(document).on('keydown', (e) => {
                if (!this.$container.hasClass('has-focus')) return;
                
                switch (e.which) {
                    case 37: // Flecha izquierda
                        this.$prevArrow.trigger('click');
                        break;
                    case 39: // Flecha derecha
                        this.$nextArrow.trigger('click');
                        break;
                    case 36: // Inicio
                        this.goToPage(1);
                        break;
                    case 35: // Fin
                        this.goToPage(this.totalPagesCount);
                        break;
                }
            });
            
            // Perder foco al hacer clic fuera
            $(document).on('click', (e) => {
                if (!$(e.target).closest(this.$container).length) {
                    this.$container.removeClass('has-focus');
                }
            });
            
            // Redimensionar ventana
            let resizeTimer;
            $(window).on('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    if (this.turnJsInitialized) {
                        // Recalcular tamaño para Turn.js
                        this.$pagesContainer.turn('size',
                            this.$pdfViewer.width() * 0.9 * this.zoomLevel,
                            this.$pdfViewer.height() * 0.9 * this.zoomLevel
                        );
                    } else {
                        // Re-renderizar sin Turn.js
                        if (this.viewMode === 'single') {
                            this.renderSinglePage();
                        } else {
                            this.renderDoublePageView();
                        }
                    }
                }, 200);
            });
        }
        
        /**
         * Alternar pantalla completa
         */
        toggleFullscreen() {
            if (!this.isFullscreen) {
                if (this.$container[0].requestFullscreen) {
                    this.$container[0].requestFullscreen();
                } else if (this.$container[0].mozRequestFullScreen) {
                    this.$container[0].mozRequestFullScreen();
                } else if (this.$container[0].webkitRequestFullscreen) {
                    this.$container[0].webkitRequestFullscreen();
                } else if (this.$container[0].msRequestFullscreen) {
                    this.$container[0].msRequestFullscreen();
                } else {
                    // Fallback si las APIs nativas no están disponibles
                    this.$container.addClass('fullscreen-active');
                    this.isFullscreen = true;
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
                    this.$container.removeClass('fullscreen-active');
                    this.isFullscreen = false;
                }
            }
        }
        
        /**
         * Mostrar mensaje de error con SweetAlert2 o fallback
         */
        showError(message) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Error',
                    text: message,
                    icon: 'error',
                    confirmButtonText: 'Aceptar'
                });
            } else {
                this.$loading.text(message);
                console.error(message);
            }
        }
    }
    
    // Inicializar cada instancia de flipbook en la página
    $('.flipbook-container').each(function() {
        new FlipbookController(this);
    });
});
/**
 * Script para el frontend del plugin Vibebook Flip
 * Versión 1.0.8 - Mejorado sistema de gestión de áreas
 */
(function ($) {
    'use strict';

    // Modos de visualización
    var viewMode = {
        SINGLE_PAGE: 'single',
        DOUBLE_PAGE: 'double'
    };

    // Objeto principal
    var VibeBookFlipFrontend = {
        // Propiedades
        instances: {},

        // Inicialización
        init: function () {
            // Configurar PDF.js
            pdfjsLib.GlobalWorkerOptions.workerSrc = vibeBookFlip.pdfJsWorkerSrc;

            // Inicializar todos los flipbooks en la página
            $('.vibebook-flipbook').each(function () {
                var id = $(this).data('id');
                var dataVar = 'vibeBookFlipData_' + id;

                if (window[dataVar]) {
                    var instance = Object.create(VibeBookFlipInstance);
                    instance.init(id, window[dataVar]);
                    VibeBookFlipFrontend.instances[id] = instance;
                }
            });
        }
    };

    // Objeto de instancia de flipbook
    var VibeBookFlipInstance = {
        // Propiedades
        id: null,
        container: null,
        data: null,
        pdfDoc: null,
        currentPage: 1,
        totalPages: 0,
        scale: 1.5,
        currentZoom: 1.0,
        maxZoom: 3.0,
        minZoom: 0.5,
        zoomStep: 0.25,
        pdfRendering: false,
        pageNumPending: null,
        pdfCanvas: null,
        pdfContext: null,
        areas: [],
        currentAudio: null,
        currentViewMode: viewMode.SINGLE_PAGE,
        pdfOriginalWidth: 0,
        pdfOriginalHeight: 0,
        zoomHintTimer: null, // Nueva propiedad para el temporizador del hint de zoom

        // Inicialización
        init: function (id, data) {
            this.id = id;
            this.container = $('#vibebook-flipbook-' + id);
            this.data = data;

            // Cargar áreas directamente desde los datos proporcionados por PHP
            this.areas = data.areas || [];

            // Inicializar eventos
            this.initEvents();

            // Cargar PDF
            this.loadPDF(data.pdf_url);

            // Añadir controles de zoom
            this.addZoomControls();
        },

        // Verificar si el flipbook está en el viewport
        isInViewport: function () {
            var rect = this.container[0].getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        },

        // Determinar el modo de visualización adecuado
        determineViewMode: function (pageNum) {
            // Portada (primera página)
            if (pageNum === 1) return viewMode.SINGLE_PAGE;

            // Contraportada (última página si es impar)
            if (pageNum === this.totalPages && this.totalPages % 2 === 1) return viewMode.SINGLE_PAGE;

            // Modo predeterminado para páginas interiores
            return viewMode.DOUBLE_PAGE;
        },

        // Ajustar layout según el modo
        adjustLayout: function (mode) {
            if (mode === viewMode.SINGLE_PAGE) {
                // Centrar una sola página
                this.container.find('.vibebook-pages').addClass('single-page-view').removeClass('double-page-view');
            } else {
                // Mostrar dos páginas lado a lado
                this.container.find('.vibebook-pages').addClass('double-page-view').removeClass('single-page-view');
            }

            this.currentViewMode = mode;
        },

        // Añadir controles de zoom
        addZoomControls: function () {
            var self = this;

            // Crear contenedor de controles de zoom
            var zoomControls = $('<div class="vibebook-zoom-controls"></div>');

            // Botón de zoom in
            var zoomInBtn = $('<button class="vibebook-zoom-in" title="Aumentar zoom">+</button>');
            zoomInBtn.on('click', function () {
                self.zoomIn();
            });

            // Botón de zoom out
            var zoomOutBtn = $('<button class="vibebook-zoom-out" title="Reducir zoom">-</button>');
            zoomOutBtn.on('click', function () {
                self.zoomOut();
            });

            // Botón de reset zoom
            var zoomResetBtn = $('<button class="vibebook-zoom-reset" title="Restablecer zoom">100%</button>');
            zoomResetBtn.on('click', function () {
                self.resetZoom();
            });

            // Añadir botones al contenedor
            zoomControls.append(zoomOutBtn);
            zoomControls.append(zoomResetBtn);
            zoomControls.append(zoomInBtn);

            // Añadir controles al contenedor principal
            this.container.find('.vibebook-controls').append(zoomControls);
        },

        // Zoom in
        zoomIn: function () {
            if (this.currentZoom < this.maxZoom) {
                this.currentZoom += this.zoomStep;
                this.applyZoom()
                // Actualizar texto del botón de reset

            }
        },

        // Zoom out
        zoomOut: function () {
            if (this.currentZoom > this.minZoom) {
                this.currentZoom -= this.zoomStep;
                this.applyZoom();
            }
        },

        // Reset zoom
        resetZoom: function () {
            this.currentZoom = 1.0;
            this.applyZoom();
        },

        // Aplicar zoom
        applyZoom: function () {
            var self = this;

            // Actualizar texto del botón de reset
            this.container.find('.vibebook-zoom-reset').text(Math.round(this.currentZoom * 100) + '%');

            // Aplicar zoom a los canvas
            this.container.find('.vibebook-page').each(function () {
                var $canvas = $(this);
                var originalWidth = $canvas.data('original-width');
                var originalHeight = $canvas.data('original-height');

                if (!originalWidth) {
                    // Guardar dimensiones originales si no existen
                    originalWidth = $canvas.width();
                    originalHeight = $canvas.height();
                    $canvas.data('original-width', originalWidth);
                    $canvas.data('original-height', originalHeight);
                }

                // Aplicar zoom
                $canvas.css({
                    width: originalWidth * self.currentZoom,
                    height: originalHeight * self.currentZoom
                });
            });

            // Reposicionar áreas interactivas
            this.renderAreas();

            // Actualizar hint de zoom si está visible - Nuevo código
            var $hint = this.container.find('.vibebook-zoom-hint');
            if ($hint.length > 0) {
                $hint.text('Zoom: ' + Math.round(this.currentZoom * 100) + '%');
            }
        },

        // Inicializar eventos
        initEvents: function () {
            var self = this;

            // Funcionalidad de los botones de navegación
            this.container.find('.vibebook-prev').on('click', function (e) {
                e.preventDefault();
                self.prevPage();
            });

            this.container.find('.vibebook-next').on('click', function (e) {
                e.preventDefault();
                self.nextPage();
            });

            // Teclas de navegación
            $(document).on('keydown', function (e) {
                // Solo si el flipbook está en el viewport
                if (self.isInViewport()) {
                    if (e.keyCode === 37) { // Flecha izquierda
                        self.prevPage();
                    } else if (e.keyCode === 39) { // Flecha derecha
                        self.nextPage();
                    } else if (e.keyCode === 107 || e.keyCode === 187) { // + o =
                        self.zoomIn();
                    } else if (e.keyCode === 109 || e.keyCode === 189) { // - o _
                        self.zoomOut();
                    } else if (e.keyCode === 48 || e.keyCode === 96) { // 0
                        self.resetZoom();
                    }
                }
            });

            // Control de audio
            this.container.find('.vibebook-audio-toggle').on('click', function (e) {
                e.preventDefault();
                self.toggleAudio();
            });

            // Eventos para áreas interactivas (delegación de eventos)
            this.container.on('click', '.vibebook-area', function (e) {
                e.preventDefault();
                var areaId = $(this).data('id');
                var area = self.findAreaById(areaId);

                if (area) {
                    self.handleAreaClick(area);
                }
            });

            // Evento de redimensionamiento de ventana
            $(window).on('resize', function () {
                // Reposicionar áreas cuando cambia el tamaño de la ventana
                if (self.currentPage > 0) {
                    self.renderAreas();
                }
            });

            // Funcionalidad de pantalla completa - Nuevo código
            this.container.find('.vibebook-fullscreen-toggle').on('click', function (e) {
                e.preventDefault();
                self.toggleFullscreen();
            });

            // Detectar cambios en el estado de pantalla completa - Nuevo código
            document.addEventListener('fullscreenchange', function () {
                self.updateFullscreenButtonState();
            });
            document.addEventListener('webkitfullscreenchange', function () {
                self.updateFullscreenButtonState();
            });
            document.addEventListener('mozfullscreenchange', function () {
                self.updateFullscreenButtonState();
            });
            document.addEventListener('MSFullscreenChange', function () {
                self.updateFullscreenButtonState();
            });

            // Zoom con rueda del mouse - Nuevo código
            this.container.find('.vibebook-pages').on('wheel', function (e) {
                if (e.ctrlKey) {
                    e.preventDefault(); // Prevenir el zoom del navegador

                    if (e.originalEvent.deltaY < 0) {
                        self.zoomIn();
                    } else {
                        self.zoomOut();
                    }

                    // Mostrar mensaje de zoom
                    self.showZoomHint();
                }
            });

            // Implementar funcionalidad de arrastrar y mover - Nuevo código
            this.initDragAndPan();

            // Soporte para gestos táctiles (pinch-to-zoom) - Nuevo código
            this.initTouchZoom();
        },

        // Nueva función para implementar arrastrar y mover - Nuevo código
        initDragAndPan: function () {
            var self = this;
            var $pagesContainer = this.container.find('.vibebook-pages');
            var isDragging = false;
            var startX, startY, scrollLeft, scrollTop;

            // Añadir clase para indicar que se puede arrastrar
            $pagesContainer.addClass('vibebook-draggable');

            // Mouse down - iniciar arrastre
            $pagesContainer.on('mousedown', function (e) {
                // Solo proceder si no estamos sobre un área interactiva
                if (!$(e.target).closest('.vibebook-area').length) {
                    isDragging = true;
                    $pagesContainer.addClass('grabbing');
                    startX = e.pageX - $pagesContainer.offset().left;
                    startY = e.pageY - $pagesContainer.offset().top;
                    scrollLeft = $pagesContainer.scrollLeft();
                    scrollTop = $pagesContainer.scrollTop();

                    // Prevenir comportamiento predeterminado
                    e.preventDefault();
                }
            });

            // Mouse move - mover contenido
            $(document).on('mousemove', function (e) {
                if (!isDragging) return;

                var x = e.pageX - $pagesContainer.offset().left;
                var y = e.pageY - $pagesContainer.offset().top;
                var walkX = (x - startX) * 1.5; // multiplicador para ajustar la sensibilidad
                var walkY = (y - startY) * 1.5;

                $pagesContainer.scrollLeft(scrollLeft - walkX);
                $pagesContainer.scrollTop(scrollTop - walkY);

                e.preventDefault();
            });

            // Mouse up - terminar arrastre
            $(document).on('mouseup mouseleave', function () {
                if (isDragging) {
                    isDragging = false;
                    $pagesContainer.removeClass('grabbing');
                }
            });

            // Evitar comportamiento de arrastre en áreas interactivas
            this.container.on('mousedown', '.vibebook-area', function (e) {
                e.stopPropagation();
            });
        },

        // Añadir nuevas funciones de pantalla completa - Nuevo código
        toggleFullscreen: function () {
            var element = this.container[0];

            if (!this.isFullscreen()) {
                // Entrar en pantalla completa
                if (element.requestFullscreen) {
                    element.requestFullscreen();
                } else if (element.mozRequestFullScreen) {
                    element.mozRequestFullScreen();
                } else if (element.webkitRequestFullscreen) {
                    element.webkitRequestFullscreen();
                } else if (element.msRequestFullscreen) {
                    element.msRequestFullscreen();
                }

                this.container.addClass('fullscreen-mode');
            } else {
                // Salir de pantalla completa
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }

                this.container.removeClass('fullscreen-mode');
            }
        },

        isFullscreen: function () {
            return !!(
                document.fullscreenElement ||
                document.mozFullScreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement
            );
        },

        updateFullscreenButtonState: function () {
            var $button = this.container.find('.vibebook-fullscreen-toggle');
            var isFullscreen = this.isFullscreen();

            if (isFullscreen) {
                $button.addClass('active');
                $button.attr('title', 'Salir de pantalla completa');
                this.container.addClass('fullscreen-mode');
            } else {
                $button.removeClass('active');
                $button.attr('title', 'Pantalla completa');
                this.container.removeClass('fullscreen-mode');
            }
        },

        // Añadir funciones para zoom táctil - Nuevo código
        initTouchZoom: function () {
            var self = this;
            var $pagesContainer = this.container.find('.vibebook-pages');
            var startDist = 0;
            var initialZoom = 1.0;
            var touchZooming = false;

            $pagesContainer.on('touchstart', function (e) {
                if (e.originalEvent.touches.length === 2) {
                    // Calcular distancia inicial entre dos dedos
                    var touch1 = e.originalEvent.touches[0];
                    var touch2 = e.originalEvent.touches[1];
                    startDist = Math.hypot(
                        touch2.clientX - touch1.clientX,
                        touch2.clientY - touch1.clientY
                    );
                    initialZoom = self.currentZoom;
                    touchZooming = true;
                    e.preventDefault();
                }
            });

            $pagesContainer.on('touchmove', function (e) {
                if (touchZooming && e.originalEvent.touches.length === 2) {
                    // Calcular nueva distancia
                    var touch1 = e.originalEvent.touches[0];
                    var touch2 = e.originalEvent.touches[1];
                    var newDist = Math.hypot(
                        touch2.clientX - touch1.clientX,
                        touch2.clientY - touch1.clientY
                    );

                    // Calcular ratio y aplicar zoom
                    var zoomRatio = newDist / startDist;
                    var newZoom = initialZoom * zoomRatio;

                    // Limitar el zoom a los límites establecidos
                    newZoom = Math.max(self.minZoom, Math.min(self.maxZoom, newZoom));

                    // Aplicar nuevo zoom
                    self.currentZoom = newZoom;
                    self.applyZoom();

                    // Mostrar mensaje de zoom
                    self.showZoomHint();

                    e.preventDefault();
                }
            });

            $pagesContainer.on('touchend touchcancel', function (e) {
                touchZooming = false;
            });
        },

        // Mostrar mensaje de zoom - Nuevo código
        showZoomHint: function () {
            var self = this;

            // Verificar si ya existe el elemento de hint
            var $hint = this.container.find('.vibebook-zoom-hint');
            if ($hint.length === 0) {
                // Crear elemento de hint
                $hint = $('<div class="vibebook-zoom-hint">Zoom: ' + Math.round(this.currentZoom * 100) + '%</div>');
                this.container.append($hint);
            } else {
                // Actualizar texto
                $hint.text('Zoom: ' + Math.round(this.currentZoom * 100) + '%');
            }

            // Mostrar hint
            $hint.addClass('visible');

            // Ocultar después de un tiempo
            clearTimeout(this.zoomHintTimer);
            this.zoomHintTimer = setTimeout(function () {
                $hint.removeClass('visible');
            }, 1500);
        },

        // Encontrar área por ID
        findAreaById: function (id) {
            for (var i = 0; i < this.areas.length; i++) {
                if (this.areas[i].id === id) {
                    return this.areas[i];
                }
            }
            return null;
        },

        // Manejar clic en área
        handleAreaClick: function (area) {
            switch (area.type) {
                case 'url':
                    window.open(area.target_url, '_blank');
                    break;

                case 'youtube':
                    window.open(area.target_url, '_blank');
                    break;

                case 'internal':
                    this.renderPage(parseInt(area.target_page));
                    break;

                case 'audio':
                    if (area.audio_id) {
                        this.playAudio(area.audio_id);
                    }
                    break;
            }
        },

        // Cargar PDF
        loadPDF: function (url) {
            var self = this;

            // Mostrar carga
            this.container.find('.vibebook-loading').show();

            // Cargar PDF
            var loadingTask = pdfjsLib.getDocument(url);
            loadingTask.promise.then(function (pdf) {
                self.pdfDoc = pdf;
                self.totalPages = pdf.numPages;

                // Obtener dimensiones originales del PDF (primera página)
                pdf.getPage(1).then(function (page) {
                    var viewport = page.getViewport({ scale: 1.0 });
                    self.pdfOriginalWidth = viewport.width;
                    self.pdfOriginalHeight = viewport.height;

                    // Actualizar información de páginas
                    self.updatePageInfo();

                    // Renderizar primera página
                    self.renderPage(1);

                    // Ocultar carga
                    self.container.find('.vibebook-loading').hide();

                    // Reproducir audio con autoplay
                    self.playAutoplayAudio();
                });
            }).catch(function (error) {
                console.error('Error al cargar el PDF:', error);
                self.container.find('.vibebook-pages').html('<div class="vibebook-error">Error al cargar el PDF: ' + error.message + '</div>');
                self.container.find('.vibebook-loading').hide();
            });
        },

        // Actualizar información de páginas
        updatePageInfo: function () {
            var pageInfo = '';

            if (this.currentViewMode === viewMode.SINGLE_PAGE) {
                // Modo de una página
                pageInfo = 'Página ' + this.currentPage + ' de ' + this.totalPages;
            } else {
                // Modo de dos páginas
                var leftPage = this.currentPage % 2 === 0 ? this.currentPage : this.currentPage - 1;
                var rightPage = this.currentPage % 2 === 0 ? this.currentPage + 1 : this.currentPage;

                // Verificar que las páginas existan
                if (leftPage < 1) leftPage = 1;
                if (rightPage > this.totalPages) rightPage = this.totalPages;

                // Si las páginas son diferentes, mostrar ambas
                if (leftPage !== rightPage) {
                    pageInfo = 'Páginas ' + leftPage + ' y ' + rightPage + ' de ' + this.totalPages;
                } else {
                    pageInfo = 'Página ' + leftPage + ' de ' + this.totalPages;
                }
            }

            this.container.find('.vibebook-page-info').text(pageInfo);
        },

        // Renderizar página
        renderPage: function (pageNum) {
            var self = this;

            if (self.pdfRendering) {
                self.pageNumPending = pageNum;
                return;
            }

            self.pdfRendering = true;

            // Actualizar página actual
            self.currentPage = pageNum;

            // Asegurarse de que determineViewMode existe y está definido correctamente
            if (typeof self.determineViewMode !== 'function') {
                console.error('Error: determineViewMode no está definido como una función');

                // Implementación de respaldo si la función falta
                self.determineViewMode = function (pageNum) {
                    // Portada (primera página)
                    if (pageNum === 1) return viewMode.SINGLE_PAGE;
                    // Contraportada (última página si es impar)
                    if (pageNum === self.totalPages && self.totalPages % 2 === 1) return viewMode.SINGLE_PAGE;
                    // Modo predeterminado para páginas interiores
                    return viewMode.DOUBLE_PAGE;
                };
            }

            // Determinar modo de visualización
            var mode = self.determineViewMode(pageNum);

            // Ajustar layout
            self.adjustLayout(mode);

            // Actualizar información de páginas
            self.updatePageInfo();

            // Limpiar contenedor
            self.container.find('.vibebook-pages').empty();

            // Crear contenedor para la(s) página(s)
            var pagesContainer = $('<div class="vibebook-pages-container"></div>');
            self.container.find('.vibebook-pages').append(pagesContainer);

            // Función para renderizar una página individual
            function renderSinglePage(pageNumber, position) {
                return self.pdfDoc.getPage(pageNumber).then(function (page) {
                    // Crear canvas
                    var canvas = document.createElement('canvas');
                    var context = canvas.getContext('2d');

                    // Calcular escala para ajustar al contenedor
                    var containerWidth = self.container.find('.vibebook-pages').width();
                    var containerHeight = self.container.find('.vibebook-pages').height();

                    var initialViewport = page.getViewport({ scale: 1 });

                    // Calcular escala base para ajustar al contenedor
                    var baseScale;
                    if (mode === viewMode.SINGLE_PAGE) {
                        // Escala para una sola página
                        var scaleX = containerWidth / initialViewport.width;
                        var scaleY = containerHeight / initialViewport.height;
                        baseScale = Math.min(scaleX, scaleY) * 0.95; // 95% para dejar un pequeño margen
                    } else {
                        // Escala para dos páginas
                        var scaleX = (containerWidth / 2) / initialViewport.width;
                        var scaleY = containerHeight / initialViewport.height;
                        baseScale = Math.min(scaleX, scaleY) * 0.95;
                    }

                    // Factor de renderizado para mayor calidad (HiDPI)
                    // Usamos devicePixelRatio para adaptarnos a la densidad de píxeles del dispositivo.
                    // Considerar Math.max(window.devicePixelRatio || 1, 1.5) o un valor fijo como 2 si la calidad aún no es suficiente.
                    var renderFactor = 2.0; // Probar con un factor de renderizado de 2.0
                    // Para forzar una calidad mínima, por ejemplo 1.5x o 2x:
                    // renderFactor = Math.max(window.devicePixelRatio || 1, 1.5);

                    var finalScale = baseScale * renderFactor;

                    // Obtener viewport con la escala final de renderizado (mayor resolución)
                    var viewport = page.getViewport({ scale: finalScale });

                    // Ajustar tamaño del canvas al tamaño de renderizado (mayor resolución)
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    // Ajustar tamaño visual del canvas mediante CSS para que encaje en el layout
                    // El tamaño visual debe ser el que tendría con baseScale
                    canvas.style.width = (initialViewport.width * baseScale) + 'px';
                    canvas.style.height = (initialViewport.height * baseScale) + 'px';

                    // Aplicar clase según posición y asignar ID único para debugging
                    $(canvas).addClass('vibebook-page');
                    var uniqueId = 'vibebook-page-' + pageNumber + '-' + new Date().getTime();
                    $(canvas).attr('id', uniqueId);

                    if (position === 'left') {
                        $(canvas).addClass('vibebook-page-left');
                        $(canvas).attr('data-page', pageNumber);
                    } else if (position === 'right') {
                        $(canvas).addClass('vibebook-page-right');
                        $(canvas).attr('data-page', pageNumber);
                    } else {
                        $(canvas).attr('data-page', pageNumber);
                    }

                    // Guardar dimensiones originales para zoom
                    $(canvas).data('original-width', initialViewport.width * baseScale);
                    $(canvas).data('original-height', initialViewport.height * baseScale);

                    // Agregar al contenedor antes de renderizar para evitar errores de canvas no encontrado
                    pagesContainer.append(canvas);
                    
                    // Renderizar PDF
                    var renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                        enableWebGL: true,
                        imageQuality: 1.5
                    };

                    return page.render(renderContext).promise.catch(function (error) {
                        console.error('Error al renderizar página ' + pageNumber + ':', error);
                    });
                });
            }

            // Renderizar según el modo
            if (mode === viewMode.SINGLE_PAGE) {
                // Renderizar una sola página
                renderSinglePage(pageNum, 'center').then(function () {
                    self.pdfRendering = false;

                    // Renderizar áreas
                    self.renderAreas();

                    // Procesar página pendiente
                    if (self.pageNumPending !== null) {
                        self.renderPage(self.pageNumPending);
                        self.pageNumPending = null;
                    }
                });
            } else {
                // Renderizar dos páginas
                var leftPage = pageNum % 2 === 0 ? pageNum : pageNum - 1;
                var rightPage = pageNum % 2 === 0 ? pageNum + 1 : pageNum;

                // Verificar que las páginas existan
                if (leftPage < 1) leftPage = 1;
                if (rightPage > self.totalPages) rightPage = self.totalPages;

                // Renderizar página izquierda
                var leftPromise = leftPage >= 1 ? renderSinglePage(leftPage, 'left') : Promise.resolve();

                // Renderizar página derecha
                var rightPromise = rightPage <= self.totalPages ? renderSinglePage(rightPage, 'right') : Promise.resolve();

                // Cuando ambas páginas estén renderizadas
                Promise.all([leftPromise, rightPromise]).then(function () {
                    self.pdfRendering = false;

                    // Renderizar áreas
                    self.renderAreas();

                    // Procesar página pendiente
                    if (self.pageNumPending !== null) {
                        self.renderPage(self.pageNumPending);
                        self.pageNumPending = null;
                    }
                });
            }
        },

        // Calcular posición de área según el modo y la página
        calculateAreaPosition: function (area) {
            var position = { left: 0, top: 0, width: 0, height: 0 };

            // Obtener el canvas de la página correspondiente
            var pageCanvas;

            if (this.currentViewMode === viewMode.SINGLE_PAGE) {
                // En modo de una página, buscar el canvas específico por número de página
                pageCanvas = this.container.find('.vibebook-page[data-page="' + area.page + '"]');
                if (pageCanvas.length === 0) {
                    // Si no se encuentra el canvas específico, usar el único disponible
                    pageCanvas = this.container.find('.vibebook-page');
                }
            } else {
                // En modo de dos páginas, buscar el canvas por número de página
                pageCanvas = this.container.find('.vibebook-page[data-page="' + area.page + '"]');
                if (pageCanvas.length === 0) {
                    // Si no se encuentra, determinar si es par o impar
                    if (area.page % 2 === 0) {
                        // Página par (izquierda)
                        pageCanvas = this.container.find('.vibebook-page-left');
                    } else {
                        // Página impar (derecha)
                        pageCanvas = this.container.find('.vibebook-page-right');
                    }
                }
            }

            // Si no se encuentra el canvas, retornar posición vacía
            if (pageCanvas.length === 0) {
                return position;
            }

            // Calcular dimensiones del canvas
            var canvasWidth = pageCanvas.width();
            var canvasHeight = pageCanvas.height();

            // Si el zoom está aplicado, ajustar para compensar
            var zoomFactor = this.currentZoom || 1.0;

            // Verificar si tenemos coordenadas porcentuales
            if (area.coords_percent && area.coords_percent.length === 4) {
                // Usar coordenadas porcentuales
                var xPercent = parseFloat(area.coords_percent[0]);
                var yPercent = parseFloat(area.coords_percent[1]);
                var widthPercent = parseFloat(area.coords_percent[2]);
                var heightPercent = parseFloat(area.coords_percent[3]);

                // Calcular dimensiones reales en píxeles basadas en porcentajes
                position.width = (widthPercent * canvasWidth) / 100;
                position.height = (heightPercent * canvasHeight) / 100;

                // Calcular posición absoluta dentro del canvas
                var absoluteX = (xPercent * canvasWidth) / 100;
                var absoluteY = (yPercent * canvasHeight) / 100;

                // Posición relativa al contenedor
                var canvasOffset = pageCanvas.offset();
                var containerOffset = this.container.find('.vibebook-pages').offset();
                position.left = canvasOffset.left - containerOffset.left + absoluteX;
                position.top = canvasOffset.top - containerOffset.top + absoluteY;
            }
            // Alternativa: usar coordenadas absolutas si están disponibles
            else if (area.coords && area.coords.length === 4) {
                console.log("Usando coordenadas absolutas para el área:", area.id);

                // Determinar la proporción de escala entre el tamaño del PDF original y el actual
                var scaleX = canvasWidth / this.pdfOriginalWidth;
                var scaleY = canvasHeight / this.pdfOriginalHeight;

                // Adaptar coordenadas con la escala
                position.left = area.coords[0] * scaleX;
                position.top = area.coords[1] * scaleY;
                position.width = area.coords[2] * scaleX;
                position.height = area.coords[3] * scaleY;

                // Ajustar la posición relativa al canvas
                var canvasOffset = pageCanvas.offset();
                var containerOffset = this.container.find('.vibebook-pages').offset();
                position.left = canvasOffset.left - containerOffset.left + position.left;
                position.top = canvasOffset.top - containerOffset.top + position.top;

                // Calcular coordenadas porcentuales para futuras referencias
                area.coords_percent = [
                    (area.coords[0] / this.pdfOriginalWidth) * 100,
                    (area.coords[1] / this.pdfOriginalHeight) * 100,
                    (area.coords[2] / this.pdfOriginalWidth) * 100,
                    (area.coords[3] / this.pdfOriginalHeight) * 100
                ];

                console.log("Coordenadas porcentuales calculadas:", area.coords_percent);
            } else {
                console.error("Área sin coordenadas válidas:", area);
            }

            return position;
        },

        // Renderizar áreas interactivas
        renderAreas: function () {
            var self = this;

            // Limpiar áreas existentes
            self.container.find('.vibebook-area').remove();

            // Filtrar áreas para la página actual
            var currentAreas = [];

            if (self.currentViewMode === viewMode.SINGLE_PAGE) {
                // En modo de una página, solo mostrar áreas de la página actual
                currentAreas = self.areas.filter(function (area) {
                    return area.page === self.currentPage;
                });
            } else {
                // En modo de dos páginas, mostrar áreas de ambas páginas
                var leftPage = self.currentPage % 2 === 0 ? self.currentPage : self.currentPage - 1;
                var rightPage = self.currentPage % 2 === 0 ? self.currentPage + 1 : self.currentPage;

                // Verificar que las páginas existan
                if (leftPage < 1) leftPage = 1;
                if (rightPage > self.totalPages) rightPage = self.totalPages;

                currentAreas = self.areas.filter(function (area) {
                    return area.page === leftPage || area.page === rightPage;
                });
            }

            // Crear elementos para cada área
            $.each(currentAreas, function (index, area) {
                var areaDiv = $('<div class="vibebook-area"></div>');
                areaDiv.attr('data-id', area.id);
                areaDiv.attr('data-page', area.page);
                areaDiv.attr('data-type', area.type);

                // Añadir clase según el tipo
                switch (area.type) {
                    case 'url':
                        areaDiv.addClass('url-area');
                        break;
                    case 'youtube':
                        areaDiv.addClass('youtube-area');
                        break;
                    case 'internal':
                        areaDiv.addClass('internal-area');
                        break;
                    case 'audio':
                        areaDiv.addClass('audio-area');
                        areaDiv.html('<span class="dashicons dashicons-controls-play area-icon"></span>');
                        break;
                }

                // Calcular posición
                var position = self.calculateAreaPosition(area);

                // Aplicar posición
                areaDiv.css({
                    position: 'absolute',
                    left: position.left + 'px',
                    top: position.top + 'px',
                    width: position.width + 'px',
                    height: position.height + 'px',
                    cursor: 'pointer',
                    zIndex: 50
                });

                // Agregar al contenedor
                self.container.find('.vibebook-pages').append(areaDiv);
            });
        },

        // Reproducir audio con autoplay
        playAutoplayAudio: function () {
            var self = this;

            // Buscar áreas de audio con autoplay en la página actual
            var autoplayAreas = this.areas.filter(function (area) {
                return area.type === 'audio' &&
                    area.autoplay === true &&
                    area.page === self.currentPage &&
                    area.audio_id;
            });

            // Reproducir el primer audio con autoplay encontrado
            if (autoplayAreas.length > 0) {
                this.playAudio(autoplayAreas[0].audio_id);
            }
        },

        // Reproducir audio
        playAudio: function (audioId) {
            var self = this;

            // Detener audio actual
            if (self.currentAudio) {
                self.currentAudio.pause();
                self.currentAudio = null;
            }

            // Buscar el área con este audio_id y obtener la URL directamente
            var audioUrl = null;
            var audioArea = null;

            for (var i = 0; i < self.areas.length; i++) {
                if (self.areas[i].type === 'audio' && self.areas[i].audio_id === audioId) {
                    audioArea = self.areas[i];
                    if (self.areas[i].audio_url) {
                        audioUrl = self.areas[i].audio_url;
                    }
                    break;
                }
            }

            if (audioUrl) {
                // Crear elemento de audio con la URL obtenida
                var audio = new Audio(audioUrl);

                // Configurar eventos del audio
                audio.addEventListener('canplaythrough', function () {
                    // Reproducir cuando esté listo
                    audio.play().catch(function (error) {
                        console.error('Error al reproducir audio:', error);
                        alert('Error al reproducir el audio. Por favor, inténtelo de nuevo.');
                    });

                    // Mostrar controles de audio y cambiar icono
                    self.container.find('.vibebook-audio-controls').show();
                    self.container.find('.vibebook-audio-toggle').addClass('playing');

                    // Cambiar icono en el área si existe
                    if (audioArea) {
                        self.container.find('.vibebook-area[data-id="' + audioArea.id + '"] .area-icon')
                            .removeClass('dashicons-controls-play')
                            .addClass('dashicons-controls-pause');
                    }
                });

                audio.addEventListener('ended', function () {
                    // Restaurar icono cuando termina
                    if (audioArea) {
                        self.container.find('.vibebook-area[data-id="' + audioArea.id + '"] .area-icon')
                            .removeClass('dashicons-controls-pause')
                            .addClass('dashicons-controls-play');
                    }

                    self.container.find('.vibebook-audio-toggle').removeClass('playing');
                    self.currentAudio = null;
                });

                audio.addEventListener('error', function (e) {
                    console.error('Error en la reproducción de audio:', e);
                    alert('Error al reproducir el audio. Por favor, inténtelo de nuevo.');
                });

                // Guardar referencia
                self.currentAudio = audio;
            } else {
                console.error('No se pudo obtener la URL del audio para el ID:', audioId);
                alert('No se pudo obtener el archivo de audio. Por favor, verifica que el archivo exista.');
            }
        },

        // Alternar reproducción de audio
        toggleAudio: function () {
            var self = this;

            if (self.currentAudio) {
                if (self.currentAudio.paused) {
                    self.currentAudio.play();
                    self.container.find('.vibebook-audio-toggle').addClass('playing');

                    // Buscar el área de audio actual y cambiar su icono
                    self.container.find('.vibebook-area[data-type="audio"] .area-icon')
                        .removeClass('dashicons-controls-play')
                        .addClass('dashicons-controls-pause');
                } else {
                    self.currentAudio.pause();
                    self.container.find('.vibebook-audio-toggle').removeClass('playing');

                    // Buscar el área de audio actual y cambiar su icono
                    self.container.find('.vibebook-area[data-type="audio"] .area-icon')
                        .removeClass('dashicons-controls-pause')
                        .addClass('dashicons-controls-play');
                }
            }
        },

        // Ir a la página anterior
        prevPage: function () {
            if (this.currentPage <= 1) return;

            var prevPage;
            if (this.currentViewMode === viewMode.SINGLE_PAGE) {
                prevPage = this.currentPage - 1;
            } else {
                // En modo de dos páginas, retroceder dos páginas
                prevPage = this.currentPage % 2 === 0 ? this.currentPage - 2 : this.currentPage - 1;
                if (prevPage < 1) prevPage = 1;
            }

            this.renderPage(prevPage);
        },

        // Ir a la página siguiente
        nextPage: function () {
            if (this.currentPage >= this.totalPages) return;

            var nextPage;
            if (this.currentViewMode === viewMode.SINGLE_PAGE) {
                nextPage = this.currentPage + 1;
            } else {
                // En modo de dos páginas, avanzar dos páginas
                nextPage = this.currentPage % 2 === 0 ? this.currentPage + 2 : this.currentPage + 2;
                if (nextPage > this.totalPages) nextPage = this.totalPages;
            }

            this.renderPage(nextPage);
        }
    };

    // Inicializar cuando el documento esté listo
    $(document).ready(function () {
        VibeBookFlipFrontend.init();
    });

})(jQuery);


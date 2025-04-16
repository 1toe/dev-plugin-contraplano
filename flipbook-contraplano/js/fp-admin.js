/**
 * JavaScript para la administración del plugin Flipbook Contraplano
 */
(function ($) {
    'use strict';

    // Objeto para manejar la administración del flipbook
    var FlipbookAdmin = {
        // Variables de configuración
        config: {
            pdfScale: 1.0,
            currentPage: 1,
            isSelecting: false,
            editingAreaIndex: -1
        },

        // Inicializar
        init: function () {
            this.setupTabs();
            this.setupPdfUploader();
            this.setupAudioUploader();
            this.setupAreasEditor();
            this.setupAreasList();
            this.setupThemeColorPicker();
            this.setupInDesignImport();
        },

        // Configurar tabs 
        setupTabs: function () {
            $('.fp-tabs-nav a').on('click', function (e) {
                e.preventDefault();
                const tabId = $(this).attr('href');

                $('.fp-tabs-nav li').removeClass('active');
                $(this).parent().addClass('active');

                $('.fp-tab-panel').removeClass('active');
                $(tabId).addClass('active');
            });
        },

        // Configurar uploader de PDF
        setupPdfUploader: function () {
            var self = this;
            var pdfFrame;

            $('#fp_pdf_button').on('click', function (e) {
                e.preventDefault();

                if (pdfFrame) {
                    pdfFrame.open();
                    return;
                }

                pdfFrame = wp.media({
                    title: 'Seleccionar PDF',
                    button: { text: 'Usar este PDF' },
                    library: { type: 'application/pdf' },
                    multiple: false
                });

                pdfFrame.on('select', function () {
                    var attachment = pdfFrame.state().get('selection').first().toJSON();
                    $('#fp_pdf').val(attachment.url);

                    // Recargar la página para mostrar la vista previa
                    setTimeout(function () {
                        location.reload();
                    }, 500);
                });

                pdfFrame.open();
            });
        },

        // Configurar uploader de audio
        setupAudioUploader: function () {
            // Gestión de audio actual
            $('.fp-audio-upload-btn').on('click', function (e) {
                e.preventDefault();
                var button = $(this);
                var inputField = $('#' + button.data('input'));

                var audioFrame = wp.media({
                    title: 'Seleccionar archivo de audio',
                    button: { text: 'Usar este audio' },
                    library: { type: 'audio' },
                    multiple: false
                });

                audioFrame.on('select', function () {
                    var attachment = audioFrame.state().get('selection').first().toJSON();
                    inputField.val(attachment.url);

                    // Actualizar o crear la vista previa
                    var audioControls = inputField.closest('.fp-audio-row').find('.fp-audio-controls');
                    if (audioControls.find('.fp-audio-preview').length === 0) {
                        audioControls.append(
                            '<div class="fp-audio-preview">' +
                            '<audio controls src="' + attachment.url + '" style="max-width: 250px; height: 30px;"></audio>' +
                            '</div>'
                        );
                    } else {
                        audioControls.find('audio').attr('src', attachment.url);
                    }
                });

                audioFrame.open();
            });

            // Añadir campo de audio
            var audioIndex = $('#fp_audio_container .fp-audio-row').length;
            $('#add_audio_button').on('click', function () {
                audioIndex++;

                var fieldId = 'fp_audio_' + audioIndex;
                var newRow =
                    '<div class="fp-audio-row">' +
                    '  <div class="fp-audio-number"><span>Página ' + audioIndex + '</span></div>' +
                    '  <div class="fp-audio-input">' +
                    '    <input type="text" name="fp_audios[]" id="' + fieldId + '" class="regular-text fp-audio-url-input" placeholder="URL del archivo de audio">' +
                    '    <button type="button" class="button fp-audio-upload-btn" data-input="' + fieldId + '">Subir Audio</button>' +
                    '  </div>' +
                    '  <div class="fp-audio-controls">' +
                    '    <button type="button" class="button button-secondary remove-audio">Eliminar</button>' +
                    '  </div>' +
                    '</div>';

                $('#fp_audio_container').append(newRow);

                // Reinicializar el botón de subida para el nuevo campo
                FlipbookAdmin.setupAudioUploader();

                // Actualizar las etiquetas de número de página
                FlipbookAdmin.updateAudioLabels();
            });

            // Eliminar campo de audio
            $('#fp_audio_container').on('click', '.remove-audio', function () {
                $(this).closest('.fp-audio-row').remove();
                FlipbookAdmin.updateAudioLabels();
            });
        },

        // Actualizar etiquetas de número de página en campos de audio
        updateAudioLabels: function () {
            $('#fp_audio_container .fp-audio-row').each(function (index) {
                $(this).find('.fp-audio-number span').html('Página ' + (index + 1));
            });
        },

        // Configurar editor de áreas interactivas
        setupAreasEditor: function () {
            var self = this;
            var $selectionBox = null;
            var selectionStart = { x: 0, y: 0 };

            // Inicializar overlay cuando el iframe se carga
            $('#pdf_preview_iframe').on('load', function () {
                self.renderExistingAreas();
            });

            // Navegación por páginas
            $('#fp_go_to_page').on('click', function () {
                self.navigateToPage();
            });

            $('#fp_editor_page').on('keypress', function (e) {
                if (e.which === 13) {
                    e.preventDefault();
                    self.navigateToPage();
                }
            });

            // Cambio de tipo de área interactiva
            $('#popup_type').on('change', function () {
                var selectedType = $(this).val();
                // Ocultar todos los campos específicos
                $('.fp-youtube-url-field, .fp-page-jump-field').hide();

                // Mostrar campos según el tipo seleccionado
                switch (selectedType) {
                    case 'youtube':
                        $('.fp-youtube-url-field').show();
                        break;
                    case 'page':
                        $('.fp-page-jump-field').show();
                        break;
                }
            });

            // Iniciar selección
            $('#fp_start_selection').on('click', function () {
                self.config.isSelecting = true;
                $('#fp_selection_overlay').addClass('selecting');
                $(this).hide();
                $('#fp_cancel_selection').show();

                // Crear selección si no existe
                if (!$selectionBox) {
                    $selectionBox = $('<div class="fp-selection-box"></div>');
                    $('#fp_selection_overlay').append($selectionBox);
                }

                $selectionBox.hide();
            });

            // Cancelar selección
            $('#fp_cancel_selection').on('click', function () {
                self.cancelSelection();
            });

            // Eventos de mouse para selección
            $('#fp_selection_overlay').on('mousedown', function (e) {
                if (!self.config.isSelecting) return;

                var overlay = $(this);
                var offsetX = e.pageX - overlay.offset().left;
                var offsetY = e.pageY - overlay.offset().top;

                selectionStart = { x: offsetX, y: offsetY };

                $selectionBox.css({
                    left: offsetX + 'px',
                    top: offsetY + 'px',
                    width: '0',
                    height: '0'
                }).show();
            });

            $('#fp_selection_overlay').on('mousemove', function (e) {
                if (!self.config.isSelecting || !$selectionBox.is(':visible')) return;

                var overlay = $(this);
                var offsetX = e.pageX - overlay.offset().left;
                var offsetY = e.pageY - overlay.offset().top;

                var width = Math.abs(offsetX - selectionStart.x);
                var height = Math.abs(offsetY - selectionStart.y);

                // Calcular esquina superior izquierda
                var left = Math.min(offsetX, selectionStart.x);
                var top = Math.min(offsetY, selectionStart.y);

                $selectionBox.css({
                    left: left + 'px',
                    top: top + 'px',
                    width: width + 'px',
                    height: height + 'px'
                });
            });

            $('#fp_selection_overlay').on('mouseup', function (e) {
                if (!self.config.isSelecting || !$selectionBox.is(':visible')) return;

                var overlay = $(this);
                var offsetX = e.pageX - overlay.offset().left;
                var offsetY = e.pageY - overlay.offset().top;

                // Finalizar selección
                var width = Math.abs(offsetX - selectionStart.x);
                var height = Math.abs(offsetY - selectionStart.y);

                // Esquina superior izquierda
                var left = Math.min(offsetX, selectionStart.x);
                var top = Math.min(offsetY, selectionStart.y);

                // Verificar tamaño mínimo
                if (width < 10 || height < 10) {
                    $selectionBox.hide();
                    return;
                }

                // Mostrar formulario
                self.showAreaForm(left, top, width, height, $selectionBox);
            });

            // Guardar área
            $('#fp_save_area').on('click', function () {
                self.saveAreaFromSelection($selectionBox);
            });

            // Cancelar área
            $('#fp_cancel_area').on('click', function () {
                self.hideAreaForm();
                self.cancelSelection();
            });
        },

        // Navegar a una página específica
        navigateToPage: function () {
            var pageNum = parseInt($('#fp_editor_page').val(), 10);
            if (isNaN(pageNum) || pageNum < 1) return;

            this.config.currentPage = pageNum;

            // Re-renderizar áreas existentes para la nueva página
            this.renderExistingAreas();
        },

        // Cancelar selección actual
        cancelSelection: function () {
            this.config.isSelecting = false;
            $('#fp_selection_overlay').removeClass('selecting');
            $('#fp_start_selection').show();
            $('#fp_cancel_selection').hide();

            // Asegurar que se oculte la caja de selección correctamente
            $('.fp-selection-box').hide().removeData('selection');

            // Asegurar que se oculte el formulario de área
            this.hideAreaForm();
        },

        // Mostrar formulario para configurar área
        showAreaForm: function (left, top, width, height, $selectionBox) {
            // Guardar datos de selección
            $selectionBox.data('selection', {
                left: left / this.config.pdfScale,
                top: top / this.config.pdfScale,
                width: width / this.config.pdfScale,
                height: height / this.config.pdfScale,
                page: this.config.currentPage
            });

            // Mostrar formulario cerca de la selección
            var formLeft = left + width + 10;
            var formTop = top;

            // Limpiar formulario
            $('#popup_url').val('');
            $('#popup_tooltip').val('');
            $('#popup_new_tab').prop('checked', false);
            $('#popup_type').val('url'); // Valor predeterminado: URL
            $('#popup_youtube_url').val('');
            $('#popup_target_page').val('1');
            $('.fp-youtube-url-field, .fp-page-jump-field').hide(); // Ocultar campos específicos

            // Si estamos editando, cargar datos existentes
            if (this.config.editingAreaIndex >= 0) {
                var $row = $(`.fp-interactive-area-row[data-area-index="${this.config.editingAreaIndex}"]`);

                // Cargar datos básicos
                $('#popup_url').val($row.find('input[name^="fp_areas"][name$="[url]"]').val());
                $('#popup_tooltip').val($row.find('input[name^="fp_areas"][name$="[tooltip]"]').val());
                $('#popup_new_tab').prop('checked', $row.find('input[name^="fp_areas"][name$="[new_tab]"]').is(':checked'));

                // Cargar tipo de área y mostrar campos correspondientes
                var areaType = $row.find('select[name^="fp_areas"][name$="[type]"]').val() || 'url';
                $('#popup_type').val(areaType);

                // Cargar datos específicos del tipo
                $('#popup_youtube_url').val($row.find('input[name^="fp_areas"][name$="[youtube_url]"]').val());
                $('#popup_target_page').val($row.find('input[name^="fp_areas"][name$="[target_page]"]').val() || '1');

                // Mostrar campos según tipo
                switch (areaType) {
                    case 'youtube':
                        $('.fp-youtube-url-field').show();
                        break;
                    case 'page':
                        $('.fp-page-jump-field').show();
                        break;
                }
            }

            // --- INICIO CÓDIGO A INSERTAR ---
            // Asegurar que los campos correctos se muestren al abrir/cargar el popup
            var currentPopupType = $('#popup_type').val();
            $('.fp-youtube-url-field').toggle(currentPopupType === 'youtube');
            $('.fp-page-jump-field').toggle(currentPopupType === 'page');
            // --- FIN CÓDIGO A INSERTAR ---

            // Mostrar (esta línea ya existe, la nueva lógica va antes)
            this.showAreaFormAtPosition(formLeft, formTop);
        },

        // Posicionar formulario en coordenadas específicas
        showAreaFormAtPosition: function (left, top) {
            var $form = $('#fp_area_form');
            $form.css({
                left: left + 'px',
                top: top + 'px'
            }).show();
        },

        // Ocultar formulario
        hideAreaForm: function () {
            $('#fp_area_form').hide();
            this.config.editingAreaIndex = -1;
        },

        // Guardar área desde selección
        saveAreaFromSelection: function ($selectionBox) {
            if (!$selectionBox || !$selectionBox.data('selection')) return;

            var selection = $selectionBox.data('selection');
            var url = $('#popup_url').val();
            var tooltip = $('#popup_tooltip').val();
            var newTab = $('#popup_new_tab').is(':checked');
            var areaType = $('#popup_type').val();
            var youtubeUrl = $('#popup_youtube_url').val();
            var targetPage = $('#popup_target_page').val();

            // Crear o actualizar área
            if (this.config.editingAreaIndex >= 0) {
                // Actualizar área existente
                var $row = $(`.fp-interactive-area-row[data-area-index="${this.config.editingAreaIndex}"]`);

                $row.find('input[name^="fp_areas"][name$="[page]"]').val(selection.page);
                $row.find('input[name^="fp_areas"][name$="[x]"]').val(selection.left.toFixed(1));
                $row.find('input[name^="fp_areas"][name$="[y]"]').val(selection.top.toFixed(1));
                $row.find('input[name^="fp_areas"][name$="[width]"]').val(selection.width.toFixed(1));
                $row.find('input[name^="fp_areas"][name$="[height]"]').val(selection.height.toFixed(1));
                $row.find('input[name^="fp_areas"][name$="[url]"]').val(url);
                $row.find('input[name^="fp_areas"][name$="[tooltip]"]').val(tooltip);
                $row.find('input[name^="fp_areas"][name$="[new_tab]"]').prop('checked', newTab);
                $row.find('select[name^="fp_areas"][name$="[type]"]').val(areaType);
                $row.find('input[name^="fp_areas"][name$="[youtube_url]"]').val(youtubeUrl);
                $row.find('input[name^="fp_areas"][name$="[target_page]"]').val(targetPage);

                // Actualizar visibilidad de campos según tipo
                this.updateFieldVisibility($row, areaType);

                // Actualizar encabezado
                $row.find('h4').text(`Área #${this.config.editingAreaIndex + 1} (Página ${selection.page})`);
            } else {
                // Crear nueva área
                var template = $('#fp_area_template').html();
                var areaIndex = $('.fp-interactive-area-row').length;
                var areaIndexPlus = areaIndex + 1; // Variable explícita para evitar confusión

                var newRow = template
                    .replace(/NEW_INDEX/g, areaIndex)
                    .replace(/NEW_INDEX_PLUS/g, areaIndexPlus) // Usar la variable explícita
                    .replace(/PAGE_NUM/g, selection.page)
                    .replace(/X_VALUE/g, selection.left.toFixed(1))
                    .replace(/Y_VALUE/g, selection.top.toFixed(1))
                    .replace(/WIDTH_VALUE/g, selection.width.toFixed(1))
                    .replace(/HEIGHT_VALUE/g, selection.height.toFixed(1))
                    .replace(/URL_VALUE/g, url)
                    .replace(/TOOLTIP_VALUE/g, tooltip)
                    .replace(/NEW_TAB_CHECKED/g, newTab ? 'checked' : '');

                $('#fp_interactive_container').append(newRow);

                // Seleccionar los campos en la nueva fila y establecer sus valores
                var $newRow = $('.fp-interactive-area-row').last();
                $newRow.find('select[name^="fp_areas"][name$="[type]"]').val(areaType);
                $newRow.find('input[name^="fp_areas"][name$="[youtube_url]"]').val(youtubeUrl);
                $newRow.find('input[name^="fp_areas"][name$="[target_page]"]').val(targetPage);

                // Actualizar visibilidad de campos según tipo
                this.updateFieldVisibility($newRow, areaType);

                $('.no-areas-message').remove();
            }

            // Importante: limpiar los datos de selección antes de cancelar
            $selectionBox.removeData('selection');

            // Ocultar la caja de selección
            $selectionBox.hide();

            // Salir del modo selección y ocultar formulario
            this.hideAreaForm();
            this.cancelSelection();

            // Re-renderizar áreas
            this.renderExistingAreas();

            // Volver a la pestaña de lista si era un área nueva
            if (this.config.editingAreaIndex < 0) {
                $('.fp-tabs-nav a[href="#tab-list"]').click();
            }

            // Forzar un reseteo completo del estado de selección
            this.config.isSelecting = false;
            $('#fp_selection_overlay').removeClass('selecting');
            $('#fp_start_selection').show();
            $('#fp_cancel_selection').hide();
        },

        // Actualiza la visibilidad de los campos según el tipo de área
        updateFieldVisibility: function ($row, areaType) {
            $row.find('.fp-youtube-url-field, .fp-page-jump-field').hide();

            switch (areaType) {
                case 'youtube':
                    $row.find('.fp-youtube-url-field').show();
                    break;
                case 'page':
                    $row.find('.fp-page-jump-field').show();
                    break;
            }
        },

        // Renderizar áreas existentes
        renderExistingAreas: function () {
            var self = this;
            var $areasOverlay = $('#fp_areas_overlay');
            $areasOverlay.empty();

            // Buscar todas las áreas para la página actual
            $('.fp-interactive-area-row').each(function () {
                var $row = $(this);
                var pageNum = parseInt($row.find('input[name^="fp_areas"][name$="[page]"]').val(), 10);

                if (pageNum === self.config.currentPage) {
                    var areaIndex = $row.data('area-index');
                    var x = parseFloat($row.find('input[name^="fp_areas"][name$="[x]"]').val());
                    var y = parseFloat($row.find('input[name^="fp_areas"][name$="[y]"]').val());
                    var width = parseFloat($row.find('input[name^="fp_areas"][name$="[width]"]').val());
                    var height = parseFloat($row.find('input[name^="fp_areas"][name$="[height]"]').val());

                    // Escalar coordenadas 
                    var scaledX = x * self.config.pdfScale;
                    var scaledY = y * self.config.pdfScale;
                    var scaledWidth = width * self.config.pdfScale;
                    var scaledHeight = height * self.config.pdfScale;

                    var $area = $('<div class="fp-existing-area"></div>')
                        .css({
                            left: scaledX + 'px',
                            top: scaledY + 'px',
                            width: scaledWidth + 'px',
                            height: scaledHeight + 'px'
                        })
                        .attr('data-area-index', areaIndex);

                    $areasOverlay.append($area);
                }
            });
        },

        // Configurar lista de áreas interactivas
        setupAreasList: function () {
            var self = this;

            // Añadir área
            $('#fp_add_area_btn').on('click', function () {
                var template = $('#fp_area_template').html();
                var areaIndex = $('.fp-interactive-area-row').length;

                var newRow = template
                    .replace(/NEW_INDEX/g, areaIndex)
                    .replace(/NEW_INDEX_PLUS/g, areaIndex + 1)
                    .replace(/PAGE_NUM/g, 1)
                    .replace(/X_VALUE/g, 0)
                    .replace(/Y_VALUE/g, 0)
                    .replace(/WIDTH_VALUE/g, 100)
                    .replace(/HEIGHT_VALUE/g, 30)
                    .replace(/URL_VALUE/g, '')
                    .replace(/TOOLTIP_VALUE/g, '')
                    .replace(/NEW_TAB_CHECKED/g, '');

                $('#fp_interactive_container').append(newRow);
                $('.no-areas-message').remove();
            });

            // Eliminar área
            $('#fp_interactive_container').on('click', '.remove-area', function () {
                $(this).closest('.fp-interactive-area-row').remove();

                if ($('#fp_interactive_container .fp-interactive-area-row').length === 0) {
                    $('#fp_interactive_container').html('<div class="no-areas-message">No hay áreas interactivas definidas. Haga clic en "Agregar Área Interactiva" para comenzar.</div>');
                }

                // Actualizar títulos
                $('#fp_interactive_container .fp-interactive-area-row').each(function (idx) {
                    $(this).find('h4').text('Área #' + (idx + 1) + ' (Página ' + $(this).find('input[name^="fp_areas"][name$="[page]"]').val() + ')');
                    $(this).attr('data-area-index', idx);
                    $(this).find('.edit-area-visually').attr('data-area-index', idx);
                });
            });

            // Editar área visualmente
            $('#fp_interactive_container').on('click', '.edit-area-visually', function () {
                self.config.editingAreaIndex = $(this).data('area-index');
                var $row = $(this).closest('.fp-interactive-area-row');

                // Cambiar a la pestaña visual
                $('.fp-tabs-nav li').removeClass('active');
                $('.fp-tabs-nav a[href="#tab-visual"]').parent().addClass('active');

                $('.fp-tab-panel').removeClass('active');
                $('#tab-visual').addClass('active');

                // Obtener página y navegar a ella
                var pageNum = parseInt($row.find('input[name^="fp_areas"][name$="[page]"]').val(), 10);
                $('#fp_editor_page').val(pageNum);
                self.config.currentPage = pageNum;

                // Mostrar selección para esta área
                setTimeout(function () {
                    var x = parseFloat($row.find('input[name^="fp_areas"][name$="[x]"]').val());
                    var y = parseFloat($row.find('input[name^="fp_areas"][name$="[y]"]').val());
                    var width = parseFloat($row.find('input[name^="fp_areas"][name$="[width]"]').val());
                    var height = parseFloat($row.find('input[name^="fp_areas"][name$="[height]"]').val());

                    // Iniciar modo selección
                    self.config.isSelecting = true;
                    $('#fp_selection_overlay').addClass('selecting');
                    $('#fp_start_selection').hide();
                    $('#fp_cancel_selection').show();

                    // Crear y mostrar caja de selección
                    var $selectionBox = $('.fp-selection-box');
                    if ($selectionBox.length === 0) {
                        $selectionBox = $('<div class="fp-selection-box"></div>');
                        $('#fp_selection_overlay').append($selectionBox);
                    }

                    // Escalar coordenadas
                    var scaledX = x * self.config.pdfScale;
                    var scaledY = y * self.config.pdfScale;
                    var scaledWidth = width * self.config.pdfScale;
                    var scaledHeight = height * self.config.pdfScale;

                    $selectionBox.css({
                        left: scaledX + 'px',
                        top: scaledY + 'px',
                        width: scaledWidth + 'px',
                        height: scaledHeight + 'px'
                    }).show();

                    // Guardar datos de selección
                    $selectionBox.data('selection', {
                        left: x,
                        top: y,
                        width: width,
                        height: height,
                        page: pageNum
                    });

                    // Llenar formulario con datos existentes
                    var url = $row.find('input[name^="fp_areas"][name$="[url]"]').val();
                    var tooltip = $row.find('input[name^="fp_areas"][name$="[tooltip]"]').val();
                    var newTab = $row.find('input[name^="fp_areas"][name$="[new_tab]"]').is(':checked');

                    $('#popup_url').val(url);
                    $('#popup_tooltip').val(tooltip);
                    $('#popup_new_tab').prop('checked', newTab);

                    // Mostrar formulario
                    var formLeft = scaledX + scaledWidth + 10;
                    var formTop = scaledY;
                    self.showAreaFormAtPosition(formLeft, formTop);

                }, 300);
            });
        },

        // Configuración del selector de color de tema
        setupThemeColorPicker: function () {
            // Añadir selector de color si no existe
            if (!$('#fp_theme_color_picker').length) {
                var colorPicker = `
                    <div class="fp-admin-section theme-color-section">
                        <h3>Color del tema y modo de visualización</h3>
                        <div class="fp-theme-options">
                            <div class="fp-theme-option">
                                <label>
                                    <input type="radio" name="fp_theme_mode" value="light" checked>
                                    <span class="fp-theme-preview light-theme">Modo claro</span>
                                </label>
                            </div>
                            <div class="fp-theme-option">
                                <label>
                                    <input type="radio" name="fp_theme_mode" value="dark">
                                    <span class="fp-theme-preview dark-theme">Modo oscuro</span>
                                </label>
                            </div>
                            <div class="fp-theme-option">
                                <label>
                                    <input type="radio" name="fp_theme_mode" value="user_choice">
                                    <span class="fp-theme-preview user-choice-theme">Elección del usuario</span>
                                </label>
                            </div>
                        </div>
                        <div class="fp-accent-color">
                            <label>
                                <strong>Color de acento (iconos, botones):</strong>
                                <input type="color" name="fp_accent_color" value="#e42535">
                            </label>
                        </div>
                        
                        <input type="hidden" id="fp_theme_mode" name="fp_theme_mode" value="light">
                        <input type="hidden" id="fp_accent_color" name="fp_accent_color" value="#e42535">
                    </div>
                `;

                // Insertar después de la sección de PDF
                $('.pdf-upload-section').after(colorPicker);

                // Inicializar con valor guardado si existe
                var savedTheme = $('input[name="fp_theme_mode"]:radio').filter('[value="' + $('#fp_theme_mode').val() + '"]');
                if (savedTheme.length) {
                    savedTheme.prop('checked', true);
                }

                if ($('#fp_accent_color').val()) {
                    $('input[name="fp_accent_color"]').val($('#fp_accent_color').val());
                }

                // Actualizar campo oculto al cambiar la selección
                $('input[name="fp_theme_mode"]:radio').on('change', function () {
                    $('#fp_theme_mode').val($(this).val());
                });

                $('input[name="fp_accent_color"]').on('change', function () {
                    $('#fp_accent_color').val($(this).val());
                });
            }
        },

        // Configurar importación de datos de InDesign
        setupInDesignImport: function () {
            $('#fp_import_indesign').on('click', function () {
                var fileInput = $('#fp_indesign_json')[0];

                if (!fileInput.files || fileInput.files.length === 0) {
                    alert('Por favor, seleccione un archivo JSON de InDesign para importar.');
                    return;
                }

                var file = fileInput.files[0];
                var reader = new FileReader();

                reader.onload = function (e) {
                    try {
                        var jsonData = JSON.parse(e.target.result);

                        // Procesar datos de InDesign
                        var processedData = FlipbookAdmin.processInDesignData(jsonData);

                        // Actualizar la tabla de acciones
                        FlipbookAdmin.updateInDesignActionsList(processedData);

                        // Actualizar el campo oculto con los datos procesados
                        $('#fp_indesign_data').val(JSON.stringify(processedData));

                        alert('Datos de InDesign importados correctamente.');
                    } catch (error) {
                        console.error('Error al procesar el archivo JSON:', error);
                        alert('Error al procesar el archivo. Asegúrese de que es un JSON válido.');
                    }
                };

                reader.readAsText(file);
            });

            // Eliminar acción de InDesign
            $('.fp-indesign-list').on('click', '.remove-indesign-action', function () {
                var index = $(this).data('index');
                var indesignData = JSON.parse($('#fp_indesign_data').val() || '[]');

                // Eliminar la acción del array
                indesignData.splice(index, 1);

                // Actualizar el campo oculto y la lista
                $('#fp_indesign_data').val(JSON.stringify(indesignData));
                FlipbookAdmin.updateInDesignActionsList(indesignData);
            });
        },

        // Procesar datos JSON de InDesign
        processInDesignData: function (jsonData) {
            var processedData = [];

            // Verificar la estructura del JSON (puede variar según la exportación de InDesign)
            if (jsonData.hyperlinks && Array.isArray(jsonData.hyperlinks)) {
                // Ejemplo de estructura: Array de hyperlinks con source y destination
                jsonData.hyperlinks.forEach(function (hyperlink, index) {
                    if (hyperlink.source && hyperlink.destination) {
                        var action = {
                            id: 'indesign_' + index,
                            sourcePage: hyperlink.source.page || 1,
                            x: hyperlink.source.x || 0,
                            y: hyperlink.source.y || 0,
                            width: hyperlink.source.width || 100,
                            height: hyperlink.source.height || 30
                        };

                        // Determinar tipo de destino
                        if (hyperlink.destination.type === 'page') {
                            action.type = 'goto';
                            action.targetPage = hyperlink.destination.page || 1;
                        } else if (hyperlink.destination.type === 'url') {
                            action.type = 'url';
                            action.url = hyperlink.destination.url || '#';
                            action.openInNewTab = hyperlink.destination.newWindow || false;
                        }

                        processedData.push(action);
                    }
                });
            } else if (jsonData.actions && Array.isArray(jsonData.actions)) {
                // Estructura alternativa: Array of actions
                jsonData.actions.forEach(function (action, index) {
                    var newAction = {
                        id: 'indesign_' + index,
                        sourcePage: action.page || 1,
                        x: action.bounds ? action.bounds.x || 0 : 0,
                        y: action.bounds ? action.bounds.y || 0 : 0,
                        width: action.bounds ? action.bounds.width || 100 : 100,
                        height: action.bounds ? action.bounds.height || 30 : 30
                    };

                    if (action.actionType === 'goToPage') {
                        newAction.type = 'goto';
                        newAction.targetPage = action.targetPage || 1;
                    } else if (action.actionType === 'goToURL') {
                        newAction.type = 'url';
                        newAction.url = action.url || '#';
                        newAction.openInNewTab = action.openInNewWindow || false;
                    }

                    processedData.push(newAction);
                });
            } else {
                // Intentar procesar formato genérico
                if (Array.isArray(jsonData)) {
                    jsonData.forEach(function (item, index) {
                        var newAction = {
                            id: 'indesign_' + index,
                            sourcePage: item.sourcePage || item.page || 1,
                            x: item.x || 0,
                            y: item.y || 0,
                            width: item.width || 100,
                            height: item.height || 30,
                            type: item.type || 'goto'
                        };

                        if (newAction.type === 'goto') {
                            newAction.targetPage = item.targetPage || 1;
                        } else if (newAction.type === 'url') {
                            newAction.url = item.url || '#';
                            newAction.openInNewTab = item.openInNewTab || false;
                        }

                        processedData.push(newAction);
                    });
                }
            }

            return processedData;
        },

        // Actualizar la lista de acciones de InDesign
        updateInDesignActionsList: function (indesignData) {
            var $list = $('.fp-indesign-list');

            if (!indesignData || indesignData.length === 0) {
                $list.html('<p>No hay acciones de InDesign importadas.</p>');
                return;
            }

            var tableHtml = '<table class="widefat striped">' +
                '<thead>' +
                '<tr>' +
                '<th>Página Origen</th>' +
                '<th>Tipo</th>' +
                '<th>Destino</th>' +
                '<th>Acciones</th>' +
                '</tr>' +
                '</thead>' +
                '<tbody>';

            indesignData.forEach(function (action, index) {
                var destination = '';

                if (action.type === 'goto') {
                    destination = 'Página ' + action.targetPage;
                } else if (action.type === 'url') {
                    destination = action.url;
                }

                tableHtml += '<tr>' +
                    '<td>' + action.sourcePage + '</td>' +
                    '<td>' + action.type + '</td>' +
                    '<td>' + destination + '</td>' +
                    '<td>' +
                    '<button type="button" class="button remove-indesign-action" data-index="' + index + '">Eliminar</button>' +
                    '</td>' +
                    '</tr>';
            });

            tableHtml += '</tbody></table>';

            $list.html(tableHtml);
        }
    };

    // Inicializar cuando el DOM esté listo
    $(document).ready(function () {
        FlipbookAdmin.init();
    });

})(jQuery); 
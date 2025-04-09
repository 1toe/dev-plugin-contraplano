<?php

/**
 * Plugin Name: Flipbook Contraplano
 * Description: Visualiza Flipbooks PDF interactivos con audios por página y áreas interactivas.
 * Version: 1.5
 * Author: Walter C, Matías F.
 * Text Domain: flipbook-contraplano
 */

if (!defined('ABSPATH')) exit;

define('FP_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('FP_PLUGIN_URL', plugin_dir_url(__FILE__));

// Registrar tipo de contenido personalizado
function fp_register_flipbook_post_type()
{
    register_post_type('flipbook', [
        'labels' => [
            'name' => __('Flipbooks', 'flipbook-contraplano'),
            'singular_name' => __('Flipbook', 'flipbook-contraplano'),
            'add_new' => __('Añadir nuevo', 'flipbook-contraplano'),
            'add_new_item' => __('Añadir nuevo Flipbook', 'flipbook-contraplano'),
            'edit_item' => __('Editar Flipbook', 'flipbook-contraplano'),
            'view_item' => __('Ver Flipbook', 'flipbook-contraplano'),
            'search_items' => __('Buscar Flipbooks', 'flipbook-contraplano'),
        ],
        'public' => true,
        'has_archive' => true,
        'menu_icon' => 'dashicons-book',
        'supports' => ['title'],
        'rewrite' => ['slug' => 'flipbook'],
        'show_in_rest' => true,
    ]);
}
add_action('init', 'fp_register_flipbook_post_type');

// Metabox para PDF y audios
function fp_add_meta_box()
{
    add_meta_box('fp_meta_box', 'Configuración del Flipbook', 'fp_meta_callback', 'flipbook', 'normal', 'high');
    add_meta_box('fp_interactive_box', 'Áreas Interactivas', 'fp_interactive_callback', 'flipbook', 'normal', 'high');
    add_meta_box('fp_indesign_actions', 'Acciones de InDesign', 'fp_indesign_callback', 'flipbook', 'normal', 'high');
}
add_action('add_meta_boxes', 'fp_add_meta_box');

function fp_meta_callback($post)
{
    wp_nonce_field('fp_save_meta_data', 'fp_meta_nonce');
    $pdf = get_post_meta($post->ID, 'fp_pdf', true);
    $audios = get_post_meta($post->ID, 'fp_audios', true) ?: [];
?>
    <div class="fp-admin-container">
        <div class="fp-admin-section pdf-upload-section">
            <h3>PDF del Flipbook</h3>
            <div class="fp-pdf-upload-container">
                <label for="fp_pdf" class="screen-reader-text">URL del PDF</label>
                <input type="text" name="fp_pdf" id="fp_pdf" value="<?php echo esc_url($pdf); ?>" style="width:80%;" readonly>
                <button type="button" class="button" id="fp_pdf_button" title="Seleccionar o subir archivo PDF">Subir PDF</button>
            </div>
            
            <?php if (!empty($pdf)) : ?>
                <div class="fp-pdf-preview">
                    <h4>Vista previa del PDF</h4>
                    <div class="fp-preview-area">
                        <iframe src="<?php echo esc_url($pdf); ?>" width="100%" height="300px"></iframe>
                    </div>
                    <p class="description">Vista previa limitada. El PDF completo se mostrará en el flipbook.</p>
                </div>
            <?php endif; ?>
        </div>
        
        <div class="fp-admin-section audio-section">
            <h3>Audios por página</h3>
            <p class="description">El primer audio corresponde a la página 1, el segundo a la página 2, etc.</p>
            
            <div id="fp_audio_container">
                <?php foreach ($audios as $index => $audio_url): 
                    $field_id = 'fp_audio_' . $index;
                ?>
                    <div class="fp-audio-row">
                        <div class="fp-audio-number"><span>Página <?php echo $index + 1; ?></span></div>
                        <div class="fp-audio-input">
                            <label for="<?php echo esc_attr($field_id); ?>" class="screen-reader-text">URL del audio para página <?php echo $index + 1; ?></label>
                            <input type="text" name="fp_audios[]" id="<?php echo esc_attr($field_id); ?>" 
                                   value="<?php echo esc_url($audio_url); ?>" 
                                   class="regular-text fp-audio-url-input" 
                                   placeholder="URL del archivo de audio">
                            <button type="button" class="button fp-audio-upload-btn" data-input="<?php echo esc_attr($field_id); ?>">Subir Audio</button>
                        </div>
                        <div class="fp-audio-controls">
                            <button type="button" class="button button-secondary remove-audio">Eliminar</button>
                            <?php if (!empty($audio_url)) : ?>
                            <div class="fp-audio-preview">
                                <audio controls src="<?php echo esc_url($audio_url); ?>" style="max-width: 250px; height: 30px;"></audio>
                            </div>
                            <?php endif; ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
            <div class="fp-audio-actions">
                <button type="button" class="button" id="add_audio_button">+ Agregar Audio</button>
            </div>
        </div>
    </div>
    
    <style>
    .fp-admin-container {
        margin: 15px 0;
    }
    .fp-admin-section {
        margin-bottom: 25px;
        padding: 15px;
        background: #fff;
        border: 1px solid #e5e5e5;
        border-radius: 3px;
    }
    .fp-admin-section h3 {
        margin-top: 0;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
    }
    .fp-pdf-preview {
        margin-top: 15px;
        border: 1px solid #ddd;
        padding: 10px;
        background: #f9f9f9;
    }
    .fp-audio-row {
        display: flex;
        align-items: center;
        padding: 10px;
        margin-bottom: 10px;
        background: #f9f9f9;
        border: 1px solid #e5e5e5;
        border-radius: 3px;
    }
    .fp-audio-number {
        width: 80px;
        font-weight: bold;
    }
    .fp-audio-input {
        flex: 1;
        margin-right: 10px;
        display: flex;
        gap: 5px;
    }
    .fp-audio-url-input {
        flex: 1;
    }
    .fp-audio-controls {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    .fp-audio-preview {
        margin-top: 5px;
    }
    .fp-audio-actions {
        margin-top: 10px;
    }
    </style>
    
    <script type="text/javascript">
        jQuery(document).ready(function($) {
            // Media uploader for PDF
            var pdf_frame;
            $('#fp_pdf_button').on('click', function(event){
                event.preventDefault();
                if (pdf_frame) { pdf_frame.open(); return; }
                pdf_frame = wp.media({
                    title: 'Seleccionar PDF',
                    button: { text: 'Usar este PDF' },
                    library: { type: 'application/pdf' }, // Filter for PDF files
                    multiple: false
                });
                pdf_frame.on('select', function(){
                    var attachment = pdf_frame.state().get('selection').first().toJSON();
                    $('#fp_pdf').val(attachment.url);
                    
                    // En lugar de recargar la página, actualizamos la vista previa dinámicamente
                    if ($('.fp-pdf-preview').length === 0) {
                        // Si no existe la vista previa, la creamos
                        var previewHtml = '<div class="fp-pdf-preview">' +
                            '<h4>Vista previa del PDF</h4>' +
                            '<div class="fp-preview-area">' +
                            '<iframe src="' + attachment.url + '" width="100%" height="300px"></iframe>' +
                            '</div>' +
                            '<p class="description">Vista previa limitada. El PDF completo se mostrará en el flipbook.</p>' +
                            '</div>';
                        $('.fp-pdf-upload-container').after(previewHtml);
                    } else {
                        // Si ya existe, actualizamos el iframe
                        $('.fp-pdf-preview iframe').attr('src', attachment.url);
                    }
                });
                pdf_frame.open();
            });

            // Media uploader for Audio files
            $('.fp-audio-upload-btn').on('click', function(e) {
                e.preventDefault();
                var button = $(this);
                var inputField = $('#' + button.data('input'));
                
                var frame = wp.media({
                    title: 'Seleccionar archivo de audio',
                    button: { text: 'Usar este audio' },
                    library: { type: 'audio' },
                    multiple: false
                });
                
                frame.on('select', function() {
                    var attachment = frame.state().get('selection').first().toJSON();
                    inputField.val(attachment.url);
                    
                    // Add audio preview
                    var audioPreview = inputField.closest('.fp-audio-row').find('.fp-audio-controls');
                    if (audioPreview.find('.fp-audio-preview').length === 0) {
                        audioPreview.append('<div class="fp-audio-preview">' +
                            '<audio controls src="' + attachment.url + '" style="max-width: 250px; height: 30px;"></audio>' +
                            '</div>');
                    } else {
                        audioPreview.find('audio').attr('src', attachment.url);
                    }
                });
                
                frame.open();
            });

            // Add Audio Field
            var audioIndex = <?php echo count($audios); ?>;
            $('#add_audio_button').on('click', function(){
                audioIndex++;
                var fieldId = 'fp_audio_' + audioIndex;
                var newField = 
                    '<div class="fp-audio-row">' +
                    '  <div class="fp-audio-number"><span>Página ' + audioIndex + '</span></div>' +
                    '  <div class="fp-audio-input">' +
                    '    <label for="' + fieldId + '" class="screen-reader-text">URL del audio para página ' + audioIndex + '</label>' +
                    '    <input type="text" name="fp_audios[]" id="' + fieldId + '" value="" class="regular-text fp-audio-url-input" placeholder="URL del archivo de audio">' +
                    '    <button type="button" class="button fp-audio-upload-btn" data-input="' + fieldId + '">Subir Audio</button>' +
                    '  </div>' +
                    '  <div class="fp-audio-controls">' +
                    '    <button type="button" class="button button-secondary remove-audio">Eliminar</button>' +
                    '  </div>' +
                    '</div>';
                $('#fp_audio_container').append(newField);
                
                // Initialize new uploader button
                $('.fp-audio-upload-btn').off('click').on('click', function(e) {
                    e.preventDefault();
                    var button = $(this);
                    var inputField = $('#' + button.data('input'));
                    
                    var frame = wp.media({
                        title: 'Seleccionar archivo de audio',
                        button: { text: 'Usar este audio' },
                        library: { type: 'audio' },
                        multiple: false
                    });
                    
                    frame.on('select', function() {
                        var attachment = frame.state().get('selection').first().toJSON();
                        inputField.val(attachment.url);
                        
                        // Add audio preview
                        var audioPreview = inputField.closest('.fp-audio-row').find('.fp-audio-controls');
                        if (audioPreview.find('.fp-audio-preview').length === 0) {
                            audioPreview.append('<div class="fp-audio-preview">' +
                                '<audio controls src="' + attachment.url + '" style="max-width: 250px; height: 30px;"></audio>' +
                                '</div>');
                        } else {
                            audioPreview.find('audio').attr('src', attachment.url);
                        }
                    });
                    
                    frame.open();
                });
                
                // Update labels after adding/removing fields
                updateAudioLabels();
            });

            // Remove Audio Field
            $('#fp_audio_container').on('click', '.remove-audio', function(){
                $(this).closest('.fp-audio-row').remove();
                // Update labels after removing fields
                updateAudioLabels();
            });
            
            // Function to update page numbers in labels
            function updateAudioLabels() {
                $('#fp_audio_container .fp-audio-row').each(function(index) {
                    $(this).find('.fp-audio-number span').html('Página ' + (index + 1));
                });
                // Update the index for adding new fields
                audioIndex = $('#fp_audio_container .fp-audio-row').length;
            }
        });
    </script>
<?php
}

function fp_interactive_callback($post)
{
    wp_nonce_field('fp_save_interactive_data', 'fp_interactive_nonce');
    $interactive_areas = get_post_meta($post->ID, 'fp_interactive_areas', true) ?: [];
    $pdf = get_post_meta($post->ID, 'fp_pdf', true);
?>
    <div class="fp-interactive-areas-admin">
        <p>
            <strong>Áreas Interactivas:</strong> Defina áreas en el PDF que funcionarán como enlaces clickeables.
        </p>
        
        <?php if (empty($pdf)) : ?>
            <div class="notice notice-warning inline">
                <p>Primero debe subir un archivo PDF en la sección "Configuración del Flipbook" para poder definir áreas interactivas.</p>
            </div>
        <?php else : ?>
            <!-- Editor visual y lista de áreas interactivas en tabs -->
            <div class="fp-tabs">
                <ul class="fp-tabs-nav">
                    <li class="active"><a href="#tab-list">Lista de Áreas</a></li>
                    <li><a href="#tab-visual">Editor Visual</a></li>
                </ul>
                
                <div class="fp-tabs-content">
                    <!-- Lista tabulada de áreas -->
                    <div id="tab-list" class="fp-tab-panel active">
                        <button type="button" class="button button-primary" id="fp_add_area_btn">+ Agregar Área Interactiva</button>
                        
                        <div id="fp_interactive_container" class="fp-areas-list">
                            <?php 
                            if (!empty($interactive_areas)) {
                                foreach ($interactive_areas as $area_index => $area) {
                                    $page_num = $area['page'] ?? 1;
                                    $x = $area['x'] ?? 0;
                                    $y = $area['y'] ?? 0;
                                    $width = $area['width'] ?? 100;
                                    $height = $area['height'] ?? 30;
                                    $url = $area['url'] ?? '';
                                    $tooltip = $area['tooltip'] ?? '';
                                    $new_tab = isset($area['new_tab']) && $area['new_tab'] ? 'checked' : '';
                                    $area_type = $area['type'] ?? 'url';
                                    $youtube_url = $area['youtube_url'] ?? '';
                                    $target_page = $area['target_page'] ?? 1;
                            ?>
                                <div class="fp-interactive-area-row" data-area-index="<?php echo $area_index; ?>">
                                    <div class="fp-area-header">
                                        <h4>Área #<?php echo $area_index + 1; ?> (Página <?php echo $page_num; ?>)</h4>
                                        <div class="fp-area-actions">
                                            <button type="button" class="button button-small edit-area-visually" data-area-index="<?php echo $area_index; ?>">Editar Visualmente</button>
                                            <button type="button" class="button button-small remove-area" title="Eliminar área">Eliminar</button>
                                        </div>
                                    </div>
                                    
                                    <div class="fp-area-content">
                                        <div class="fp-field-row">
                                            <label for="fp_area_page_<?php echo $area_index; ?>">
                                                <strong>Página:</strong>
                                            </label>
                                            <input type="number" id="fp_area_page_<?php echo $area_index; ?>" 
                                                   name="fp_areas[<?php echo $area_index; ?>][page]" 
                                                   value="<?php echo $page_num; ?>" min="1" required class="small-text">
                                        </div>
                                        
                                        <div class="fp-field-row fp-field-coordinates">
                                            <div>
                                                <label for="fp_area_x_<?php echo $area_index; ?>">
                                                    <strong>X:</strong>
                                                </label>
                                                <input type="number" id="fp_area_x_<?php echo $area_index; ?>" 
                                                       name="fp_areas[<?php echo $area_index; ?>][x]" 
                                                       step="0.1"
                                                       value="<?php echo $x; ?>" class="small-text">
                                            </div>
                                            <div>
                                                <label for="fp_area_y_<?php echo $area_index; ?>">
                                                    <strong>Y:</strong>
                                                </label>
                                                <input type="number" id="fp_area_y_<?php echo $area_index; ?>" 
                                                       name="fp_areas[<?php echo $area_index; ?>][y]" 
                                                       step="0.1"
                                                       value="<?php echo $y; ?>" class="small-text">
                                            </div>
                                            <div>
                                                <label for="fp_area_width_<?php echo $area_index; ?>">
                                                    <strong>Ancho:</strong>
                                                </label>
                                                <input type="number" id="fp_area_width_<?php echo $area_index; ?>" 
                                                       name="fp_areas[<?php echo $area_index; ?>][width]" 
                                                       step="0.1"
                                                       value="<?php echo $width; ?>" class="small-text">
                                            </div>
                                            <div>
                                                <label for="fp_area_height_<?php echo $area_index; ?>">
                                                    <strong>Alto:</strong>
                                                </label>
                                                <input type="number" id="fp_area_height_<?php echo $area_index; ?>" 
                                                       name="fp_areas[<?php echo $area_index; ?>][height]" 
                                                       step="0.1"
                                                       value="<?php echo $height; ?>" class="small-text">
                                            </div>
                                        </div>
                                        
                                        <div class="fp-field-row">
                                            <label for="fp_area_url_<?php echo $area_index; ?>">
                                                <strong>URL de destino:</strong>
                                            </label>
                                            <input type="url" id="fp_area_url_<?php echo $area_index; ?>" 
                                                   name="fp_areas[<?php echo $area_index; ?>][url]" 
                                                   value="<?php echo esc_url($url); ?>" class="regular-text">
                                        </div>
                                        
                                        <div class="fp-field-row">
                                            <label for="fp_area_tooltip_<?php echo $area_index; ?>">
                                                <strong>Texto (tooltip):</strong>
                                            </label>
                                            <input type="text" id="fp_area_tooltip_<?php echo $area_index; ?>" 
                                                   name="fp_areas[<?php echo $area_index; ?>][tooltip]" 
                                                   value="<?php echo esc_attr($tooltip); ?>" class="regular-text">
                                        </div>
                                        
                                        <div class="fp-field-row">
                                            <label>
                                                <input type="checkbox" name="fp_areas[<?php echo $area_index; ?>][new_tab]" <?php echo $new_tab; ?>>
                                                <strong>Abrir en nueva pestaña</strong>
                                            </label>
                                        </div>
                                        
                                        <div class="fp-field-row">
                                            <label for="fp_area_type_<?php echo $area_index; ?>">
                                                <strong>Tipo de área:</strong>
                                            </label>
                                            <select id="fp_area_type_<?php echo $area_index; ?>" name="fp_areas[<?php echo $area_index; ?>][type]" class="regular-text">
                                                <option value="url" <?php selected($area_type, 'url'); ?>>URL - Enlace externo</option>
                                                <option value="page" <?php selected($area_type, 'page'); ?>>Navegación - Ir a página</option>
                                                <option value="youtube" <?php selected($area_type, 'youtube'); ?>>Video - YouTube en popup</option>
                                            </select>
                                        </div>
                                        
                                        <div class="fp-field-row fp-youtube-url-field" style="display: <?php echo $area_type === 'youtube' ? 'block' : 'none'; ?>;">
                                            <label for="fp_area_youtube_url_<?php echo $area_index; ?>">
                                                <strong>ID del video de YouTube:</strong>
                                            </label>
                                            <input type="text" id="fp_area_youtube_url_<?php echo $area_index; ?>" 
                                                   name="fp_areas[<?php echo $area_index; ?>][youtube_url]" 
                                                   value="<?php echo esc_attr($youtube_url); ?>" class="regular-text" placeholder="Ej: dQw4w9WgXcQ">
                                        </div>
                                        
                                        <div class="fp-field-row fp-page-jump-field" style="display: <?php echo $area_type === 'page' ? 'block' : 'none'; ?>;">
                                            <label for="fp_area_target_page_<?php echo $area_index; ?>">
                                                <strong>Ir a página número:</strong>
                                            </label>
                                            <input type="number" id="fp_area_target_page_<?php echo $area_index; ?>" 
                                                   name="fp_areas[<?php echo $area_index; ?>][target_page]" 
                                                   value="<?php echo $target_page; ?>" min="1" class="small-text">
                                        </div>
                                    </div>
                                </div>
                            <?php 
                                }
                            } else {
                                echo '<div class="no-areas-message">No hay áreas interactivas definidas. Haga clic en "Agregar Área Interactiva" para comenzar.</div>';
                            }
                            ?>
                        </div>
                    </div>
                    
                    <!-- Editor visual -->
                    <div id="tab-visual" class="fp-tab-panel">
                        <div class="fp-visual-editor-controls">
                            <div class="fp-page-navigation">
                                <label for="fp_editor_page">Ir a página:</label>
                                <input type="number" id="fp_editor_page" min="1" value="1" class="small-text">
                                <button type="button" class="button" id="fp_go_to_page">Ir</button>
                            </div>
                            
                            <div class="fp-visual-editor-actions">
                                <button type="button" class="button button-primary" id="fp_start_selection">Crear Nueva Área</button>
                                <button type="button" class="button button-secondary" id="fp_cancel_selection" style="display:none;">Cancelar</button>
                            </div>
                        </div>
                        
                        <div class="fp-visual-editor">
                            <div id="fp_pdf_viewer" class="fp-pdf-editor-preview">
                                <iframe src="<?php echo esc_url($pdf); ?>" id="pdf_preview_iframe"></iframe>
                                <div id="fp_selection_overlay" class="fp-selection-overlay"></div>
                                <div id="fp_areas_overlay" class="fp-areas-overlay"></div>
                            </div>
                            
                            <div id="fp_area_form" class="fp-area-popup-form" style="display:none;">
                                <h3>Configurar Área Interactiva</h3>
                                <div class="fp-field-row">
                                    <label for="popup_url">URL de destino:</label>
                                    <input type="url" id="popup_url" name="popup_url" class="regular-text">
                                </div>
                                <div class="fp-field-row">
                                    <label for="popup_tooltip">Texto (tooltip):</label>
                                    <input type="text" id="popup_tooltip" name="popup_tooltip" class="regular-text">
                                </div>
                                <div class="fp-field-row">
                                    <label for="popup_type">Tipo de área:</label>
                                    <select id="popup_type" name="popup_type" class="regular-text">
                                        <option value="url">URL - Enlace externo</option>
                                        <option value="page">Navegación - Ir a página</option>
                                        <option value="youtube">Video - YouTube en popup</option>
                                    </select>
                                </div>
                                <div class="fp-field-row fp-youtube-url-field" style="display: none;">
                                    <label for="popup_youtube_url">ID del video de YouTube:</label>
                                    <input type="text" id="popup_youtube_url" name="popup_youtube_url" class="regular-text" placeholder="Ej: dQw4w9WgXcQ">
                                </div>
                                <div class="fp-field-row fp-page-jump-field" style="display: none;">
                                    <label for="popup_target_page">Ir a página número:</label>
                                    <input type="number" id="popup_target_page" name="popup_target_page" class="small-text" min="1" value="1">
                                </div>
                                <div class="fp-field-row">
                                    <label>
                                        <input type="checkbox" id="popup_new_tab" name="popup_new_tab">
                                        Abrir en nueva pestaña
                                    </label>
                                </div>
                                <div class="fp-popup-actions">
                                    <button type="button" class="button button-primary" id="fp_save_area">Guardar Área</button>
                                    <button type="button" class="button" id="fp_cancel_area">Cancelar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        <?php endif; ?>
        
        <script type="text/html" id="fp_area_template">
            <div class="fp-interactive-area-row" data-area-index="NEW_INDEX">
                <div class="fp-area-header">
                    <h4>Área #NEW_INDEX_PLUS (Página PAGE_NUM)</h4>
                    <div class="fp-area-actions">
                        <button type="button" class="button button-small edit-area-visually" data-area-index="NEW_INDEX">Editar Visualmente</button>
                        <button type="button" class="button button-small remove-area" title="Eliminar área">Eliminar</button>
                    </div>
                </div>
                
                <div class="fp-area-content">
                    <div class="fp-field-row">
                        <label for="fp_area_page_NEW_INDEX">
                            <strong>Página:</strong>
                        </label>
                        <input type="number" id="fp_area_page_NEW_INDEX" 
                               name="fp_areas[NEW_INDEX][page]" 
                               value="PAGE_NUM" min="1" required class="small-text">
                    </div>
                    
                    <div class="fp-field-row fp-field-coordinates">
                        <div>
                            <label for="fp_area_x_NEW_INDEX">
                                <strong>X:</strong>
                            </label>
                            <input type="number" id="fp_area_x_NEW_INDEX" 
                                   name="fp_areas[NEW_INDEX][x]" 
                                   step="0.1"
                                   value="X_VALUE" class="small-text">
                        </div>
                        <div>
                            <label for="fp_area_y_NEW_INDEX">
                                <strong>Y:</strong>
                            </label>
                            <input type="number" id="fp_area_y_NEW_INDEX" 
                                   name="fp_areas[NEW_INDEX][y]" 
                                   step="0.1"
                                   value="Y_VALUE" class="small-text">
                        </div>
                        <div>
                            <label for="fp_area_width_NEW_INDEX">
                                <strong>Ancho:</strong>
                            </label>
                            <input type="number" id="fp_area_width_NEW_INDEX" 
                                   name="fp_areas[NEW_INDEX][width]" 
                                   step="0.1"
                                   value="WIDTH_VALUE" class="small-text">
                        </div>
                        <div>
                            <label for="fp_area_height_NEW_INDEX">
                                <strong>Alto:</strong>
                            </label>
                            <input type="number" id="fp_area_height_NEW_INDEX" 
                                   name="fp_areas[NEW_INDEX][height]" 
                                   step="0.1"
                                   value="HEIGHT_VALUE" class="small-text">
                        </div>
                    </div>
                    
                    <div class="fp-field-row">
                        <label for="fp_area_url_NEW_INDEX">
                            <strong>URL de destino:</strong>
                        </label>
                        <input type="url" id="fp_area_url_NEW_INDEX" 
                               name="fp_areas[NEW_INDEX][url]" 
                               value="URL_VALUE" class="regular-text">
                    </div>
                    
                    <div class="fp-field-row">
                        <label for="fp_area_tooltip_NEW_INDEX">
                            <strong>Texto (tooltip):</strong>
                        </label>
                        <input type="text" id="fp_area_tooltip_NEW_INDEX" 
                               name="fp_areas[NEW_INDEX][tooltip]" 
                               value="TOOLTIP_VALUE" class="regular-text">
                    </div>
                    
                    <div class="fp-field-row">
                        <label>
                            <input type="checkbox" name="fp_areas[NEW_INDEX][new_tab]" NEW_TAB_CHECKED>
                            <strong>Abrir en nueva pestaña</strong>
                        </label>
                    </div>
                    
                    <div class="fp-field-row">
                        <label for="fp_area_type_NEW_INDEX">
                            <strong>Tipo de área:</strong>
                        </label>
                        <select id="fp_area_type_NEW_INDEX" name="fp_areas[NEW_INDEX][type]" class="regular-text">
                            <option value="url" TYPE_IS_URL>URL - Enlace externo</option>
                            <option value="page" TYPE_IS_PAGE>Navegación - Ir a página</option>
                            <option value="youtube" TYPE_IS_YOUTUBE>Video - YouTube en popup</option>
                        </select>
                    </div>
                    
                    <div class="fp-field-row fp-youtube-url-field" style="display: none;">
                        <label for="fp_area_youtube_url_NEW_INDEX">
                            <strong>ID del video de YouTube:</strong>
                        </label>
                        <input type="text" id="fp_area_youtube_url_NEW_INDEX" 
                               name="fp_areas[NEW_INDEX][youtube_url]" 
                               value="YOUTUBE_URL_VALUE" class="regular-text" placeholder="Ej: dQw4w9WgXcQ">
                    </div>
                    
                    <div class="fp-field-row fp-page-jump-field" style="display: none;">
                        <label for="fp_area_target_page_NEW_INDEX">
                            <strong>Ir a página número:</strong>
                        </label>
                        <input type="number" id="fp_area_target_page_NEW_INDEX" 
                               name="fp_areas[NEW_INDEX][target_page]" 
                               value="TARGET_PAGE_VALUE" min="1" class="small-text">
                    </div>
                </div>
            </div>
        </script>
    </div>
    
    <style>
    .fp-interactive-areas-admin {
        margin: 15px 0;
    }
    
    /* Tabs */
    .fp-tabs {
        margin-top: 15px;
    }
    .fp-tabs-nav {
        display: flex;
        border-bottom: 1px solid #ccc;
        margin: 0;
        padding: 0;
    }
    .fp-tabs-nav li {
        margin: 0 0 -1px 0;
        list-style: none;
    }
    .fp-tabs-nav li a {
        display: block;
        padding: 10px 15px;
        text-decoration: none;
        background: #f1f1f1;
        border: 1px solid #ccc;
        color: #555;
    }
    .fp-tabs-nav li.active a {
        background: #fff;
        border-bottom-color: #fff;
    }
    .fp-tab-panel {
        display: none;
        border: 1px solid #ccc;
        border-top: none;
        padding: 15px;
        background: #fff;
    }
    .fp-tab-panel.active {
        display: block;
    }
    
    /* Área interactiva en lista */
    .fp-interactive-area-row {
        margin-bottom: 15px;
        border: 1px solid #ddd;
        border-radius: 3px;
        background-color: #f9f9f9;
    }
    .fp-area-header {
        padding: 10px;
        background-color: #f1f1f1;
        border-bottom: 1px solid #ddd;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .fp-area-header h4 {
        margin: 0;
    }
    .fp-area-actions {
        display: flex;
        gap: 5px;
    }
    .fp-area-content {
        padding: 15px;
    }
    .fp-field-row {
        margin-bottom: 10px;
    }
    .fp-field-coordinates {
        display: flex;
        gap: 10px;
    }
    .no-areas-message {
        padding: 20px;
        background: #f5f5f5;
        border: 1px dashed #ddd;
        text-align: center;
        margin: 15px 0;
    }
    
    /* Editor visual */
    .fp-visual-editor-controls {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        padding: 10px;
        background: #f1f1f1;
        border: 1px solid #ddd;
        border-radius: 3px;
    }
    .fp-visual-editor {
        position: relative;
        margin-top: 10px;
    }
    .fp-pdf-editor-preview {
        position: relative;
        min-height: 500px;
        border: 1px solid #ddd;
        overflow: hidden;
    }
    .fp-pdf-editor-preview iframe {
        width: 100%;
        height: 500px;
        border: none;
    }
    .fp-selection-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10;
        cursor: crosshair;
        pointer-events: none;
    }
    .fp-selection-overlay.selecting {
        pointer-events: auto;
    }
    .fp-selection-box {
        position: absolute;
        border: 2px dashed #0073aa;
        background-color: rgba(0, 115, 170, 0.2);
        pointer-events: none;
    }
    .fp-areas-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9;
        pointer-events: none;
    }
    .fp-existing-area {
        position: absolute;
        border: 1px solid #007cba;
        background-color: rgba(0, 124, 186, 0.15);
        transition: background-color 0.2s;
    }
    .fp-area-popup-form {
        position: absolute;
        background: #fff;
        border: 1px solid #ccc;
        padding: 15px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        z-index: 20;
        width: 300px;
    }
    .fp-popup-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 10px;
        gap: 5px;
    }
    </style>
    
    <script type="text/javascript">
        jQuery(document).ready(function($) {
            // Tabs functionality
            $('.fp-tabs-nav a').on('click', function(e) {
                e.preventDefault();
                const tabId = $(this).attr('href');
                
                $('.fp-tabs-nav li').removeClass('active');
                $(this).parent().addClass('active');
                
                $('.fp-tab-panel').removeClass('active');
                $(tabId).addClass('active');
            });
            
            // Inicializar campos de tipo de área
            $('#fp_interactive_container .fp-interactive-area-row').each(function() {
                var areaType = $(this).find('select[name^="fp_areas"][name$="[type]"]').val();
                // Mostrar/ocultar campos según el tipo de área
                $(this).find('.fp-youtube-url-field').toggle(areaType === 'youtube');
                $(this).find('.fp-page-jump-field').toggle(areaType === 'page');
            });
            
            // Manejar cambios en el tipo de área
            $('#fp_interactive_container').on('change', 'select[name^="fp_areas"][name$="[type]"]', function() {
                var $row = $(this).closest('.fp-interactive-area-row');
                var type = $(this).val();
                
                // Ocultar todos los campos específicos
                $row.find('.fp-youtube-url-field, .fp-page-jump-field').hide();
                
                // Mostrar campos según el tipo
                if (type === 'youtube') {
                    $row.find('.fp-youtube-url-field').show();
                } else if (type === 'page') {
                    $row.find('.fp-page-jump-field').show();
                }
            });
            
            // Variables para gestionar áreas
            var addAreaInProgress = false;
            var areaIndex = $('#fp_interactive_container .fp-interactive-area-row').length;
            
            // Añadir área - evitando duplicados
            $('#fp_add_area_btn').on('click', function() {
                if (addAreaInProgress) return; // Evitar clicks rápidos
                addAreaInProgress = true;
                
                var template = $('#fp_area_template').html();
                var areaIndexPlus = areaIndex + 1;
                
                var newRow = template
                    .replace(/NEW_INDEX/g, areaIndex)
                    .replace(/NEW_INDEX_PLUS/g, areaIndexPlus)
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
                
                // Incrementar índice después de crear el área
                areaIndex++;
                
                // Desbloquear después de un breve retraso
                setTimeout(function() {
                    addAreaInProgress = false;
                }, 300);
            });
            
            // Remove Interactive Area
            $('#fp_interactive_container').on('click', '.remove-area', function() {
                $(this).closest('.fp-interactive-area-row').remove();
                
                if ($('#fp_interactive_container .fp-interactive-area-row').length === 0) {
                    $('#fp_interactive_container').html('<div class="no-areas-message">No hay áreas interactivas definidas. Haga clic en "Agregar Área Interactiva" para comenzar.</div>');
                }
                
                // Actualizar títulos
                $('#fp_interactive_container .fp-interactive-area-row').each(function(idx) {
                    $(this).find('h4').text('Área #' + (idx + 1) + ' (Página ' + $(this).find('input[name^="fp_areas"][name$="[page]"]').val() + ')');
                    $(this).attr('data-area-index', idx);
                    $(this).find('.edit-area-visually').attr('data-area-index', idx);
                });
            });
            
            // Visual Editor Logic
            let pdfScale = 1;
            let currentPage = 1;
            let isSelecting = false;
            let selectionStart = { x: 0, y: 0 };
            let $selectionBox = null;
            let editingAreaIndex = -1;
            
            // Adjust iframe content when loaded
            $('#pdf_preview_iframe').on('load', function() {
                renderExistingAreas();
            });
            
            // Go to page functionality
            $('#fp_go_to_page').on('click', function() {
                navigateToPage();
            });
            
            $('#fp_editor_page').on('keypress', function(e) {
                if (e.which === 13) {
                    e.preventDefault();
                    navigateToPage();
                }
            });
            
            function navigateToPage() {
                const pageNum = parseInt($('#fp_editor_page').val(), 10);
                if (isNaN(pageNum) || pageNum < 1) return;
                
                currentPage = pageNum;
                
                // This would need to be modified based on how your PDF is structured
                // For now, just rerender existing areas
                renderExistingAreas();
            }
            
            // Start area selection
            $('#fp_start_selection').on('click', function() {
                isSelecting = true;
                $('#fp_selection_overlay').addClass('selecting');
                $(this).hide();
                $('#fp_cancel_selection').show();
                
                // Create selection box if not exists
                if (!$selectionBox) {
                    $selectionBox = $('<div class="fp-selection-box"></div>');
                    $('#fp_selection_overlay').append($selectionBox);
                }
                $selectionBox.hide();
            });
            
            // Cancel selection
            $('#fp_cancel_selection').on('click', function() {
                cancelSelection();
            });
            
            function cancelSelection() {
                isSelecting = false;
                $('#fp_selection_overlay').removeClass('selecting');
                $('#fp_start_selection').show();
                $('#fp_cancel_selection').hide();
                
                if ($selectionBox) {
                    $selectionBox.hide();
                }
                
                hideAreaForm();
            }
            
            // Selection events
            $('#fp_selection_overlay').on('mousedown', function(e) {
                if (!isSelecting) return;
                
                const overlay = $(this);
                const offsetX = e.pageX - overlay.offset().left;
                const offsetY = e.pageY - overlay.offset().top;
                
                selectionStart = { x: offsetX, y: offsetY };
                
                $selectionBox.css({
                    left: offsetX + 'px',
                    top: offsetY + 'px',
                    width: '0',
                    height: '0'
                }).show();
            });
            
            $('#fp_selection_overlay').on('mousemove', function(e) {
                if (!isSelecting || !$selectionBox.is(':visible')) return;
                
                const overlay = $(this);
                const offsetX = e.pageX - overlay.offset().left;
                const offsetY = e.pageY - overlay.offset().top;
                
                const width = Math.abs(offsetX - selectionStart.x);
                const height = Math.abs(offsetY - selectionStart.y);
                
                // Calculate top-left corner
                const left = Math.min(offsetX, selectionStart.x);
                const top = Math.min(offsetY, selectionStart.y);
                
                $selectionBox.css({
                    left: left + 'px',
                    top: top + 'px',
                    width: width + 'px',
                    height: height + 'px'
                });
            });
            
            $('#fp_selection_overlay').on('mouseup', function(e) {
                if (!isSelecting || !$selectionBox.is(':visible')) return;
                
                const overlay = $(this);
                const offsetX = e.pageX - overlay.offset().left;
                const offsetY = e.pageY - overlay.offset().top;
                
                // Finalize selection
                const width = Math.abs(offsetX - selectionStart.x);
                const height = Math.abs(offsetY - selectionStart.y);
                
                // Calculate top-left corner
                const left = Math.min(offsetX, selectionStart.x);
                const top = Math.min(offsetY, selectionStart.y);
                
                // Check if selection has minimum size
                if (width < 10 || height < 10) {
                    $selectionBox.hide();
                    return;
                }
                
                // Show area form
                showAreaForm(left, top, width, height);
            });
            
            // Cancel area form
            $('#fp_cancel_area').on('click', function() {
                hideAreaForm();
                cancelSelection();
            });
            
            // Save area from selection
            function saveAreaFromSelection() {
                if (!$selectionBox) return;
                
                const selection = $selectionBox.data('selection');
                const url = $('#popup_url').val();
                const tooltip = $('#popup_tooltip').val();
                const newTab = $('#popup_new_tab').is(':checked');
                const type = $('#popup_type').val();
                const youtubeUrl = $('#popup_youtube_url').val();
                const targetPage = $('#popup_target_page').val();
                
                // Create new area
                var template = $('#fp_area_template').html();
                var newRow = template
                    .replace(/NEW_INDEX/g, areaIndex)
                    .replace(/NEW_INDEX_PLUS/g, areaIndex + 1)
                    .replace(/PAGE_NUM/g, selection.page)
                    .replace(/X_VALUE/g, selection.left.toFixed(1))
                    .replace(/Y_VALUE/g, selection.top.toFixed(1))
                    .replace(/WIDTH_VALUE/g, selection.width.toFixed(1))
                    .replace(/HEIGHT_VALUE/g, selection.height.toFixed(1))
                    .replace(/URL_VALUE/g, url)
                    .replace(/TOOLTIP_VALUE/g, tooltip)
                    .replace(/NEW_TAB_CHECKED/g, newTab ? 'checked' : '')
                    .replace(/TYPE_IS_URL/g, type === 'url' ? 'selected' : '')
                    .replace(/TYPE_IS_PAGE/g, type === 'page' ? 'selected' : '')
                    .replace(/TYPE_IS_YOUTUBE/g, type === 'youtube' ? 'selected' : '')
                    .replace(/YOUTUBE_URL_VALUE/g, youtubeUrl || '')
                    .replace(/TARGET_PAGE_VALUE/g, targetPage || '1');
                
                $('#fp_interactive_container').append(newRow);
                $('.no-areas-message').remove();
                
                // Mostrar/ocultar campos según el tipo
                const $newRow = $('#fp_interactive_container .fp-interactive-area-row').last();
                $newRow.find('.fp-youtube-url-field').toggle(type === 'youtube');
                $newRow.find('.fp-page-jump-field').toggle(type === 'page');
                
                areaIndex++;
                
                // Exit selection mode and hide form
                cancelSelection();
                hideAreaForm();
                
                // Re-render areas
                renderExistingAreas();
            }
            
            // Show area form at specific position
            function showAreaFormAtPosition(left, top) {
                const $form = $('#fp_area_form');
                $form.css({
                    left: left + 'px',
                    top: top + 'px'
                }).show();
            }
            
            // Show area form after selection
            function showAreaForm(left, top, width, height) {
                // Save selection dimensions
                $selectionBox.data('selection', {
                    left: left / pdfScale,
                    top: top / pdfScale,
                    width: width / pdfScale,
                    height: height / pdfScale,
                    page: currentPage
                });
                
                // Show form near selection
                const formLeft = left + width + 10;
                const formTop = top;
                
                // Clear form values
                $('#popup_url').val('');
                $('#popup_tooltip').val('');
                $('#popup_new_tab').prop('checked', false);
                
                showAreaFormAtPosition(formLeft, formTop);
            }
            
            // Hide area form
            function hideAreaForm() {
                $('#fp_area_form').hide();
                editingAreaIndex = -1;
            }
            
            // Render existing areas
            function renderExistingAreas() {
                const $areasOverlay = $('#fp_areas_overlay');
                $areasOverlay.empty();
                
                // Find all areas for current page
                $('.fp-interactive-area-row').each(function() {
                    const $row = $(this);
                    const pageNum = parseInt($row.find('input[name^="fp_areas"][name$="[page]"]').val(), 10);
                    
                    if (pageNum === currentPage) {
                        const areaIndex = $row.data('area-index');
                        const x = parseFloat($row.find('input[name^="fp_areas"][name$="[x]"]').val());
                        const y = parseFloat($row.find('input[name^="fp_areas"][name$="[y]"]').val());
                        const width = parseFloat($row.find('input[name^="fp_areas"][name$="[width]"]').val());
                        const height = parseFloat($row.find('input[name^="fp_areas"][name$="[height]"]').val());
                        
                        // Calculate scale to match current display
                        const scaledX = x * pdfScale;
                        const scaledY = y * pdfScale;
                        const scaledWidth = width * pdfScale;
                        const scaledHeight = height * pdfScale;
                        
                        const $area = $('<div class="fp-existing-area"></div>')
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
            }
        });
    </script>
<?php
}

function fp_indesign_callback($post)
{
    wp_nonce_field('fp_save_indesign_data', 'fp_indesign_nonce');
    
    // Obtener datos de InDesign guardados
    $indesign_data = get_post_meta($post->ID, '_fp_indesign_data', true);
    if (!$indesign_data) {
        $indesign_data = array();
    }
    
    ?>
    <div class="fp-meta-section">
        <h3>Acciones de InDesign</h3>
        <p class="description">Importe acciones definidas en Adobe InDesign para navegar entre páginas o abrir enlaces.</p>
        
        <div class="fp-indesign-actions-container">
            <div class="fp-indesign-upload">
                <label for="fp_indesign_json">Archivo JSON de InDesign:</label>
                <input type="file" id="fp_indesign_json" accept=".json">
                <button type="button" class="button" id="fp_import_indesign">Importar Acciones</button>
            </div>
            
            <div class="fp-indesign-data">
                <h4>Acciones Importadas</h4>
                <div class="fp-indesign-list">
                    <?php if (empty($indesign_data)) : ?>
                        <p>No hay acciones de InDesign importadas.</p>
                    <?php else : ?>
                        <table class="widefat striped">
                            <thead>
                                <tr>
                                    <th>Página Origen</th>
                                    <th>Tipo</th>
                                    <th>Destino</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($indesign_data as $index => $action) : ?>
                                <tr>
                                    <td><?php echo esc_html($action['sourcePage']); ?></td>
                                    <td><?php echo esc_html($action['type']); ?></td>
                                    <td>
                                        <?php 
                                        if ($action['type'] === 'goto') {
                                            echo 'Página ' . esc_html($action['targetPage']);
                                        } elseif ($action['type'] === 'url') {
                                            echo esc_html($action['url']);
                                        }
                                        ?>
                                    </td>
                                    <td>
                                        <button type="button" class="button remove-indesign-action" 
                                                data-index="<?php echo esc_attr($index); ?>">Eliminar</button>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php endif; ?>
                </div>
            </div>
            
            <input type="hidden" id="fp_indesign_data" name="fp_indesign_data" 
                   value="<?php echo esc_attr(json_encode($indesign_data)); ?>">
        </div>
    </div>
    <?php
}

function fp_save_meta($post_id)
{
    // Verificar nonces
    if ((!isset($_POST['fp_meta_nonce']) || !wp_verify_nonce($_POST['fp_meta_nonce'], 'fp_save_meta_data')) &&
        (!isset($_POST['fp_interactive_nonce']) || !wp_verify_nonce($_POST['fp_interactive_nonce'], 'fp_save_interactive_data'))) {
        return;
    }
    
    // Verificar autoguardado
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    // Verificar permisos
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }
    
    // Guardar metadatos
    
    // PDF URL
    if (isset($_POST['fp_pdf'])) {
        update_post_meta($post_id, 'fp_pdf', sanitize_text_field($_POST['fp_pdf']));
    }
    
    // Áreas interactivas
    if (isset($_POST['fp_areas']) && is_array($_POST['fp_areas'])) {
        $areas = array();
        foreach ($_POST['fp_areas'] as $index => $area) {
            if (!empty($area)) {
                $areas[] = array(
                    'page' => absint($area['page']),
                    'x' => floatval($area['x']),
                    'y' => floatval($area['y']),
                    'width' => floatval($area['width']),
                    'height' => floatval($area['height']),
                    'url' => esc_url_raw($area['url']),
                    'tooltip' => sanitize_text_field($area['tooltip']),
                    'new_tab' => isset($area['new_tab']) ? true : false,
                    'type' => sanitize_text_field($area['type']),
                    'youtube_url' => sanitize_text_field($area['youtube_url']),
                    'target_page' => absint($area['target_page'])
                );
            }
        }
        update_post_meta($post_id, 'fp_interactive_areas', $areas);
    } else {
        delete_post_meta($post_id, 'fp_interactive_areas');
    }
    
    // Guardar archivos de audio
    if (isset($_POST['fp_audios']) && is_array($_POST['fp_audios'])) {
        $audios = array_map('sanitize_text_field', $_POST['fp_audios']);
        update_post_meta($post_id, 'fp_audios', $audios);
    } else {
        delete_post_meta($post_id, 'fp_audios');
    }
    
    // Datos de InDesign
    if (isset($_POST['fp_indesign_data']) && !empty($_POST['fp_indesign_data'])) {
        $indesign_data = json_decode(stripslashes($_POST['fp_indesign_data']), true);
        if (is_array($indesign_data)) {
            update_post_meta($post_id, '_fp_indesign_data', $indesign_data);
        }
    } else {
        delete_post_meta($post_id, '_fp_indesign_data');
    }
}
add_action('save_post_flipbook', 'fp_save_meta');

// Registrar y encolar scripts frontend
function fp_register_frontend_scripts() {
    // PDF.js library y worker (usar versión estable de CDN)
    wp_register_script('pdfjs-core', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js', array(), '3.4.120', true);
    wp_register_script('pdfjs-worker', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js', array(), '3.4.120', true);
    
    // Estilos del flipbook
    wp_register_style('fp-front-style', FP_PLUGIN_URL . 'css/fp-front.css', array(), '1.5');
    
    // Script principal del flipbook
    wp_register_script('fp-front-script', FP_PLUGIN_URL . 'js/fp-front.js', array('jquery', 'pdfjs-core'), '1.5', true);
}
add_action('wp_enqueue_scripts', 'fp_register_frontend_scripts');

// Registrar el shortcode con el formato correcto
add_shortcode('flipbook', 'fp_flipbook_shortcode');

// Función para procesar el shortcode con formato [flipbook=id]
function fp_process_shortcode($content) {
    if (preg_match_all('/\[flipbook=(\d+)\]/', $content, $matches)) {
        foreach ($matches[0] as $key => $shortcode) {
            $id = $matches[1][$key];
            $replacement = do_shortcode('[flipbook id="' . $id . '"]');
            $content = str_replace($shortcode, $replacement, $content);
        }
    }
    return $content;
}
add_filter('the_content', 'fp_process_shortcode', 11);

// Shortcode para visualizar el Flipbook
function fp_flipbook_shortcode($atts)
{
    $atts = shortcode_atts(array(
        'id' => 0,
        'width' => '100%',
        'height' => '600px',
        'view_mode' => 'double', // 'single' o 'double'
    ), $atts, 'flipbook');

    $post_id = absint($atts['id']);
    if (!$post_id || get_post_type($post_id) !== 'flipbook') {
        return '<p>Flipbook no encontrado. Verifique el ID proporcionado.</p>';
    }
    
    // Obtener datos del flipbook
    $pdf_url = get_post_meta($post_id, 'fp_pdf', true);
    if (empty($pdf_url)) {
        return '<p>No se ha configurado un PDF para este flipbook. Por favor, suba un PDF desde el panel de administración.</p>';
    }
    
    // Obtener datos de audios asignados a páginas
    $audios = get_post_meta($post_id, 'fp_audios', true) ?: [];
    
    // Obtener áreas interactivas
    $interactive_areas = get_post_meta($post_id, 'fp_interactive_areas', true) ?: [];
    
    // Obtener configuración visual
    $theme_mode = get_post_meta($post_id, 'fp_theme_mode', true) ?: 'light';
    $accent_color = get_post_meta($post_id, 'fp_accent_color', true) ?: '#e42535';
    
    // ID único para el contenedor
    $container_id = 'flipbook-container-' . $post_id . '-' . uniqid();
    
    // Enqueue scripts and styles
    wp_enqueue_style('fp-front-style');
    wp_enqueue_script('pdfjs-core');
    wp_enqueue_script('fp-front-script');
    
    // Pasar variables al JavaScript
    wp_localize_script('fp-front-script', 'fpConfig', array(
        'pdfWorkerSrc' => 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js',
        'audios' => $audios,
        'interactiveAreas' => $interactive_areas,
        'indesignData' => get_post_meta($post_id, '_fp_indesign_data', true) ?: array(),
        'postId' => $post_id,
        'themeMode' => $theme_mode,
        'accentColor' => $accent_color,
        'ajaxurl' => admin_url('admin-ajax.php')
    ));
    
    // Determinar clase de tema según configuración
    $theme_class = '';
    if ($theme_mode === 'dark') {
        $theme_class = 'dark-mode';
    } elseif ($theme_mode === 'user_choice') {
        $theme_class = 'user-choice-theme';
    }
    
    // CSS inline para el color de acento
    $accent_color_css = '
    <style>
        #' . esc_attr($container_id) . ' {
            --fp-accent-color: ' . esc_attr($accent_color) . ';
        }
    </style>
    ';
    
    // Generar HTML para el flipbook
    $output = $accent_color_css . '
    <div id="' . esc_attr($container_id) . '" class="flipbook-container ' . esc_attr($theme_class) . '" 
         data-pdf="' . esc_url($pdf_url) . '" 
         data-view-mode="' . esc_attr($atts['view_mode']) . '" 
         style="width: ' . esc_attr($atts['width']) . '; height: ' . esc_attr($atts['height']) . ';">
        
        <!-- Selector de fondo si es user_choice -->
        ' . ($theme_mode === 'user_choice' ? '<div class="fp-background-picker">
            <div class="fp-background-option fp-background-light active" data-theme="light"></div>
            <div class="fp-background-option fp-background-dark" data-theme="dark"></div>
        </div>' : '') . '
        
        <!-- Toolbar / Controles -->
        <div class="fp-toolbar">
            <div class="fp-toolbar-group fp-nav-btns">
                <button type="button" class="fp-tool-btn fp-zoom-out" title="Reducir">
                    <i class="dashicons dashicons-minus"></i>
                </button>
                <input type="range" class="fp-zoom-slider" min="0.5" max="3" step="0.1" value="1">
                <button type="button" class="fp-tool-btn fp-zoom-in" title="Ampliar">
                    <i class="dashicons dashicons-plus"></i>
                </button>
            </div>
            
            <div class="fp-toolbar-group fp-page-nav">
                <div class="fp-page-input-container">
                    <input type="number" class="fp-page-input" min="1" value="1">
                    <span class="fp-page-indicator">/ <span class="fp-total-pages">0</span></span>
                </div>
                <button type="button" class="fp-tool-btn fp-goto-page" title="Ir a página">
                    <i class="dashicons dashicons-arrow-right-alt"></i>
                </button>
            </div>
            
            <div class="fp-toolbar-group fp-view-btns">
                <button type="button" class="fp-tool-btn fp-view-toggle" title="Cambiar vista">
                    <i class="dashicons dashicons-book-alt"></i>
                </button>
                <button type="button" class="fp-tool-btn fp-fullscreen" title="Pantalla completa">
                    <i class="dashicons dashicons-fullscreen-alt"></i>
                </button>
            </div>
        </div>
        
        <!-- Área del visor -->
        <div class="fp-viewer-area">
            <button type="button" class="fp-arrow fp-arrow-left" disabled>
                <i class="dashicons dashicons-arrow-left-alt2"></i>
            </button>
            
            <div class="fp-pdf-viewer">
                <div class="fp-pages-container"></div>
                <div class="fp-loading">Cargando PDF...</div>
            </div>
            
            <button type="button" class="fp-arrow fp-arrow-right" disabled>
                <i class="dashicons dashicons-arrow-right-alt2"></i>
            </button>
        </div>
        
        <!-- Reproductor de audio -->
        <div class="fp-audio-container">
            <audio class="fp-audio-player" controls></audio>
        </div>
    </div>';
    
    return $output;
}

// Función para insertar el botón de Flipbook en el editor
function fp_insert_flipbook_button() {
    global $current_screen;
    
    // Solo mostrar en el editor de páginas y entradas
    if ($current_screen->base === 'post' && in_array($current_screen->post_type, array('post', 'page'))) {
        ?>
        <script type="text/javascript">
            jQuery(document).ready(function($) {
                $('#wp-content-media-buttons').append('<button type="button" class="button" id="fp-add-flipbook"><span class="dashicons dashicons-book" style="vertical-align: text-top;"></span> Insertar Flipbook</button>');
                
                $('#fp-add-flipbook').on('click', function(e) {
                    e.preventDefault();
                    
                    // Petición AJAX para obtener lista de flipbooks
                    $.ajax({
                        url: ajaxurl,
                        type: 'post',
                        data: {
                            action: 'fp_get_flipbooks',
                            nonce: '<?php echo wp_create_nonce("fp_get_flipbooks_nonce"); ?>'
                        },
                        success: function(response) {
                            if (response.success) {
                                showFlipbookSelector(response.data);
                            } else {
                                alert('Error: ' + response.data);
                            }
                        },
                        error: function() {
                            alert('Error al cargar los flipbooks.');
                        }
                    });
                    
                    // Función para mostrar selector de flipbooks
                    function showFlipbookSelector(flipbooks) {
                        var $modal = $('<div class="fp-modal">' +
                            '<div class="fp-modal-content">' +
                            '<span class="fp-modal-close">&times;</span>' +
                            '<h3>Insertar Flipbook</h3>' +
                            '<div class="fp-flipbooks-list"></div>' +
                            '</div>' +
                            '</div>');
                        
                        var $list = $modal.find('.fp-flipbooks-list');
                        
                        if (flipbooks.length === 0) {
                            $list.html('<p>No hay flipbooks disponibles. <a href="<?php echo admin_url('post-new.php?post_type=flipbook'); ?>" target="_blank">Crear nuevo</a></p>');
                        } else {
                            var $table = $('<table class="widefat striped">' +
                                '<thead><tr><th>Título</th><th>Acciones</th></tr></thead>' +
                                '<tbody></tbody>' +
                                '</table>');
                            
                            $.each(flipbooks, function(i, flipbook) {
                                $table.find('tbody').append('<tr>' +
                                    '<td>' + flipbook.title + '</td>' +
                                    '<td><button type="button" class="button insert-flipbook" data-id="' + flipbook.id + '">Insertar</button></td>' +
                                    '</tr>');
                            });
                            
                            $list.html($table);
                        }
                        
                        $('body').append($modal);
                        $modal.show();
                        
                        // Cerrar modal
                        $modal.find('.fp-modal-close').on('click', function() {
                            $modal.remove();
                        });
                        
                        // Insertar shortcode
                        $modal.on('click', '.insert-flipbook', function() {
                            var id = $(this).data('id');
                            wp.media.editor.insert('[flipbook=' + id + ']');
                            $modal.remove();
                        });
                        
                        // Cerrar modal al hacer clic fuera
                        $(window).on('click', function(e) {
                            if ($(e.target).is($modal)) {
                                $modal.remove();
                            }
                        });
                    }
                });
            });
        </script>
        <style>
            .fp-modal {
                display: none;
                position: fixed;
                z-index: 100000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0,0,0,0.4);
            }
            .fp-modal-content {
                background-color: #fefefe;
                margin: 10% auto;
                padding: 20px;
                border: 1px solid #888;
                width: 50%;
                min-width: 300px;
                max-width: 600px;
                position: relative;
            }
            .fp-modal-close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
            }
            .fp-modal-close:hover {
                color: black;
            }
            .fp-flipbooks-list {
                margin-top: 15px;
            }
        </style>
        <?php
    }
}
add_action('admin_footer', 'fp_insert_flipbook_button');

// Endpoint AJAX para obtener lista de flipbooks
function fp_get_flipbooks_ajax() {
    // Verificar nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'fp_get_flipbooks_nonce')) {
        wp_send_json_error('Acceso no autorizado');
        return;
    }
    
    // Obtener todos los flipbooks
    $args = array(
        'post_type' => 'flipbook',
        'post_status' => 'publish',
        'posts_per_page' => -1,
        'orderby' => 'title',
        'order' => 'ASC'
    );
    
    $flipbooks = array();
    $query = new WP_Query($args);
    
    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $flipbooks[] = array(
                'id' => get_the_ID(),
                'title' => get_the_title()
            );
        }
    }
    
    wp_reset_postdata();
    
    wp_send_json_success($flipbooks);
}
add_action('wp_ajax_fp_get_flipbooks', 'fp_get_flipbooks_ajax');

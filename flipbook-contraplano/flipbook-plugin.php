<?php

/**
 * Plugin Name: Flipbook Contraplano
 * Description: Visualiza Flipbooks PDF interactivos con audios por página.
 * Version: 1.2
 * Author: a
 */

if (!defined('ABSPATH')) exit;

define('FP_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('FP_PLUGIN_URL', plugin_dir_url(__FILE__));

// Registrar tipo de contenido personalizado
function fp_register_flipbook_post_type()
{
    register_post_type('flipbook', [
        'labels' => ['name' => 'Flipbooks'],
        'public' => true,
        'has_archive' => true,
        'menu_icon' => 'dashicons-book',
        'supports' => ['title'],
    ]);
}
add_action('init', 'fp_register_flipbook_post_type');

// Metabox para PDF y audios
function fp_add_meta_box()
{
    add_meta_box('fp_meta_box', 'Configuración del Flipbook', 'fp_meta_callback', 'flipbook', 'normal', 'high');
}
add_action('add_meta_boxes', 'fp_add_meta_box');

function fp_meta_callback($post)
{
    wp_nonce_field('fp_save_meta_data', 'fp_meta_nonce');
    $pdf = get_post_meta($post->ID, 'fp_pdf', true);
    $audios = get_post_meta($post->ID, 'fp_audios', true) ?: [];
    $interactive_areas = get_post_meta($post->ID, 'fp_interactive_areas', true) ?: '';
    
    // Convertir array de áreas a JSON para el campo de texto
    $interactive_areas_json = is_array($interactive_areas) ? wp_json_encode($interactive_areas, JSON_PRETTY_PRINT) : $interactive_areas;
?>
    <p>
        <label for="fp_pdf">PDF del Flipbook:</label><br>
        <input type="text" name="fp_pdf" id="fp_pdf" value="<?php echo esc_url($pdf); ?>" style="width:80%;" readonly>
        <button type="button" class="button" id="fp_pdf_button" title="Seleccionar o subir archivo PDF">Subir PDF</button>
    </p>
    <hr>
    <p><strong>Audios por página:</strong> (El primer audio corresponde a la página 1, el segundo a la página 2, etc.)</p>
    <div id="fp_audio_container">
        <?php foreach ($audios as $index => $audio_url):
            $field_id = 'fp_audio_' . $index;
        ?>
            <div class="fp-audio-row" style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                <label for="<?php echo esc_attr($field_id); ?>" style="display: inline-block; width: 80px;">Página <?php echo $index + 1; ?>:</label>
                <input type="text" name="fp_audios[]" id="<?php echo esc_attr($field_id); ?>" value="<?php echo esc_url($audio_url); ?>" style="width:70%; margin-right: 5px;" placeholder="URL del archivo de audio">
                <button type="button" class="button remove-audio" title="Eliminar este audio">X</button>
            </div>
        <?php endforeach; ?>
    </div>
    <button type="button" class="button" id="add_audio_button">+ Agregar Audio</button>

    <hr>
    <p><strong>Áreas Interactivas:</strong></p>
    <p>
        <textarea name="fp_interactive_areas" id="fp_interactive_areas" style="width:100%; height:200px;" placeholder='[
  {
    "page": 1,
    "x": 100,
    "y": 200,
    "width": 200,
    "height": 100,
    "type": "url",
    "url": "https://ejemplo.com",
    "tooltip": "Visitar sitio web"
  },
  {
    "page": 2,
    "x": 150,
    "y": 300,
    "width": 250,
    "height": 150,
    "type": "youtube",
    "youtube_url": "https://youtu.be/abc123",
    "tooltip": "Ver video"
  },
  {
    "page": 3,
    "x": 200,
    "y": 400,
    "width": 150,
    "height": 100,
    "type": "page",
    "target_page": 5,
    "tooltip": "Ir a página 5"
  }
]'><?php echo esc_textarea($interactive_areas_json); ?></textarea>
    </p>
    <p class="description">Ingresa las áreas interactivas en formato JSON. Cada área debe tener: page, x, y, width, height, type, y propiedades específicas según el tipo.</p>

    <script type="text/javascript">
        jQuery(document).ready(function($) {
            var pdf_frame;
            $('#fp_pdf_button').on('click', function(event) {
                event.preventDefault();
                if (pdf_frame) {
                    pdf_frame.open();
                    return;
                }
                pdf_frame = wp.media({
                    title: 'Seleccionar PDF',
                    button: {
                        text: 'Usar este PDF'
                    },
                    library: {
                        type: 'application/pdf'
                    },
                    multiple: false
                });
                pdf_frame.on('select', function() {
                    var attachment = pdf_frame.state().get('selection').first().toJSON();
                    $('#fp_pdf').val(attachment.url);
                });
                pdf_frame.open();
            });

            // Add Audio Field
            var audioIndex = <?php echo count($audios); ?>;
            $('#add_audio_button').on('click', function() {
                audioIndex++;
                var fieldId = 'fp_audio_' + audioIndex;
                var newField =
                    '<div class="fp-audio-row" style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee;">' +
                    '  <label for="' + fieldId + '" style="display: inline-block; width: 80px;">Página ' + (audioIndex) + ':</label>' +
                    '  <input type="text" name="fp_audios[]" id="' + fieldId + '" value="" style="width:70%; margin-right: 5px;" placeholder="URL del archivo de audio">' +
                    '  <button type="button" class="button remove-audio" title="Eliminar este audio">X</button>' +
                    '</div>';
                $('#fp_audio_container').append(newField);
                updateAudioLabels();
            });

            $('#fp_audio_container').on('click', '.remove-audio', function() {
                $(this).closest('.fp-audio-row').remove();
                updateAudioLabels();
            });

            function updateAudioLabels() {
                $('#fp_audio_container .fp-audio-row').each(function(index) {
                    $(this).find('label').html('Página ' + (index + 1) + ':');
                });
                audioIndex = $('#fp_audio_container .fp-audio-row').length;
            }

        });
    </script>
<?php
}

function fp_save_meta($post_id)
{
    if (!isset($_POST['fp_meta_nonce']) || !wp_verify_nonce($_POST['fp_meta_nonce'], 'fp_save_meta_data')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;

    update_post_meta($post_id, 'fp_pdf', sanitize_url($_POST['fp_pdf'] ?? ''));
    update_post_meta($post_id, 'fp_audios', array_map('sanitize_url', $_POST['fp_audios'] ?? []));

    // Guardar áreas interactivas
    $interactive_areas = '';
    if (isset($_POST['fp_interactive_areas'])) {
        $interactive_areas = wp_unslash($_POST['fp_interactive_areas']);
        
        // Intentar decodificar el JSON y validar
        $decoded = json_decode($interactive_areas, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            // JSON válido, guardar como array
            update_post_meta($post_id, 'fp_interactive_areas', $decoded);
        } else {
            // JSON inválido, guardar como string y mostrar error
            update_post_meta($post_id, 'fp_interactive_areas', $interactive_areas);
            add_action('admin_notices', function() {
                echo '<div class="error"><p>El formato JSON de las áreas interactivas no es válido. Por favor, revise la sintaxis.</p></div>';
            });
        }
    }
}

// Shortcode para visualizar el Flipbook
function fp_flipbook_shortcode($atts)
{
    $atts = shortcode_atts(['id' => ''], $atts, 'flipbook');
    $post_id = absint($atts['id']);
    if (!$post_id || get_post_type($post_id) !== 'flipbook') return '<p>Error: Flipbook no encontrado.</p>';

    $pdf = get_post_meta($post_id, 'fp_pdf', true);
    $audios = get_post_meta($post_id, 'fp_audios', true) ?: [];
    $interactive_areas = get_post_meta($post_id, 'fp_interactive_areas', true) ?: [];
    
    if (empty($pdf)) return '<p>Error: No se ha configurado un PDF para este Flipbook.</p>';

    // Registrar y encolar estilos y scripts
    wp_register_style('fp-style', plugins_url('css/fp-front.css', __FILE__), [], '1.2.1');
    wp_enqueue_style('fp-style');
    wp_enqueue_script('fp-custom-zoom', plugins_url('js/fp-custom-zoom.js', __FILE__), array('jquery'), '1.0.1', true);
    wp_enqueue_script('pdfjs', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js', [], null, true);
    wp_register_script('fp-front', plugins_url('js/fp-front.js', __FILE__), ['jquery', 'pdfjs'], '1.2.1', true);
    wp_enqueue_script('fp-front');

    // Pasar todos los datos necesarios
    wp_localize_script('fp-front', 'fpConfig', [
        'pdfWorkerSrc' => 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js',
        'postId' => $post_id,
        'audios' => $audios,
        'interactiveAreas' => is_array($interactive_areas) ? $interactive_areas : [],
        'startWithDoublePage' => false, // Configurable por opciones
        'debug' => WP_DEBUG
    ]);

    ob_start();
?>
    <div id="flipbook-container-<?php echo $post_id; ?>" class="flipbook-container" data-pdf="<?php echo esc_url($pdf); ?>" data-view-mode="single"> <!-- Default to single view -->
        <div class="fp-viewer-area">
            <div class="fp-pdf-viewer">
                <div class="fp-pages-container"></div>
                <div class="fp-loading">Cargando...</div>
            </div>
            <button class="fp-arrow fp-arrow-left" aria-label="Página anterior" title="Página anterior">‹</button>
            <button class="fp-arrow fp-arrow-right" aria-label="Página siguiente" title="Página siguiente">›</button>
        </div>

        <div class="fp-toolbar">
            <div class="fp-toolbar-section fp-page-nav">
                <div class="fp-page-indicator">
                    <input type="number" class="fp-page-input" value="1" min="1" aria-label="Página actual">
                    <span class="fp-page-separator">/</span>
                    <span class="fp-total-pages">?</span>
                </div>
            </div>

            <div class="fp-toolbar-section fp-zoom-container">
                <button class="fp-tool-btn fp-zoom-out" title="Alejar (Ctrl+-)" aria-label="Alejar">－</button>
                <button class="fp-tool-btn fp-zoom-in" title="Acercar (Ctrl++)" aria-label="Acercar">＋</button>
            </div>

            <div class="fp-toolbar-section fp-tools-right">
                <button class="fp-tool-btn fp-fullscreen" title="Pantalla completa (F)" aria-label="Pantalla completa">⛶</button>
            </div>
        </div>

        <!-- Audio player is removed/hidden via CSS -->
        <!-- <audio id="fp-audio-<?php echo $post_id; ?>" controls class="fp-audio-player"></audio> -->
    </div>
<?php
    return ob_get_clean();
}
add_shortcode('flipbook', 'fp_flipbook_shortcode');

// Agregar botón "Insertar Flipbook" al editor
function fp_add_insert_flipbook_button() {
    // Verificar si estamos en el editor
    $screen = get_current_screen();
    if (!$screen || !method_exists($screen, 'is_block_editor') || $screen->is_block_editor()) {
        // No cargar en Gutenberg, solo en el editor clásico
        return;
    }

    wp_enqueue_script(
        'fp-insert-flipbook',
        FP_PLUGIN_URL . 'js/fp-insert-flipbook.js',
        array('jquery'),
        '1.0.0',
        true
    );
    
    // Pasar datos de flipbooks disponibles al script
    $flipbooks = get_posts([
        'post_type' => 'flipbook',
        'numberposts' => -1,
        'orderby' => 'title',
        'order' => 'ASC'
    ]);
    
    $flipbooks_data = [];
    foreach ($flipbooks as $flipbook) {
        $flipbooks_data[] = [
            'id' => $flipbook->ID,
            'title' => $flipbook->post_title
        ];
    }
    
    wp_localize_script('fp-insert-flipbook', 'fpInsertData', [
        'flipbooks' => $flipbooks_data,
        'button_text' => 'Insertar Flipbook',
        'modal_title' => 'Seleccionar un Flipbook',
        'modal_button' => 'Insertar',
        'cancel_button' => 'Cancelar'
    ]);
}
add_action('admin_enqueue_scripts', 'fp_add_insert_flipbook_button');

// Para el editor de Gutenberg - Registrar bloque
function fp_register_gutenberg_flipbook_button() {
    // Solo cargar en admin y si Gutenberg está activo
    if (!is_admin() || !function_exists('register_block_type')) {
        return;
    }
    
    wp_register_script(
        'fp-gutenberg-button',
        FP_PLUGIN_URL . 'js/fp-gutenberg-button.js',
        array('wp-blocks', 'wp-element', 'wp-components', 'wp-editor', 'wp-api-fetch'),
        '1.0.0',
        true
    );
    
    // Pasar datos de flipbooks disponibles al script
    $flipbooks = get_posts([
        'post_type' => 'flipbook',
        'numberposts' => -1,
        'orderby' => 'title',
        'order' => 'ASC'
    ]);
    
    $flipbooks_data = [];
    foreach ($flipbooks as $flipbook) {
        $flipbooks_data[] = [
            'id' => $flipbook->ID,
            'title' => $flipbook->post_title
        ];
    }
    
    wp_localize_script('fp-gutenberg-button', 'fpGutenbergData', [
        'flipbooks' => $flipbooks_data
    ]);
    
    register_block_type('flipbook-contraplano/insert-button', [
        'editor_script' => 'fp-gutenberg-button',
    ]);
}
add_action('init', 'fp_register_gutenberg_flipbook_button');

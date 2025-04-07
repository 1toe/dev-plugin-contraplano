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
                });
                pdf_frame.open();
            });

            // Add Audio Field
            var audioIndex = <?php echo count($audios); ?>;
            $('#add_audio_button').on('click', function(){
                audioIndex++;
                var fieldId = 'fp_audio_' + audioIndex;
                var newField = 
                    '<div class="fp-audio-row" style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee;">' +
                    '  <label for="' + fieldId + '" style="display: inline-block; width: 80px;">Página ' + (audioIndex) + ':</label>' +
                    '  <input type="text" name="fp_audios[]" id="' + fieldId + '" value="" style="width:70%; margin-right: 5px;" placeholder="URL del archivo de audio">' +
                    '  <button type="button" class="button remove-audio" title="Eliminar este audio">X</button>' +
                    '</div>';
                $('#fp_audio_container').append(newField);
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
                     $(this).find('label').html('Página ' + (index + 1) + ':');
                     // Ensure ID is also updated if necessary (though typically static once created)
                     // var newId = 'fp_audio_' + index;
                     // $(this).find('input[type="text"]').attr('id', newId);
                     // $(this).find('label').attr('for', newId);
                 });
                 // Update the index for adding new fields
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
}
add_action('save_post_flipbook', 'fp_save_meta');

// Shortcode para visualizar el Flipbook
function fp_flipbook_shortcode($atts)
{
    $atts = shortcode_atts(['id' => ''], $atts, 'flipbook');
    $post_id = absint($atts['id']);
    if (!$post_id || get_post_type($post_id) !== 'flipbook') return '<p>Error: Flipbook no encontrado.</p>';

    $pdf = get_post_meta($post_id, 'fp_pdf', true);
    // $audios = get_post_meta($post_id, 'fp_audios', true) ?: []; // Audios hidden for ISSUU style
    if (empty($pdf)) return '<p>Error: No se ha configurado un PDF para este Flipbook.</p>';

    // Registrar y encolar estilos y scripts
    wp_register_style('fp-style', plugins_url('css/fp-front.css', __FILE__), [], '1.2.0'); // Version bump
    wp_enqueue_style('fp-style');

    wp_enqueue_script('pdfjs', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js', [], null, true);
    wp_register_script('fp-front', plugins_url('js/fp-front.js', __FILE__), ['jquery', 'pdfjs'], '1.2.0', true); // Version bump
    wp_enqueue_script('fp-front');

    // Pass only necessary data
    wp_localize_script('fp-front', 'fpConfig', [
        'pdfWorkerSrc' => 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js',
        'postId' => $post_id
        // 'audios' => $audios // Don't pass audios
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
                <!-- <input type="range" class="fp-zoom-slider" min="0.5" max="3" step="0.1" value="1"> -->
                <button class="fp-tool-btn fp-zoom-in" title="Acercar (Ctrl++)" aria-label="Acercar">＋</button>
            </div>

            <div class="fp-toolbar-section fp-tools-right">
                 <!-- Hide view toggle for ISSUU style 
                 <button class="fp-tool-btn fp-view-toggle" title="Alternar vista (V)">📖</button> 
                 -->
                 <div class="fp-search-container">
                    <input type="text" class="fp-search-input" placeholder="Buscar...">
                    <button class="fp-tool-btn fp-search-toggle-btn" title="Buscar (Ctrl+F)" aria-label="Buscar">🔍</button>
                 </div>
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

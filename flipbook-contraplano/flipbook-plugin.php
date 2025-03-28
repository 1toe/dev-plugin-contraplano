<?php
/**
 * Plugin Name: Flipbook Pro
 * Description: Visualiza Flipbooks PDF interactivos. Incluye zonas interactivas y audio en ediciones especiales.
 * Version: 1.0
 * Author: Tu Nombre
 */

if (!defined('ABSPATH')) exit;

// 1. Registrar tipo de contenido personalizado
function fp_register_flipbook_post_type() {
    register_post_type('flipbook', [
        'labels' => [
            'name' => 'Flipbooks',
            'singular_name' => 'Flipbook',
            'add_new' => 'Agregar nuevo',
            'add_new_item' => 'Agregar nuevo Flipbook',
            'edit_item' => 'Editar Flipbook',
            'new_item' => 'Nuevo Flipbook',
            'view_item' => 'Ver Flipbook',
            'search_items' => 'Buscar Flipbook',
            'not_found' => 'No encontrado',
        ],
        'public' => true,
        'has_archive' => true,
        'menu_icon' => 'dashicons-book',
        'supports' => ['title'],
    ]);
}
add_action('init', 'fp_register_flipbook_post_type');

// 2. Agregar metabox para subir PDF y audio
function fp_add_meta_box() {
    add_meta_box('fp_meta_box', 'Configuración del Flipbook', 'fp_meta_callback', 'flipbook', 'normal', 'high');
}
add_action('add_meta_boxes', 'fp_add_meta_box');

function fp_meta_callback($post) {
    $pdf = get_post_meta($post->ID, 'fp_pdf', true);
    $audio = get_post_meta($post->ID, 'fp_audio', true);

    ?>
    <p>
        <label for="fp_pdf">PDF del Flipbook:</label><br>
        <input type="text" name="fp_pdf" id="fp_pdf" value="<?php echo esc_url($pdf); ?>" style="width:80%;" readonly>
        <button type="button" class="button" id="fp_pdf_button">Subir o seleccionar PDF</button>
    </p>
    <p>
        <label for="fp_audio">Audio del Flipbook:</label><br>
        <input type="text" name="fp_audio" id="fp_audio" value="<?php echo esc_url($audio); ?>" style="width:80%;" readonly>
        <button type="button" class="button" id="fp_audio_button">Subir o seleccionar Audio</button>
    </p>
    <?php
}

function fp_save_meta($post_id) {
    if (isset($_POST['fp_pdf'])) {
        update_post_meta($post_id, 'fp_pdf', sanitize_text_field($_POST['fp_pdf']));
    }
    if (isset($_POST['fp_audio'])) {
        update_post_meta($post_id, 'fp_audio', sanitize_text_field($_POST['fp_audio']));
    }
}
add_action('save_post', 'fp_save_meta');

// 3. Encolar script para media uploader
add_action('admin_enqueue_scripts', function($hook) {
    if ($hook !== 'post.php' && $hook !== 'post-new.php') return;

    wp_enqueue_media();

    wp_add_inline_script('jquery', <<<JS
    jQuery(document).ready(function($) {
        // Subir PDF
        $('#fp_pdf_button').on('click', function(e) {
            e.preventDefault();
            var frame = wp.media({
                title: 'Selecciona o sube un PDF',
                button: { text: 'Usar este PDF' },
                multiple: false
            });
            frame.on('select', function() {
                var attachment = frame.state().get('selection').first().toJSON();
                $('#fp_pdf').val(attachment.url);
            });
            frame.open();
        });

        // Subir Audio
        $('#fp_audio_button').on('click', function(e) {
            e.preventDefault();
            var frame = wp.media({
                title: 'Selecciona o sube un archivo de audio',
                button: { text: 'Usar este Audio' },
                multiple: false,
                library: { type: 'audio' }
            });
            frame.on('select', function() {
                var attachment = frame.state().get('selection').first().toJSON();
                $('#fp_audio').val(attachment.url);
            });
            frame.open();
        });
    });
JS);
});

// 4. Mostrar el Flipbook en el frontend
function fp_flipbook_shortcode($atts) {
    $atts = shortcode_atts([
        'id' => '',
    ], $atts);

    $post_id = $atts['id'];
    $pdf = get_post_meta($post_id, 'fp_pdf', true);
    $audio = get_post_meta($post_id, 'fp_audio', true);

    ob_start();
    ?>
    <div class="flipbook-container" data-pdf="<?php echo esc_url($pdf); ?>" <?php if ($audio): ?>data-audio="<?php echo esc_url($audio); ?>"<?php endif; ?>>
        <p>Cargando Flipbook...</p>
        <!-- Aquí se puede integrar el visor JS -->
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('flipbook', 'fp_flipbook_shortcode');
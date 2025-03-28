<?php
/*
Plugin Name: Flipbook Interactivo
Description: Visor de Flipbook para PDFs con audio y zonas interactivas.
Version: 1.0
Author: Tu Nombre
*/

add_action('init', function () {
    register_post_type('flipbook', [
        'labels' => [
            'name' => 'Flipbooks',
            'singular_name' => 'Flipbook',
        ],
        'public' => true,
        'has_archive' => true,
        'supports' => ['title', 'editor', 'thumbnail'],
        'menu_icon' => 'dashicons-book',
    ]);
});

add_action('add_meta_boxes', function () {
    add_meta_box('fp_meta', 'Datos del Flipbook', 'fp_meta_callback', 'flipbook');
});

function fp_meta_callback($post) {
    $pdf = get_post_meta($post->ID, '_fp_pdf', true);
    $audio = get_post_meta($post->ID, '_fp_audio', true);
    $areas = get_post_meta($post->ID, '_fp_areas', true);
    ?>
    <p><label>PDF URL:</label><br>
        <input type="text" name="fp_pdf" value="<?php echo esc_attr($pdf); ?>" style="width:100%;">
    </p>
    <p><label>Audio URL (opcional):</label><br>
        <input type="text" name="fp_audio" value="<?php echo esc_attr($audio); ?>" style="width:100%;">
    </p>
    <p><label>Áreas interactivas (JSON):</label><br>
        <textarea name="fp_areas" rows="5" style="width:100%;"><?php echo esc_textarea($areas); ?></textarea>
    </p>
    <?php
}

add_action('save_post', function ($post_id) {
    if (isset($_POST['fp_pdf'])) {
        update_post_meta($post_id, '_fp_pdf', sanitize_text_field($_POST['fp_pdf']));
    }
    if (isset($_POST['fp_audio'])) {
        update_post_meta($post_id, '_fp_audio', sanitize_text_field($_POST['fp_audio']));
    }
    if (isset($_POST['fp_areas'])) {
        update_post_meta($post_id, '_fp_areas', wp_kses_post($_POST['fp_areas']));
    }
});

add_shortcode('flipbook', function () {
    global $post;
    $pdf = get_post_meta($post->ID, '_fp_pdf', true);
    $audio = get_post_meta($post->ID, '_fp_audio', true);
    $areas = get_post_meta($post->ID, '_fp_areas', true);

    ob_start(); ?>
    <div id="fp-flipbook-container">
        <div id="fp-flipbook" data-pdf="<?php echo esc_url($pdf); ?>"></div>
        <?php if (!empty($audio)) : ?>
            <audio id="fp-audio-player" src="<?php echo esc_url($audio); ?>" controls style="margin-top:10px;"></audio>
        <?php endif; ?>
        <?php if (!empty($areas)) : ?>
            <div id="fp-interactive-areas" data-areas='<?php echo esc_attr($areas); ?>'></div>
        <?php endif; ?>
    </div>
    <?php return ob_get_clean();
});

add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('fp-front', plugin_dir_url(__FILE__) . 'css/fp-front.css');
    wp_enqueue_script('pdfjs', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js', [], null, true);
    wp_enqueue_script('turnjs', 'https://cdnjs.cloudflare.com/ajax/libs/turn.js/4.1.0/turn.min.js', ['jquery'], null, true);
    wp_enqueue_script('fp-front', plugin_dir_url(__FILE__) . 'js/fp-front.js', ['jquery'], null, true);
});


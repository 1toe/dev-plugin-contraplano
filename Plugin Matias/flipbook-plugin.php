<?php
/**
 * Plugin Name: Flipbook Contraplano
 * Description: Visualiza Flipbooks PDF interactivos. Incluye zonas interactivas y audio en ediciones especiales.
 * Version: 1.1
 * Author: a
 */

if (!defined('ABSPATH')) exit;

// Define constants for plugin paths and URLs
define('FP_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('FP_PLUGIN_URL', plugin_dir_url(__FILE__));

// 1. Registrar tipo de contenido personalizado
function fp_register_flipbook_post_type() {
    // ... (tu código existente para register_post_type) ...
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
        'has_archive' => true, // Puedes ponerlo en false si no quieres una página de archivo de flipbooks
        'menu_icon' => 'dashicons-book',
        'supports' => ['title'],
        'rewrite' => ['slug' => 'flipbooks'], // URL amigable
    ]);
}
add_action('init', 'fp_register_flipbook_post_type');

// 2. Agregar metabox para subir PDF y audio
function fp_add_meta_box() {
    // ... (tu código existente para add_meta_box) ...
    add_meta_box('fp_meta_box', 'Configuración del Flipbook', 'fp_meta_callback', 'flipbook', 'normal', 'high');
}
add_action('add_meta_boxes', 'fp_add_meta_box');

function fp_meta_callback($post) {
    // ... (tu código existente para fp_meta_callback) ...
    wp_nonce_field('fp_save_meta_data', 'fp_meta_nonce'); // Nonce for security

    $pdf = get_post_meta($post->ID, 'fp_pdf', true);
    $audio = get_post_meta($post->ID, 'fp_audio', true);
    // Futuro: Cargar datos de áreas interactivas aquí
    // $interactive_areas = get_post_meta($post->ID, 'fp_interactive_areas', true);

    ?>
    <p>
        <label for="fp_pdf">PDF del Flipbook:</label><br>
        <input type="text" name="fp_pdf" id="fp_pdf" value="<?php echo esc_url($pdf); ?>" style="width:80%;" readonly>
        <button type="button" class="button" id="fp_pdf_button">Subir o seleccionar PDF</button>
        <?php if ($pdf): ?>
            <p><small>URL actual: <?php echo esc_url($pdf); ?></small></p>
        <?php endif; ?>
    </p>
    <p>
        <label for="fp_audio">Audio del Flipbook (Opcional):</label><br>
        <input type="text" name="fp_audio" id="fp_audio" value="<?php echo esc_url($audio); ?>" style="width:80%;" readonly>
        <button type="button" class="button" id="fp_audio_button">Subir o seleccionar Audio</button>
         <?php if ($audio): ?>
            <p><small>URL actual: <?php echo esc_url($audio); ?></small></p>
        <?php endif; ?>
    </p>
    <!-- Futuro: Campo para áreas interactivas (ej. un textarea para JSON) -->
    <!--
    <p>
        <label for="fp_interactive_areas">Áreas Interactivas (JSON):</label><br>
        <textarea name="fp_interactive_areas" id="fp_interactive_areas" rows="5" style="width:100%;"><?php // echo esc_textarea($interactive_areas); ?></textarea>
        <small>Formato: [{"page": 1, "x": 100, "y": 150, "width": 50, "height": 30, "type": "link", "value": "https://..."}]</small>
    </p>
    -->
    <?php
}

function fp_save_meta($post_id) {
    // Security checks
    if (!isset($_POST['fp_meta_nonce']) || !wp_verify_nonce($_POST['fp_meta_nonce'], 'fp_save_meta_data')) {
        return;
    }
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }
    // ---

    if (isset($_POST['fp_pdf'])) {
        update_post_meta($post_id, 'fp_pdf', sanitize_url($_POST['fp_pdf'])); // Use sanitize_url
    } else {
         delete_post_meta($post_id, 'fp_pdf');
    }

    if (isset($_POST['fp_audio'])) {
        update_post_meta($post_id, 'fp_audio', sanitize_url($_POST['fp_audio'])); // Use sanitize_url
    } else {
        delete_post_meta($post_id, 'fp_audio');
    }

    // Futuro: Guardar áreas interactivas
    // if (isset($_POST['fp_interactive_areas'])) {
    //    update_post_meta($post_id, 'fp_interactive_areas', sanitize_textarea_field($_POST['fp_interactive_areas']));
    // } else {
    //     delete_post_meta($post_id, 'fp_interactive_areas');
    // }
}
add_action('save_post_flipbook', 'fp_save_meta'); // Hook specifically to the CPT

// 3. Encolar script para media uploader en admin
add_action('admin_enqueue_scripts', function($hook) {
    global $post_type;
    // Only load on flipbook edit pages
    if (($hook !== 'post.php' && $hook !== 'post-new.php') || 'flipbook' !== $post_type) {
        return;
    }

    wp_enqueue_media();

    // Es mejor mover este JS a un archivo separado, pero por ahora lo dejamos inline
    wp_add_inline_script('jquery', <<<JS
    jQuery(document).ready(function($) {
        function setupMediaUploader(buttonId, inputId, mediaTitle, mediaButtonText, mediaType) {
            $('#' + buttonId).on('click', function(e) {
                e.preventDefault();
                var frame = wp.media({
                    title: mediaTitle,
                    button: { text: mediaButtonText },
                    multiple: false,
                    library: mediaType ? { type: mediaType } : undefined
                });
                frame.on('select', function() {
                    var attachment = frame.state().get('selection').first().toJSON();
                    $('#' + inputId).val(attachment.url);
                    // Opcional: Mostrar la URL debajo del botón después de seleccionar
                    $('#' + inputId).next('p').remove(); // Limpiar mensaje anterior
                    $('#' + inputId).after('<p><small>URL actual: ' + attachment.url + '</small></p>');
                });
                frame.open();
            });
        }

        setupMediaUploader('fp_pdf_button', 'fp_pdf', 'Selecciona o sube un PDF', 'Usar este PDF', 'application/pdf');
        setupMediaUploader('fp_audio_button', 'fp_audio', 'Selecciona o sube un archivo de audio', 'Usar este Audio', 'audio');
    });
JS);
});

// 4. Encolar scripts y estilos para el frontend (SOLO si se usa el shortcode)
function fp_enqueue_frontend_assets() {
    // --- Dependencias ---
    // PDF.js (desde CDN de Mozilla) - Asegúrate de que la versión sea compatible
    $pdfjs_version = '2.10.377'; // Ejemplo, verifica la última versión estable
    wp_enqueue_script('pdfjs-lib', "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/$pdfjs_version/pdf.min.js", [], $pdfjs_version, true);
    wp_enqueue_script('pdfjs-worker', "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/$pdfjs_version/pdf.worker.min.js", [], $pdfjs_version, true);

    // Turn.js (desde CDN) - Requiere jQuery
    // Turn.js (versión 4) - Usando un CDN fiable si existe, o alojarlo localmente
    // Nota: El CDN oficial turnjs.com parece inactivo/no seguro. Usar un repo o alojar localmente es mejor.
    // Ejemplo usando cdnjs si estuviera disponible o alojado localmente:
     wp_enqueue_script('turn-js', FP_PLUGIN_URL . 'js/turn.min.js', ['jquery', 'pdfjs-lib'], '4.1.0', true); // ¡¡ASEGÚRATE DE TENER turn.min.js en tu carpeta js!!

    // --- Tus assets ---
    wp_enqueue_style('fp-front-style', FP_PLUGIN_URL . 'css/fp-front.css', [], '1.0');
    wp_enqueue_script('fp-front-script', FP_PLUGIN_URL . 'js/fp-front.js', ['jquery', 'turn-js', 'pdfjs-lib', 'pdfjs-worker'], '1.0', true); // Depende de jQuery, Turn.js y PDF.js

    // Pasar la URL del worker de PDF.js al script frontend
    wp_localize_script('fp-front-script', 'fpConfig', [
       'pdfWorkerSrc' => "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/$pdfjs_version/pdf.worker.min.js"
       // 'pdfWorkerSrc' => FP_PLUGIN_URL . 'js/pdf.worker.min.js' // Si alojas pdf.worker.min.js localmente
    ]);
}

// 5. Mostrar el Flipbook en el frontend via Shortcode
function fp_flipbook_shortcode($atts) {
    $atts = shortcode_atts([
        'id' => '',
    ], $atts, 'flipbook'); // Añadir tercer parámetro para contexto

    $post_id = absint($atts['id']); // Sanitizar ID

    if (!$post_id || get_post_type($post_id) !== 'flipbook') {
        return '<p>Error: Flipbook ID inválido o no encontrado.</p>';
    }

    $pdf = get_post_meta($post_id, 'fp_pdf', true);
    $audio = get_post_meta($post_id, 'fp_audio', true);
    // Futuro: Cargar áreas interactivas
    // $interactive_areas = get_post_meta($post_id, 'fp_interactive_areas', true);
    // $interactive_areas_json = !empty($interactive_areas) ? $interactive_areas : '[]'; // Default to empty JSON array

    if (empty($pdf)) {
         return '<p>Error: No se ha configurado un PDF para este Flipbook.</p>';
    }

    // Si el shortcode se usa, encolamos los assets necesarios
    fp_enqueue_frontend_assets();

    // Generar un ID único para este contenedor de flipbook específico
    $container_id = 'flipbook-container-' . $post_id . '-' . wp_rand(100, 999); // Añadir aleatorio por si el shortcode se usa más de una vez con el mismo ID

    ob_start();
    ?>
    <div id="<?php echo esc_attr($container_id); ?>" class="flipbook-container" data-pdf="<?php echo esc_url($pdf); ?>" <?php if ($audio): ?>data-audio="<?php echo esc_url($audio); ?>"<?php endif; ?>>
        <div id="fp-pdf-viewer-<?php echo esc_attr($post_id); ?>" class="fp-pdf-viewer">
             <div class="fp-loading">Cargando Flipbook...</div>
             <div id="fp-pages-container-<?php echo esc_attr($post_id); ?>" class="fp-pages-container" style="display:none;">
                 <!-- Las páginas (canvas) se insertarán aquí por JS -->
             </div>
             <!-- Futuro: Contenedor para áreas interactivas -->
             <!-- <div class="fp-interactive-areas" data-areas='<?php // echo esc_attr($interactive_areas_json); ?>'></div> -->
        </div>

        <?php if ($audio): ?>
        <div id="fp-audio-container-<?php echo esc_attr($post_id); ?>" class="fp-audio-container">
            <audio controls src="<?php echo esc_url($audio); ?>">
                Tu navegador no soporta el elemento de audio.
            </audio>
        </div>
        <?php endif; ?>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('flipbook', 'fp_flipbook_shortcode');

// Limpiar metadatos si se borra el flipbook (opcional pero buena práctica)
function fp_delete_post_meta($post_id) {
    if (get_post_type($post_id) === 'flipbook') {
        delete_post_meta($post_id, 'fp_pdf');
        delete_post_meta($post_id, 'fp_audio');
        // delete_post_meta($post_id, 'fp_interactive_areas');
    }
}
add_action('delete_post', 'fp_delete_post_meta');

?>
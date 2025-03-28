<?php
/*
Plugin Name: Flipbook Plugin
Plugin URI: https://contraplano.cl
Description: Plugin para visualizar PDFs con efecto flipbook, áreas interactivas y audios en la Edición Especial.
Version: 1.0
Author: contraplano.cl
Author URI: https://contraplano.cl
License: GPL2
*/

// Evitamos el acceso directo.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Registra el Custom Post Type "flipbook"
 */
function fp_register_flipbook_cpt() {
    $labels = array(
        'name'                  => 'Flipbooks',
        'singular_name'         => 'Flipbook',
        'menu_name'             => 'Flipbooks',
        'name_admin_bar'        => 'Flipbook',
        'add_new'               => 'Agregar Nuevo',
        'add_new_item'          => 'Agregar Nuevo Flipbook',
        'new_item'              => 'Nuevo Flipbook',
        'edit_item'             => 'Editar Flipbook',
        'view_item'             => 'Ver Flipbook',
        'all_items'             => 'Todos los Flipbooks',
        'search_items'          => 'Buscar Flipbooks',
        'not_found'             => 'No se encontraron Flipbooks.',
        'not_found_in_trash'    => 'No se encontraron Flipbooks en la papelera.'
    );
    $args = array(
        'labels'                => $labels,
        'public'                => true,
        'has_archive'           => true,
        'rewrite'               => array('slug' => 'flipbook'),
        'supports'              => array('title', 'editor', 'thumbnail'),
        'menu_icon'             => 'dashicons-book-alt',
    );
    register_post_type( 'flipbook', $args );
}
add_action( 'init', 'fp_register_flipbook_cpt' );

/**
 * Agrega la metabox de configuración en el editor de Flipbook
 */
function fp_add_flipbook_metaboxes() {
    add_meta_box(
        'fp_flipbook_settings',
        'Configuración del Flipbook',
        'fp_flipbook_settings_callback',
        'flipbook',
        'normal',
        'high'
    );
}
add_action( 'add_meta_boxes', 'fp_add_flipbook_metaboxes' );

/**
 * Callback para la metabox de configuración
 */
function fp_flipbook_settings_callback( $post ) {
    // Usamos nonce para seguridad
    wp_nonce_field( 'fp_flipbook_save', 'fp_flipbook_nonce' );

    // Recuperamos los valores actuales (si existen)
    $pdf_url          = get_post_meta( $post->ID, 'fp_pdf_url', true );
    $edition_type     = get_post_meta( $post->ID, 'fp_edition_type', true );
    if ( empty( $edition_type ) ) {
        $edition_type = 'estandar';
    }
    $interactive_areas = get_post_meta( $post->ID, 'fp_interactive_areas', true );
    $audio_file       = get_post_meta( $post->ID, 'fp_audio_file', true );
    $audio_autoplay   = get_post_meta( $post->ID, 'fp_audio_autoplay', true );
    ?>
    <p>
        <label for="fp_pdf_url"><strong>Archivo PDF:</strong></label><br>
        <input type="text" id="fp_pdf_url" name="fp_pdf_url" value="<?php echo esc_attr( $pdf_url ); ?>" style="width:80%;" />
        <input type="button" class="button fp_upload_pdf_button" value="Subir PDF" />
    </p>
    <p>
        <label><strong>Tipo de Edición:</strong></label><br>
        <label>
            <input type="radio" name="fp_edition_type" value="especial" <?php checked( $edition_type, 'especial' ); ?> />
            Especial
        </label>
        <label>
            <input type="radio" name="fp_edition_type" value="estandar" <?php checked( $edition_type, 'estandar' ); ?> />
            Estándar
        </label>
    </p>
    <p>
        <label for="fp_interactive_areas"><strong>Áreas Interactivas (JSON):</strong></label><br>
        <textarea id="fp_interactive_areas" name="fp_interactive_areas" rows="5" style="width:80%;"><?php echo esc_textarea( $interactive_areas ); ?></textarea>
        <br>
        <small>Ejemplo de JSON: 
        <code>
        [{"x":100, "y":200, "width":150, "height":50, "type":"linking", "value":"https://ejemplo.com"}, {"x":300, "y":400, "width":150, "height":50, "type":"youtube", "value":"dQw4w9WgXcQ"}]
        </code>
        </small>
    </p>
    <div id="fp_audio_section" style="border:1px solid #ccc; padding:10px; margin-top:15px; <?php echo ( $edition_type == 'especial' ) ? '' : 'display:none;'; ?>">
        <p><strong>Configuración de Audio (solo para Edición Especial):</strong></p>
        <p>
            <label for="fp_audio_file">Archivo MP3:</label><br>
            <input type="text" id="fp_audio_file" name="fp_audio_file" value="<?php echo esc_attr( $audio_file ); ?>" style="width:80%;" />
            <input type="button" class="button fp_upload_audio_button" value="Subir Audio" />
        </p>
        <p>
            <label>
                <input type="checkbox" name="fp_audio_autoplay" value="1" <?php checked( $audio_autoplay, '1' ); ?> />
                Reproducir automáticamente
            </label>
        </p>
    </div>
    <script>
    jQuery(document).ready(function($){
        // Muestra u oculta la sección de audio según el tipo de edición
        $('input[name="fp_edition_type"]').on('change', function(){
            if( $(this).val() == 'especial' ) {
                $('#fp_audio_section').show();
            } else {
                $('#fp_audio_section').hide();
            }
        });

        // Configuración del uploader para PDF
        $('.fp_upload_pdf_button').on('click', function(e){
            e.preventDefault();
            var frame = wp.media({
                title: 'Seleccionar PDF',
                library: { type: 'application/pdf' },
                button: { text: 'Usar este archivo' },
                multiple: false
            });
            frame.on('select', function(){
                var attachment = frame.state().get('selection').first().toJSON();
                $('#fp_pdf_url').val( attachment.url );
            });
            frame.open();
        });

        // Configuración del uploader para Audio
        $('.fp_upload_audio_button').on('click', function(e){
            e.preventDefault();
            var frame = wp.media({
                title: 'Seleccionar Audio MP3',
                library: { type: 'audio/mp3' },
                button: { text: 'Usar este archivo' },
                multiple: false
            });
            frame.on('select', function(){
                var attachment = frame.state().get('selection').first().toJSON();
                $('#fp_audio_file').val( attachment.url );
            });
            frame.open();
        });
    });
    </script>
    <?php
}

/**
 * Guarda los metadatos al guardar la entrada
 */
function fp_save_flipbook_meta( $post_id ) {
    // Verifica el nonce
    if ( ! isset( $_POST['fp_flipbook_nonce'] ) || ! wp_verify_nonce( $_POST['fp_flipbook_nonce'], 'fp_flipbook_save' ) ) {
        return $post_id;
    }
    // Evita guardar durante un autosave
    if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
        return $post_id;
    }
    // Verifica permisos
    if ( isset( $_POST['post_type'] ) && 'flipbook' === $_POST['post_type'] ) {
        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            return $post_id;
        }
    }

    // Guarda el PDF
    $pdf_url = isset( $_POST['fp_pdf_url'] ) ? sanitize_text_field( $_POST['fp_pdf_url'] ) : '';
    update_post_meta( $post_id, 'fp_pdf_url', $pdf_url );

    // Guarda el tipo de edición
    $edition_type = isset( $_POST['fp_edition_type'] ) ? sanitize_text_field( $_POST['fp_edition_type'] ) : 'estandar';
    update_post_meta( $post_id, 'fp_edition_type', $edition_type );

    // Guarda las áreas interactivas (almacenadas en formato JSON)
    $interactive_areas = isset( $_POST['fp_interactive_areas'] ) ? wp_unslash( $_POST['fp_interactive_areas'] ) : '';
    update_post_meta( $post_id, 'fp_interactive_areas', $interactive_areas );

    // Para la edición "especial", se guardan los datos de audio; para "estándar" se eliminan
    if ( $edition_type == 'especial' ) {
        $audio_file = isset( $_POST['fp_audio_file'] ) ? sanitize_text_field( $_POST['fp_audio_file'] ) : '';
        update_post_meta( $post_id, 'fp_audio_file', $audio_file );

        $audio_autoplay = isset( $_POST['fp_audio_autoplay'] ) ? '1' : '0';
        update_post_meta( $post_id, 'fp_audio_autoplay', $audio_autoplay );
    } else {
        delete_post_meta( $post_id, 'fp_audio_file' );
        delete_post_meta( $post_id, 'fp_audio_autoplay' );
    }

    // Si se guarda como "especial", se asegura que sea la única entrada con ese tipo.
    if ( $edition_type == 'especial' ) {
        $args = array(
            'post_type'      => 'flipbook',
            'post_status'    => 'any',
            'meta_key'       => 'fp_edition_type',
            'meta_value'     => 'especial',
            'post__not_in'   => array( $post_id ),
            'fields'         => 'ids'
        );
        $especial_query = new WP_Query( $args );
        if ( $especial_query->have_posts() ) {
            foreach ( $especial_query->posts as $other_id ) {
                update_post_meta( $other_id, 'fp_edition_type', 'estandar' );
                // Se eliminan los metadatos de audio en la entrada anterior
                delete_post_meta( $other_id, 'fp_audio_file' );
                delete_post_meta( $other_id, 'fp_audio_autoplay' );
            }
        }
        wp_reset_postdata();
    }
}
add_action( 'save_post_flipbook', 'fp_save_flipbook_meta' );

/**
 * Encola los scripts y estilos para el administrador
 */
function fp_admin_scripts( $hook ) {
    global $post;
    if ( ( $hook == 'post-new.php' || $hook == 'post.php' ) && isset( $post ) && 'flipbook' === get_post_type( $post ) ) {
        // El Media Uploader ya viene incluido en WordPress
        wp_enqueue_media();
    }
}
add_action( 'admin_enqueue_scripts', 'fp_admin_scripts' );

/**
 * Encola los scripts y estilos para el front-end (PDF.js y Turn.js)
 */
function fp_enqueue_front_scripts() {
    if ( is_singular( 'flipbook' ) ) {
        // Encola PDF.js desde un CDN
        wp_enqueue_script( 'pdfjs', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.min.js', array(), '2.10.377', true );
        // Encola Turn.js desde un CDN (verifica la disponibilidad de la versión en el CDN)
        wp_enqueue_script( 'turnjs', 'https://cdnjs.cloudflare.com/ajax/libs/turn.js/4.1.0/turn.min.js', array( 'jquery' ), '4.1.0', true );

        // Encola el script personalizado para el front-end
        wp_enqueue_script( 'fp-front-script', plugin_dir_url( __FILE__ ) . 'js/fp-front.js', array( 'jquery', 'pdfjs', 'turnjs' ), '1.0', true );

        // Encola el estilo personalizado para el front-end
        wp_enqueue_style( 'fp-front-style', plugin_dir_url( __FILE__ ) . 'css/fp-front.css', array(), '1.0' );
    }
}
add_action( 'wp_enqueue_scripts', 'fp_enqueue_front_scripts' );

/**
 * Shortcode para mostrar el flipbook en el front-end.
 *
 * Uso: [flipbook]
 */
function fp_display_flipbook( $atts ) {
    global $post;
    if ( ! is_singular( 'flipbook' ) ) {
        return '';
    }
    // Recupera los metadatos
    $pdf_url           = get_post_meta( $post->ID, 'fp_pdf_url', true );
    $interactive_areas = get_post_meta( $post->ID, 'fp_interactive_areas', true );
    $audio_file        = get_post_meta( $post->ID, 'fp_audio_file', true );
    $audio_autoplay    = get_post_meta( $post->ID, 'fp_audio_autoplay', true );

    ob_start();
    ?>
    <div id="fp-flipbook-container">
        <!-- Contenedor donde se renderizará el PDF y se aplicará el efecto flip -->
        <div id="fp-pdf-viewer"></div>
        <!-- Contenedor para las áreas interactivas. Se almacenan los datos en un atributo data -->
        <div id="fp-interactive-areas" data-areas='<?php echo esc_attr( $interactive_areas ); ?>'></div>
        <?php if ( $audio_file ) : ?>
            <div id="fp-audio-container">
                <audio id="fp-audio-player" src="<?php echo esc_url( $audio_file ); ?>" <?php echo ( $audio_autoplay == '1' ) ? 'autoplay' : ''; ?> controls></audio>
            </div>
        <?php endif; ?>
    </div>
    <script>
        // Variable global con la URL del PDF, utilizada en el script front-end
        var fp_pdf_url = "<?php echo esc_url( $pdf_url ); ?>";
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode( 'flipbook', 'fp_display_flipbook' );

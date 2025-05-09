<?php
/**
 * Plugin Name: - 📚 Flipbook ContraPlano
 * Plugin URI: https://contraplano.cl/
 * Description: Plugin para visualizar PDFs como flipbooks interactivos con áreas interactivas.
 * Version: 1.0.8
 * Author: Matías F, Walter C.
 * Author URI: https://contraplano.cl/
 * Text Domain: vibebook-flip
 * Domain Path: /languages
 */

// Si este archivo es llamado directamente, abortar.
if (!defined('WPINC')) {
    die;
}

// Definir constantes
define('VIBEBOOK_FLIP_VERSION', '1.0.4');
define('VIBEBOOK_FLIP_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('VIBEBOOK_FLIP_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Clase principal del plugin
 */
class VibeBookFlip {
    
    /**
     * AJAX: Actualizar todas las áreas de un flipbook
     * Esta función reemplaza múltiples endpoints por uno solo más eficiente
     */
    public function ajax_update_areas() {
        // Verificar nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'vibebook_flip_nonce')) {
            wp_send_json_error('Nonce inválido');
        }
        
        // Verificar permisos
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permisos insuficientes');
        }
        
        // Obtener datos
        $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;
        $areas_json = isset($_POST['areas']) ? sanitize_text_field($_POST['areas']) : '';
        
        // Verificar datos
        if (!$post_id || empty($areas_json)) {
            wp_send_json_error('Datos incompletos para guardar áreas');
        }
        
        // Verificar post
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'vibebook_flipbook') {
            wp_send_json_error('Flipbook no encontrado');
        }
        
        // Decodificar JSON
        $areas = json_decode(stripslashes($areas_json), true);
        if (!$areas && json_last_error() !== JSON_ERROR_NONE) {
            wp_send_json_error('Error al decodificar áreas: ' . json_last_error_msg());
        }

        // Procesar cada área para sanitizar datos
        foreach ($areas as &$area) {
            if (isset($area['target_url'])) {
                $area['target_url'] = esc_url_raw($area['target_url']);
            }
            
            if (isset($area['color'])) {
                $area['color'] = sanitize_text_field($area['color']);
            }
            
            // Asegurarse que las coordenadas se manejan como números
            if (isset($area['coords']) && is_array($area['coords'])) {
                $area['coords'] = array_map('floatval', $area['coords']);
            }
            
            if (isset($area['coords_percent']) && is_array($area['coords_percent'])) {
                $area['coords_percent'] = array_map('floatval', $area['coords_percent']);
            }
            
            // Para áreas de audio, incluir la URL del audio
            if ($area['type'] === 'audio' && isset($area['audio_id'])) {
                $audio_url = wp_get_attachment_url($area['audio_id']);
                if ($audio_url) {
                    $area['audio_url'] = $audio_url;
                }
            }
        }
        
        // Guardar áreas actualizadas
        update_post_meta($post_id, '_vibebook_areas', $areas);
        
        // Devolver respuesta exitosa
        wp_send_json_success(array(
            'message' => 'Áreas guardadas correctamente',
            'timestamp' => current_time('timestamp'),
            'areas_count' => count($areas)
        ));
    }

    /**
     * Constructor
     */
    public function __construct() {
        // Hooks de activación y desactivación
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
        
        // Inicializar el plugin
        add_action('init', array($this, 'init'));
        
        // Agregar menú de administración
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Registrar scripts y estilos
        add_action('admin_enqueue_scripts', array($this, 'register_admin_scripts'));
        add_action('wp_enqueue_scripts', array($this, 'register_frontend_scripts'));
        
        // Registrar shortcode
        add_shortcode('flipbook', array($this, 'render_shortcode'));
        
        // Agregar botón al editor clásico
        add_action('media_buttons', array($this, 'add_media_button'));
        add_action('admin_footer', array($this, 'add_media_button_popup'));
        
        // Registrar AJAX handlers para usuarios logueados
        add_action('wp_ajax_vibebook_save_flipbook', array($this, 'ajax_save_flipbook'));
        add_action('wp_ajax_vibebook_get_flipbook', array($this, 'ajax_get_flipbook'));
        add_action('wp_ajax_vibebook_update_areas', array($this, 'ajax_update_areas')); // Nuevo endpoint consolidado
        add_action('wp_ajax_vibebook_get_audio_url', array($this, 'ajax_get_audio_url'));
        
        // Registrar AJAX handlers para usuarios no logueados (frontend)
        add_action('wp_ajax_nopriv_vibebook_get_audio_url', array($this, 'ajax_get_audio_url'));
        
        // Manejar acción de eliminación de flipbook
        add_action('admin_post_vibebook_delete_flipbook', array($this, 'handle_delete_flipbook'));
        
        // Habilitar depuración AJAX si es necesario
        $this->enable_ajax_debug();
    }


    //ajax//
    public function enable_ajax_debug() {
        // Verificar si estamos en un entorno de desarrollo
        if (defined('WP_DEBUG') && WP_DEBUG) {
            // Configurar manejo de errores para AJAX
            add_action('wp_ajax_vibebook_save_area', array($this, 'debug_ajax_request'), 1);
            add_action('wp_ajax_vibebook_update_area', array($this, 'debug_ajax_request'), 1);
            add_action('wp_ajax_vibebook_delete_area', array($this, 'debug_ajax_request'), 1);
            add_action('wp_ajax_vibebook_update_area_position', array($this, 'debug_ajax_request'), 1);
            add_action('wp_ajax_vibebook_get_audio_url', array($this, 'debug_ajax_request'), 1);
        }
    }
    
    /**
     * Función para depurar peticiones AJAX
     */
    public function debug_ajax_request() {
        // Registrar información de la petición
        error_log('AJAX Request: ' . $_REQUEST['action']);
        error_log('POST Data: ' . print_r($_POST, true));
        
        // Verificar nonce manualmente para depuración
        if (isset($_POST['nonce'])) {
            $nonce_valid = wp_verify_nonce($_POST['nonce'], 'vibebook_flip_nonce');
            error_log('Nonce validation: ' . ($nonce_valid ? 'Valid' : 'Invalid'));
        } else {
            error_log('Nonce missing in request');
        }
    }
    //fin ajax//
    //audio 
    public function ajax_get_audio_url() {
        // Configurar encabezados para AJAX
        header('Content-Type: application/json');
        
        try {
            // Verificar nonce
            if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'vibebook_flip_nonce')) {
                throw new Exception('Nonce inválido');
            }
            
            // Obtener ID del audio
            $audio_id = isset($_POST['audio_id']) ? intval($_POST['audio_id']) : 0;
            
            // Verificar ID
            if (!$audio_id) {
                throw new Exception('ID de audio no válido');
            }
            
            // Obtener URL del archivo de audio
            $audio_url = wp_get_attachment_url($audio_id);
            
            if (!$audio_url) {
                throw new Exception('Archivo de audio no encontrado');
            }
            
            // Responder con éxito
            echo json_encode(array(
                'success' => true,
                'data' => array(
                    'url' => $audio_url
                )
            ));
            
        } catch (Exception $e) {
            // Registrar error
            error_log('VibeBook Error: ' . $e->getMessage());
            
            // Responder con error
            echo json_encode(array(
                'success' => false,
                'data' => array(
                    'message' => $e->getMessage()
                )
            ));
        }
        
        // Terminar ejecución
        wp_die();
    }
    //fin audio
    
    /**
     * Activación del plugin
     */
    public function activate() {
        // Crear Custom Post Type
        $this->register_post_types();
        
        // Limpiar caché de rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Desactivación del plugin
     */
    public function deactivate() {
        // Limpiar caché de rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Inicialización del plugin
     */
    public function init() {
        // Registrar Custom Post Type
        $this->register_post_types();
        
        // Cargar traducciones
        load_plugin_textdomain('vibebook-flip', false, dirname(plugin_basename(__FILE__)) . '/languages');
        
        // Aumentar límite de memoria si es necesario para manejar PDFs y áreas grandes
        if (defined('WP_MAX_MEMORY_LIMIT')) {
            $current_limit = ini_get('memory_limit');
            $current_limit_int = intval($current_limit);
            if ($current_limit_int < 256 && strpos($current_limit, 'M') !== false) {
                ini_set('memory_limit', '256M');
            }
        }
        
        // Aumentar límites de POST para permitir muchas áreas
        if (function_exists('ini_set')) {
            ini_set('post_max_size', '32M');
            ini_set('max_input_vars', '3000');
        }
    }
    
    /**
     * Registrar Custom Post Type
     */
    public function register_post_types() {
        $args = array(
            'public' => false,
            'publicly_queryable' => false,
            'show_ui' => false,
            'show_in_menu' => false,
            'query_var' => false,
            'capability_type' => 'post',
            'has_archive' => false,
            'hierarchical' => false,
            'supports' => array('title'),
        );
        
        register_post_type('vibebook_flipbook', $args);
    }
    
    /**
     * Agregar menú de administración
     */
    public function add_admin_menu() {
        add_menu_page(
            __('📚Flipbooks📚', 'vibebook-flip'),
            __('📚Flipbooks📚', 'vibebook-flip'),
            'manage_options',
            'vibebook-flip',
            array($this, 'render_admin_page'),
            'dashicons-book',
            30
        );
    }
    
    /**
     * Renderizar página de administración
     */
    public function render_admin_page() {
        // Verificar si estamos editando un flipbook
        $editing = false;
        $flipbook_id = 0;
        $flipbook_data = array();
        
        if (isset($_GET['action']) && $_GET['action'] === 'edit' && isset($_GET['id'])) {
            $flipbook_id = intval($_GET['id']);
            $post = get_post($flipbook_id);
            
            if ($post && $post->post_type === 'vibebook_flipbook') {
                $editing = true;
                
                // Obtener datos del flipbook
                $pdf_id = get_post_meta($flipbook_id, '_vibebook_pdf_id', true);
                $pdf_url = wp_get_attachment_url($pdf_id);
                $pdf_name = get_the_title($pdf_id);
                $areas = get_post_meta($flipbook_id, '_vibebook_areas', true);
                
                if (!$areas) {
                    $areas = array();
                }
                
                $flipbook_data = array(
                    'post_id' => $flipbook_id,
                    'title' => $post->post_title,
                    'pdf_id' => $pdf_id,
                    'pdf_url' => $pdf_url,
                    'pdf_name' => $pdf_name,
                    'areas' => $areas,
                );
                
                // Pasar datos al script
                wp_localize_script('vibebook-flip-admin', 'vibeBookFlipData', $flipbook_data);
            }
        }
        
        // Pasar estado de edición al script
        wp_localize_script('vibebook-flip-admin', 'vibeBookFlipEditing', array(
            'editing' => $editing,
            'flipbook_id' => $flipbook_id,
        ));
        
        include VIBEBOOK_FLIP_PLUGIN_DIR . 'templates/admin-page.php';
    }
    
    /**
     * Registrar scripts y estilos para el admin
     */
    public function register_admin_scripts($hook) {
        // Solo cargar en la página del plugin
        if ($hook != 'toplevel_page_vibebook-flip') {
            return;
        }
        
        // PDF.js
        wp_enqueue_script('pdfjs', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.min.js', array(), '2.12.313', true);
        
        // Scripts del plugin
        wp_enqueue_script('vibebook-flip-admin', VIBEBOOK_FLIP_PLUGIN_URL . 'js/admin.js', array('jquery', 'pdfjs'), VIBEBOOK_FLIP_VERSION, true);
        
        // Estilos del plugin
        wp_enqueue_style('vibebook-flip-admin', VIBEBOOK_FLIP_PLUGIN_URL . 'css/admin.css', array(), VIBEBOOK_FLIP_VERSION);
        
        // Media Uploader
        wp_enqueue_media();
        
        // Localización
        wp_localize_script('vibebook-flip-admin', 'vibeBookFlip', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'adminUrl' => admin_url('admin.php'),
            'nonce' => wp_create_nonce('vibebook_flip_nonce'),
            'pdfJsWorkerSrc' => 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js',
        ));
    }
    
    /**
     * Registrar scripts y estilos para el frontend
     */
    public function register_frontend_scripts() {
        // PDF.js
        wp_enqueue_script('pdfjs', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.min.js', array(), '2.12.313', true);
        
        // Scripts del plugin
        wp_enqueue_script('vibebook-flip-frontend', VIBEBOOK_FLIP_PLUGIN_URL . 'js/frontend.js', array('jquery', 'pdfjs'), VIBEBOOK_FLIP_VERSION, true);
        
        // Estilos del plugin
        wp_enqueue_style('vibebook-flip-frontend', VIBEBOOK_FLIP_PLUGIN_URL . 'css/frontend.css', array(), VIBEBOOK_FLIP_VERSION);
        
        // Dashicons
        wp_enqueue_style('dashicons');
        
        // Localización
        wp_localize_script('vibebook-flip-frontend', 'vibeBookFlip', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vibebook_flip_nonce'),
            'pdfJsWorkerSrc' => 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js',
        ));
    }
    
    /**
     * Renderizar shortcode
     */
    public function render_shortcode($atts) {
        $atts = shortcode_atts(array(
            'id' => 0,
        ), $atts, 'flipbook');
        
        $post_id = intval($atts['id']);
        
        if (!$post_id) {
            return '<p>' . __('Error: ID de flipbook no válido.', 'vibebook-flip') . '</p>';
        }
        
        // Verificar que el post exista
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'vibebook_flipbook') {
            return '<p>' . __('Error: Flipbook no encontrado.', 'vibebook-flip') . '</p>';
        }
        
        // Obtener datos del flipbook
        $pdf_id = get_post_meta($post_id, '_vibebook_pdf_id', true);
        $pdf_url = wp_get_attachment_url($pdf_id);
        
        if (!$pdf_url) {
            return '<p>' . __('Error: PDF no encontrado.', 'vibebook-flip') . '</p>';
        }
        
        // Obtener áreas interactivas
        $areas = get_post_meta($post_id, '_vibebook_areas', true);
        if (!$areas) {
            $areas = array();
        }
        
        // Asegurarse de que todas las áreas de audio tengan su URL
        foreach ($areas as $key => $area) {
            if ($area['type'] === 'audio' && isset($area['audio_id']) && !isset($area['audio_url'])) {
                $audio_url = wp_get_attachment_url($area['audio_id']);
                if ($audio_url) {
                    $areas[$key]['audio_url'] = $audio_url;
                }
            }
        }
        
        // Actualizar áreas con las URLs de audio
        update_post_meta($post_id, '_vibebook_areas', $areas);
        
        // Incluir datos para JavaScript
        $data = array(
            'pdf_url' => $pdf_url,
            'areas' => $areas,
        );
        
        // Generar ID único para el script
        $script_id = 'vibeBookFlipData_' . $post_id;
        
        // Agregar script con datos
        wp_add_inline_script('vibebook-flip-frontend', 'var ' . $script_id . ' = ' . json_encode($data) . ';', 'before');
        
        // Renderizar template
        ob_start();
        include VIBEBOOK_FLIP_PLUGIN_DIR . 'templates/frontend.php';
        return ob_get_clean();
    }
    
    /**
     * Agregar botón al editor clásico
     */
    public function add_media_button() {
        echo '<a href="#" id="vibebook-insert-flipbook" class="button">';
        echo '<span class="wp-media-buttons-icon dashicons dashicons-book"></span> ';
        echo __('📚 Insertar Flipbook', 'vibebook-flip');
        echo '</a>';
    }
    
    /**
     * Agregar popup para el botón del editor
     */
    public function add_media_button_popup() {
        // Obtener todos los flipbooks
        $flipbooks = get_posts(array(
            'post_type' => 'vibebook_flipbook',
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC',
        ));
        
        ?>
        <div id="vibebook-insert-popup" style="display:none;">
            <div class="vibebook-popup-content">
                <h2><?php _e('Insertar Flipbook', 'vibebook-flip'); ?></h2>
                
                <?php if (empty($flipbooks)) : ?>
                    <p><?php _e('No hay flipbooks disponibles. Por favor, crea uno primero.', 'vibebook-flip'); ?></p>
                <?php else : ?>
                    <p><?php _e('Selecciona un flipbook para insertar:', 'vibebook-flip'); ?></p>
                    <select id="vibebook-select-flipbook">
                        <?php foreach ($flipbooks as $flipbook) : ?>
                            <option value="<?php echo esc_attr($flipbook->ID); ?>"><?php echo esc_html($flipbook->post_title); ?></option>
                        <?php endforeach; ?>
                    </select>
                    <p>
                        <button id="vibebook-insert-shortcode" class="button button-primary"><?php _e('Insertar', 'vibebook-flip'); ?></button>
                        <button id="vibebook-cancel-insert" class="button"><?php _e('Cancelar', 'vibebook-flip'); ?></button>
                    </p>
                <?php endif; ?>
            </div>
        </div>
        
        <script>
            jQuery(document).ready(function($) {
                // Abrir popup
                $('#vibebook-insert-flipbook').on('click', function(e) {
                    e.preventDefault();
                    $('#vibebook-insert-popup').show();
                });
                
                // Cerrar popup
                $('#vibebook-cancel-insert').on('click', function() {
                    $('#vibebook-insert-popup').hide();
                });
                
                // Insertar shortcode
                $('#vibebook-insert-shortcode').on('click', function() {
                    var id = $('#vibebook-select-flipbook').val();
                    var shortcode = '[flipbook id="' + id + '"]';
                    
                    // Insertar en el editor
                    if (typeof window.tinyMCE !== 'undefined' && window.tinyMCE.activeEditor && !window.tinyMCE.activeEditor.isHidden()) {
                        window.tinyMCE.activeEditor.execCommand('mceInsertContent', false, shortcode);
                    } else {
                        var wpActiveEditor = window.wpActiveEditor;
                        if (typeof wpActiveEditor === 'undefined') {
                            wpActiveEditor = 'content';
                        }
                        var editor = $('#' + wpActiveEditor);
                        if (editor.length) {
                            var selectionStart = editor[0].selectionStart;
                            var selectionEnd = editor[0].selectionEnd;
                            var text = editor.val();
                            editor.val(text.substring(0, selectionStart) + shortcode + text.substring(selectionEnd));
                        }
                    }
                    
                    // Cerrar popup
                    $('#vibebook-insert-popup').hide();
                });
            });
        </script>
        
        <style>
            #vibebook-insert-popup {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .vibebook-popup-content {
                background: #fff;
                padding: 20px;
                border-radius: 5px;
                max-width: 400px;
                width: 100%;
            }
            
            .vibebook-popup-content h2 {
                margin-top: 0;
            }
            
            .vibebook-popup-content select {
                width: 100%;
                margin-bottom: 15px;
            }
        </style>
        <?php
    }
    
    /**
     * AJAX: Guardar flipbook
     */
    public function ajax_save_flipbook() {
        // Verificar nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'vibebook_flip_nonce')) {
            wp_send_json_error('Nonce inválido');
        }
        
        // Verificar permisos
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permisos insuficientes');
        }
        
        // Obtener datos
        $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;
        $title = isset($_POST['title']) ? sanitize_text_field($_POST['title']) : 'Flipbook';
        $pdf_id = isset($_POST['pdf_id']) ? intval($_POST['pdf_id']) : 0;
        
        // Verificar PDF
        if (!$pdf_id) {
            wp_send_json_error('PDF no válido');
        }
        
        // Crear o actualizar post
        if ($post_id) {
            // Actualizar post existente
            $post_data = array(
                'ID' => $post_id,
                'post_title' => $title,
            );
            
            $post_id = wp_update_post($post_data);
        } else {
            // Crear nuevo post
            $post_data = array(
                'post_title' => $title,
                'post_status' => 'publish',
                'post_type' => 'vibebook_flipbook',
            );
            
            $post_id = wp_insert_post($post_data);
        }
        
        // Verificar errores
        if (is_wp_error($post_id)) {
            wp_send_json_error($post_id->get_error_message());
        }
        
        // Guardar metadatos
        update_post_meta($post_id, '_vibebook_pdf_id', $pdf_id);
        
        // Inicializar áreas si no existen
        $areas = get_post_meta($post_id, '_vibebook_areas', true);
        if (!$areas) {
            update_post_meta($post_id, '_vibebook_areas', array());
        }
        
        // Responder con éxito
        wp_send_json_success(array(
            'post_id' => $post_id,
        ));
    }
    
    /**
     * AJAX: Obtener flipbook
     */
    public function ajax_get_flipbook() {
        // Configurar encabezado JSON para la respuesta
        header('Content-Type: application/json');
        
        try {
            // Verificar nonce
            if (!isset($_GET['nonce']) || !wp_verify_nonce($_GET['nonce'], 'vibebook_flip_nonce')) {
                throw new Exception('Nonce inválido');
            }
            
            // Verificar permisos
            if (!current_user_can('manage_options')) {
                throw new Exception('Permisos insuficientes');
            }
            
            // Obtener datos
            $post_id = isset($_GET['post_id']) ? intval($_GET['post_id']) : 0;
            
            // Verificar post
            $post = get_post($post_id);
            if (!$post || $post->post_type !== 'vibebook_flipbook') {
                throw new Exception('Flipbook no encontrado');
            }
            
            // Obtener metadatos
            $pdf_id = get_post_meta($post_id, '_vibebook_pdf_id', true);
            $pdf_url = wp_get_attachment_url($pdf_id);
            $areas = get_post_meta($post_id, '_vibebook_areas', true);
            
            // Asegurar que areas sea un array para evitar errores de JavaScript
            if (empty($areas) || !is_array($areas)) {
                $areas = array();
            }
            
            // Procesar áreas para asegurar que los datos sean correctos
            foreach ($areas as $key => $area) {
                // Verificar que el área tiene las propiedades mínimas necesarias
                if (!isset($area['id']) || !isset($area['page']) || !isset($area['type'])) {
                    unset($areas[$key]);
                    continue;
                }
                
                // Verificar coordenadas
                if (!isset($area['coords_percent']) || !is_array($area['coords_percent']) || count($area['coords_percent']) !== 4) {
                    // Si hay coords pero no coords_percent, intentar mantenerlo para que el frontend calcule
                    if (!isset($area['coords']) || !is_array($area['coords']) || count($area['coords']) !== 4) {
                        // Si no tenemos ninguna coordenada válida, mejor eliminar esta área
                        unset($areas[$key]);
                        continue;
                    }
                }
            }
            
            // Reindexar el array
            $areas = array_values($areas);
            
            // Responder con éxito
            wp_send_json_success(array(
                'post_id' => $post_id,
                'title' => $post->post_title,
                'pdf_id' => $pdf_id,
                'pdf_url' => $pdf_url,
                'areas' => $areas,
                'areas_count' => count($areas)
            ));
            
        } catch (Exception $e) {
            // Registrar error para depuración
            error_log('VibeBook Error: ' . $e->getMessage());
            
            // Responder con error
            wp_send_json_error(array(
                'message' => $e->getMessage()
            ));
        }
    }
    
    /**
     * AJAX: Guardar área
     */
    public function ajax_save_area() {
        // Verificar nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'vibebook_flip_nonce')) {
            wp_send_json_error('Nonce inválido');
        }
        
        // Verificar permisos
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permisos insuficientes');
        }
        
        // Obtener datos
        $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;
        $page = isset($_POST['page']) ? intval($_POST['page']) : 1;
        $type = isset($_POST['type']) ? sanitize_text_field($_POST['type']) : '';
        $coords = isset($_POST['coords']) ? sanitize_text_field($_POST['coords']) : '';
        
        // Verificar datos
        if (!$post_id || !$type || !$coords) {
            wp_send_json_error('Datos incompletos');
        }
        
        // Verificar post
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'vibebook_flipbook') {
            wp_send_json_error('Flipbook no encontrado');
        }
        
        // Procesar coordenadas
        $coords_array = explode(',', $coords);
        if (count($coords_array) !== 4) {
            wp_send_json_error('Coordenadas inválidas');
        }
        
        // Convertir a enteros
        $coords_array = array_map('intval', $coords_array);
        
        // Obtener áreas existentes
        $areas = get_post_meta($post_id, '_vibebook_areas', true);
        if (!$areas) {
            $areas = array();
        }
        
        // Crear nueva área
        $area = array(
            'id' => uniqid(),
            'page' => $page,
            'type' => $type,
            'coords' => $coords_array,
        );
        
        // Datos específicos según el tipo
        switch ($type) {
            case 'url':
                $area['target_url'] = isset($_POST['target_url']) ? esc_url_raw($_POST['target_url']) : '';
                break;
                
            case 'youtube':
                $area['target_url'] = isset($_POST['target_url']) ? esc_url_raw($_POST['target_url']) : '';
                break;
                
            case 'internal':
                $area['target_page'] = isset($_POST['target_page']) ? intval($_POST['target_page']) : 1;
                $area['color'] = isset($_POST['color']) ? sanitize_text_field($_POST['color']) : 'blue';
                break;
                
            case 'audio':
                $area['audio_id'] = isset($_POST['audio_id']) ? intval($_POST['audio_id']) : 0;
                $area['autoplay'] = isset($_POST['autoplay']) && $_POST['autoplay'] === 'true';
                
                // Obtener y guardar la URL del audio directamente
                $audio_url = wp_get_attachment_url($area['audio_id']);
                if ($audio_url) {
                    $area['audio_url'] = $audio_url;
                } else {
                    wp_send_json_error('Archivo de audio no encontrado');
                    return;
                }
                break;
        }
        
        // Agregar área
        $areas[] = $area;
        
        // Guardar áreas
        update_post_meta($post_id, '_vibebook_areas', $areas);
        
        // Responder con éxito
        wp_send_json_success();
    }
    
    /**
     * AJAX: Actualizar área
     */
    public function ajax_update_area() {
        // Verificar nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'vibebook_flip_nonce')) {
            wp_send_json_error('Nonce inválido');
        }
        
        // Verificar permisos
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permisos insuficientes');
        }
        
        // Obtener datos
        $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;
        $area_id = isset($_POST['area_id']) ? sanitize_text_field($_POST['area_id']) : '';
        $type = isset($_POST['type']) ? sanitize_text_field($_POST['type']) : '';
        
        // Verificar datos
        if (!$post_id || !$area_id || !$type) {
            wp_send_json_error('Datos incompletos');
        }
        
        // Verificar post
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'vibebook_flipbook') {
            wp_send_json_error('Flipbook no encontrado');
        }
        
        // Obtener áreas existentes
        $areas = get_post_meta($post_id, '_vibebook_areas', true);
        if (!$areas) {
            wp_send_json_error('Área no encontrada');
        }
        
        // Buscar área
        $area_index = -1;
        foreach ($areas as $index => $area) {
            if ($area['id'] === $area_id) {
                $area_index = $index;
                break;
            }
        }
        
        if ($area_index === -1) {
            wp_send_json_error('Área no encontrada');
        }
        
        // Actualizar tipo
        $areas[$area_index]['type'] = $type;
        
        // Datos específicos según el tipo
        switch ($type) {
            case 'url':
                $areas[$area_index]['target_url'] = isset($_POST['target_url']) ? esc_url_raw($_POST['target_url']) : '';
                break;
                
            case 'youtube':
                $areas[$area_index]['target_url'] = isset($_POST['target_url']) ? esc_url_raw($_POST['target_url']) : '';
                break;
                
            case 'internal':
                $areas[$area_index]['target_page'] = isset($_POST['target_page']) ? intval($_POST['target_page']) : 1;
                $areas[$area_index]['color'] = isset($_POST['color']) ? sanitize_text_field($_POST['color']) : 'blue';
                break;
                
            case 'audio':
                $areas[$area_index]['audio_id'] = isset($_POST['audio_id']) ? intval($_POST['audio_id']) : 0;
                $areas[$area_index]['autoplay'] = isset($_POST['autoplay']) && $_POST['autoplay'] === 'true';
                break;
        }
        
        // Guardar áreas
        update_post_meta($post_id, '_vibebook_areas', $areas);
        
        // Responder con éxito
        wp_send_json_success();
    }
    
    /**
     * AJAX: Eliminar área
     */
    public function ajax_delete_area() {
        // Verificar nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'vibebook_flip_nonce')) {
            wp_send_json_error('Nonce inválido');
        }
        
        // Verificar permisos
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permisos insuficientes');
        }
        
        // Obtener datos
        $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;
        $area_id = isset($_POST['area_id']) ? sanitize_text_field($_POST['area_id']) : '';
        
        // Verificar datos
        if (!$post_id || !$area_id) {
            wp_send_json_error('Datos incompletos');
        }
        
        // Verificar post
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'vibebook_flipbook') {
            wp_send_json_error('Flipbook no encontrado');
        }
        
        // Obtener áreas existentes
        $areas = get_post_meta($post_id, '_vibebook_areas', true);
        if (!$areas) {
            wp_send_json_error('Área no encontrada');
        }
        
        // Buscar área
        $area_index = -1;
        foreach ($areas as $index => $area) {
            if ($area['id'] === $area_id) {
                $area_index = $index;
                break;
            }
        }
        
        if ($area_index === -1) {
            wp_send_json_error('Área no encontrada');
        }
        
        // Eliminar área
        array_splice($areas, $area_index, 1);
        
        // Guardar áreas
        update_post_meta($post_id, '_vibebook_areas', $areas);
        
        // Responder con éxito
        wp_send_json_success();
    }
    
    /**
     * AJAX: Actualizar posición de área
     */
    public function ajax_update_area_position() {
        // Verificar nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'vibebook_flip_nonce')) {
            wp_send_json_error('Nonce inválido');
        }
        
        // Verificar permisos
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permisos insuficientes');
        }
        
        // Obtener datos
        $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;
        $area_id = isset($_POST['area_id']) ? sanitize_text_field($_POST['area_id']) : '';
        $coords = isset($_POST['coords']) ? sanitize_text_field($_POST['coords']) : '';
        
        // Verificar datos
        if (!$post_id || !$area_id || !$coords) {
            wp_send_json_error('Datos incompletos');
        }
        
        // Verificar post
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'vibebook_flipbook') {
            wp_send_json_error('Flipbook no encontrado');
        }
        
        // Procesar coordenadas
        $coords_array = explode(',', $coords);
        if (count($coords_array) !== 4) {
            wp_send_json_error('Coordenadas inválidas');
        }
        
        // Convertir a enteros
        $coords_array = array_map('intval', $coords_array);
        
        // Obtener áreas existentes
        $areas = get_post_meta($post_id, '_vibebook_areas', true);
        if (!$areas) {
            wp_send_json_error('Área no encontrada');
        }
        
        // Buscar área
        $area_index = -1;
        foreach ($areas as $index => $area) {
            if ($area['id'] === $area_id) {
                $area_index = $index;
                break;
            }
        }
        
        if ($area_index === -1) {
            wp_send_json_error('Área no encontrada');
        }
        
        // Actualizar coordenadas
        $areas[$area_index]['coords'] = $coords_array;
        
        // Guardar áreas
        update_post_meta($post_id, '_vibebook_areas', $areas);
        
        // Responder con éxito
        wp_send_json_success();
    }
    
    /**
     * Manejar eliminación de flipbook
     */
    public function handle_delete_flipbook() {
        // Verificar nonce
        if (!isset($_GET['nonce']) || !wp_verify_nonce($_GET['nonce'], 'vibebook_delete_flipbook')) {
            wp_die('Nonce inválido');
        }
        
        // Verificar permisos
        if (!current_user_can('manage_options')) {
            wp_die('Permisos insuficientes');
        }
        
        // Obtener ID
        $post_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        
        // Verificar post
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'vibebook_flipbook') {
            wp_die('Flipbook no encontrado');
        }
        
        // Eliminar post
        wp_delete_post($post_id, true);
        
        // Redireccionar
        wp_redirect(admin_url('admin.php?page=vibebook-flip'));
        exit;
    }
}

// Inicializar plugin
$vibebook_flip = new VibeBookFlip();

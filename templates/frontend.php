<?php
/**
 * Template para el frontend del plugin Vibebook Flip
 * Versión 1.0.8 - Añadido movimiento con mouse y mejora de calidad de imagen
 */
?>
<div id="vibebook-flipbook-<?php echo esc_attr($id); ?>" class="vibebook-flipbook flipbook-container draggable-enabled" data-id="<?php echo esc_attr($id); ?>">
    <!-- Controles de navegación -->
    <div class="vibebook-controls">
        <div class="vibebook-page-info">Página 1 de <?php echo esc_html($total_pages); ?></div>
        
        <!-- Los controles de zoom se añadirán dinámicamente mediante JavaScript -->
    
        
        <!-- Botón de pantalla completa -->
        <div class="vibebook-fullscreen-control">
            <button class="vibebook-fullscreen-toggle" title="Pantalla completa"><span class="dashicons dashicons-screenoptions"></span></button>
                <span class="dashicons dashicons-fullscreen"></span>
            </button>
        </div>
        
        <!-- Controles de audio (inicialmente ocultos) -->
        <div class="vibebook-audio-controls"> 
            <button class="vibebook-audio-toggle" title="Reproducir/Pausar audio">
                <span class="dashicons dashicons-controls"></span>
            </button>
        </div>
    </div>
    
    <!-- Contenedor de páginas con soporte para arrastrar -->
    <div class="vibebook-pages vibebook-draggable">
        <!-- Las páginas se renderizarán dinámicamente mediante JavaScript -->
        <div class="vibebook-drag-indicator">
            <span class="dashicons dashicons-move"></span>
        </div>
    </div>
    
    <!-- Botones de navegación laterales -->
    <div class="vibebook-side-nav">
        <button class="vibebook-prev vibebook-side-button" title="Página anterior"><span class="vibebook-arrow">←</span></button>
        <button class="vibebook-next vibebook-side-button" title="Página siguiente"><span class="vibebook-arrow">→</span></button>
    </div>
    
    <!-- Indicador de carga -->
    <div class="vibebook-loading">
        <div class="vibebook-loading-spinner"></div>
    </div>
</div>

<!-- Datos para JavaScript -->
<script type="text/javascript">
    var vibeBookFlipData_<?php echo esc_attr($id); ?> = <?php echo wp_json_encode($data); ?>;
    
    // Configuración adicional para arrastrar y calidad
    if (!vibeBookFlipData_<?php echo esc_attr($id); ?>.config) {
        vibeBookFlipData_<?php echo esc_attr($id); ?>.config = {};
    }
    vibeBookFlipData_<?php echo esc_attr($id); ?>.config.draggable = true;
    vibeBookFlipData_<?php echo esc_attr($id); ?>.config.highQuality = true;
    vibeBookFlipData_<?php echo esc_attr($id); ?>.config.renderOptions = {
        quality: 'high',
        resolution: 2, // Factor multiplicador para mejorar resolución
        antialiasing: true
    };
</script>

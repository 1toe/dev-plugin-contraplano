<?php
/**
 * Plantilla para la página de administración del plugin Vibebook Flip
 */
?>
<div class="wrap">
    <div class="vibebook-admin-container">
        <div class="vibebook-admin-header">
            <h2>📚 Flipbooks 📚</h2>
        </div>
        
        <div class="vibebook-tabs">
            <a href="#vibebook-tab-upload" class="vibebook-tab-link active"><?php _e('Subir/Seleccionar PDF', 'vibebook-flip'); ?></a>
            <a href="#vibebook-tab-edit" class="vibebook-tab-link"><?php _e('Editar Flipbook', 'vibebook-flip'); ?></a>
            <a href="#vibebook-tab-manage" class="vibebook-tab-link"><?php _e('Gestionar Ediciones', 'vibebook-flip'); ?></a>
        </div>
        
        <!-- Tutorial de Bienvenida -->
        <div id="vibebook-welcome-tutorial" class="vibebook-tutorial-overlay">
            <div class="vibebook-tutorial-modal">
                <div class="vibebook-tutorial-header">
                    <h2>Bienvenido a Flipbooks de ContraPlano</h2>
                    <button class="vibebook-tutorial-close" title="Cerrar tutorial">&times;</button>
                </div>
                
                <div class="vibebook-tutorial-content">
                    <div class="vibebook-tutorial-step active" data-step="1">
                        <h3>Paso 1: Crear tu primer flipbook</h3>
                        <p>Para comenzar, sigue estos sencillos pasos:</p>
                        <ol>
                            <li>Escribe un título para tu flipbook</li>
                            <li>Haz clic en "Seleccionar PDF" para subir o elegir un archivo PDF</li>
                            <li>Una vez seleccionado, haz clic en "Guardar Flipbook"</li>
                        </ol>
                        <div class="vibebook-tutorial-image">
                            <img src="<?php echo VIBEBOOK_FLIP_PLUGIN_URL; ?>images/tutorial-step1.png" alt="Seleccionar PDF">
                        </div>
                    </div>
                    
                    <div class="vibebook-tutorial-step" data-step="2">
                        <h3>Paso 2: Añadir áreas interactivas</h3>
                        <p>Una vez creado el flipbook, podrás añadir áreas interactivas:</p>
                        <ol>
                            <li>Selecciona el tipo de área (URL, YouTube, Navegación interna o Audio)</li>
                            <li>Dibuja un área en el PDF arrastrando el cursor</li>
                            <li>Configura los detalles del área y guarda</li>
                        </ol>
                        <div class="vibebook-tutorial-image">
                            <img src="<?php echo VIBEBOOK_FLIP_PLUGIN_URL; ?>images/tutorial-step2.png" alt="Áreas interactivas">
                        </div>
                    </div>
                    
                    <div class="vibebook-tutorial-step" data-step="3">
                        <h3>Paso 3: Insertar en tu sitio</h3>
                        <p>Para mostrar el flipbook en tu sitio:</p>
                        <ol>
                            <li>Copia el shortcode generado [flipbook id="X"]</li>
                            <li>Pégalo en cualquier página o entrada</li>
                            <li>¡Listo! Tu flipbook interactivo ya está visible para tus usuarios</li>
                        </ol>
                        <div class="vibebook-tutorial-image">
                            <img src="<?php echo VIBEBOOK_FLIP_PLUGIN_URL; ?>images/tutorial-step3.png" alt="Usar shortcode">
                        </div>
                    </div>
                </div>
                
                <div class="vibebook-tutorial-navigation">
                    <button class="vibebook-tutorial-prev" disabled>&larr; Anterior</button>
                    <div class="vibebook-tutorial-dots">
                        <span class="vibebook-tutorial-dot active" data-step="1"></span>
                        <span class="vibebook-tutorial-dot" data-step="2"></span>
                        <span class="vibebook-tutorial-dot" data-step="3"></span>
                    </div>
                    <button class="vibebook-tutorial-next">Siguiente &rarr;</button>
                </div>
                
                <div class="vibebook-tutorial-footer">
                    <label>
                        <input type="checkbox" id="vibebook-dont-show-again"> No mostrar este tutorial de nuevo
                    </label>
                    <button class="vibebook-button vibebook-tutorial-start">¡Comenzar ahora!</button>
                </div>
            </div>
        </div>
        
        <div id="vibebook-tab-upload" class="vibebook-tab-content active">
            <div class="vibebook-welcome-message">
                <h3><?php _e('Comienza a crear tu flipbook interactivo', 'vibebook-flip'); ?></h3>
                <p><?php _e('Selecciona un PDF de tu biblioteca de medios o sube uno nuevo para convertirlo en un atractivo flipbook interactivo.', 'vibebook-flip'); ?></p>
            </div>

            <div class="vibebook-form-group">
                <label for="vibebook-title"><?php _e('Título del Flipbook', 'vibebook-flip'); ?></label>
                <input type="text" id="vibebook-title" placeholder="<?php _e('Ingresa un título', 'vibebook-flip'); ?>">
            </div>
            
            <div class="vibebook-form-group">
                <button id="vibebook-select-pdf" class="vibebook-button"><?php _e('Seleccionar PDF', 'vibebook-flip'); ?></button>
                <div id="vibebook-pdf-info" style="display: none; margin-top: 10px;">
                    <strong><?php _e('PDF seleccionado:', 'vibebook-flip'); ?></strong> <span id="vibebook-pdf-name"></span>
                </div>
            </div>
            
            <div class="vibebook-form-group">
                <button id="vibebook-save-flipbook" class="vibebook-button"><?php _e('Guardar Flipbook', 'vibebook-flip'); ?></button>
            </div>
            
            <div class="vibebook-help-card">
                <h4><?php _e('¿Necesitas ayuda?', 'vibebook-flip'); ?></h4>
                <p><?php _e('Si es la primera vez que usas Vibebook Flipbook, puedes ver el tutorial en cualquier momento haciendo clic en el botón de abajo.', 'vibebook-flip'); ?></p>
                <button id="vibebook-show-tutorial" class="vibebook-button secondary"><?php _e('Mostrar tutorial', 'vibebook-flip'); ?></button>
            </div>
        </div>
        
        <div id="vibebook-tab-edit" class="vibebook-tab-content">
            <div id="vibebook-editor-loading" style="display: none;">
                <div class="vibebook-loading">
                    <div class="vibebook-loading-spinner"></div>
                </div>
                <p><?php _e('Cargando editor...', 'vibebook-flip'); ?></p>
            </div>
            
            <!-- Mejorar indicador de guardado -->
            <div id="vibebook-save-indicator" style="display: none;" class="vibebook-notice">
                <p id="vibebook-save-message"></p>
            </div>
            
            <div id="vibebook-editor-content">
                <h3 id="vibebook-editor-title"><?php _e('Editar Flipbook', 'vibebook-flip'); ?></h3>
                
                <div class="vibebook-editor">
                    <div class="vibebook-editor-pdf">
                        <div class="vibebook-pdf-toolbar">
                            <button id="vibebook-prev-page" class="vibebook-button secondary">← <?php _e('Anterior', 'vibebook-flip'); ?></button>
                            <select id="vibebook-page-select"></select>
                            <button id="vibebook-next-page" class="vibebook-button secondary"><?php _e('Siguiente', 'vibebook-flip'); ?> →</button>
                        </div>
                        
                        <div id="vibebook-pdf-container">
                            <div id="vibebook-pdf-loading" class="vibebook-loading">
                                <div class="vibebook-loading-spinner"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="vibebook-editor-tools">
                        <div class="vibebook-tools">
                            <h4 class="vibebook-tools-title"><?php _e('Herramientas', 'vibebook-flip'); ?></h4>
                            
                            <div class="vibebook-tools-buttons">
                                <button class="vibebook-tool-button" data-tool="url"><?php _e('Enlace URL', 'vibebook-flip'); ?></button>
                                <button class="vibebook-tool-button" data-tool="youtube"><?php _e('YouTube', 'vibebook-flip'); ?></button>
                                <button class="vibebook-tool-button" data-tool="internal"><?php _e('Navegación interna', 'vibebook-flip'); ?></button>
                                <button class="vibebook-tool-button" data-tool="audio"><?php _e('Audio', 'vibebook-flip'); ?></button>
                            </div>
                            
                            <div id="vibebook-option-url" class="vibebook-tool-options">
                                <div class="vibebook-form-group">
                                    <label for="vibebook-url-target"><?php _e('URL de destino:', 'vibebook-flip'); ?></label>
                                    <input type="text" id="vibebook-url-target" placeholder="https://">
                                </div>
                                
                                <button id="vibebook-save-url" class="vibebook-button"><?php _e('Guardar enlace', 'vibebook-flip'); ?></button>
                            </div>
                            
                            <div id="vibebook-option-youtube" class="vibebook-tool-options">
                                <div class="vibebook-form-group">
                                    <label for="vibebook-youtube-url"><?php _e('URL de YouTube:', 'vibebook-flip'); ?></label>
                                    <input type="text" id="vibebook-youtube-url" placeholder="https://www.youtube.com/watch?v=...">
                                </div>
                                
                                <button id="vibebook-save-youtube" class="vibebook-button"><?php _e('Guardar YouTube', 'vibebook-flip'); ?></button>
                            </div>
                            
                            <div id="vibebook-option-internal" class="vibebook-tool-options">
                                <div class="vibebook-form-group">
                                    <label for="vibebook-internal-page"><?php _e('Página de destino:', 'vibebook-flip'); ?></label>
                                    <select id="vibebook-internal-page"></select>
                                </div>
                                
                                <div class="vibebook-form-group">
                                    <label for="vibebook-internal-color"><?php _e('Color:', 'vibebook-flip'); ?></label>
                                    <select id="vibebook-internal-color">
                                        <option value="blue"><?php _e('Azul', 'vibebook-flip'); ?></option>
                                        <option value="red"><?php _e('Rojo', 'vibebook-flip'); ?></option>
                                        <option value="green"><?php _e('Verde', 'vibebook-flip'); ?></option>
                                        <option value="orange"><?php _e('Naranja', 'vibebook-flip'); ?></option>
                                    </select>
                                </div>
                                
                                <button id="vibebook-save-internal" class="vibebook-button"><?php _e('Guardar navegación', 'vibebook-flip'); ?></button>
                            </div>
                            
                            <div id="vibebook-option-audio" class="vibebook-tool-options">
                                <div class="vibebook-form-group">
                                    <label><?php _e('Archivo de audio:', 'vibebook-flip'); ?></label>
                                    <p id="vibebook-audio-name"><?php _e('Ninguno', 'vibebook-flip'); ?></p>
                                    <button id="vibebook-select-audio" class="vibebook-button secondary"><?php _e('Seleccionar audio', 'vibebook-flip'); ?></button>
                                </div>
                                
                                <div class="vibebook-form-group">
                                    <label>
                                        <input type="checkbox" id="vibebook-audio-autoplay">
                                        <?php _e('Reproducir automáticamente', 'vibebook-flip'); ?>
                                    </label>
                                </div>
                                
                                <button id="vibebook-save-audio" class="vibebook-button"><?php _e('Guardar audio', 'vibebook-flip'); ?></button>
                            </div>
                        </div>
                        
                        <div class="vibebook-areas">
                            <h4 class="vibebook-areas-title"><?php _e('Áreas en esta página', 'vibebook-flip'); ?></h4>
                            <div class="vibebook-help-message">
                                <p><?php _e('Las áreas interactivas se posicionan utilizando porcentajes relativos al tamaño original del PDF para asegurar la correcta visualización en diferentes dispositivos.', 'vibebook-flip'); ?></p>
                            </div>
                            <ul id="vibebook-areas-list" class="vibebook-areas-list"></ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="vibebook-tab-manage" class="vibebook-tab-content">
            <h3><?php _e('Gestionar Ediciones', 'vibebook-flip'); ?></h3>
            
            <?php
            // Obtener todos los flipbooks
            $flipbooks = get_posts(array(
                'post_type' => 'vibebook_flipbook',
                'posts_per_page' => -1,
                'orderby' => 'title',
                'order' => 'ASC',
            ));
            ?>
            
            <?php if (empty($flipbooks)) : ?>
                <p><?php _e('No hay flipbooks disponibles. Por favor, crea uno primero.', 'vibebook-flip'); ?></p>
            <?php else : ?>
                <table class="vibebook-editions-table">
                    <thead>
                        <tr>
                            <th><?php _e('Título', 'vibebook-flip'); ?></th>
                            <th><?php _e('Shortcode', 'vibebook-flip'); ?></th>
                            <th><?php _e('Acciones', 'vibebook-flip'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($flipbooks as $flipbook) : ?>
                            <tr>
                                <td><?php echo esc_html($flipbook->post_title); ?></td>
                                <td><code>[flipbook id="<?php echo esc_attr($flipbook->ID); ?>"]</code></td>
                                <td class="actions">
                                    <a href="<?php echo esc_url(admin_url('admin.php?page=vibebook-flip&action=edit&id=' . $flipbook->ID)); ?>" class="vibebook-edit-flipbook" data-id="<?php echo esc_attr($flipbook->ID); ?>"><?php _e('Editar', 'vibebook-flip'); ?></a>
                                    <a href="<?php echo esc_url(admin_url('admin-post.php?action=vibebook_delete_flipbook&id=' . $flipbook->ID . '&nonce=' . wp_create_nonce('vibebook_delete_flipbook'))); ?>" class="vibebook-delete-flipbook" onclick="return confirm('<?php esc_attr_e('¿Estás seguro de que deseas eliminar este flipbook?', 'vibebook-flip'); ?>');"><?php _e('Eliminar', 'vibebook-flip'); ?></a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </div>
</div>

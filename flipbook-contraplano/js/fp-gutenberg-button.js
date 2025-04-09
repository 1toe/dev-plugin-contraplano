/**
 * Añadir botón de insertar Flipbook en el editor Gutenberg
 */
(function(wp) {
    const { registerPlugin } = wp.plugins;
    const { PluginMoreMenuItem } = wp.editPost;
    const { Modal, Button, SelectControl } = wp.components;
    const { useState } = wp.element;
    const { insertBlock, createBlock } = wp.blocks;
    const { useDispatch, useSelect } = wp.data;

    const FlipbookButton = () => {
        const [isOpen, setIsOpen] = useState(false);
        const [selectedFlipbook, setSelectedFlipbook] = useState('');
        const { insertBlocks } = useDispatch('core/block-editor');
        const { getSelectedBlock } = useSelect(select => select('core/block-editor'));

        // Preparar opciones para el selector
        const flipbookOptions = [];
        if (fpGutenbergData && fpGutenbergData.flipbooks) {
            flipbookOptions.push({ label: 'Seleccione un flipbook...', value: '' });
            fpGutenbergData.flipbooks.forEach(flipbook => {
                flipbookOptions.push({
                    label: flipbook.title,
                    value: flipbook.id.toString()
                });
            });
        }

        // Función para insertar el shortcode en el editor
        const insertFlipbookShortcode = () => {
            if (!selectedFlipbook) {
                // Si no hay flipbook seleccionado, mostrar alerta
                return;
            }

            // Crear bloque de shortcode
            const shortcodeBlock = createBlock('core/shortcode', {
                text: `[flipbook id=${selectedFlipbook}]`
            });

            // Insertar el bloque en el editor
            insertBlocks(shortcodeBlock);
            
            // Cerrar el modal
            setIsOpen(false);
        };

        return (
            <>
                <PluginMoreMenuItem
                    icon="book"
                    onClick={() => setIsOpen(true)}
                >
                    Insertar Flipbook
                </PluginMoreMenuItem>

                {isOpen && (
                    <Modal
                        title="Seleccionar un Flipbook"
                        onRequestClose={() => setIsOpen(false)}
                    >
                        <div style={{ margin: '20px 0' }}>
                            <SelectControl
                                label="Seleccione el Flipbook que desea insertar:"
                                value={selectedFlipbook}
                                options={flipbookOptions}
                                onChange={(value) => setSelectedFlipbook(value)}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                isSecondary
                                onClick={() => setIsOpen(false)}
                                style={{ marginRight: '10px' }}
                            >
                                Cancelar
                            </Button>

                            <Button
                                isPrimary
                                onClick={insertFlipbookShortcode}
                                disabled={!selectedFlipbook}
                            >
                                Insertar
                            </Button>
                        </div>
                    </Modal>
                )}
            </>
        );
    };

    registerPlugin('flipbook-contraplano-button', {
        render: FlipbookButton
    });
})(window.wp);

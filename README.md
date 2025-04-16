# INSTALACIÓN Y USO DEL PLUGIN FP-CP

## ESTRUCTURA DEL PLUGIN

```
flipbook-contraplano/
├── css/
│   ├── fp-front.css
│   └── fp-admin.css
├── js/
│   ├── fp-front.js
│   └── fp-admin.js
└── flipbook-plugin.php
```

## INSTALACIÓN

1. **Preparación del archivo ZIP**:

   - Descarga el archivo ZIP del plugin Flipbook Contraplano
   - Asegúrate de que la estructura de carpetas sea exactamente como se muestra arriba
2. **Instalación en WordPress**:

   - Inicia sesión en el panel de administración de WordPress
   - Navega a "Plugins" > "Añadir nuevo"
   - Haz clic en "Subir plugin"
   - Selecciona el archivo ZIP del plugin y haz clic en "Instalar ahora"
   - Una vez completada la instalación, haz clic en "Activar plugin"
3. **Instalación manual (alternativa)**:

   - Descomprime el archivo ZIP
   - Sube la carpeta `flipbook-contraplano` al directorio `/wp-content/plugins/` de tu instalación WordPress
   - Activa el plugin desde el panel de administración de WordPress

## USO DEL PLUGIN

### 1. CREAR UN FLIPBOOK

1. **Acceder al menú de Flipbooks**:

   - En el panel de administración de WordPress, verás un nuevo menú llamado "Flipbooks"
   - Haz clic en "Añadir nuevo" para crear un flipbook
2. **Configurar el Flipbook**:

   - **Título**: Asigna un título descriptivo a tu flipbook
   - **PDF del Flipbook**:
     - Haz clic en "Subir PDF" para seleccionar o subir un archivo PDF
     - El PDF se mostrará como un flipbook interactivo
   - **Audios por página**:
     - Puedes añadir archivos de audio para cada página del flipbook
     - El primer audio corresponde a la página 1, el segundo a la página 2, etc.
     - Haz clic en "+ Agregar Audio" para añadir más audios
3. **Áreas Interactivas**:

   - En la pestaña "Áreas Interactivas", puedes definir áreas clickeables en el PDF
   - Estas áreas pueden enlazar a URLs externas, navegar a otras páginas del mismo PDF o reproducir videos de YouTube
4. **Acciones de InDesign**:

   - En la pestaña "Acciones de InDesign", puedes importar acciones definidas en Adobe InDesign
   - Estas acciones pueden configurarse para navegar entre páginas o abrir enlaces
5. **Guardar el Flipbook**:

   - Haz clic en "Publicar" o "Actualizar" para guardar tu flipbook

### 2. INSERTAR EL FLIPBOOK EN UNA PÁGINA O ENTRADA

1. **Usando el botón de inserción**:

   - Edita la página o entrada donde deseas insertar el flipbook
   - Haz clic en el botón "Insertar Flipbook" (icono de libro) en la barra de herramientas
   - Selecciona el flipbook que deseas insertar de la lista
   - El shortcode se insertará automáticamente en el formato `[flipbook=ID]`
2. **Usando el shortcode manualmente**:

   - Puedes insertar el shortcode `[flipbook=ID]` directamente en el editor
   - Reemplaza "ID" con el ID del flipbook que deseas mostrar
   - El ID se puede encontrar en la URL cuando editas el flipbook (por ejemplo, `post.php?post=123&action=edit`)

### 3. PERSONALIZACIÓN

1. **Configuración visual**:

   - Puedes personalizar el aspecto del flipbook desde el panel de administración
   - Selecciona un tema (claro/oscuro) y un color de acento
2. **Parámetros del shortcode**:

   - El shortcode acepta varios parámetros para personalizar la visualización:
     - `[flipbook=ID width="100%" height="600px" view_mode="double"]`
     - `width`: Ancho del flipbook (por defecto: 100%)
     - `height`: Alto del flipbook (por defecto: 600px)
     - `view_mode`: Modo de visualización ("single" o "double", por defecto: "double")

## SOLUCIÓN DE PROBLEMAS

1. **El PDF no se muestra**:

   - Verifica que el PDF se haya subido correctamente
   - Asegúrate de que el formato del shortcode sea correcto: `[flipbook=ID]` (sin comillas), igualmente prueba con y sin comillas.
   - Comprueba que el ID del flipbook sea correcto
2. **Los audios no se reproducen**:

   - Verifica que los archivos de audio se hayan subido correctamente
   - Asegúrate de que los formatos de audio sean compatibles con el navegador (MP3, WAV, OGG)
3. **Las áreas interactivas no funcionan**:

   - Verifica que las coordenadas de las áreas interactivas sean correctas
   - Asegúrate de que los enlaces o acciones estén configurados correctamente

## RECOMENDACIONES

1. **Optimización de PDFs**:

   - Para un mejor rendimiento, optimiza tus PDFs antes de subirlos
   - Reduce el tamaño de las imágenes dentro del PDF
   - Considera dividir PDFs muy grandes en varios flipbooks más pequeños
2. **Compatibilidad de navegadores**:

   - El plugin funciona mejor en navegadores modernos como Chrome, Firefox, Safari y Edge
   - Para una experiencia óptima, recomienda a tus usuarios utilizar estos navegadores
3. **Rendimiento**:

   - Los flipbooks con muchos audios o áreas interactivas pueden cargar más lentamente
   - Considera limitar el número de elementos interactivos para mejorar el rendimiento

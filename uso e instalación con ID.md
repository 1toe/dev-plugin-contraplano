**Tutorial: Aplicar Flipbook Vía Shortcode en WordPress**

### **1. Instalar y Activar el Plugin**

**Paso 1:** Asegúrate de que el archivo `flipbook-plugin-php.txt` esté en `wp-content/plugins/`.

**Paso 2:** Activa el plugin desde el panel de WordPress en "Plugins".

---

### **2. Crear un Flipbook**

**Paso 1:** En el panel de WordPress, ve a  **"Flipbooks" -> "Agregar nuevo"** .

**Paso 2:** Asigna un título, por ejemplo, "Mi Catálogo Interactivo".

**Paso 3:** En la caja  **"Configuración del Flipbook"** :

* Haz clic en **"Subir o seleccionar PDF"** y elige tu archivo.
* Opcionalmente, selecciona un  **archivo de audio** .
* Haz clic en  **"Publicar"** .

**Paso 4:** Obtén el **ID del Flipbook** mirando la URL en la barra de direcciones. Ejemplo:

* `...wp-admin/post.php?post=`
* **ID = 9816**

---

### **3. Insertar el Shortcode en una Página o Entrada**

**Paso 1:** Ve a la página o entrada donde quieres mostrar el Flipbook.

**Paso 2:** Edita la página y agrega un bloque  **"Shortcode"** .

**Paso 3:** Dentro del bloque, escribe:

```
[flipbook id="1234"]
```

*(Reemplaza 1234 con el ID real de tu Flipbook.)*

**Paso 4:** Guarda o actualiza la página.

---

### **4. Pasos Adicionales para la Visualización Correcta**

Para que el Flipbook se renderice correctamente en el frontend:

✅ **Cargar las bibliotecas necesarias:** Asegurar que **PDF.js** y **Turn.js** estén encoladas en las páginas donde se usa el shortcode.

✅ **Encolar JS y CSS:** Modificar el plugin PHP para encolar `fp-front.js` y `fp-front.css` en el frontend.

✅ **Corregir JavaScript:**

* Ajustar `fp-front.js` para que obtenga el PDF del atributo `data-pdf`.
* Asegurar que los selectores CSS coincidan con el HTML generado.
* Implementar lógica para reproducir audio desde `data-audio`.

✅ **Interactividad Avanzada:**

* Definir áreas interactivas en el admin (posible metabox).
* Guardar los datos en el Flipbook.
* Emitir datos con el shortcode (`data-attributes`).
* Leer y posicionar interacciones con JS.

✅ **Corregir CSS:** Asegurar que los estilos sean correctos para los contenedores del Flipbook.

---

**Resultado esperado:** Si todo está bien configurado, el Flipbook se mostrará correctamente en la página con interactividad y audio. Sin estos pasos, solo se mostrará un "Cargando Flipbook..." sin contenido visible.

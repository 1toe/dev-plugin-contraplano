document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('fp-flipbook');
    const pdfUrl = container.getAttribute('data-pdf');
    const audioPlayer = document.getElementById('fp-audio-player');
    const interactiveAreas = document.getElementById('fp-interactive-areas');
  
    if (!pdfUrl) return;
  
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    loadingTask.promise.then(function (pdf) {
      const totalPages = pdf.numPages;
      const promises = [];
  
      for (let i = 1; i <= totalPages; i++) {
        promises.push(
          pdf.getPage(i).then(function (page) {
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.classList.add('fp-page');
  
            return page.render({ canvasContext: context, viewport: viewport }).promise.then(() => {
              const wrapper = document.createElement('div');
              wrapper.classList.add('fp-page-wrapper');
              wrapper.appendChild(canvas);
              container.appendChild(wrapper);
            });
          })
        );
      }
  
      Promise.all(promises).then(() => {
        $(container).turn({
          width: 800,
          height: 600,
          autoCenter: true,
          elevation: 50,
          gradients: true,
        });
  
        if (interactiveAreas && interactiveAreas.dataset.areas) {
          try {
            const areas = JSON.parse(interactiveAreas.dataset.areas);
            areas.forEach((area) => {
              const page = parseInt(area.page, 10);
              const selector = `.fp-page-wrapper:nth-child(${page})`;
              const target = container.querySelector(selector);
              if (target) {
                const hotspot = document.createElement('div');
                hotspot.classList.add('fp-hotspot');
                hotspot.style.left = `${area.x}px`;
                hotspot.style.top = `${area.y}px`;
                hotspot.style.width = `${area.width}px`;
                hotspot.style.height = `${area.height}px`;
                hotspot.title = area.tooltip || '';
                if (area.link) {
                  hotspot.onclick = () => window.open(area.link, '_blank');
                }
                target.style.position = 'relative';
                target.appendChild(hotspot);
              }
            });
          } catch (err) {
            console.warn('Error al procesar áreas interactivas:', err);
          }
        }
  
        if (audioPlayer) {
          audioPlayer.play().catch(() => {
            console.log('El navegador bloqueó el autoplay. Requiere interacción del usuario.');
          });
        }
      });
    });
  });
  
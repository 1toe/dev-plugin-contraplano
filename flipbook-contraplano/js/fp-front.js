jQuery(document).ready(function ($) {
    // Use fpConfig passed from PHP (wp_localize_script)
    if (typeof pdfjsLib === 'undefined' || typeof fpConfig === 'undefined' || !fpConfig.pdfWorkerSrc) {
        console.error('PDF.js library or fpConfig data not found.');
        return;
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = fpConfig.pdfWorkerSrc;

    $('.flipbook-container').each(function () {
        // --- Elements ---
        const $container = $(this);
        const $viewerArea = $container.find('.fp-viewer-area');
        const $viewer = $container.find('.fp-pdf-viewer');
        const $pagesContainer = $container.find('.fp-pages-container');
        const $loading = $container.find('.fp-loading');
        const $prevArrow = $container.find('.fp-arrow-left');
        const $nextArrow = $container.find('.fp-arrow-right');
        const $audioPlayer = $container.find('.fp-audio-player');
        // Toolbar elements
        const $toolbar = $container.find('.fp-toolbar');
        const $zoomOutBtn = $toolbar.find('.fp-zoom-out');
        const $zoomInBtn = $toolbar.find('.fp-zoom-in');
        const $zoomSlider = $toolbar.find('.fp-zoom-slider');
        const $viewToggleBtn = $toolbar.find('.fp-view-toggle');
        const $fullscreenBtn = $toolbar.find('.fp-fullscreen');
        const $searchInput = $toolbar.find('.fp-search-input');
        const $searchBtn = $toolbar.find('.fp-search-btn');
        const $pageIndicator = $toolbar.find('.fp-page-indicator');
        const $pageInput = $toolbar.find('.fp-page-input');
        const $totalPagesSpan = $toolbar.find('.fp-total-pages');
        const $searchToggleBtn = $toolbar.find('.fp-search-toggle-btn');

        // --- Config & State ---
        const pdfUrl = $container.data('pdf');
        const postId = fpConfig.postId; // Assuming postId is passed if needed for unique IDs
        const audios = fpConfig.audios || [];
        let pdfDoc = null;
        let totalPages = 0;
        let pages = []; // Array to store page data {pageNum, element, canvas, width, height}
        let currentPageNum = 1; // Logical current page (1-based)
        let targetScale = 1.0; // The desired scale for the page (fit, or zoom level)
        let viewMode = 'double'; // 'single' or 'double'
        let isRendering = false; // Prevent overlapping renders/navigations
        let isFullscreen = false;
        let renderTimeout = null;

        if (!pdfUrl) {
            $loading.text('Error: PDF URL no encontrado.');
            console.error('PDF URL missing for container:', $container.attr('id'));
            return;
        }

        // --- Initialization ---
        async function initializeFlipbook() {
            $loading.show();
            try {
                pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
                totalPages = pdfDoc.numPages;
                pages = new Array(totalPages);

                $pageInput.attr('max', totalPages);
                $totalPagesSpan.text(totalPages);

                // Load base dimensions for the first page to calculate initial scale accurately
                await loadPageDimensions(1);
                targetScale = calculateFitScale(1); // Initial fit scale for page 1
                console.log("Initial target scale:", targetScale);

                viewMode = $container.attr('data-view-mode') || 'double';
                updateViewModeUI();

                await renderView(currentPageNum); // Render initial page using the calculated targetScale
                preloadAdjacentPages(currentPageNum);
                setupEventListeners();
                $loading.hide();
            } catch (error) {
                console.error(`Error initializing Flipbook: ${pdfUrl}`, error);
                $loading.text('Error al inicializar.');
            }
        }

        // Helper to load just page dimensions if not already loaded
        async function loadPageDimensions(pageNum) {
            const pageIndex = pageNum - 1;
            if (pageNum < 1 || pageNum > totalPages || (pages[pageIndex] && pages[pageIndex].baseWidth)) {
                return; // Already loaded or invalid
            }
            // Prevent multiple loads for the same page if called rapidly
            if (pages[pageIndex] && pages[pageIndex].loadingDimensions) {
                 console.log(`Waiting for dimensions load for page ${pageNum}`);
                 await pages[pageIndex].dimensionPromise; // Wait for the existing load to finish
                 return;
            }
            
            try {
                 console.log(`Loading dimensions for page ${pageNum}`);
                 // Mark as loading and create a promise to wait on
                 if (!pages[pageIndex]) pages[pageIndex] = { pageNum: pageNum };
                 let resolveDimensionPromise;
                 pages[pageIndex].dimensionPromise = new Promise(resolve => resolveDimensionPromise = resolve);
                 pages[pageIndex].loadingDimensions = true;
                 
                 const page = await pdfDoc.getPage(pageNum);
                 const viewport = page.getViewport({ scale: 1 });
                 
                 pages[pageIndex].baseWidth = viewport.width;
                 pages[pageIndex].baseHeight = viewport.height;
                 pages[pageIndex].pdfPage = page; // Store page object too
                 console.log(`Dimensions loaded for page ${pageNum}: ${viewport.width}x${viewport.height}`);
                 pages[pageIndex].loadingDimensions = false;
                 resolveDimensionPromise(); // Resolve the promise
            } catch (error) {
                 console.error(`Failed to load dimensions for page ${pageNum}`, error);
                 if(pages[pageIndex]) pages[pageIndex].loadingDimensions = false; // Reset flag on error
                 // Potentially reject the promise here if needed by callers
                 // resolveDimensionPromise(); // Resolve anyway? Or handle error state?
            }
        }

        // --- Page Loading & Rendering (ISSUU Style - Single Page Focus) ---
        async function loadAndRenderPage(pageNum, scaleToRender) {
            const pageIndex = pageNum - 1;
            console.log(`Request to load/render page ${pageNum} at scale ${scaleToRender.toFixed(3)}`);
            
            // Ensure base dimensions and pdfPage object are loaded first
            await loadPageDimensions(pageNum);
            
            if (!pages[pageIndex] || !pages[pageIndex].pdfPage) {
                console.error(`Page data/object missing for ${pageNum} even after load attempt.`);
                return null; // Critical error if dimensions/page didn't load
            }

            // Check cache (render at the specific scale)
            if (pages[pageIndex].renderedScale && Math.abs(pages[pageIndex].renderedScale - scaleToRender) < 0.01) {
                console.log(`Using cached render for page ${pageNum} at scale ${pages[pageIndex].renderedScale.toFixed(3)}`);
                // Ensure the element exists if it was somehow removed (shouldn't happen often)
                if (!pages[pageIndex].element || pages[pageIndex].element.find('canvas').length === 0) {
                     console.warn("Recreating element/canvas for cached page", pageNum);
                     return await rerenderPageObject(pages[pageIndex], scaleToRender);
                }
                return pages[pageIndex];
            }
            
            // If page object exists but needs re-render at different scale
            console.log(`Rendering page ${pageNum} at scale ${scaleToRender.toFixed(3)} (was ${pages[pageIndex].renderedScale?.toFixed(3)})`);
            return await rerenderPageObject(pages[pageIndex], scaleToRender);
        }

        async function rerenderPageObject(pageData, scale) {
            if (!pageData || !pageData.pdfPage) {
                 console.error("rerenderPageObject called with invalid pageData");
                 return null;
            }
            try {
                 console.log(`Rendering canvas for page ${pageData.pageNum} at scale ${scale.toFixed(3)}`);
                const viewport = pageData.pdfPage.getViewport({ scale });
                // Ensure canvas exists
                if (!pageData.canvas) {
                    pageData.canvas = document.createElement('canvas');
                    pageData.context = pageData.canvas.getContext('2d');
                }
                // Ensure element exists and contains the canvas
                if (!pageData.element || !pageData.element.length || pageData.element.find('canvas').length === 0) {
                    console.log(`Creating/Re-attaching element for page ${pageData.pageNum}`);
                    pageData.element = $('<div class="fp-page"></div>')
                                        .attr('data-page-num', pageData.pageNum)
                                        .append(pageData.canvas);
                } else {
                     // If element exists, ensure canvas is inside (might be needed if DOM was manipulated)
                     if (pageData.element.find('canvas')[0] !== pageData.canvas) {
                          pageData.element.empty().append(pageData.canvas);
                     }
                }

                pageData.canvas.width = Math.floor(viewport.width);
                pageData.canvas.height = Math.floor(viewport.height);
                // Update container div size to match canvas for layout purposes
                pageData.element.css({ width: viewport.width + 'px', height: viewport.height + 'px' });

                const renderContext = { canvasContext: pageData.context, viewport };
                await pageData.pdfPage.render(renderContext).promise;
                pageData.renderedScale = scale; // Record the scale it was actually rendered at
                console.log(`Page ${pageData.pageNum} canvas render complete.`);
                return pageData;
            } catch (error) {
                console.error(`Error rendering page ${pageData.pageNum} canvas at scale ${scale}:`, error);
                pageData.renderedScale = 0; // Mark as failed render at this scale
                return null; // Indicate render failure more clearly
            }
        }

        // Calculate the scale to fit a specific page within the viewer dimensions
        function calculateFitScale(pageNumToMeasure) {
            const containerWidth = $viewer.width();
            const containerHeight = $viewer.height();
            const pageIndex = pageNumToMeasure - 1;

            // IMPORTANT: This function NOW relies on loadPageDimensions having been called beforehand!
            if (!containerWidth || !containerHeight || totalPages === 0 || !pages[pageIndex] || !pages[pageIndex].baseWidth) {
                console.error(`Cannot calculate fit scale for page ${pageNumToMeasure}. Dimensions not loaded.`, { containerW: containerWidth, containerH: containerHeight, totalP: totalPages, pageDataExists: !!pages[pageIndex], hasWidth: !!pages[pageIndex]?.baseWidth });
                return 1.0; // Fallback scale if dimensions are unexpectedly missing
            }

            const refWidth = pages[pageIndex].baseWidth;
            const refHeight = pages[pageIndex].baseHeight;

            const scaleX = (containerWidth * 0.95) / refWidth; // Use 95% of container for padding
            const scaleY = (containerHeight * 0.95) / refHeight;
            const fitScale = Math.min(scaleX, scaleY);

            // Clamp the automatically calculated scale within reasonable limits
            return Math.max(0.1, Math.min(fitScale, 10.0)); // Adjust min/max zoom if needed
        }

        // --- View Logic (Single Page) ---
        // Renders the specified page number at the current targetScale
        async function renderView(targetPageNum) { 
            if (isRendering) {
                console.warn("Render already in progress, skipping request for page", targetPageNum);
                return;
            }
            isRendering = true;
            $loading.show();

            const pageNumToShow = Math.max(1, Math.min(targetPageNum, totalPages));
            console.log(`Rendering view for page ${pageNumToShow} at target scale ${targetScale.toFixed(3)}`);

            // Load and render the page at the current target scale
            const loadedPageData = await loadAndRenderPage(pageNumToShow, targetScale);

            // --- Error Handling --- 
            if (!loadedPageData || !loadedPageData.element) {
                console.error(`Failed to load/render page ${pageNumToShow} for display.`);
                $loading.text('Error al mostrar página.');
                isRendering = false;
                return;
            }

            // --- Update DOM --- 
            const $previousPage = $pagesContainer.children('.fp-page');

            // Simple fade transition
            if ($previousPage.length > 0 && $previousPage.data('page-num') !== pageNumToShow) {
                console.log(`Fading out page ${$previousPage.data('page-num')}`);
                $previousPage.removeClass('active').css('opacity', 0);
                await new Promise(resolve => setTimeout(resolve, 150)); 
                $previousPage.remove();
                console.log("Previous page removed");
            } else if ($previousPage.length > 0) {
                console.log(`Replacing page ${$previousPage.data('page-num')} after re-render`);
                 $previousPage.remove();
            }

            // Add the new page element
            console.log(`Adding page ${loadedPageData.pageNum} to DOM`);
            loadedPageData.element.addClass('active').css('opacity', 0);
            $pagesContainer.append(loadedPageData.element);
            
            void loadedPageData.element[0].offsetWidth; // Force reflow for transition
            
            loadedPageData.element.css('opacity', 1);
            console.log(`Page ${loadedPageData.pageNum} faded in`);

            // Update state AFTER rendering is complete
            currentPageNum = pageNumToShow;

            updatePageIndicator();
            updateNavigationArrows();
            preloadAdjacentPages(currentPageNum);

            $loading.hide();
            isRendering = false;
            console.log("Render view complete for page", currentPageNum);
        }

        function applyZoomToPage(pageElement) {
             // We use the canvas render scale + potentially a transform scale for smoother zoom
             // For now, let's rely on re-rendering via rerenderPageAtScale called in renderView
             // If we wanted transform-based zoom:
             // $(pageElement).css('transform', `scale(${currentScale})`);
             // This would need careful handling with transform-origin and positioning.
             // Re-rendering the canvas is generally better quality but slower.
        }

        // --- UI Updates ---
        function updatePageIndicator() {
            $pageInput.val(currentPageNum);
            $totalPagesSpan.text(totalPages);
        }

        function updateNavigationArrows() {
            $prevArrow.prop('disabled', currentPageNum <= 1);
            $nextArrow.prop('disabled', currentPageNum >= totalPages);
        }

        function updateAudio(firstVisiblePageNum) {
            if (audios && audios.length >= firstVisiblePageNum) {
                const audioUrl = audios[firstVisiblePageNum - 1]; // 0-based index
                if (audioUrl) {
                    if ($audioPlayer.attr('src') !== audioUrl) {
                        $audioPlayer.attr('src', audioUrl);
                         // Optional: auto-play? $audioPlayer[0].play();
                    }
                    $audioPlayer.addClass('visible');
                } else {
                    $audioPlayer.removeClass('visible').attr('src', '');
                    $audioPlayer[0].pause();
                }
            } else {
                 $audioPlayer.removeClass('visible').attr('src', '');
                 $audioPlayer[0].pause();
            }
        }

        function updateViewModeUI() {
             $container.attr('data-view-mode', viewMode);
             // Update button appearance if needed (e.g., toggle icon)
             $viewToggleBtn.text(viewMode === 'double' ? '📖' : '📄'); // Example icons
        }

        // --- Actions ---
        async function goToPage(pageNum) {
            const target = parseInt(pageNum, 10);
            if (isNaN(target) || target < 1 || target > totalPages || target === currentPageNum) {
                $pageInput.val(currentPageNum); 
                return;
            }
            // Ensure dimensions are loaded for the target page before calculating scale
            await loadPageDimensions(target);
            targetScale = calculateFitScale(target); // Reset to fit scale when changing pages
            console.log(`Go to page ${target}, setting target scale to fit: ${targetScale.toFixed(3)}`);
            await renderView(target);
        }

        async function nextPage() {
            if (currentPageNum < totalPages) {
                 const targetPage = currentPageNum + 1;
                 await loadPageDimensions(targetPage);
                 targetScale = calculateFitScale(targetPage); // Reset to fit scale
                 console.log(`Next page ${targetPage}, setting target scale to fit: ${targetScale.toFixed(3)}`);
                 await renderView(targetPage);
            }
        }

        async function prevPage() {
            if (currentPageNum > 1) {
                 const targetPage = currentPageNum - 1;
                 await loadPageDimensions(targetPage);
                 targetScale = calculateFitScale(targetPage); // Reset to fit scale
                 console.log(`Prev page ${targetPage}, setting target scale to fit: ${targetScale.toFixed(3)}`);
                 await renderView(targetPage);
            }
        }

        // Zooming sets the targetScale directly and re-renders
        function setZoom(newScale) {
             const pageIndex = currentPageNum - 1;
             let maxScale = 10.0; 
             if (pages[pageIndex] && pages[pageIndex].baseWidth) {
                 maxScale = 5.0; // Example fixed max zoom
             }
             
             targetScale = Math.max(0.1, Math.min(newScale, maxScale)); // Clamp the target scale
             console.log("Set zoom target scale:", targetScale.toFixed(3));
             
             // Re-render the current page at the new target scale
             renderView(currentPageNum); // Don't need animate=false, renderView default is false now
        }

        function zoomIn() {
            // Get the currently rendered scale (which might differ slightly from targetScale if mid-render)
            const currentRenderedScale = pages[currentPageNum-1]?.renderedScale || targetScale;
            setZoom(currentRenderedScale * 1.25); 
        }

        function zoomOut() {
             const currentRenderedScale = pages[currentPageNum-1]?.renderedScale || targetScale;
            setZoom(currentRenderedScale / 1.25);
        }

        function toggleViewMode() {
            viewMode = (viewMode === 'double') ? 'single' : 'double';
            updateViewModeUI();
            // Re-render the view with the current logical page number
            // Need to calculate the *first* page to show in the new mode
            let targetPageForRender = currentPageNum;
             if (viewMode === 'double' && currentPageNum % 2 !== 0 && currentPageNum > 1) {
                 // If switching to double and current is odd (not 1), show the spread it belongs to
                  targetPageForRender = currentPageNum - 1;
             } else if (viewMode === 'single' && currentPageNum % 2 === 0) {
                  // If switching to single from an even page (left side), keep showing that page
                  // targetPageForRender = currentPageNum; // Already correct
             } else if (viewMode === 'single' && currentPageNum % 2 !== 0 && currentPageNum > 1) {
                  // If switching to single from an odd page (right side), show that page
                   // targetPageForRender = currentPageNum; // Already correct
             }

            renderView(targetPageForRender, false); // Render new view mode without animation
        }

         function toggleFullscreen() {
             const element = $container[0];
             if (!document.fullscreenElement && !document.webkitFullscreenElement /* ... */) {
                 $container.addClass('fullscreen-active');
                 if (element.requestFullscreen) element.requestFullscreen();
                 else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
                 /* ... */
             } else {
                 if (document.exitFullscreen) document.exitFullscreen();
                 else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                 /* ... */
             }
         }

         // Basic Search - Finds first page with match
         async function executeSearch() {
             const query = $searchInput.val().trim().toLowerCase();
             if (!query || !pdfDoc) return;
             $loading.text(`Buscando "${query}"...`).show();
             let foundPage = 0;
             try {
                 for (let i = 1; i <= totalPages; i++) {
                     await loadPageDimensions(i); // Ensure page object is available
                     if (!pages[i - 1] || !pages[i - 1].pdfPage) continue; 
                     
                     const textContent = await pages[i - 1].pdfPage.getTextContent();
                     const pageText = textContent.items.map(item => item.str).join(' ').toLowerCase();
                     if (pageText.includes(query)) {
                         foundPage = i;
                         console.log(`Found "${query}" on page ${foundPage}`);
                         break; 
                     }
                 }
                 $loading.hide();
                 if (foundPage > 0) {
                     // Pass a dummy event if needed by toggleSearch
                     toggleSearch({ stopPropagation: () => {} }); 
                     await goToPage(foundPage); // Ensure navigation completes
                 } else {
                     alert(`Texto "${query}" no encontrado.`);
                 }
             } catch (error) {
                 console.error("Error during search:", error);
                 $loading.text('Error en búsqueda.').show().delay(2000).fadeOut();
             }
         }

        // --- Preloading ---
        function preloadAdjacentPages(centerPageNum) {
            // Preload pages at their FIT scale, not the current potentially zoomed scale
            const range = 2; 
            console.log(`Preloading around page ${centerPageNum}`);
            const promises = [];
            for (let i = 1; i <= range; i++) {
                const nextPage = centerPageNum + i;
                const prevPage = centerPageNum - i;
                if (nextPage <= totalPages) {
                    promises.push(loadPageDimensions(nextPage));
                }
                if (prevPage >= 1) {
                     promises.push(loadPageDimensions(prevPage));
                }
            }
            // Once dimensions are loaded, calculate their fit scale and render
            Promise.all(promises).then(() => {
                 for (let i = 1; i <= range; i++) {
                     const nextPage = centerPageNum + i;
                     const prevPage = centerPageNum - i;
                     if (nextPage <= totalPages && (!pages[nextPage - 1] || !pages[nextPage - 1].renderedScale)) {
                          const preloadScale = calculateFitScale(nextPage);
                          console.log(`-> Preloading page ${nextPage} at scale ${preloadScale.toFixed(3)}`);
                          loadAndRenderPage(nextPage, preloadScale).catch(e => console.warn(`Preload render failed: ${nextPage}`, e));
                     }
                     if (prevPage >= 1 && (!pages[prevPage - 1] || !pages[prevPage - 1].renderedScale)) {
                          const preloadScale = calculateFitScale(prevPage);
                          console.log(`-> Preloading page ${prevPage} at scale ${preloadScale.toFixed(3)}`);
                          loadAndRenderPage(prevPage, preloadScale).catch(e => console.warn(`Preload render failed: ${prevPage}`, e));
                     }
                 }
            });
        }

        // --- Event Listeners ---
        function setupEventListeners() {
            $prevArrow.off('click').on('click', prevPage);
            $nextArrow.off('click').on('click', nextPage);

            // Toolbar
            $pageInput.off('change keypress').on('change', () => goToPage($pageInput.val()))
                                           .on('keypress', function(e) {
                                                if (e.key === 'Enter') {
                                                     e.preventDefault();
                                                     goToPage($pageInput.val());
                                                     $(this).blur(); 
                                                }
                                           });
            $zoomOutBtn.off('click').on('click', zoomOut);
            $zoomInBtn.off('click').on('click', zoomIn);
            $searchToggleBtn.off('click').on('click', toggleSearch);
            $searchInput.off('keypress').on('keypress', function(e) {
                 if (e.key === 'Enter') {
                      e.preventDefault();
                      executeSearch();
                 }
            });
            $fullscreenBtn.off('click').on('click', toggleFullscreen);

            // Keyboard Shortcuts
            $(document).off('keydown.flipbook' + postId).on('keydown.flipbook' + postId, function(e) {
                if ($(e.target).is('input:not(.fp-page-input):not(.fp-search-input), textarea')) return; 
                if ($(e.target).is('.fp-page-input, .fp-search-input') && e.key !== 'Enter') return; 

                let handled = false;
                if (!$(e.target).is('input, textarea') || e.key !== 'Enter') { 
                    if (e.key === 'ArrowLeft' && !$prevArrow.prop('disabled')) { prevPage(); handled = true; }
                    else if (e.key === 'ArrowRight' && !$nextArrow.prop('disabled')) { nextPage(); handled = true; }
                    else if ((e.key === '-' || e.key === '_') && (e.ctrlKey || e.metaKey)) { zoomOut(); handled = true; }
                    else if ((e.key === '+' || e.key === '=') && (e.ctrlKey || e.metaKey)) { zoomIn(); handled = true; }
                    else if (e.key === 'f' || e.key === 'F') { 
                         if (!e.ctrlKey && !e.metaKey) {
                              toggleFullscreen(); handled = true; 
                         }
                    }
                    else if ((e.key === 'f' || e.key === 'F') && (e.ctrlKey || e.metaKey)) { 
                         toggleSearch(e); handled = true; 
                    }
                }

                if (handled) e.preventDefault();
            });

            // Fullscreen Change Event
            const handleFullscreenChange = () => {
                 const wasFullscreen = $container.hasClass('fullscreen-active');
                 isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement /* ... */);
                 if (wasFullscreen !== isFullscreen) {
                     console.log("Fullscreen state changed via event:", isFullscreen);
                     // Update class based on actual fullscreen state
                     if (isFullscreen) {
                          $container.addClass('fullscreen-active');
                     } else {
                          $container.removeClass('fullscreen-active');
                     }
                     
                     clearTimeout(renderTimeout);
                     renderTimeout = setTimeout(() => {
                           targetScale = calculateFitScale(currentPageNum);
                           console.log("Fullscreen change: Recalculated fit scale:", targetScale.toFixed(3));
                           renderView(currentPageNum);
                      }, 200); 
                 }
            };
            // Ensure listeners are properly namespaced and cleaned up
             $(document).off('.flipbookFs' + postId)
                        .on('fullscreenchange.flipbookFs' + postId + 
                            ' webkitfullscreenchange.flipbookFs' + postId + 
                            ' mozfullscreenchange.flipbookFs' + postId + 
                            ' MSFullscreenChange.flipbookFs' + postId, handleFullscreenChange);

            // Debounced Resize
            let resizeTimer;
            $(window).off('resize.flipbook' + postId).on('resize.flipbook' + postId, function() {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(async () => { // Make async
                    if ($container.is(':visible')) {
                        console.log("Window resized, adjusting view.");
                        // Ensure dimensions are loaded before calculating scale
                        await loadPageDimensions(currentPageNum); 
                        targetScale = calculateFitScale(currentPageNum);
                        console.log("Resize: Recalculated fit scale:", targetScale.toFixed(3));
                        await renderView(currentPageNum);
                    }
                }, 250);
            });
        }

        // --- Start ---
        initializeFlipbook();

    }); // End .each('.flipbook-container')
}); // End jQuery ready
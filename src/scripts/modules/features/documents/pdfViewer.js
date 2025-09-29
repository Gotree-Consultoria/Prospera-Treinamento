let pdfJsLoaderPromise = null;

function setWorkerSrc(pdfjsLib) {
  if (!pdfjsLib || !pdfjsLib.GlobalWorkerOptions) return;
  const workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  if (pdfjsLib.GlobalWorkerOptions.workerSrc !== workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  }
}

async function ensurePdfJs() {
  if (typeof window !== 'undefined' && window.pdfjsLib) {
    setWorkerSrc(window.pdfjsLib);
    return window.pdfjsLib;
  }
  if (!pdfJsLoaderPromise) {
    pdfJsLoaderPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.crossOrigin = 'anonymous';
      script.referrerPolicy = 'no-referrer';
      script.onload = () => {
        try {
          if (!window.pdfjsLib) {
            reject(new Error('PDF.js carregado, mas biblioteca não disponível.'));
            return;
          }
          setWorkerSrc(window.pdfjsLib);
          resolve(window.pdfjsLib);
        } catch (err) {
          reject(err);
        }
      };
      script.onerror = () => reject(new Error('Não foi possível carregar a biblioteca PDF.js.'));
      document.head.appendChild(script);
    });
  }
  return pdfJsLoaderPromise;
}

export async function renderPdfInto(url, container, { token, scale = 1.15, renderMode = 'continuous', initialPage = 1, onPageRendered } = {}) {
  if (!url || !container) return null;
  const pdfjsLib = await ensurePdfJs();
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  let loadingTask = null;
  const autoCleanup = renderMode !== 'single';
  try {
    loadingTask = pdfjsLib.getDocument({
      url,
      withCredentials: !!token,
      httpHeaders: headers
    });
    const pdf = await loadingTask.promise;
    container.innerHTML = '';
    container.classList.add('pdf-viewer');
    container.classList.remove('pdf-viewer-single', 'pdf-viewer-continuous');
    container.dataset.pdfPages = String(pdf.numPages || 0);

    if (renderMode === 'single') {
      container.classList.add('pdf-viewer-single');
      let currentPage = Math.max(1, Math.min(pdf.numPages || 1, Math.round(initialPage || 1)));
      let renderToken = 0;

      const renderPage = async (pageNum) => {
        const tokenId = ++renderToken;
        const target = Math.max(1, Math.min(pdf.numPages || 1, Math.round(pageNum || 1)));
        container.dataset.rendering = 'true';
        container.innerHTML = '<div class="pdf-loading inline">Renderizando página...</div>';
        try {
          const page = await pdf.getPage(target);
          if (tokenId !== renderToken) return;
          const viewport = page.getViewport({ scale });
          const wrapper = document.createElement('div');
          wrapper.className = 'pdf-page pdf-page-single';
          wrapper.setAttribute('data-page-number', String(target));
          const canvas = document.createElement('canvas');
          canvas.className = 'pdf-canvas';
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          wrapper.appendChild(canvas);
          container.innerHTML = '';
          container.appendChild(wrapper);
          await page.render({ canvasContext: context, viewport }).promise;
          if (tokenId === renderToken) {
            currentPage = target;
            container.dataset.pdfCurrentPage = String(target);
            container.scrollTop = 0;
            if (typeof onPageRendered === 'function') {
              try { onPageRendered({ pageNumber: target, totalPages: pdf.numPages }); } catch (_) { /* ignore */ }
            }
          }
        } finally {
          if (tokenId === renderToken) {
            container.dataset.rendering = 'false';
          }
        }
      };

      await renderPage(currentPage);

      const controller = {
        pageCount: pdf.numPages || 0,
        get currentPage() { return currentPage; },
        async goTo(pageNum) {
          const target = Math.max(1, Math.min(pdf.numPages || 1, Math.round(pageNum || 1)));
          if (target === currentPage) return currentPage;
          await renderPage(target);
          return currentPage;
        },
        async next() { return this.goTo(currentPage + 1); },
        async prev() { return this.goTo(currentPage - 1); },
        destroy() {
          if (loadingTask && typeof loadingTask.destroy === 'function') {
            try { loadingTask.destroy(); } catch (_) { /* noop */ }
          }
        }
      };

      return controller;
    }

    container.classList.add('pdf-viewer-continuous');
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'pdf-page';
      pageWrapper.setAttribute('data-page-number', String(pageNum));

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      pageWrapper.appendChild(canvas);
      container.appendChild(pageWrapper);

      await page.render({ canvasContext: context, viewport }).promise;
    }
    return { pageCount: pdf.numPages || 0, currentPage: 1 };
  } catch (err) {
    container.classList.remove('pdf-viewer');
    container.dataset.pdfPages = '0';
    container.innerHTML = '';
    throw err;
  } finally {
    if (autoCleanup && loadingTask && typeof loadingTask.destroy === 'function') {
      try { loadingTask.destroy(); } catch (_) { /* ignore */ }
    }
  }
}

export { ensurePdfJs };

// Mini Catálogo de E-books específico para a página de E-books
// Agora usando endpoints definidos (backend em 8080 via API_BASE_URL):
// 1) GET {API_BASE_URL}/public/catalog?type=EBOOK  -> lista (PublicTrainingDTO: id, title, author, coverImageUrl)
// 2) GET {API_BASE_URL}/public/catalog/{id}        -> detalhe (inclui description)

import { API_BASE_URL } from '../../shared/api.js';

const PUBLIC_CATALOG_LIST_URL = `${API_BASE_URL}/public/catalog?type=EBOOK`;
const PUBLIC_CATALOG_DETAIL_URL = (id) => `${API_BASE_URL}/public/catalog/${encodeURIComponent(id)}`;

let _ebooksCache = null;          // cache da lista (miniaturas)
let _loading = false;             // flag de carregamento da lista
const _ebookDetailsCache = {};    // cache individual de detalhes (id -> objeto)

// Marcadores de placeholder que o backend pode estar retornando quando não há capa real
const PLACEHOLDER_COVER_MARKERS = [
  'url/de/imagem/padrao.jpg',
  'url/da/imagem/padrao.jpg'
]; // agora comparação exata (não substring) para evitar falsos positivos

async function fetchPublicCatalogList() {
  if (_ebooksCache) return _ebooksCache;
  if (_loading) {
    return new Promise(resolve => {
      const iv = setInterval(() => { if (_ebooksCache) { clearInterval(iv); resolve(_ebooksCache); } }, 150);
    });
  }
  _loading = true;
  try {
    const resp = await fetch(PUBLIC_CATALOG_LIST_URL, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error('Falha ao carregar catálogo público de e-books');
    const data = await resp.json();
    if (!Array.isArray(data)) return [];
    // A lista já vem filtrada por EBOOK via query param; armazenar diretamente
    _ebooksCache = data;
    // Log de debug para inspecionar capas retornadas
    console.groupCollapsed('[ebooksMini] E-books carregados');
    _ebooksCache.forEach(it => {
      console.debug('ebook', it.id, {
        title: it.title,
        coverImageUrl: it.coverImageUrl,
        computedCover: coverUrl(it)
      });
    });
    console.groupEnd();
    return _ebooksCache;
  } finally {
    _loading = false;
  }
}

async function fetchEbookDetail(id) {
  if (_ebookDetailsCache[id]) return _ebookDetailsCache[id];
  try {
    const resp = await fetch(PUBLIC_CATALOG_DETAIL_URL(id), { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error('Falha ao carregar detalhe do e-book');
    const data = await resp.json();
    _ebookDetailsCache[id] = data;
    return data;
  } catch (e) {
    console.error('[ebooksMini] Erro ao buscar detalhe', e);
    throw e;
  }
}

function coverUrl(item) {
  const raw = item && item.coverImageUrl ? String(item.coverImageUrl).trim() : '';
  if (!raw) return null;
  const normalizedLower = raw.toLowerCase();
  // Placeholder somente se coincidência exata com algum marcador (considerando caminho sem domínio)
  const pathOnly = normalizedLower.replace(/^https?:\/\/[^/]+/,'');
  if (PLACEHOLDER_COVER_MARKERS.some(p => pathOnly.endsWith(p))) return null;
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:')) return raw;
  const normalized = raw.startsWith('/') ? raw : '/' + raw;
  return `${API_BASE_URL}${normalized}`;
}

function escapeHtml(str='') { return String(str).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c)); }
function shorten(t='', n=90) { return t.length>n ? t.slice(0,n-1)+'…' : t; }

function renderMiniCard(item) {
  const cu = coverUrl(item);
  const coverInner = cu ? `<img src="${escapeHtml(cu)}" alt="Capa do e-book ${escapeHtml(item.title||'')}" loading="lazy" onerror="this.style.display='none';this.closest('.ebook-mini-cover').classList.add('no-img');"/>` : '';
  return `<div class="ebook-mini-card" data-ebook-id="${item.id || item.trainingId}" data-cover="${escapeHtml(item.coverImageUrl||'')}" tabindex="0" role="button" aria-label="Abrir detalhes do e-book ${escapeHtml(item.title)}">
    <div class="ebook-mini-cover ${cu ? '' : 'no-img'}">${coverInner}</div>
    <div class="ebook-mini-meta">E-BOOK</div>
    <div class="ebook-mini-title">${escapeHtml(shorten(item.title||'Sem título', 70))}</div>
    <div class="ebook-mini-actions">
      <button class="ebook-mini-btn" data-action="openEbookDetail" data-ebook-id="${item.id || item.trainingId}">Detalhes</button>
    </div>
  </div>`;
}

function ensureListeners() {
  if (document._ebooksMiniBound) return; 
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="openEbookDetail"]');
    const card = btn || e.target.closest('.ebook-mini-card');
    if (!card) return;
    const id = card.getAttribute('data-ebook-id') || btn?.getAttribute('data-ebook-id');
    if (id) openDetail(id);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const card = e.target.closest('.ebook-mini-card');
      if (card) { e.preventDefault(); openDetail(card.getAttribute('data-ebook-id')); }
    }
    if (e.key === 'Escape') closeDetail();
  });
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="closeEbookDetail"]')) closeDetail();
    if (e.target.id === 'ebookDetailModal') closeDetail();
  });
  document._ebooksMiniBound = true;
}

async function openDetail(id) {
  const modal = document.getElementById('ebookDetailModal');
  const body = document.getElementById('ebookDetailBody');
  if (!modal || !body) return;
  modal.classList.remove('hidden');
  body.innerHTML = 'Carregando...';
  try {
    // Primeiro tentar os dados de lista (para mostrar algo rápido) enquanto busca detalhes
    let baseItem = null;
    try {
      const list = await fetchPublicCatalogList();
      baseItem = list.find(it => (it.id || it.trainingId) == id) || null;
    } catch (e) { /* ignorar erro da lista aqui */ }
    // Se já temos descrição (agora presente no DTO público) e (opcionalmente) capa, não precisamos de outra chamada
    if (baseItem && baseItem.description) {
      body.innerHTML = renderDetail(baseItem, { partial: false });
      return; // evitar chamada extra
    }
    if (baseItem) body.innerHTML = renderDetail(baseItem, { partial: true });
    const fullItem = await fetchEbookDetail(id); // fallback caso lista não tenha tudo
    body.innerHTML = renderDetail(fullItem, { partial: false });
  } catch (e) {
    body.innerHTML = '<p style="color:#b33">Falha ao carregar detalhes.</p>';
  }
}

function closeDetail() {
  const modal = document.getElementById('ebookDetailModal');
  if (modal) modal.classList.add('hidden');
}

function renderDetail(item, { partial } = { partial: false }) {
  const cu = coverUrl(item);
  const c = cu ? escapeHtml(cu) : null;
  const title = escapeHtml(item.title||'Sem título');
  // Se partial e ainda não temos description, mostrar placeholder
  const hasDescription = !!(item.description && item.description.trim());
  const desc = hasDescription ? escapeHtml(item.description) : (partial ? 'Carregando descrição...' : 'Descrição indisponível.');
  const author = escapeHtml(item.author||'');
  const coverBlock = c ? `<img src="${c}" alt="Capa do e-book ${title}" onerror="this.style.display='none';this.parentElement.classList.add('no-img');"/>` : '';
  return `<div class="ebook-detail-header">
    <div class="ebook-detail-cover ${c ? '' : 'no-img'}">${coverBlock}</div>
    <div class="ebook-detail-info">
      <h3 id="ebookDetailTitle">${title}</h3>
      ${author ? `<p><strong>Autor:</strong> ${author}</p>` : ''}
      <p class="ebook-detail-desc">${desc}</p>
    </div>
  </div>
  <div class="ebook-detail-footer">
    <button class="btn-primary" data-action="closeEbookDetail">Fechar</button>
  </div>`;
}

export async function initMiniEbooksCatalog() {
  ensureListeners();
  const grid = document.getElementById('ebooksMiniGrid');
  const empty = document.getElementById('ebooksMiniEmpty');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:1rem;">Carregando e-books...</div>';
  try {
    const ebooks = await fetchPublicCatalogList();
    if (!ebooks.length) {
      grid.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    grid.innerHTML = ebooks.map(renderMiniCard).join('');
  } catch (e) {
    grid.innerHTML = '<p style="color:#b33;grid-column:1/-1;">Falha ao carregar e-books.</p>';
  }
}

// Inicializar quando a página de e-books for carregada
if (typeof document !== 'undefined') {
  document.addEventListener('page:loaded', (e) => {
    if (e.detail.page === 'ebooks') {
      initMiniEbooksCatalog();
    }
  });
}

// Export para uso manual se necessário
export default { initMiniEbooksCatalog };
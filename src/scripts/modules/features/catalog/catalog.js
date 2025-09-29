// Módulo Catálogo Completo
// Consolida EBOOK, RECORDED_COURSE e LIVE_TRAINING em uma única listagem

import { navigateToTrainingDetail, getAuthToken } from '../admin/adminContent.js';
import { API_BASE_URL, getPublicCatalogSectors } from '../../shared/api.js';

// Fonte: reutilizar treinamentos carregados em adminContent (se expuser cache) + produtos mock (ebooks)
// Para simplificação inicial, vamos importar dinamicamente adminContent para acessar getAllTrainings se existir.

let catalogItems = [];
let isInitialized = false;
let _publicEbooksCache = null;
let _publicSectorsCache = null; // [{id,name}]
// Preset de filtros (definido antes de carregar a página) para permitir redirecionamentos
// Ex: window._catalogPreset = { format: 'EBOOK', sector: 'alimentacao' }
// Aplicado na primeira renderização após initCatalogPage

function applyPresetIfAny() {
  try {
    if (window && window._catalogPreset) {
      const { format, sector, search } = window._catalogPreset;
      if (format) {
        const fmtSel = document.getElementById('catalogFormatFilter');
        if (fmtSel) fmtSel.value = format;
      }
      if (sector !== undefined) {
        const secSel = document.getElementById('catalogSectorFilter');
        if (secSel) secSel.value = sector;
      }
      if (search) {
        const q = document.getElementById('catalogSearch');
        if (q) q.value = search;
      }
      // limpar para não reutilizar indevidamente
      delete window._catalogPreset;
    }
  } catch (e) { /* ignore */ }
}

function normalizeFormat(item) {
  if (!item) return '';
  const f = (item.format || item.type || item.trainingType || '').toUpperCase();
  if (f.includes('EBOOK')) return 'EBOOK';
  if (f.includes('RECORDED') || f.includes('GRAV') ) return 'RECORDED_COURSE';
  if (f.includes('LIVE') || f.includes('AO_VIVO') ) return 'LIVE_TRAINING';
  // fallback por campos específicos
  if (item.isLive) return 'LIVE_TRAINING';
  return 'EBOOK';
}

export async function initCatalogPage() {
  if (isInitialized) { renderCatalog(); return; }
  isInitialized = true;
  try {
    // Carregar setores públicos antes de montar eventos para construir UI dinâmica
    await ensureSectorsLoaded();
    // tentar obter treinamentos do adminContent
    let trainings = [];
    try {
  const mod = await import('../admin/adminContent.js');
      if (mod && mod._getCachedTrainings) {
        trainings = mod._getCachedTrainings();
      }
    } catch (e) { /* ignore */ }

    // map treinos
    const mappedTrainings = trainings.map(t => ({
      id: t.id,
      title: t.title || t.name,
      description: t.shortDescription || t.description || '',
      sectors: t.sectors || t.assignedSectors || [],
      format: normalizeFormat(t),
      type: 'TRAINING',
      raw: t
    }));

    // E-books mock podem estar em window.products (render.js) ou localStorage
    let legacyEbooks = [];
    try {
      if (window && window.products && Array.isArray(window.products)) {
        legacyEbooks = window.products.map(p => ({
          id: p.id || ('legacy-ebook-' + (p.title||'sem-titulo')), 
          title: p.title,
          description: p.description || '',
          sectors: p.sectors || ['global'],
          format: 'EBOOK',
          type: 'EBOOK',
          raw: p
        }));
      }
    } catch (e) { /* ignore */ }

    // Carregar e-books públicos reais da API (mesma fonte usada em ebooksMini.js)
    let publicEbooks = [];
    try {
      publicEbooks = await loadPublicEbooks();
    } catch (e) {
      console.warn('[catalog] Falha ao carregar e-books públicos', e);
    }

    // Mesclar e remover duplicados (prioriza dados públicos sobre legacy)
    const map = new Map();
    [...mappedTrainings, ...legacyEbooks, ...publicEbooks].forEach(it => {
      if (!it || !it.id) return;
      // chave composta para evitar conflito entre um treinamento e um ebook com mesmo id
      const key = `${it.format || 'UNKNOWN'}::${it.id}`;
      if (!map.has(key)) map.set(key, it); else {
        // Se já existe e o novo tem descrição maior, substitui (heurística simples)
        const prev = map.get(key);
        if ((it.description||'').length > (prev.description||'').length) map.set(key, it);
      }
    });
    catalogItems = Array.from(map.values());
    // Aplicar preset antes de renderizar
    applyPresetIfAny();
    renderCatalog();
    attachCatalogEvents();
  } catch (e) {
    console.warn('[catalog] falha ao inicializar', e);
  }
}

async function loadPublicEbooks() {
  if (_publicEbooksCache) return _publicEbooksCache;
  try {
    const resp = await fetch(`${API_BASE_URL}/public/catalog?type=EBOOK`, {
      headers: { 'Accept': 'application/json, text/plain, */*' }
    });
    if (!resp.ok) throw new Error('HTTP '+resp.status);
    const data = await safeParse(resp);
    const arr = Array.isArray(data) ? data : (Array.isArray(data.items)? data.items : (Array.isArray(data.data)? data.data : []));
    _publicEbooksCache = arr.map(eb => ({
      id: eb.id || eb.uuid || eb.code || ('ebook-'+Math.random().toString(36).slice(2)),
      title: eb.title || eb.name || 'E-book',
      description: eb.description || eb.shortDescription || '',
      sectors: (Array.isArray(eb.sectors) && eb.sectors.length) ? eb.sectors : (Array.isArray(eb.assignedSectors)? eb.assignedSectors : ['global']),
      format: 'EBOOK',
      type: 'EBOOK',
      coverImageUrl: eb.coverImageUrl,
      raw: eb
    }));
    return _publicEbooksCache;
  } catch (e) {
    console.warn('[catalog] erro ao buscar public ebooks', e);
    _publicEbooksCache = [];
    return [];
  }
}

async function safeParse(resp){
  try { return await resp.json(); } catch { return []; }
}

function attachCatalogEvents() {
  const search = document.getElementById('catalogSearch');
  const formatSel = document.getElementById('catalogFormatFilter');
  const sectorSel = document.getElementById('catalogSectorFilter');
  if (search) search.addEventListener('input', debounce(renderCatalog, 250));
  [formatSel, sectorSel].forEach(el => el && el.addEventListener('change', () => renderCatalog()));

  // Toggle de formatos (segmented buttons)
  const formatToggle = document.querySelector('#catalogPage .catalog-format-toggle');
  if (formatToggle && !formatToggle._bound) {
    formatToggle.addEventListener('click', (e)=>{
      const btn = e.target.closest('.format-btn');
      if (!btn) return;
      const value = btn.getAttribute('data-format') || '';
      const select = document.getElementById('catalogFormatFilter');
      if (select) select.value = value;
      formatToggle.querySelectorAll('.format-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderCatalog();
    });
    // Sincronizar estado inicial caso preset tenha definido select antes
    const currentVal = formatSel?.value || '';
    if (currentVal) {
      const activeBtn = formatToggle.querySelector(`.format-btn[data-format="${currentVal}"]`);
      if (activeBtn) {
        formatToggle.querySelectorAll('.format-btn').forEach(b=>b.classList.remove('active'));
        activeBtn.classList.add('active');
      }
    }
    formatToggle._bound = true;
  }

  // Botões rápidos de setor
  const quick = document.querySelector('#catalogPage .catalog-quick-filters');
  if (quick && !quick._bound) {
    quick.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn[data-sector]');
      if (!btn) return;
      const sector = btn.getAttribute('data-sector');
      const sectorSelect = document.getElementById('catalogSectorFilter');
      if (sectorSelect) sectorSelect.value = sector;
      quick.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked','false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-checked','true');
      renderCatalog();
    });
    quick._bound = true;
  }

  // Botão limpar setor
  const clearSector = document.querySelector('#catalogPage .sector-clear-btn');
  if (clearSector && !clearSector._bound) {
    clearSector.addEventListener('click', ()=>{
      const sectorSelect = document.getElementById('catalogSectorFilter');
      if (sectorSelect) sectorSelect.value = '';
      const quickGroup = document.querySelector('#catalogPage .catalog-quick-filters');
      if (quickGroup) {
        quickGroup.querySelectorAll('.filter-btn').forEach(b=>{ b.classList.remove('active'); b.setAttribute('aria-checked','false'); });
        const allBtn = quickGroup.querySelector('.filter-btn[data-sector=""]');
        if (allBtn) { allBtn.classList.add('active'); allBtn.setAttribute('aria-checked','true'); }
      }
      renderCatalog();
    });
    clearSector._bound = true;
  }
}

async function ensureSectorsLoaded() {
  if (_publicSectorsCache) return _publicSectorsCache;
  let sectors = [];
  try {
    sectors = await getPublicCatalogSectors();
  } catch (e) {
    console.warn('[catalog] erro ao obter setores públicos', e);
  }
  // Garantir pelo menos "global" e placeholder Todos
  const hasGlobal = sectors.some(s => s.id === 'global');
  if (!hasGlobal) sectors.push({ id: 'global', name: 'Global' });
  _publicSectorsCache = sectors;
  buildSectorUI(sectors);
  return sectors;
}

function buildSectorUI(sectors) {
  try {
    const quick = document.querySelector('#catalogPage .catalog-quick-filters');
    const select = document.getElementById('catalogSectorFilter');
    if (!quick || !select) return;
    // Preservar primeiro botão "Todos" e limpar demais
    quick.innerHTML = '';
    // Botão Todos
    quick.insertAdjacentHTML('beforeend', `<button class="filter-btn active" data-sector="" role="radio" aria-checked="true">Todos</button>`);
    // Inserir setores dinâmicos
    sectors.forEach(sec => {
      const safeId = escapeHtml(sec.id);
      const safeName = escapeHtml(sec.name);
      quick.insertAdjacentHTML('beforeend', `<button class="filter-btn" data-sector="${safeId}" role="radio" aria-checked="false">${safeName}</button>`);
    });
    // Recriar options do select (para acessibilidade / fallback)
    select.innerHTML = '<option value="">Setor: Todos</option>' + sectors.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('');
  } catch (e) {
    console.warn('[catalog] falha ao construir UI de setores', e);
  }
}

// Permite definir filtros programaticamente após a página estar carregada
export function setCatalogFilters({ format, sector, search }) {
  if (format) {
    const fmtSel = document.getElementById('catalogFormatFilter');
    if (fmtSel) fmtSel.value = format;
    // refletir no toggle
    const formatToggle = document.querySelector('#catalogPage .catalog-format-toggle');
    if (formatToggle) {
      formatToggle.querySelectorAll('.format-btn').forEach(b=>b.classList.remove('active'));
      const btn = formatToggle.querySelector(`.format-btn[data-format="${format}"]`) || formatToggle.querySelector('.format-btn[data-format=""]');
      if (btn) btn.classList.add('active');
    }
  }
  if (sector !== undefined) {
    const secSel = document.getElementById('catalogSectorFilter');
    if (secSel) secSel.value = sector;
    const quickGroup = document.querySelector('#catalogPage .catalog-quick-filters');
    if (quickGroup) {
      quickGroup.querySelectorAll('.filter-btn').forEach(b=>{ b.classList.remove('active'); b.setAttribute('aria-checked','false'); });
      const btn = quickGroup.querySelector(`.filter-btn[data-sector="${sector}"]`) || quickGroup.querySelector('.filter-btn[data-sector=""]');
      if (btn) { btn.classList.add('active'); btn.setAttribute('aria-checked','true'); }
    }
  }
  if (search) {
    const q = document.getElementById('catalogSearch');
    if (q) q.value = search;
  }
  renderCatalog();
}

function filterItems() {
  const q = (document.getElementById('catalogSearch')?.value || '').trim().toLowerCase();
  const fmt = document.getElementById('catalogFormatFilter')?.value || '';
  const sector = document.getElementById('catalogSectorFilter')?.value || '';
  return catalogItems.filter(it => {
    if (fmt && it.format !== fmt) return false;
    if (sector) {
      const secs = (it.sectors || []).map(s => (typeof s === 'string' ? s : (s.id || s.code || s.slug || '')));
      const matches = secs.some(s => s === sector || (sector === 'global' && (s === 'global' || secs.length === 0)));
      if (!matches) return false;
    }
    if (q) {
      const hay = (it.title + ' ' + it.description).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderCatalog() {
  const listEl = document.getElementById('catalogList');
  const emptyEl = document.getElementById('catalogEmpty');
  if (!listEl) return;
  const filtered = filterItems();
  if (filtered.length === 0) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');
  listEl.innerHTML = filtered.map(renderCard).join('');
}

function renderCard(item) {
  const badge = item.format === 'EBOOK' ? 'E-book' : item.format === 'RECORDED_COURSE' ? 'Curso Gravado' : 'Ao Vivo';
  const cover = item.coverImageUrl ? `<div class="catalog-card-cover"><img src="${escapeHtml(item.coverImageUrl)}" alt="Capa de ${escapeHtml(item.title)}" loading="lazy" onerror="this.parentElement.classList.add('no-cover');this.remove();" /></div>` : '';
  return `<div class="catalog-card" data-id="${item.id}" data-format="${item.format}">
    <div class="catalog-card-badge badge-${item.format.toLowerCase()}">${badge}</div>
    ${cover}
    <h3 class="catalog-card-title">${escapeHtml(item.title)}</h3>
    <p class="catalog-card-desc">${escapeHtml(shorten(item.description, 140))}</p>
    <div class="catalog-card-actions">
      <button class="btn btn-small" data-action="openCatalogItem" data-id="${item.id}">Ver Detalhes</button>
    </div>
  </div>`;
}

// Delegação (listener global já existe em eventListeners) – fallback aqui caso precise local
if (document) {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="openCatalogItem"]');
    if (!btn) return;
    e.preventDefault();
    const id = btn.dataset.id;
    navigateToTrainingDetail(id);
  });
}

// Captura clique em category-card para presetar setor no catálogo
if (document) {
  document.addEventListener('click', (e) => {
    const cat = e.target.closest('.category-card[data-page="catalog"][data-filter]');
    if (!cat) return;
    const sector = cat.getAttribute('data-filter');
    // Definir preset global antes de mostrar a página
    try { window._catalogPreset = { sector, format: '' }; } catch(_) {}
    // Forçar navegação via roteador existente
  import('../../shared/navigation.js').then(m => m.showPage('catalog'));
  });
}

function debounce(fn, wait) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); }; }
function escapeHtml(str='') { return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]||c)); }
function shorten(t='', n=120){ return t.length>n? t.slice(0,n-1)+'…':t; }

// Inicializar quando a página de catálogo for carregada
if (typeof document !== 'undefined') {
  document.addEventListener('page:loaded', (e) => {
    if (e.detail.page === 'catalog') {
      initCatalogPage();
    }
  });
}

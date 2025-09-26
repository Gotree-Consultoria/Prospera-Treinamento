import { products } from './render.js';
import { renderProducts } from './render.js';
import { showPage, currentPage } from './navigation.js';
import { renderTrainingsForSector } from './trainings.js';
import { getAdminTrainings } from './api.js';

// Cache para e-books globais e lista completa (todos os EBOOKS)
let _cachedGlobalEbooks = null;
let _globalEbooksLoading = false;
let _cachedAllEbooks = null;
let _allEbooksLoading = false;

async function fetchGlobalEbooksFromApi() {
    if (_cachedGlobalEbooks) return _cachedGlobalEbooks;
    if (_globalEbooksLoading) {
        return new Promise(resolve => {
            const iv = setInterval(()=> { if (_cachedGlobalEbooks) { clearInterval(iv); resolve(_cachedGlobalEbooks); } }, 200);
        });
    }
    _globalEbooksLoading = true;
    try {
        const token = localStorage.getItem('jwtToken');
        if (!token) throw new Error('É necessário estar autenticado para listar e-books globais.');
        const data = await getAdminTrainings(token);
        const list = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : (Array.isArray(data.data) ? data.data : []));
        const filtered = list.filter(t => (t.entityType === 'EBOOK') && !hasAnySector(t));
        _cachedGlobalEbooks = filtered;
        return filtered;
    } catch (e) {
        console.error('[ebooks] Erro ao carregar e-books globais', e);
        throw e;
    } finally {
        _globalEbooksLoading = false;
    }
}

async function fetchAllEbooksFromApi() {
    if (_cachedAllEbooks) return _cachedAllEbooks;
    if (_allEbooksLoading) {
        return new Promise(resolve => {
            const iv = setInterval(()=> { if (_cachedAllEbooks) { clearInterval(iv); resolve(_cachedAllEbooks); } }, 200);
        });
    }
    _allEbooksLoading = true;
    try {
        const token = localStorage.getItem('jwtToken');
        if (!token) throw new Error('Autenticação necessária.');
        const data = await getAdminTrainings(token);
        const list = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : (Array.isArray(data.data) ? data.data : []));
        const ebooks = list.filter(t => t && t.entityType === 'EBOOK');
        _cachedAllEbooks = ebooks;
        return ebooks;
    } catch (e) {
        console.error('[ebooks] Erro ao carregar todos os e-books', e);
        throw e;
    } finally {
        _allEbooksLoading = false;
    }
}

function hasAnySector(t) {
    if (!t || typeof t !== 'object') return false;
    const arr = Array.isArray(t.sectors) ? t.sectors : (Array.isArray(t.assignedSectors) ? t.assignedSectors : []);
    return Array.isArray(arr) && arr.length > 0;
}

function renderGlobalEbooks(list) {
    const trainingsContainer = document.getElementById('trainingsList');
    const grid = document.getElementById('ebooksGrid');
    const loadingEl = document.getElementById('ebooksLoading');
    if (!trainingsContainer) return;
    if (grid) grid.innerHTML = '';
    if (loadingEl) loadingEl.style.display = 'none';
    trainingsContainer.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'trainings-header';
    header.innerHTML = '<h3>E-books Globais</h3>';
    trainingsContainer.appendChild(header);
    if (!list || !list.length) {
        trainingsContainer.innerHTML += '<p>Nenhum e-book global disponível.</p>';
        return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'trainings-list-items';
    list.forEach(eb => {
        const card = document.createElement('div');
        card.className = 'training-card';
        const status = (eb.publicationStatus || eb.status || 'DRAFT');
        card.innerHTML = `
            <h4>${escapeHtml(eb.title || '')}</h4>
            <p class="training-desc">${escapeHtml(eb.description || '')}</p>
            <p class="training-meta">${escapeHtml(status)} ${eb.author ? '• ' + escapeHtml(eb.author) : ''}</p>
            <div class="training-actions">
                <button class="btn btn-secondary" data-id="${eb.id}" data-type="ebook" disabled>Em breve</button>
            </div>`;
        wrap.appendChild(card);
    });
    trainingsContainer.appendChild(wrap);
}

function renderAllEbooks(list) {
    const trainingsContainer = document.getElementById('trainingsList');
    const grid = document.getElementById('ebooksGrid');
    const loadingEl = document.getElementById('ebooksLoading');
    if (!trainingsContainer) return;
    if (grid) grid.innerHTML = '';
    if (loadingEl) loadingEl.style.display = 'none';
    trainingsContainer.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'trainings-header';
    header.innerHTML = '<h3>Todos os E-books</h3>';
    trainingsContainer.appendChild(header);
    if (!list || !list.length) {
        trainingsContainer.innerHTML += '<p>Nenhum e-book encontrado.</p>';
        return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'trainings-list-items';
    list.forEach(eb => {
        const card = document.createElement('div');
        card.className = 'training-card';
        const status = (eb.publicationStatus || eb.status || 'DRAFT');
        const sectors = getSectors(eb);
        const sectorLabel = sectors.length ? sectors.map(s => escapeHtml(s.name || s.title || s)).join(', ') : 'Global';
        card.innerHTML = `
            <h4>${escapeHtml(eb.title || '')}</h4>
            <p class="training-desc">${escapeHtml(eb.description || '')}</p>
            <p class="training-meta">${escapeHtml(status)} • <span class="sectors">${sectorLabel}</span>${eb.author ? ' • ' + escapeHtml(eb.author) : ''}</p>
            <div class="training-actions">
                <button class="btn btn-secondary" data-id="${eb.id}" data-type="ebook" disabled>Em breve</button>
            </div>`;
        wrap.appendChild(card);
    });
    trainingsContainer.appendChild(wrap);
}

function getSectors(t) {
    if (!t) return [];
    const arr = Array.isArray(t.sectors) ? t.sectors : (Array.isArray(t.assignedSectors) ? t.assignedSectors : []);
    return Array.isArray(arr) ? arr : [];
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
}

// Flag simples para evitar reentrância / loops ao filtrar
let _ebooksFiltering = false;

// LÓGICA DE SETOR MIGRADA PARA catalog.js
// Mantemos stub para compatibilidade temporária com eventListeners legados.
export function filterProductsByCategory(/* categoryName, opts */) {
        console.warn('[products] filterProductsByCategory depreciado. A filtragem por setor agora ocorre em Catálogo Completo.');
}

document.addEventListener('page:loaded', (e) => {
    if (e?.detail?.page === 'ebooks') {
        // Página legacy: manter funcional até remoção definitiva
        const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
        if (allBtn) allBtn.classList.add('active');
        filterProductsByCategory('all', { skipShow: true, forceLegacy: true });
    }
});

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    const filter = btn.dataset.filter;
    if (!document.getElementById('ebooksPage')) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterProductsByCategory(filter);
});

export function searchProducts(query) {
    const filteredProducts = products.filter((product) =>
        product.title.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
    );
    showPage("ebooks");
    renderProducts(filteredProducts);
}
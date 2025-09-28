import { getAdminTrainings, createAdminTraining, publishAdminTraining, assignTrainingToSector, getAdminSectors, getAdminTrainingById, updateAdminTraining, deleteAdminTraining, uploadEbookFileWithProgress, buildEbookFileUrl, getAdminSectorById, API_BASE_URL, unlinkTrainingSector, orgUnfollowSector, updateEbookProgress, fetchEbookProgress } from './api.js';
import { uploadTrainingCoverImage } from './api.js';
import { showToast } from './notifications.js';
import { showPage, currentPage } from './navigation.js';

const READER_PROGRESS_KEY_PREFIX = 'prospera:readerProgress:';

function isSystemAdmin() {
  const raw = localStorage.getItem('systemRole') || localStorage.getItem('userRole') || '';
  return /SYSTEM[_-]?ADMIN|ADMIN/i.test(raw);
}

// === Nova detecção de papel principal para customizar UI de E-book ===
function getPrimaryRole() {
  const token = getAuthToken();
  if (!token) return 'GUEST';
  const raw = (localStorage.getItem('systemRole') || localStorage.getItem('userRole') || '').toUpperCase();
  if (/SYSTEM[_-]?ADMIN/.test(raw)) return 'SYSTEM_ADMIN';
  if (/ORG[_-]?ADMIN/.test(raw)) return 'ORG_ADMIN';
  if (/ORG[_-]?MEMBER/.test(raw)) return 'ORG_MEMBER';
  // fallback: se houver algum token mas sem role claro tratamos como membro
  return 'ORG_MEMBER';
}

// === Helpers de autenticação / formatação ===
function getAuthToken() {
  return localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('jwtToken') || localStorage.getItem('accessToken') || '';
}

function formatDateTime(val) {
  if (!val) return '—';
  try { const d = new Date(val); if (!isNaN(d.getTime())) return d.toLocaleString(); } catch(_) {}
  return String(val);
}

  // =============================================================
  // Tratamento de imagem de capa quebrada / fallback
  // =============================================================
  function rebuildCandidateCoverUrl(id, rawUrl, { forceBust=false } = {}) {
    if (!rawUrl) return '';
    let url = rawUrl.trim();
    // Se já for absoluta http(s) usar direto
    if (!/^https?:\/\//i.test(url)) {
      // Pode ser apenas um filename (ex: 123.png) ou caminho armazenado.
      // Backend expõe cover presumivelmente em /admin/trainings/{id}/cover-image (GET?) ou um caminho estático devolvido.
      // Se nome do arquivo parece GUID + extensão, tentar /admin/trainings/{id}/cover-image?file=...
      const hasExt = /\.(png|jpe?g|webp|gif)$/i.test(url);
      if (!hasExt) {
        // força png por tentativa? Melhor não. Apenas usa endpoint genérico se existir.
        // Mantemos como veio e prefixamos base.
      }
      // Caso comum: apenas prefixar base
      url = API_BASE_URL.replace(/\/$/, '') + '/' + url.replace(/^\//,'');
    }
    if (forceBust) {
      const sep = url.includes('?') ? '&' : '?';
      url += sep + 'v=' + Date.now();
    }
    return url;
  }

  function enhanceCoverImage(training) {
    try {
      const box = document.querySelector('.td-box-cover');
      if (!box) return;
      const img = box.querySelector('.td-cover-preview img');
      if (!img) return;
      const original = img.getAttribute('src');
      img.addEventListener('error', () => {
        // Evitar loop infinito
        if (img.dataset._errored) return;
        img.dataset._errored = '1';
        console.warn('[cover] imagem quebrou, tentando fallback', original);
        // Tentar recuperar programaticamente (fetch com Authorization) a partir de candidatos
        attemptProgrammaticCoverFetch(training.id, original, box)
          .then(ok => {
            if (!ok) {
              // Último fallback: reconstrução simples e/ou placeholder
              const preview = box.querySelector('.td-cover-preview');
              preview.innerHTML = `<div class="td-cover-broken" data-original-url="${escapeAttr(original)}" style="width:110px; height:140px; border:1px dashed #c89; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; font-size:.55rem; color:#a33; text-align:center; padding:6px;">Imagem indisponível<br/><button type="button" class="btn-small" data-action="retryCoverImg" data-original-url="${escapeAttr(original)}" style="margin-top:4px; font-size:.55rem; padding:4px 6px;">Tentar novamente</button></div>`;
            }
          });
      }, { once:true });
    } catch(err) { console.warn('enhanceCoverImage erro', err); }
  }

  async function attemptProgrammaticCoverFetch(trainingId, originalSrc, boxEl) {
    try {
      const token = getAuthToken();
      const candidates = buildCoverCandidates(trainingId, originalSrc);
      console.debug('[coverCandidate] lista', candidates);
      const preview = boxEl.querySelector('.td-cover-preview');
      if (preview) {
        preview.innerHTML = `<div class="td-cover-skeleton" aria-label="Tentando carregar capa" role="img"></div>`;
      }
      for (const url of candidates) {
        try {
          const res = await fetch(url, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
          const ct = res.headers.get('content-type') || '';
          if (res.ok && /image\//i.test(ct)) {
            const blob = await res.blob();
            const objUrl = URL.createObjectURL(blob);
            if (preview) preview.innerHTML = `<img src="${escapeAttr(objUrl)}" alt="Capa" data-original-url="${escapeAttr(url)}" />`;
            console.debug('[coverFetch] sucesso em', url);
            return true;
          } else {
            console.debug('[coverFetch] falhou', url, res.status, ct);
          }
        } catch(fetchErr) {
          console.debug('[coverFetch] erro candidato', url, fetchErr);
        }
      }
    } catch(err) { console.warn('[coverFetch] erro geral', err); }
    return false;
  }

  function buildCoverCandidates(trainingId, original) {
    const list = new Set();
    if (original) {
      // adicionar original como veio
      list.add(original);
      // se relativo
      if (!/^https?:\/\//i.test(original)) {
        list.add(rebuildCandidateCoverUrl(trainingId, original, { forceBust:true }));
      } else {
        // forçar cache-buster
        const sep = original.includes('?') ? '&' : '?';
        list.add(original + sep + 'v=' + Date.now());
      }
    }
    // Endpoints canônicos possíveis
    if (trainingId) {
      const base = API_BASE_URL.replace(/\/$/,'');
      list.add(`${base}/admin/trainings/${encodeURIComponent(trainingId)}/cover-image`);
      list.add(`${base}/admin/trainings/${encodeURIComponent(trainingId)}/cover-image?v=${Date.now()}`);
    }
    // Possível pasta estática /covers/
    if (original && /[A-Za-z0-9_-]+\.(png|jpe?g|webp)$/i.test(original)) {
      const fname = original.split('/').pop();
      const base = API_BASE_URL.replace(/\/$/,'');
      list.add(`${base}/covers/${fname}`);
      list.add(`${base}/uploads/${fname}`);
    }
    return [...list];
  }

let cachedSectors = [];
window.uploadedEbooks = window.uploadedEbooks || {}; // legado (usado apenas para armazenar nome após upload, não define status)
window._allTrainings = window._allTrainings || [];
const FILTER_STATE = { text:'', type:'', status:'' };
// Pré-visualizações locais de capa (antes do backend confirmar). Cada entrada: { file, url }
window._pendingCoverPreviews = window._pendingCoverPreviews || {};

// === Detecção robusta de presença de PDF para E-book ===
function trainingHasPdf(t) {
  if (!t) return false;
  const booleanFlags = ['hasPdf','pdfUploaded','ebookFileUploaded','fileUploaded'];
  if (booleanFlags.some(k => !!t[k])) return true;
  const pathKeys = ['filePath','filepath','file','pdfPath','pdfFilePath','pdfFile','ebookFile','ebookFilePath','ebookPath','ebookPdfPath','ebookFileUrl','fileUrl','pdfUrl','pdf','ebookUrl'];
  for (const k of pathKeys) {
    const v = t[k];
    if (typeof v === 'string' && /\.pdf($|\?)/i.test(v)) return true;
  }
  function scan(obj, depth=0) {
    if (!obj || depth > 1) return false;
    for (const v of Object.values(obj)) {
      if (typeof v === 'string' && /\.pdf($|\?)/i.test(v)) return true;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (scan(v, depth+1)) return true;
      }
    }
    return false;
  }
  return scan(t);
}

function extractPdfFileName(t) {
  if (!t) return '';
  if (window.uploadedEbooks && window.uploadedEbooks[t.id] && window.uploadedEbooks[t.id].fileName) return window.uploadedEbooks[t.id].fileName;
  const pathKeys = ['filePath','filepath','file','pdfPath','pdfFilePath','pdfFile','ebookFile','ebookFilePath','ebookPath','ebookPdfPath','ebookFileUrl','fileUrl','pdfUrl','pdf','ebookUrl'];
  for (const k of pathKeys) {
    const v = t[k];
    if (typeof v === 'string' && /\.pdf($|\?)/i.test(v)) {
      try { return decodeURIComponent(v.split('/').pop().split('?')[0]); } catch(_) { return v.split('/').pop(); }
    }
  }
  return '';
}

function extractPdfUpdatedDate(t) {
  if (!t || typeof t !== 'object') return null;
  const dateKeys = [
    'pdfUpdatedAt','fileUpdatedAt','ebookUpdatedAt','ebookFileUpdatedAt','updatedAt','lastUpdatedAt','modifiedAt','fileModifiedAt'
  ];
  for (const k of dateKeys) {
    const v = t[k];
    if (v && (typeof v === 'string' || typeof v === 'number')) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

// === Utilidade: debounce simples ===
function debounce(fn, delay=350) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(()=> fn(...args), delay); };
}

// === Filtros aplicados localmente ===
function applyFilters(list) {
  return list.filter(item => {
    if (FILTER_STATE.text) {
      const txt = (item.title||'').toLowerCase();
      if (!txt.includes(FILTER_STATE.text.toLowerCase())) return false;
    }
    if (FILTER_STATE.type) {
      if ((item.entityType||'').toUpperCase() !== FILTER_STATE.type.toUpperCase()) return false;
    }
    if (FILTER_STATE.status) {
      const st = (item.publicationStatus || item.status || '').toUpperCase();
      if (st !== FILTER_STATE.status.toUpperCase()) return false;
    }
    return true;
  });
}

// === Modal de confirmação custom (Promise) ===
function showConfirmModal({ title='Confirmar', message='Tem certeza?', confirmLabel='OK', cancelLabel='Cancelar', confirmType='primary' }={}) {
  return new Promise(resolve => {
    // evitar múltiplos
    if (document.querySelector('.confirm-modal-overlay')) {
      resolve(false); return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal-overlay';
    overlay.innerHTML = `
      <div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle">
        <h4 id="confirmModalTitle">${escapeHtml(title)}</h4>
        <p class="confirm-message">${escapeHtml(message)}</p>
        <div class="confirm-actions">
          <button type="button" class="btn-small btn-cancel" data-action="cancelConfirm">${escapeHtml(cancelLabel)}</button>
          <button type="button" class="btn-small ${confirmType==='danger'?'btn-small-remove':(confirmType==='primary'?'btn-small-change':'')}" data-action="okConfirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    function cleanup(res) { overlay.remove(); resolve(res); }
    overlay.addEventListener('click', (e)=> { if (e.target === overlay) cleanup(false); });
    overlay.querySelector('[data-action="cancelConfirm"]').addEventListener('click', ()=> cleanup(false));
    overlay.querySelector('[data-action="okConfirm"]').addEventListener('click', ()=> cleanup(true));
    injectConfirmModalStyles();
  });
}

function injectConfirmModalStyles() {
  if (document.getElementById('confirmModalStyles')) return;
  const st = document.createElement('style');
  st.id='confirmModalStyles';
  st.textContent = `
    .confirm-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:10000; }
    .confirm-modal { background:#fff; width:min(92vw,400px); padding:18px 20px 22px; border-radius:10px; box-shadow:0 12px 32px rgba(0,0,0,0.28); animation:contentModalIn .25s ease; }
    .confirm-modal h4 { margin:0 0 6px; font-size:1rem; }
    .confirm-modal .confirm-message { font-size:0.8rem; line-height:1.25rem; margin:0 0 14px; }
    .confirm-modal .confirm-actions { display:flex; gap:8px; justify-content:flex-end; }
    .confirm-modal button { cursor:pointer; }
  `;
  document.head.appendChild(st);
}

// === Upload de E-book (PDF) ===
function openEbookUploadModal(trainingId, meta={}) {
  closeAdminContentModal();
  const title = meta.title || '';
  const overlay = document.createElement('div');
  overlay.className='content-modal-overlay';
  overlay.innerHTML = `
    <div class="content-modal" role="dialog" aria-modal="true" aria-labelledby="ebookUploadTitle">
      <h3 id="ebookUploadTitle">Upload de PDF</h3>
      <form id="ebookUploadForm" class="content-form" enctype="multipart/form-data">
        <p style="margin:0 0 8px; font-size:.8rem; line-height:1.1rem;">Treinamento: <strong>${escapeHtml(title)}</strong></p>
        <p style="margin:0 0 14px; font-size:.7rem; color:#555;">Os dados básicos já foram salvos. Envie o PDF agora ou feche para enviar depois.</p>
        <label>Arquivo PDF<span>*</span></label>
        <input type="file" name="file" accept="application/pdf" required />
        <div class="progress-row" style="display:none; flex-direction:column; gap:4px;">
          <div style="height:6px; background:#eee; border-radius:4px; overflow:hidden;">
            <div class="bar" style="height:100%; width:0; background:var(--verde-claro);"></div>
          </div>
          <small class="pct" style="font-size:.65rem;">0%</small>
        </div>
        <div class="form-messages" id="ebookUploadMessages" aria-live="polite"></div>
        <div class="content-modal-actions">
          <button type="button" class="btn-small btn-small-remove" data-action="cancelUpload">Fechar</button>
          <button type="submit" class="btn-small btn-small-change" id="ebookUploadSubmit">Enviar PDF</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=> { if (e.target === overlay) closeAdminContentModal(); });
  const form = overlay.querySelector('#ebookUploadForm');
  const bar = form.querySelector('.bar');
  const pct = form.querySelector('.pct');
  const progressRow = form.querySelector('.progress-row');
  const messages = form.querySelector('#ebookUploadMessages');
  form.querySelector('[data-action="cancelUpload"]').addEventListener('click', (ev)=> { ev.preventDefault(); closeAdminContentModal(); });
  form.addEventListener('submit', async (ev)=> {
    ev.preventDefault(); messages.textContent='';
    const f = form.file.files[0];
    if (!f) { messages.textContent='Selecione um PDF.'; return; }
    if (f.type !== 'application/pdf') { messages.textContent='Apenas PDF é permitido.'; return; }
    progressRow.style.display='flex';
    form.querySelector('#ebookUploadSubmit').disabled = true;
    try {
      const token = localStorage.getItem('jwtToken');
      await uploadEbookFileWithProgress(token, trainingId, f, (perc)=> { bar.style.width = perc + '%'; pct.textContent = perc + '%'; });
      window.uploadedEbooks[trainingId] = { fileName: f.name };
      showToast('PDF enviado.');
      closeAdminContentModal();
      loadTrainings();
    } catch (err) {
      console.error('Falha upload ebook', err);
      messages.textContent = err.message || 'Erro no upload.';
      form.querySelector('#ebookUploadSubmit').disabled = false;
    }
  });
}

// === Visualizador simples (iframe) ===
function openEbookViewer(trainingId) {
  closeAdminContentModal();
  const token = localStorage.getItem('jwtToken');
  const url = buildEbookFileUrl ? buildEbookFileUrl(trainingId, token) : '';
  const overlay = document.createElement('div');
  overlay.className='content-modal-overlay';
  overlay.innerHTML = `
    <div class="content-modal large" role="dialog" aria-modal="true" aria-labelledby="ebookViewerTitle">
      <h3 id="ebookViewerTitle">Visualizar E-book</h3>
      <div class="ebook-viewer-frame-wrapper">
        ${url ? `<iframe src="${escapeAttr(url)}" title="E-book" style="width:100%; height:100%; border:0;" referrerpolicy="no-referrer"></iframe>` : '<p style="padding:12px;">URL do PDF indisponível.</p>'}
      </div>
      <div class="content-modal-actions ebook-viewer-actions">
        <button type="button" class="btn-small btn-small-remove" data-action="closeViewer">Fechar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click',(e)=> { if (e.target === overlay) closeAdminContentModal(); });
  // estilos de modal já carregados via CSS estático (_adminModals.css)
  overlay.querySelector('[data-action="closeViewer"]').addEventListener('click', (e)=> { e.preventDefault(); closeAdminContentModal(); });
}

async function loadTrainings() {
  const container = document.getElementById('adminContentContainer');
  const msg = document.getElementById('adminContentMessages');
  if (!container) return;
  container.innerHTML = '<p>Carregando treinamentos...</p>';
  if (msg) msg.textContent = '';
  if (!isSystemAdmin()) { container.innerHTML = '<p>Acesso negado.</p>'; return; }
  try {
    const token = localStorage.getItem('jwtToken');
    const data = await getAdminTrainings(token);
    const list = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : (Array.isArray(data.data) ? data.data : []));
    window._allTrainings = list;
    renderTrainings(applyFilters(list));
  } catch (e) {
    console.error('Erro ao listar treinamentos', e);
    container.innerHTML = '<p>Erro ao carregar treinamentos.</p>';
    if (msg) msg.textContent = e.message || 'Erro.';
  }
}

function renderTrainings(list) {
  const container = document.getElementById('adminContentContainer');
  if (!container) return;
  // Cleanup de menus órfãos de sessões anteriores (portais antigos)
  try {
    document.querySelectorAll('.action-menu.portal').forEach(m => m.remove());
    document.querySelectorAll('.row-menu-backdrop').forEach(b => b.remove());
    window._currentRowMenu = null; window._currentRowMenuToggle = null;
  } catch(_) {}
  const rows = list.map(t => {
  let status = t.publicationStatus || t.status || 'DRAFT';
  const rawStatusUpper = (status||'').toUpperCase();
  const statusLabel = rawStatusUpper === 'DRAFT' ? 'Rascunho' : (rawStatusUpper === 'PUBLISHED' ? 'Publicado' : (rawStatusUpper === 'ARCHIVED' ? 'Arquivado' : status));
    const published = (status || '').toUpperCase() === 'PUBLISHED';
    const isEbook = t.entityType === 'EBOOK';
  const hasPdf = trainingHasPdf(t);
  const pdfSvg = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/><path d="M4.5 3.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/></svg>';
  const ebookIcon = isEbook ? (hasPdf ? `<span class="ebook-ic" title="Arquivo enviado" aria-label="Arquivo enviado">${pdfSvg}</span>` : `<span class="ebook-ic-missing" title="Arquivo não enviado" aria-label="Arquivo não enviado">${pdfSvg}</span>`) : '';
    // Itens do menu suspenso (somente os solicitados)
  // Ícones SVG inline (aria-hidden para não poluir leitura de tela; texto já está no label)
  const iconPublish = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/></svg>`;
  const iconAssign = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/><path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/></svg>`;
  const iconView = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.12 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/></svg>`;
  const iconUpload = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z"/></svg>`;
    const menuItems = [
      `<button class=\"dropdown-item\" role=\"menuitem\" tabindex=\"-1\" data-action=\"viewTraining\" data-id=\"${t.id}\"><span class=\"ic\">${iconView}</span>Ver detalhes</button>`,
      `<button class=\"dropdown-item\" role=\"menuitem\" tabindex=\"-1\" data-action=\"publishTraining\" data-id=\"${t.id}\" ${published ? 'disabled' : ''}><span class=\"ic\">${iconPublish}</span>${published ? 'Publicado' : 'Publicar'}</button>`,
      `<button class=\"dropdown-item\" role=\"menuitem\" tabindex=\"-1\" data-action=\"assignSector\" data-id=\"${t.id}\"><span class=\"ic\">${iconAssign}</span>Vincular Setor</button>`
    ];
    if (isEbook) {
      menuItems.push(`<button class=\"dropdown-item\" role=\"menuitem\" tabindex=\"-1\" data-action=\"uploadEbook\" data-id=\"${t.id}\" data-title=\"${escapeAttr(t.title || '')}\"><span class=\"ic\">${iconUpload}</span>${hasPdf ? 'Substituir PDF' : 'Enviar PDF'}</button>`);
    }
    return `<tr data-training-id="${t.id}">
      <td>${t.id || ''}</td>
      <td>${escapeHtml(t.title || '')} ${ebookIcon}</td>
      <td>${escapeHtml(t.entityType || '')}</td>
  <td>${escapeHtml(statusLabel)}</td>
      <td>${escapeHtml(t.author || '')}</td>
      <td>
        <div class=\"row-actions\">
          <button class=\"action-menu-toggle\" data-action=\"toggleRowMenu\" aria-haspopup=\"true\" aria-expanded=\"false\" title=\"Ações\">⋮</button>
          <div class=\"action-menu\" role=\"menu\">${menuItems.join('')}</div>
          <button class=\"icon-btn trash-btn\" data-action=\"deleteTraining\" data-id=\"${t.id}\" title=\"Excluir\" aria-label=\"Excluir\">
            <svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" viewBox=\"0 0 16 16\"><path d=\"M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z\"/><path fill-rule=\"evenodd\" d=\"M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z\"/></svg>
          </button>
        </div>
      </td>
    </tr>`;}).join('');
  container.innerHTML = `
    <div class="inline-actions" style="justify-content:space-between; flex-wrap:wrap; gap:8px; align-items:flex-start;">
      <div class="admin-content-actions">
        <button class="crud-btn" data-action="newTraining" title="Criar novo treinamento">Novo Treinamento</button>
        <button class="crud-btn is-secondary" data-action="reloadTrainings" title="Recarregar lista">Recarregar</button>
      </div>
      <div class="admin-content-filters">
        <div class="acf-group">
          <label for="acf-search">Busca</label>
          <div class="acf-control"><input id="acf-search" type="text" data-filter="text" placeholder="Título..." value="${escapeAttr(FILTER_STATE.text)}" /></div>
        </div>
        <div class="acf-group">
          <label for="acf-type">Tipo</label>
          <div class="acf-control">
            <select id="acf-type" data-filter="type">
              <option value="">Todos</option>
              <option value="RECORDED_COURSE" ${FILTER_STATE.type==='RECORDED_COURSE'?'selected':''}>Gravado</option>
              <option value="LIVE_TRAINING" ${FILTER_STATE.type==='LIVE_TRAINING'?'selected':''}>Ao Vivo</option>
              <option value="EBOOK" ${FILTER_STATE.type==='EBOOK'?'selected':''}>E-book</option>
            </select>
          </div>
        </div>
        <div class="acf-group">
          <label for="acf-status">Status</label>
          <div class="acf-control">
            <select id="acf-status" data-filter="status">
              <option value="">Todos</option>
              <option value="DRAFT" ${FILTER_STATE.status==='DRAFT'?'selected':''}>Rascunho</option>
              <option value="PUBLISHED" ${FILTER_STATE.status==='PUBLISHED'?'selected':''}>Publicado</option>
              <option value="ARCHIVED" ${FILTER_STATE.status==='ARCHIVED'?'selected':''}>Arquivado</option>
            </select>
          </div>
        </div>
        <div class="acf-meta"><span class="acf-count" aria-label="Quantidade de itens listados">${list.length} itens</span></div>
      </div>
    </div>
    <div class="table-responsive small-table">
      <table class="table" id="adminTrainingsTable">
        <thead><tr><th>ID</th><th>Título</th><th>Tipo</th><th>Status</th><th>Autor</th><th>Ações</th></tr></thead>
        <tbody>${rows || ''}</tbody>
      </table>
    </div>`;
  // Reforçar que os handlers estejam anexados mesmo se o evento page:loaded ocorreu antes do partial existir
  try { attachHandlers(); } catch(e) { console.warn('[adminContent] Falha ao reanexar handlers pós-render', e); }
  // Fallback direto se delegação falhar
  try {
    const btn = container.querySelector('[data-action="newTraining"]');
    if (btn && !btn.dataset._directBound) {
      btn.addEventListener('click', (ev) => { ev.preventDefault(); console.debug('[adminContent] Direct listener disparado (fallback)'); openCreateTrainingModal(); });
      btn.dataset._directBound = '1';
    }
  } catch(err) { console.warn('[adminContent] erro ao bindar fallback newTraining', err); }

  // Fallback direto para cada botão Ver detalhes
  try {
    const viewBtns = container.querySelectorAll('[data-action="viewTraining"]');
    viewBtns.forEach(b => {
      if (!b.dataset._directBound) {
        b.addEventListener('click', (ev) => {
          ev.preventDefault();
            console.debug('[adminContent] Direct listener viewTraining fallback id=', b.dataset.id);
            navigateToTrainingDetail(b.dataset.id);
        });
        b.dataset._directBound = '1';
      }
    });
  } catch(err) { console.warn('[adminContent] erro ao bindar fallback viewTraining', err); }

  // Bind de filtros (delegado aqui para recriar a cada render)
  try {
    const textInput = container.querySelector('input[data-filter="text"]');
    const typeSelect = container.querySelector('select[data-filter="type"]');
    const statusSelect = container.querySelector('select[data-filter="status"]');
    if (textInput && !textInput._bound) {
      textInput.addEventListener('click', (e)=> e.stopPropagation());
      textInput.addEventListener('input', debounce((e)=> { e.stopPropagation(); FILTER_STATE.text = e.target.value; renderTrainings(applyFilters(window._allTrainings)); }, 300));
      textInput._bound = true;
    }
    const onSel = () => { renderTrainings(applyFilters(window._allTrainings)); };
    if (typeSelect && !typeSelect._bound) {
      typeSelect.addEventListener('click', (e)=> e.stopPropagation());
      typeSelect.addEventListener('change', (e)=> { e.stopPropagation(); FILTER_STATE.type = e.target.value; onSel(); });
      typeSelect._bound = true;
    }
    if (statusSelect && !statusSelect._bound) {
      statusSelect.addEventListener('click', (e)=> e.stopPropagation());
      statusSelect.addEventListener('change', (e)=> { e.stopPropagation(); FILTER_STATE.status = e.target.value; onSel(); });
      statusSelect._bound = true;
    }
  } catch (err) { console.warn('[adminContent] Falha ao bindar filtros', err); }

  injectRowActionMenuStyles();
  scheduleEbookPdfEnrichment();
}

function injectRowActionMenuStyles() {
  if (document.getElementById('rowActionMenuStyles')) return;
  const st = document.createElement('style');
  st.id = 'rowActionMenuStyles';
  st.textContent = `
    .row-actions { position:relative; display:flex; align-items:center; gap:6px; }
    .action-menu-toggle { background:#f4f4f4; border:1px solid #ccc; border-radius:6px; padding:2px 8px 4px; cursor:pointer; font-size:16px; line-height:1; }
    .action-menu-toggle:focus { outline:2px solid var(--verde-claro); outline-offset:1px; }
    .icon-btn.trash-btn { background:#fff; border:1px solid #e07a7a; color:#c0392b; border-radius:6px; padding:4px 8px; cursor:pointer; font-size:14px; }
    .icon-btn.trash-btn:hover { background:#ffecec; }
    .ebook-ic svg { color: var(--verde-escuro, #2e7d32); filter: drop-shadow(0 0 1px rgba(0,0,0,0.15)); }
    .ebook-ic-missing svg { color:#b35c1e; opacity:.75; }
    /* A versão portal (quando destacada para o body) usa .action-menu.portal */
  .action-menu { background:#fff; border:1px solid #d7d7d7; border-radius:8px; padding:4px 0; display:none; width:150px; max-width:150px; box-shadow:0 8px 22px -6px rgba(0,0,0,0.30); z-index:5000; box-sizing:border-box; }
    .action-menu.open { display:block; animation:fadeIn .12s ease; }
    .action-menu.portal { /* legado: não mais usada */ }
    .row-menu-backdrop { position:fixed; inset:0; background:transparent; z-index:4995; }
  .action-menu .dropdown-item { width:100%; background:none; border:0; text-align:left; padding:6px 8px; font-size:.7rem; font-weight:500; cursor:pointer; font-family:inherit; line-height:1.1rem; display:flex; gap:6px; align-items:center; }
  .action-menu .dropdown-item .ic { width:16px; text-align:center; flex:0 0 16px; font-size:.75rem; opacity:.85; }
    .action-menu .dropdown-item:hover { background:#f3f8f4; }
    .action-menu .dropdown-item:disabled { opacity:.5; cursor:not-allowed; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(-3px);} to { opacity:1; transform:translateY(0);} }
  `;
  document.head.appendChild(st);
}

// === Listener global resiliente para menus (caso delegação original não esteja ativa) ===
if (!window._rowMenuGlobalBound) {
  window._rowMenuGlobalBound = true;
  let currentRowMenu = null;
  let currentRowMenuToggle = null;
  function closeAllMenus() {
    if (currentRowMenu) {
      console.debug('[rowMenu] closeAllMenus: fechando menu atual');
      currentRowMenu.classList.remove('open');
      // Garantir que desapareça mesmo se display inline ficou 'block'
      currentRowMenu.style.display = 'none';
      currentRowMenu.style.left = '';
      currentRowMenu.style.top = '';
      currentRowMenu.style.visibility='';
    }
    if (currentRowMenuToggle) {
      currentRowMenuToggle.setAttribute('aria-expanded','false');
    }
    currentRowMenu = null;
    currentRowMenuToggle = null;
    document.querySelectorAll('.row-menu-backdrop').forEach(b => b.remove());
    try { window.closeAllMenus = closeAllMenus; } catch(_) {}
  }
  function positionPortalMenu(menu, toggleBtn) {
    // Não mover mais para o body; usar position:fixed sem alterar hierarquia
    menu.style.position='fixed';
    // Primeiro deixar pronto para medir
    menu.style.display='block';
    menu.style.visibility='hidden';
    const r = toggleBtn.getBoundingClientRect();
  const menuW = 150; // largura fixa atualizada
    const menuH = menu.offsetHeight || 10;
    let left = r.left;
    let top = r.bottom + 4;
    if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
    if (top + menuH > window.innerHeight - 8) top = r.top - menuH - 6;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.visibility='visible';
  }
  function createBackdrop() {
    const existing = document.querySelector('.row-menu-backdrop');
    if (existing) return existing;
    const bd = document.createElement('div');
    bd.className='row-menu-backdrop';
    bd.style.position='fixed';
    bd.style.inset='0';
    bd.style.background='transparent';
    bd.style.zIndex='4999';
    document.body.appendChild(bd);
    bd.addEventListener('click', () => { closeAllMenus(); });
    return bd;
  }
  function openRowMenu(toggleBtn, menu) {
    if (currentRowMenu === menu) return;
    closeAllMenus();
    menu.style.left=''; menu.style.top=''; menu.style.visibility='hidden';
    toggleBtn.setAttribute('aria-expanded','true');
    positionPortalMenu(menu, toggleBtn);
    menu.classList.add('open');
    // Garantir visibilidade controlada pela classe
    menu.style.display='block';
    currentRowMenu = menu;
    currentRowMenuToggle = toggleBtn;
    createBackdrop();
    console.debug('[rowMenu] openRowMenu: menu aberto');
  }
  document.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('[data-action="toggleRowMenu"]');
    if (toggleBtn) {
      const wrap = toggleBtn.closest('.row-actions');
      const menu = wrap ? wrap.querySelector('.action-menu') : null;
      if (!menu) return;
      if (currentRowMenu && currentRowMenu === menu) {
        // fechar o mesmo
        closeAllMenus();
      } else {
        openRowMenu(toggleBtn, menu);
        // Focar primeiro item para acessibilidade
        const first = menu.querySelector('.dropdown-item:not([disabled])');
        if (first) setTimeout(()=> first.focus(), 10);
      }
      e.preventDefault();
      return;
    }
    // Clique em item
    if (e.target.closest('.action-menu.open .dropdown-item')) {
      closeAllMenus();
      return; // ação real é tratada em outro listener
    }
    // Clique fora (nem menu nem toggle)
    if (currentRowMenu && !e.target.closest('.action-menu') && !e.target.closest('[data-action="toggleRowMenu"]')) {
      closeAllMenus();
    }
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { closeAllMenus(); } });
  // Navegação de setas dentro do menu
  document.addEventListener('keydown', (ev) => {
    if (!currentRowMenu) return;
    const items = [...currentRowMenu.querySelectorAll('.dropdown-item:not([disabled])')];
    if (!items.length) return;
    const idx = items.indexOf(document.activeElement);
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      const next = items[(idx + 1) % items.length];
      next.focus();
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      const prev = items[(idx - 1 + items.length) % items.length];
      prev.focus();
    } else if (ev.key === 'Home') {
      ev.preventDefault(); items[0].focus();
    } else if (ev.key === 'End') {
      ev.preventDefault(); items[items.length -1].focus();
    }
  });
  // Fechar também em pointerdown para reduzir janelas de clique rápido
  document.addEventListener('pointerdown', (e) => {
    if (!currentRowMenu) return;
    if (!e.target.closest('.action-menu') && !e.target.closest('[data-action="toggleRowMenu"]')) {
      closeAllMenus();
    }
  });
  // Reforço: pointerdown também na window (alguns contextos podem parar propagação no document)
  window.addEventListener('pointerdown', (e) => {
    if (!currentRowMenu) return;
    if (!e.target.closest('.action-menu') && !e.target.closest('[data-action="toggleRowMenu"]')) {
      closeAllMenus();
    }
  }, true);
  window.addEventListener('scroll', () => closeAllMenus(), true);
  // Alguns navegadores não disparam com capture em determinados nós; adiciona versão sem capture
  window.addEventListener('scroll', () => closeAllMenus());
  window.addEventListener('resize', () => closeAllMenus());
  // Fechar em qualquer gesto de rolagem dentro de containers scrolláveis
  ['wheel','touchmove'].forEach(evt => {
    window.addEventListener(evt, () => closeAllMenus(), { passive:true, capture:true });
  });
  // Extra: se houver scroll em body ou documentElement (alguns navegadores)
  document.addEventListener('scroll', () => closeAllMenus(), true);
}

function attachHandlers() {
  const scopeIds = ['adminContentPage','adminContentCard','adminContentContainer'];
  const handler = async (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (actionEl) console.debug('[adminContent] Click data-action=', actionEl.dataset.action);
    const reload = e.target.closest('[data-action="reloadTrainings"]');
    if (reload) { e.preventDefault(); loadTrainings(); closeAllMenus(); return; }
    const newBtn = e.target.closest('[data-action="newTraining"]');
    if (newBtn) { e.preventDefault(); openCreateTrainingModal(); closeAllMenus(); return; }
    const publishBtn = e.target.closest('[data-action="publishTraining"]');
    if (publishBtn) { e.preventDefault(); confirmPublish(publishBtn.dataset.id, { triggerEl: publishBtn, source: 'list' }); closeAllMenus(); return; }
    const assignBtn = e.target.closest('[data-action="assignSector"]');
    if (assignBtn) { e.preventDefault(); openAssignSectorModal(assignBtn.dataset.id); closeAllMenus(); return; }
    const deleteBtn = e.target.closest('[data-action="deleteTraining"]');
    if (deleteBtn) { e.preventDefault(); confirmDelete(deleteBtn.dataset.id); closeAllMenus(); return; }
    const uploadBtn = e.target.closest('[data-action="uploadEbook"]');
    if (uploadBtn) {
      e.preventDefault();
      const id = uploadBtn.dataset.id;
      let title = uploadBtn.dataset.title || '';
      if (!title) {
        try { const obj = (Array.isArray(window._allTrainings) ? window._allTrainings.find(t=>t.id==id) : null); title = obj && obj.title || ''; } catch(_){}
      }
      openEbookUploadModal(id, { title });
      closeAllMenus();
      return;
    }
    const viewEbookBtn = e.target.closest('[data-action="viewEbook"]');
    if (viewEbookBtn) { e.preventDefault(); openEbookViewer(viewEbookBtn.dataset.id); closeAllMenus(); return; }
  const viewBtn = e.target.closest('[data-action="viewTraining"]');
  if (viewBtn) { e.preventDefault(); navigateToTrainingDetail(viewBtn.dataset.id); closeAllMenus(); return; }

  // Remover vínculo de setor
  const unlinkBtn = e.target.closest('[data-action="unlinkSector"]');
  if (unlinkBtn) {
    e.preventDefault();
    performUnlinkSector(unlinkBtn);
  }
  };
  scopeIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset._contentHandlersAttached) {
      el.dataset._contentHandlersAttached = '1';
      el.addEventListener('click', handler);
    }
  });
}

// --- Função reutilizável para desvincular setor ---
async function performUnlinkSector(unlinkBtn) {
  const trainingId = unlinkBtn.dataset.trainingId;
  let sectorId = unlinkBtn.dataset.sectorId;
  if (!trainingId) { console.warn('[adminContent] Falta trainingId no botão de unlink'); return; }
  if (!sectorId) {
    const tr = unlinkBtn.closest('tr');
    sectorId = tr ? (tr.getAttribute('data-sector-id') || '') : '';
    if (!sectorId) {
      try {
        const firstCell = tr ? tr.querySelector('td') : null;
        const label = firstCell ? firstCell.textContent.trim() : '';
        console.debug('[adminContent] tentativa inferir sectorId via label', label);
      } catch(_) {}
    }
    if (!sectorId) { console.error('[adminContent] Setor sem ID para desvincular'); showToast('Erro: setor sem ID.', { type:'error' }); return; }
  }
  if (unlinkBtn.disabled) return;
  if (!confirm('Remover este setor do treinamento?')) return;
  unlinkBtn.disabled = true; const prev = unlinkBtn.textContent; unlinkBtn.textContent = 'Removendo...';
  try {
    const token = localStorage.getItem('jwtToken');
    const sysRole = (localStorage.getItem('systemRole')||'').toUpperCase();
    console.debug('[adminContent] unlink setor click', { trainingId, sectorId, sysRole });
    if (/SYSTEM[_-]?ADMIN/.test(sysRole)) {
      await unlinkTrainingSector(token, trainingId, sectorId);
      console.debug('[adminContent] unlinkTrainingSector OK');
      showToast('Setor desvinculado.');
    } else if (/ORG[_-]?ADMIN/.test(sysRole)) {
      const orgId = localStorage.getItem('currentOrgId');
      if (!orgId) throw new Error('Org ID não encontrado para ORG_ADMIN');
      await orgUnfollowSector(token, orgId, sectorId);
      console.debug('[adminContent] orgUnfollowSector OK');
      showToast('Organização deixou de seguir o setor.');
    } else {
      throw new Error('Sem permissão para remover setor.');
    }
    const tr = unlinkBtn.closest('tr'); if (tr) tr.remove();
  unlinkBtn.textContent = 'Removido';
  unlinkBtn.classList.add('removed');
  } catch(err) {
    console.error('Erro ao remover setor', err);
    const msgBox = document.getElementById('trainingDetailMessages');
    const msg = err.message || 'Falha ao remover setor';
    showToast(msg, { type:'error' });
    if (msgBox) { msgBox.textContent = msg; }
    unlinkBtn.disabled = false; unlinkBtn.textContent = prev;
  }
}

// Listener global de fallback caso a hierarquia não esteja dentro dos containers iniciais
if (typeof document !== 'undefined' && !window._globalUnlinkSectorBound) {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="unlinkSector"]');
    if (!btn) return;
    // Evita duplicar se já foi tratado dentro de outro handler no mesmo tick
    if (btn._unlinkHandled) return;
    btn._unlinkHandled = true;
    setTimeout(()=>{ btn._unlinkHandled = false; },0);
    // Se já está em estado final, não refazer
    if (btn.textContent === 'Removido') return;
    console.debug('[adminContent][global-listener] intercept unlink click');
    performUnlinkSector(btn);
  });
  window._globalUnlinkSectorBound = true;
}

// Merge seguro: só sobrescreve campos definidos
function mergeTrainingUpdate(updated) {
  if (!updated || !updated.id || !Array.isArray(window._allTrainings)) return updated;
  const idx = window._allTrainings.findIndex(t => t.id === updated.id);
  if (idx === -1) return updated;
  const original = window._allTrainings[idx];
  const merged = { ...original };
  const whitelist = [
    'title','description','author','publicationStatus','status','entityType',
    'filePath','filepath','pdfUrl','pdfFilePath','ebookFile','ebookFilePath'
  ];
  whitelist.forEach(k => {
    if (Object.prototype.hasOwnProperty.call(updated, k) && updated[k] !== undefined && updated[k] !== null) {
      merged[k] = updated[k];
    }
  });
  window._allTrainings[idx] = merged;
  return merged;
}

async function handlePublish(trainingId, opts = {}) {
  if (!trainingId) return;
  const { triggerEl, source } = opts;
  let previousLabel = null;
  if (triggerEl && !triggerEl._publishing) {
    triggerEl._publishing = true;
    previousLabel = triggerEl.innerHTML;
    triggerEl.disabled = true;
    triggerEl.setAttribute('aria-busy','true');
    triggerEl.innerHTML = previousLabel && /Publicado/i.test(previousLabel) ? previousLabel : 'Publicando...';
  }
  try {
    const token = localStorage.getItem('jwtToken');
    console.debug('[adminContent] Iniciando publicação', trainingId);
    await publishAdminTraining(token, trainingId);
    console.debug('[adminContent] Publicação OK, buscando detalhe atualizado');
    // Buscar detalhe atualizado para refletir status imediatamente
    let detail = null;
    try { detail = await getAdminTrainingById(token, trainingId); } catch(e){ console.warn('[adminContent] Falha ao buscar detalhe pós-publicação', e); }
    if (detail) mergeTrainingUpdate(detail); else {
      // fallback: marcar status localmente
      const idx = Array.isArray(window._allTrainings) ? window._allTrainings.findIndex(t=>t.id===trainingId) : -1;
      if (idx > -1) {
        if (!window._allTrainings[idx].publicationStatus && !window._allTrainings[idx].status) {
          window._allTrainings[idx].publicationStatus = 'PUBLISHED';
        } else if (window._allTrainings[idx].publicationStatus) {
          window._allTrainings[idx].publicationStatus = 'PUBLISHED';
        } else if (window._allTrainings[idx].status) {
          window._allTrainings[idx].status = 'PUBLISHED';
        }
      }
    }
    // Re-render tabela mantendo filtros
    try { renderTrainings(applyFilters(window._allTrainings)); } catch(e){ console.warn('[adminContent] Falha ao re-render após publicação', e); }
    // Atualizar modal se ainda aberto
    try {
      const overlay = document.querySelector('.content-modal-overlay .content-modal.large');
      if (overlay) {
        const bodyEl = overlay.querySelector('#trainingDetailBody');
        if (bodyEl) {
          const obj = Array.isArray(window._allTrainings) ? window._allTrainings.find(t=>t.id===trainingId) : null;
          if (obj) bodyEl.innerHTML = renderTrainingDetailHtml(obj);
        }
      }
    } catch(e) { console.warn('[adminContent] Não foi possível atualizar modal de detalhes', e); }
    showToast('Treinamento publicado.');
  } catch (e) {
    console.error('[adminContent] Erro ao publicar', e);
    showToast('Erro ao publicar: ' + (e.message || ''), { type: 'error' });
  } finally {
    if (triggerEl && triggerEl._publishing) {
      triggerEl.removeAttribute('aria-busy');
      triggerEl.disabled = false;
      if (/Publicando\.\.\./i.test(triggerEl.innerHTML) && previousLabel) {
        // Ajusta rótulo final
        if (Array.isArray(window._allTrainings)) {
          const obj = window._allTrainings.find(t=>t.id===trainingId);
          const isPublished = obj && ((obj.publicationStatus||obj.status||'').toUpperCase()==='PUBLISHED');
          triggerEl.innerHTML = isPublished ? previousLabel.replace(/Publicar/i,'Publicado') : previousLabel;
        } else {
          triggerEl.innerHTML = previousLabel;
        }
      }
      triggerEl._publishing = false;
    }
  }
}

async function handleDelete(trainingId) {
  if (!trainingId) return;
  try {
    const token = localStorage.getItem('jwtToken');
    await deleteAdminTraining(token, trainingId);
    showToast('Treinamento excluído.');
    loadTrainings();
  } catch (e) {
    if (e.code === 'TRAINING_HAS_ENROLLMENTS') showToast('Não é possível excluir: possui matrículas.', { type: 'error' });
    else showToast('Erro ao excluir: ' + (e.message || ''), { type: 'error' });
  }
}

function confirmPublish(id, opts = {}) {
  showConfirmModal({
    title:'Publicar Treinamento',
    message:'Confirmar a publicação deste treinamento agora?',
    confirmLabel:'Publicar',
    confirmType:'primary'
  }).then(ok => { if (ok) handlePublish(id, opts); });
}

function confirmDelete(id) {
  showConfirmModal({
    title:'Excluir Treinamento',
    message:'Esta ação é irreversível. Deseja realmente excluir?',
    confirmLabel:'Excluir',
    confirmType:'danger'
  }).then(ok => { if (ok) handleDelete(id); });
}

function openCreateTrainingModal() {
  closeAdminContentModal();
  const overlay = document.createElement('div');
  overlay.className = 'content-modal-overlay';
  overlay.innerHTML = `
    <div class="content-modal" role="dialog" aria-modal="true" aria-labelledby="trainingModalTitle">
      <h3 id="trainingModalTitle">Novo Treinamento</h3>
      <form id="createTrainingForm" class="content-form">
        <label>Título<span>*</span></label>
        <input type="text" name="title" required maxlength="160" placeholder="Ex: NR-18 Básico" />
        <label>Descrição</label>
        <textarea name="description" rows="3" maxlength="800" placeholder="Descrição do conteúdo"></textarea>
        <label>Autor</label>
        <input type="text" name="author" maxlength="120" placeholder="Nome do autor" />
        <label>Tipo (entityType)<span>*</span></label>
        <select name="entityType" required>
          <option value="">Selecione...</option>
          <option value="RECORDED_COURSE">Curso Gravado</option>
          <option value="LIVE_TRAINING">Treinamento Ao Vivo</option>
          <option value="EBOOK">E-book</option>
        </select>
        <label>Organização (opcional)</label>
        <input type="text" name="organizationId" placeholder="UUID da organização (se aplicável)" />
        <div class="form-messages" id="trainingCreateMessages" aria-live="polite"></div>
        <div class="content-modal-actions">
          <button type="button" class="btn-small btn-small-remove" data-action="cancelModal">Cancelar</button>
          <button type="submit" class="btn-small btn-small-change" id="createTrainingSubmit">Criar</button>
        </div>
      </form>-
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAdminContentModal(); });
  const form = overlay.querySelector('#createTrainingForm');
  form.addEventListener('submit', submitCreateTrainingForm);
  form.querySelector('[data-action="cancelModal"]').addEventListener('click', (e)=> { e.preventDefault(); closeAdminContentModal(); });
  // estilos de modal já carregados via CSS estático (_adminModals.css)
  setTimeout(()=> { try { form.querySelector('input[name="title"]').focus(); } catch(e){} }, 30);
}

// openTrainingDetail (modal) removido na migração para página. Qualquer chamada antiga deve usar navigateToTrainingDetail.

function renderTrainingDetailHtml(t, role='SYSTEM_ADMIN') {
  // Exibição anterior de "Setores" removida. Agora usamos somente o bloco "Vínculos de Setor".
  // Campos Status e Autor restaurados para referência antes de clicar em Editar.
  const published = (t.publicationStatus || t.status || '').toUpperCase() === 'PUBLISHED';
  const ebookBlock = (t.entityType === 'EBOOK') ? (() => {
    const has = trainingHasPdf(t);
    const fileName = has ? extractPdfFileName(t) : '';
    const upd = has ? extractPdfUpdatedDate(t) : null;
    const statusHtml = has
      ? `<span class="td-ok">Arquivo enviado${fileName ? ': ' + escapeHtml(fileName) : ''}${upd ? ' (Atualizado em: '+ escapeHtml(upd.toLocaleString()) +')' : ''}</span>`
      : '<span class="td-warn">Arquivo não enviado</span>';
    let hint = '';
    if (role === 'SYSTEM_ADMIN') {
      hint = has ? 'Use a barra de ações acima para abrir ou substituir o PDF.' : 'Use a barra de ações acima para enviar o PDF.';
    } else if (role === 'ORG_ADMIN') {
      hint = has ? 'Você pode abrir ou substituir o PDF (ações acima).' : 'Envie o PDF usando a ação acima.';
    } else if (role === 'ORG_MEMBER') {
      hint = has ? 'Clique em "Abrir PDF" (quando disponível) para visualizar.' : 'O PDF ainda não foi disponibilizado.';
    } else { // GUEST
      hint = has ? 'Faça login para acessar este E-book.' : 'Conteúdo indisponível para visitantes.';
    }
    return `
      <div class="td-box td-box-ebook">
        <strong class="td-box-title">E-book:</strong>
        ${statusHtml}
        <div class="td-hint td-ebook-hint">${hint}</div>
      </div>`;
  })() : '';
  const coverBlock = (()=> {
    // Se backend ainda não retornou coverImageUrl mas o usuário já escolheu um arquivo nesta sessão,
    // usar a pré-visualização local (object URL) para experiência imediata.
    let backendUrl = t._coverBustedUrl || t.coverImageUrl || '';
    const pending = window._pendingCoverPreviews && window._pendingCoverPreviews[t.id];
    const localPreviewUrl = (!backendUrl && pending && pending.url) ? pending.url : null;
    const effectiveUrl = backendUrl || localPreviewUrl || '';
    const hasCover = !!effectiveUrl;
    const isLocal = !!localPreviewUrl;
    const preview = hasCover
      ? `<div class="td-cover-preview"><img src="${escapeAttr(effectiveUrl)}" alt="Capa${isLocal ? ' (pré-visualização local não enviada ainda)' : ''}" loading="lazy" decoding="async" /></div>`
      : `<div class="td-cover-preview"><div class="td-cover-skeleton" aria-label="Capa pendente" role="img"></div></div>`;
    const inputId = 'coverInput-' + encodeURIComponent(String(t.id));
    return `<div class="td-box td-box-cover">
      <strong class="td-box-title">Capa:</strong>
      ${hasCover ? (isLocal ? '<span class="td-warn">Pré-visualização (ainda não enviada)</span>' : '<span class="td-ok">Imagem enviada</span>') : '<span class="td-warn">Nenhuma imagem</span>'}
      ${preview}
      <div class="td-cover-row">
        <div class="td-cover-upload">
          <input id="${inputId}" type="file" accept="image/*" data-action="uploadCoverInput" data-id="${t.id}" class="td-cover-input-overlay" aria-label="Selecionar imagem da capa" />
          <button type="button" class="btn-small td-cover-trigger${hasCover ? ' is-has-cover' : ''}" data-action="chooseCover" data-target-input="${inputId}" data-id="${t.id}">${hasCover ? (isLocal ? 'Escolher outra' : 'Trocar imagem') : 'Escolher imagem'}</button>
        </div>
        <span data-cover-filename class="td-file-name"></span>
        <button type="button" class="btn-small btn-small-change" data-action="sendCoverUpload" data-id="${t.id}" style="display:none;">Enviar Capa</button>
        <button type="button" class="btn-small btn-small-remove" data-action="cancelCoverSelection" data-id="${t.id}" style="display:none;">Cancelar</button>
        <div class="cover-progress" data-cover-progress>0%</div>
      </div>
      <div class="td-hint">Formatos aceitos: JPG, PNG, WEBP. ${hasCover && isLocal ? 'Clique em "Enviar Capa" para concluir o upload.' : 'O upload só inicia após clicar em "Enviar Capa".'}</div>
    </div>`;
  })();
  // Bloco polimórfico conforme entityType
  let polymorphicBlock = '';
  if (t.entityType === 'EBOOK' && t.ebookDetails) {
    const d = t.ebookDetails;
    const fileName = d.filePath ? (()=>{ try { return decodeURIComponent(d.filePath.split('/').pop()); } catch(_) { return d.filePath.split('/').pop(); } })() : '—';
    const uploadedAt = d.fileUploadedAt || d.updatedAt || d.createdAt;
    polymorphicBlock = `<div class="td-box td-box-poly"><strong class="td-box-title">Detalhes do E-book</strong>
      <div class="td-poly-grid">
        <div><span class="td-label">Páginas</span><span class="td-value">${escapeHtml(String(d.pages || d.totalPages || '—'))}</span></div>
        <div><span class="td-label">Arquivo</span><span class="td-value">${escapeHtml(fileName)}</span></div>
        <div><span class="td-label">Upload PDF</span><span class="td-value">${escapeHtml(formatDateTime(uploadedAt))}</span></div>
      </div>
      ${d.summary ? `<div class="td-poly-desc"><span class="td-label">Resumo</span><span class="td-value">${escapeHtml(d.summary)}</span></div>`:''}
    </div>`;
  } else if (t.entityType === 'RECORDED_COURSE' && t.courseDetails) {
    const c = t.courseDetails;
    polymorphicBlock = `<div class="td-box td-box-poly"><strong class="td-box-title">Detalhes do Curso Gravado</strong>
      <div class="td-poly-grid">
        <div><span class="td-label">Aulas</span><span class="td-value">${escapeHtml(String(c.lessons || c.totalLessons || '—'))}</span></div>
        <div><span class="td-label">Duração Total</span><span class="td-value">${escapeHtml(c.totalDuration || c.duration || '—')}</span></div>
        <div><span class="td-label">Nível</span><span class="td-value">${escapeHtml(c.level || '—')}</span></div>
      </div>
      ${c.outcomes ? `<div class="td-poly-desc"><span class="td-label">Resultados Esperados</span><span class="td-value">${escapeHtml(c.outcomes)}</span></div>`:''}
    </div>`;
  } else if (t.entityType === 'LIVE_TRAINING' && t.liveDetails) {
    const l = t.liveDetails;
    let schedule = '';
    if (Array.isArray(l.sessions)) {
      schedule = '<ul class="td-sessions">' + l.sessions.map(s => `<li>${escapeHtml((s.dateTime || s.startTime || '') + (s.topic ? ' - '+ s.topic : ''))}</li>`).join('') + '</ul>';
    }
    polymorphicBlock = `<div class="td-box td-box-poly"><strong class="td-box-title">Detalhes do Treinamento Ao Vivo</strong>
      <div class="td-poly-grid">
        <div><span class="td-label">Início</span><span class="td-value">${escapeHtml(l.startDate || l.start || '—')}</span></div>
        <div><span class="td-label">Fim</span><span class="td-value">${escapeHtml(l.endDate || l.end || '—')}</span></div>
        <div><span class="td-label">Plataforma</span><span class="td-value">${escapeHtml(l.platform || l.meetingPlatform || '—')}</span></div>
      </div>
      ${schedule ? `<div class="td-poly-desc"><span class="td-label">Agenda</span><span class="td-value">${schedule}</span></div>`:''}
      ${l.accessLink ? `<div class="td-poly-desc"><span class="td-label">Link de Acesso</span><span class="td-value"><a href="${escapeAttr(l.accessLink)}" target="_blank" rel="noopener">Abrir</a></span></div>`:''}
    </div>`;
  }
  // Vínculos de setor (sectorAssignments) - se vazio, exibir linha "Global" para ebooks avulsos ou qualquer treinamento sem vínculo.
  let assignments = Array.isArray(t._resolvedSectorAssignments) ? t._resolvedSectorAssignments : (Array.isArray(t.sectorAssignments) ? t.sectorAssignments : []);
  const hasAssignments = assignments && assignments.length > 0;
  if (!hasAssignments) {
    // não altera o DTO, só cria uma linha fictícia para exibição e funcionamento de filtros de "Ebooks Avulsos" (Global)
    assignments = [{ _virtual: true, _sector: { name: 'Global' }, trainingType: null, legalBasis: null }];
  }
  const assignmentsBlock = `<div class="td-box td-box-assignments"><strong class="td-box-title">Vínculos de Setor</strong>
    <div class="td-assignment-wrapper">
      <table class="td-assignment-table"><thead><tr><th>Setor</th><th>Tipo</th><th>Base Legal</th><th>Ações</th></tr></thead><tbody>
        ${assignments.map(a => {
          const tType = (a.trainingType||'').toUpperCase();
          const tLabel = tType === 'COMPULSORY' ? 'Obrigatório' : (tType === 'OPTIONAL' ? 'Opcional' : (tType||'—'));
          const name = a._sector ? (a._sector.name || a._sector.title || a._sector.id) : (a.sectorId || '—');
          const sectorId = a._sector ? (a._sector.id || a._sector.sectorId || a.sectorId) : a.sectorId;
          const virtual = a._virtual ? 'true' : 'false';
          const disableBtn = virtual === 'true' ? 'disabled' : '';
          return `<tr data-sector-id="${escapeAttr(sectorId||'')}" data-virtual="${virtual}"><td>${escapeHtml(name)}</td><td>${escapeHtml(tLabel)}</td><td>${escapeHtml(a.legalBasis||'—')}</td><td><button type="button" class="btn-small btn-small-remove" data-action="unlinkSector" data-training-id="${escapeAttr(t.id)}" data-sector-id="${escapeAttr(sectorId||'')}" ${disableBtn} title="Remover vínculo deste setor">Remover</button></td></tr>`; }).join('')}
      </tbody></table>
      ${hasAssignments ? '' : '<p class="td-hint" style="margin-top:6px; font-size:.65rem;">Sem vínculos reais: tratado como Global.</p>'}
    </div>
    <div class="td-hint" style="margin-top:4px; font-size:.55rem;">Remoção: System Admin desvincula global / Org Admin deixa de seguir (se aplicável).</div>
  </div>`;

  return `
    <div class="td-block" data-role="${escapeAttr(role)}">
      <div class="td-grid">
        <div class="td-field"><span class="td-label">ID</span><span class="td-value">${escapeHtml(t.id || '')}</span></div>
        <div class="td-field"><span class="td-label">Título</span><span class="td-value">${escapeHtml(t.title || '')}</span></div>
        <div class="td-field"><span class="td-label">Tipo</span><span class="td-value">${escapeHtml(t.entityType || '')}</span></div>
        <div class="td-field"><span class="td-label">Status</span><span class="td-value">${escapeHtml(t.publicationStatus || t.status || '')}${published ? ' <span class="td-published">(Publicado)</span>' : ''}</span></div>
        <div class="td-field"><span class="td-label">Autor</span><span class="td-value">${escapeHtml(t.author || '')}</span></div>
        <div class="td-field"><span class="td-label">Criado em</span><span class="td-value">${escapeHtml(formatDateTime(t.createdAt))}</span></div>
        <div class="td-field"><span class="td-label">Atualizado em</span><span class="td-value">${escapeHtml(formatDateTime(t.updatedAt))}</span></div>
        <div class="td-field td-desc"><span class="td-label">Descrição</span><span class="td-value">${escapeHtml(t.description || '') || '<em>—</em>'}</span></div>
  <!-- Campo "Setores" removido: representação consolidada em "Vínculos de Setor" -->
      </div>
      ${ebookBlock}
      ${coverBlock}
      ${assignmentsBlock}
      ${polymorphicBlock}
      <div class="td-raw is-hidden"><strong>JSON Bruto:</strong><pre>${escapeHtml(JSON.stringify(t, null, 2))}</pre></div>
    </div>`;
}

async function openEditTrainingModal(trainingId) {
  closeAdminContentModal();
  const token = localStorage.getItem('jwtToken');
  let data = null;
  try { data = await getAdminTrainingById(token, trainingId); } catch(e) { showToast('Erro ao carregar treinamento para edição.'); return; }
  const overlay = document.createElement('div');
  overlay.className='content-modal-overlay';
  overlay.innerHTML = `
    <div class="content-modal" role="dialog" aria-modal="true" aria-labelledby="editTrainingTitle">
      <h3 id="editTrainingTitle">Editar Treinamento</h3>
      <form id="editTrainingForm" class="content-form">
        <label>Título</label>
        <input type="text" name="title" maxlength="160" value="${escapeAttr(data.title || '')}" />
        <label>Descrição</label>
        <textarea name="description" rows="4" maxlength="800">${escapeHtml(data.description || '')}</textarea>
        <label>Autor</label>
        <input type="text" name="author" maxlength="120" value="${escapeAttr(data.author || '')}" />
        <div class="form-messages" id="editTrainingMessages" aria-live="polite"></div>
        <div class="content-modal-actions">
          <button type="button" class="btn-small btn-small-remove" data-action="cancelEdit">Cancelar</button>
          <button type="submit" class="btn-small btn-small-change" id="editTrainingSubmit">Salvar</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click',(e)=>{ if(e.target===overlay) closeAdminContentModal(); });
  // estilos de modal já carregados via CSS estático (_adminModals.css)
  const form = overlay.querySelector('#editTrainingForm');
  form.addEventListener('submit', (e)=> submitEditTrainingForm(e, trainingId));
  form.querySelector('[data-action="cancelEdit"]').addEventListener('click', (e)=> { e.preventDefault(); closeAdminContentModal(); });
  setTimeout(()=> { try { form.querySelector('input[name="title"]').focus(); } catch(e){} }, 40);
}

async function submitEditTrainingForm(e, trainingId) {
  e.preventDefault();
  const form = e.target;
  const messages = form.querySelector('#editTrainingMessages');
  const submitBtn = form.querySelector('#editTrainingSubmit');
  messages.textContent='';
  const fd = Object.fromEntries(new FormData(form).entries());
  const payload = {
    title: fd.title ? fd.title.trim() : undefined,
    description: fd.description ? fd.description.trim() : undefined,
    author: fd.author ? fd.author.trim() : undefined
  };
  // retirar campos vazios (undefined) para não sobrescrever com vazio se user apaga
  Object.keys(payload).forEach(k => { if (payload[k] === undefined || payload[k] === '') delete payload[k]; });
  if (Object.keys(payload).length === 0) { messages.textContent='Nada para atualizar.'; return; }
  submitBtn.disabled = true; submitBtn.textContent='Salvando...';
  try {
    const token = localStorage.getItem('jwtToken');
    await updateAdminTraining(token, trainingId, payload);
    showToast('Treinamento atualizado.');
    closeAdminContentModal();
    loadTrainings();
  } catch (err) {
    console.error('Erro atualização', err);
    messages.textContent = err.message || 'Erro ao salvar.';
  } finally {
    submitBtn.disabled = false; submitBtn.textContent='Salvar';
  }
}

async function submitCreateTrainingForm(e) {
  e.preventDefault();
  const form = e.target;
  const messages = form.querySelector('#trainingCreateMessages');
  const submitBtn = form.querySelector('#createTrainingSubmit');
  messages.textContent='';
  const formData = Object.fromEntries(new FormData(form).entries());
  const dto = {
    title: (formData.title||'').trim(),
    description: (formData.description||'').trim() || null,
    author: (formData.author||'').trim() || null,
    entityType: formData.entityType,
    organizationId: (formData.organizationId||'').trim() || null
  };
  if (!dto.title || !dto.entityType) { messages.textContent='Título e tipo são obrigatórios.'; return; }
  submitBtn.disabled = true; submitBtn.textContent='Criando...';
  try {
    const token = localStorage.getItem('jwtToken');
    const created = await createAdminTraining(token, dto);
    showToast('Treinamento criado.');
    const createdId = created && (created.id || created.trainingId || created.uuid);
    closeAdminContentModal();
    // Fluxo ajustado: após criar sempre fechamos modal e apenas recarregamos a lista.
    // Para EBOOK o upload passa a ser uma ação manual posterior (menu "Enviar PDF").
    loadTrainings();
  } catch (err) {
    console.error('Erro criação treinamento', err);
    messages.textContent = err.message || 'Erro ao criar.';
  } finally {
    submitBtn.disabled = false; submitBtn.textContent='Criar';
  }
}

async function openAssignSectorModal(trainingId) {
  closeAdminContentModal();
  const overlay = document.createElement('div');
  overlay.className='content-modal-overlay';
  overlay.innerHTML = `
    <div class="content-modal" role="dialog" aria-modal="true" aria-labelledby="assignSectorTitle">
      <h3 id="assignSectorTitle">Vincular Setor</h3>
      <form id="assignSectorForm" class="content-form">
        <input type="hidden" name="trainingId" value="${trainingId}" />
        <label>Setor<span>*</span></label>
        <select name="sectorId" required id="assignSectorSelect"><option value="">Carregando setores...</option></select>
        <label>Tipo de Treinamento<span>*</span></label>
        <select name="trainingType" required>
          <option value="COMPULSORY">Compulsório</option>
          <option value="ELECTIVE">Eletivo</option>
        </select>
        <label>Base Legal (opcional)</label>
        <input type="text" name="legalBasis" maxlength="200" placeholder="Ex: NR-18 / Lei XYZ" />
        <div class="form-messages" id="assignSectorMessages" aria-live="polite"></div>
        <div class="content-modal-actions">
          <button type="button" class="btn-small btn-small-remove" data-action="cancelModal">Cancelar</button>
          <button type="submit" class="btn-small btn-small-change" id="assignSectorSubmit">Vincular</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=> { if (e.target === overlay) closeAdminContentModal(); });
  // estilos de modal já carregados via CSS estático (_adminModals.css)
  const form = overlay.querySelector('#assignSectorForm');
  form.addEventListener('submit', submitAssignSectorForm);
  form.querySelector('[data-action="cancelModal"]').addEventListener('click', (e)=> { e.preventDefault(); closeAdminContentModal(); });
  populateSectorSelect();
}

async function populateSectorSelect() {
  const select = document.getElementById('assignSectorSelect');
  if (!select) return;
  try {
    if (!cachedSectors.length) {
      const token = localStorage.getItem('jwtToken');
      const data = await getAdminSectors(token);
      cachedSectors = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : (Array.isArray(data.data) ? data.data : []));
    }
    if (!cachedSectors.length) {
      select.innerHTML = '<option value="">Nenhum setor disponível</option>';
      return;
    }
    select.innerHTML = '<option value="">Selecione um setor...</option>' + cachedSectors.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  } catch (e) {
    console.error('Erro ao carregar setores para select', e);
    select.innerHTML = '<option value="">Erro ao carregar setores</option>';
  }
}

async function submitAssignSectorForm(e) {
  e.preventDefault();
  const form = e.target;
  const messages = form.querySelector('#assignSectorMessages');
  const submitBtn = form.querySelector('#assignSectorSubmit');
  messages.textContent='';
  const formData = Object.fromEntries(new FormData(form).entries());
  const trainingId = formData.trainingId;
  const assignment = {
    sectorId: formData.sectorId,
    trainingType: formData.trainingType,
    legalBasis: (formData.legalBasis||'').trim() || null
  };
  if (!assignment.sectorId) { messages.textContent='Selecione um setor.'; return; }
  submitBtn.disabled = true; submitBtn.textContent='Vinculando...';
  try {
    const token = localStorage.getItem('jwtToken');
    await assignTrainingToSector(token, trainingId, assignment);
    showToast('Setor vinculado.');
    closeAdminContentModal();
  } catch (err) {
    console.error('Erro ao vincular setor', err);
    if (err.code === 'TRAINING_OR_SECTOR_NOT_FOUND') messages.textContent='Treinamento ou setor não encontrado.';
    else messages.textContent = err.message || 'Erro.';
  } finally {
    submitBtn.disabled = false; submitBtn.textContent='Vincular';
  }
}

function closeAdminContentModal() {
  const existing = document.querySelector('.content-modal-overlay');
  if (existing) existing.remove();
  document.documentElement.classList.remove('modal-open');
  document.body.classList.remove('modal-open');
}

// injectContentModalStyles removido (estilos consolidados em _adminModals.css)

function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}

function escapeAttr(str) {
  return String(str).replace(/["']/g, s => ({'"':'&quot;',"'":'&#39;'}[s]));
}

// Evento de carregamento da página adminContent

document.addEventListener('page:loaded', (e) => {
  if (!e.detail) return;
  if (e.detail.page === 'adminContent' || e.detail.page === 'adminUsers') {
    attachHandlers();
    loadTrainings();
  }
  if (e.detail.page === 'trainingDetail') {
    try { initTrainingDetailPage && initTrainingDetailPage(); } catch(err) { console.warn('Falha init detalhe', err); }
  }
  if (e.detail.page === 'trainingReader') {
    try { initTrainingReaderPage && initTrainingReaderPage(); } catch(err) { console.warn('Falha init reader', err); }
  }
});

// Listener global de segurança (captura clicks mesmo fora do card original, ex: se id mudou)
if (!window._adminContentGlobalNewTrainingBound) {
  window._adminContentGlobalNewTrainingBound = true;
  document.addEventListener('click', (e) => {
    const globalBtn = e.target.closest('[data-action="newTraining"]');
    if (globalBtn) {
      if (!document.querySelector('.content-modal-overlay')) { // evitar abrir múltiplos
        console.debug('[adminContent] Listener global abriu modal Novo Treinamento');
        e.preventDefault();
        openCreateTrainingModal();
      }
    }
  }, true); // use capture para garantir prioridade
}

// ================= NOVA NAVEGAÇÃO PARA PÁGINA DE DETALHE =================
function navigateToTrainingDetail(id, options = {}) {
  if (!id) return;
  try {
    window._openTrainingId = id;
    if (options && options.training) window._trainingDetailPreloaded = options.training;
    if (options && options.source) window._trainingDetailSource = options.source;
  } catch(_) {}
  try {
    const adminPages = new Set(['adminContent','adminUsers','adminOrgs','adminOrgDetail','adminAnalytics','platformSectors','platformTags','platformLevels','platformEmails','platformPolicies','platformIntegrations','platformAudit','platformCache']);
    if (adminPages.has(currentPage)) {
      window._prevAdminPage = currentPage;
    }
  } catch(_){ }
  if (typeof showPage === 'function') {
    const role = getPrimaryRole();
    const targetPage = (role === 'SYSTEM_ADMIN' || role === 'ORG_ADMIN') ? 'trainingDetail' : 'trainingReader';
    showPage(targetPage, { trainingId: id });
  } else { console.warn('showPage não disponível'); }
}

async function initTrainingDetailPage() {
  const container = document.getElementById('trainingDetailContent');
  const actionsBar = document.getElementById('trainingDetailActions');
  if (!container) return;
  const id = window._openTrainingId;
  if (!id) {
    container.innerHTML = '<p class="td-empty">ID do treinamento não definido.</p>';
    if (actionsBar) {
      actionsBar.innerHTML = '';
      actionsBar.classList.add('is-empty');
    }
    return;
  }
  container.innerHTML = '<div class="td-loading">Carregando...</div>';
  if (actionsBar) {
    actionsBar.innerHTML = '';
    actionsBar.classList.add('is-empty');
  }
  const token = getAuthToken();
  if (!token) {
    container.innerHTML = '<p class="td-error">Sessão não encontrada. Redirecionando para login...</p>';
    setTimeout(()=> { try { showPage('loginPage'); } catch(_) {} }, 900);
    return;
  }
  const role = getPrimaryRole();
  if (role !== 'SYSTEM_ADMIN' && role !== 'ORG_ADMIN') {
    if (typeof showPage === 'function') {
      showPage('trainingReader', { trainingId: id, forceReload: true });
      return;
    }
    try {
      await renderLearnerTrainingDetail({ id, token, container, actionsBar, role });
    } catch (err) {
      console.error(err);
      container.innerHTML = `<p class="td-error">Erro ao carregar: ${escapeHtml(err.message || 'Erro')}</p>`;
    }
    return;
  }
  try {
    const t = await getAdminTrainingById(token, id);
    try { window._currentTrainingDetail = t; } catch(_) {}
    // Confiar diretamente na URL vinda do backend; aplicar cache-buster apenas após upload recente
    if (t && t.coverImageUrl && window._recentCoverUploadId === id) {
      try {
        if (/^https?:\/\//i.test(t.coverImageUrl)) {
          const sep = t.coverImageUrl.includes('?') ? '&' : '?';
          t._coverBustedUrl = t.coverImageUrl + sep + 'v=' + Date.now();
          console.debug('[trainingDetail] cache-buster aplicado para coverImageUrl');
        }
      } catch(errCache) { console.warn('Falha ao aplicar cache-buster', errCache); }
    }
    if (!t) {
      container.innerHTML = '<p class="td-empty">Treinamento não encontrado.</p>';
      return;
    }
    // Resolver nomes de setores a partir de sectorAssignments se existirem
    try {
      if (Array.isArray(t.sectorAssignments) && t.sectorAssignments.length) {
        const cache = (window._sectorsById = window._sectorsById || {});
        const toFetch = t.sectorAssignments.map(a => a.sectorId).filter(sid => sid && !cache[sid]);
        const unique = [...new Set(toFetch)];
        const fetchPromises = unique.map(async sid => {
          try {
            const detail = await getAdminSectorById(token, sid);
            if (detail && detail.id) cache[detail.id] = detail;
          } catch(err) { console.warn('Falha ao resolver setor', sid, err); }
        });
        if (fetchPromises.length) await Promise.all(fetchPromises);
        // Anexa resolvedNames na estrutura para uso na renderização (sem mutar original crítico)
        t._resolvedSectorAssignments = t.sectorAssignments.map(a => ({ ...a, _sector: (a.sectorId && cache[a.sectorId]) || null }));
      }
    } catch(err) { console.warn('Erro ao resolver nomes de setores', err); }
    container.innerHTML = renderTrainingDetailHtml(t, role);
    if (actionsBar) {
      actionsBar.innerHTML = buildDetailPageActionsHtml(t, role);
      if (!actionsBar.innerHTML.trim()) {
        actionsBar.classList.add('is-empty');
      } else {
        actionsBar.classList.remove('is-empty');
      }
    }
    try { enhanceCoverImage(t); } catch(errEnh) { console.warn('Falha enhanceCoverImage', errEnh); }
    // updateTrainingDetailStatusPill removido: status já é mostrado em seção inferior detalhada
    attachDetailPageHandlers(t);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="td-error">Erro ao carregar: ${escapeHtml(err.message || 'Erro')}</p>`;
  }
}

async function initTrainingReaderPage() {
  const root = document.getElementById('trainingReaderPageRoot');
  const content = document.getElementById('trainingReaderContent');
  const messages = document.getElementById('trainingReaderMessages');
  if (!root || !content) return;
  if (typeof root._readerCleanup === 'function') {
    try { root._readerCleanup(); } catch (_) { /* noop */ }
    root._readerCleanup = null;
  }
  const id = window._openTrainingId;
  if (!id) {
    content.innerHTML = '<p class="td-empty">Treinamento não informado.</p>';
    if (messages) messages.textContent = '';
    return;
  }
  const token = getAuthToken();
  if (!token) {
    content.innerHTML = '<p class="td-error">Sessão expirada. Faça login novamente para acessar o material.</p>';
    if (messages) messages.textContent = '';
    setTimeout(() => { try { showPage('login'); } catch (_) { window.location.hash = '#login'; } }, 600);
    return;
  }
  content.innerHTML = '<p class="td-loading">Carregando conteúdo...</p>';
  if (messages) messages.textContent = '';
  try {
    const role = getPrimaryRole();
    const training = await fetchLearnerTrainingData(id, token);
    if (!training) {
      content.innerHTML = '<p class="td-empty">Treinamento não encontrado ou não atribuído.</p>';
      return;
    }
    try { window._currentTrainingDetail = training; } catch (_) {}
    const pdfUrl = resolveTrainingPdfUrl(training, { preferStream: true });
    let progressData = null;
    try {
      progressData = await fetchEbookProgress(token, training.id);
      if (progressData && typeof progressData === 'object') {
        training._progressInfo = progressData;
      }
    } catch (progressErr) {
      console.warn('[trainingReader] falha ao obter progresso do e-book', progressErr);
    }
    const initialPage = inferLearnerStartingPage(training, progressData);
    content.innerHTML = renderLearnerTrainingDetailHtml(training, role, { pdfUrl, readerMode: true, progressData, initialPage });

    const focusMode = sessionStorage.getItem('trainingReaderFocus');
    if (focusMode) {
      sessionStorage.removeItem('trainingReaderFocus');
      setTimeout(() => {
        let target = null;
        if (focusMode === 'progress') {
          target = content.querySelector('.learner-assignment') || content.firstElementChild;
        } else if (focusMode === 'details') {
          target = content.querySelector('.learner-overview') || content.firstElementChild;
        }
        if (target) {
          try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) { /* ignore scroll issues */ }
          target.classList.add('focus-ring-pulse');
          setTimeout(() => target.classList.remove('focus-ring-pulse'), 1800);
        }
      }, 220);
    }
    const titleEl = root.querySelector('.training-title');
    if (titleEl) titleEl.textContent = training.title || 'Leitura de E-book';
    const viewer = content.querySelector('#trainingPdfContainer');
    if (!viewer) return;
    if (!pdfUrl) {
      viewer.innerHTML = '<p class="td-empty">Nenhum material PDF foi disponibilizado para este treinamento.</p>';
      return;
    }
    viewer.innerHTML = '<div class="pdf-loading">Carregando PDF...</div>';
    const { renderPdfInto } = await import('./pdfViewer.js');
    const controller = await renderPdfInto(pdfUrl, viewer, { token, renderMode: 'single', initialPage });
    if (controller) {
      setupLearnerReaderControls({ root, controller, token, training, messages, progressInfo: progressData });
      const totalFromProgress = progressData && progressData.totalPages ? Number(progressData.totalPages) : 0;
      updateReaderProgressUI(root, {
        page: controller.currentPage || initialPage,
        totalPages: (totalFromProgress && Number.isFinite(totalFromProgress) ? totalFromProgress : 0) || controller.pageCount || Number(viewer.dataset.pdfPages || viewer.dataset.totalPages || 0)
      });
    }
  } catch (err) {
    console.error('[trainingReader] erro ao preparar leitor', err);
    content.innerHTML = '<p class="td-error">Não foi possível carregar o conteúdo no momento.</p>';
    if (messages) messages.textContent = escapeHtml(err.message || 'Erro inesperado.');
  }

  if (!root._readerHandlersBound) {
    root._readerHandlersBound = true;
    root.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action="readerBack"]');
      if (!btn) return;
      event.preventDefault();
      try {
        try {
          if (typeof root._readerCleanup === 'function') {
            root._readerCleanup();
            root._readerCleanup = null;
          }
        } catch (_) { /* noop */ }
        try { delete window._openTrainingId; } catch (_) {}
        showPage('learning', { forceReload: true });
      } catch (_) {
        window.location.hash = '#learning';
      }
    });
  }
}

async function renderLearnerTrainingDetail({ id, token, container, actionsBar, role }) {
  if (!container) return;
  container.classList.add('learner-detail');
  let training;
  try {
    training = await fetchLearnerTrainingData(id, token);
  } catch (err) {
    console.error('[learnerDetail] erro carregando treinamento', err);
    container.innerHTML = `<p class="td-error">${escapeHtml(err.message || 'Erro ao carregar treinamento.')}</p>`;
    if (actionsBar) {
      actionsBar.innerHTML = '';
      actionsBar.classList.add('is-empty');
    }
    return;
  }
  if (!training) {
    container.innerHTML = '<p class="td-empty">Treinamento não encontrado ou não atribuído.</p>';
    if (actionsBar) {
      actionsBar.innerHTML = '';
      actionsBar.classList.add('is-empty');
    }
    return;
  }
  try { window._currentTrainingDetail = training; } catch(_) {}
  const pdfUrl = resolveTrainingPdfUrl(training, { preferStream: true });
  container.innerHTML = renderLearnerTrainingDetailHtml(training, role, { pdfUrl });
  if (actionsBar) {
    const actionsHtml = buildLearnerActionsHtml(training);
    actionsBar.innerHTML = actionsHtml;
    if (!actionsHtml.trim()) actionsBar.classList.add('is-empty'); else actionsBar.classList.remove('is-empty');
  }
  const viewer = container.querySelector('#trainingPdfContainer');
  if (!viewer) return;
  if (!pdfUrl) {
    viewer.innerHTML = '<p class="td-empty">Nenhum material PDF foi disponibilizado para este treinamento.</p>';
    return;
  }
  viewer.innerHTML = '<div class="pdf-loading">Carregando PDF...</div>';
  try {
    const { renderPdfInto } = await import('./pdfViewer.js');
    await renderPdfInto(pdfUrl, viewer, { token });
  } catch (err) {
    console.error('[trainingDetail] erro ao renderizar PDF', err);
    viewer.innerHTML = '<p class="td-error">Não foi possível carregar o PDF no momento. Tente recarregar a página ou contate o administrador da plataforma.</p>';
  }
}

async function fetchLearnerTrainingData(id, token) {
  if (!id) throw new Error('Treinamento não informado.');
  if (!token) throw new Error('Sessão expirada.');
  let training = null;
  try {
    if (window._trainingDetailPreloaded && String(window._trainingDetailPreloaded.id) === String(id)) {
      training = window._trainingDetailPreloaded;
    }
  } catch (_) { /* ignore */ }
  if (!training) {
    const { getMyTrainingEnrollments } = await import('./api.js');
    const raw = await getMyTrainingEnrollments(token);
    training = extractLearnerTrainingFromCollection(raw, id);
  }
  try { delete window._trainingDetailPreloaded; } catch (_) { /* ignore */ }
  return training;
}

function buildLearnerActionsHtml() {
  return '';
}

function renderLearnerTrainingDetailHtml(training, role = 'ORG_MEMBER', { pdfUrl, readerMode = false, progressData = null, initialPage = 1 } = {}) {
  const enrollment = training && training._enrollment ? training._enrollment : {};
  const statusInfo = mapLearnerStatus(enrollment.enrollmentStatus || enrollment.status || training.enrollmentStatus);
  const entityBadge = mapEntityTypeBadge(training.entityType);
  const assignedAt = enrollment.enrolledAt || enrollment.assignedAt || enrollment.createdAt || training.enrolledAt || training.assignedAt;
  const assignedLabel = assignedAt ? formatLearnerAssignedDate(assignedAt) : '—';
  const lastAccess = enrollment.lastAccessedAt || enrollment.updatedAt || training.updatedAt || null;
  const progressInfo = progressData || training._progressInfo || null;
  const progressPercentRaw = (progressInfo && typeof progressInfo.progressPercentage === 'number') ? progressInfo.progressPercentage : null;
  const computedProgress = computeLearnerProgressValue(training);
  const normalizedPercent = progressPercentRaw != null ? Math.min(100, Math.max(0, Number(progressPercentRaw))) : computedProgress;
  const coverUrl = resolveTrainingCoverUrl(training);
  const placeholderLetter = (String(training.title || 'T').trim().charAt(0) || 'T').toUpperCase();
  const description = (training.description && training.description.trim()) ? escapeHtml(training.description.trim()) : '<em>Sem descrição informada.</em>';
  const badges = buildLearnerBadges(training, enrollment, entityBadge);
  const progressLabel = progressPercentRaw != null
    ? `${normalizedPercent % 1 === 0 ? normalizedPercent.toFixed(0) : normalizedPercent.toFixed(2)}%`
    : `${normalizedPercent}%`;
  const lastPageFromProgress = progressInfo && progressInfo.lastPageRead != null ? Math.max(1, Math.round(Number(progressInfo.lastPageRead))) : null;
  const totalPagesFromProgress = progressInfo && progressInfo.totalPages != null && Number(progressInfo.totalPages) > 0
    ? Math.max(1, Math.round(Number(progressInfo.totalPages)))
    : null;
  const initialReaderPage = Math.max(1, Math.round(Number(initialPage || lastPageFromProgress || 1)));

  const readerControlsMarkup = readerMode ? `
      <div class="reader-controls" data-reader-controls hidden>
        <button type="button" class="reader-nav-btn" data-reader-prev aria-label="Página anterior">Anterior</button>
        <div class="reader-page-indicator">Página <span data-reader-current>${escapeHtml(String(lastPageFromProgress || initialReaderPage))}</span> de <span data-reader-total>${totalPagesFromProgress ? escapeHtml(String(totalPagesFromProgress)) : '—'}</span></div>
        <div class="reader-progress-display">
          <div class="reader-progress-track" data-reader-progress-track role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${normalizedPercent}">
            <div class="reader-progress-fill" data-reader-progress-fill style="width:${normalizedPercent}%"></div>
          </div>
          <span class="reader-progress-text" data-reader-progress-text aria-live="polite">${escapeHtml(progressLabel)} concluído</span>
        </div>
        <button type="button" class="reader-nav-btn" data-reader-next aria-label="Próxima página">Próxima</button>
      </div>` : '';

  const coverMarkup = coverUrl
    ? `<div class="learner-cover"><img src="${escapeAttr(coverUrl)}" alt="Capa do treinamento" loading="lazy" decoding="async" /></div>`
    : `<div class="learner-cover"><div class="learning-cover-placeholder" aria-hidden="true">${escapeHtml(placeholderLetter)}</div></div>`;

  const readerHeading = readerMode ? 'Material atribuído' : 'Material do treinamento';
  const viewerContent = pdfUrl
    ? '<div class="pdf-loading">Carregando PDF...</div>'
    : '<p class="td-empty">Nenhum material PDF foi disponibilizado para este treinamento.</p>';

  const lastAccessLabel = lastAccess ? formatLearnerAssignedDate(lastAccess) : '—';
  const baseNote = 'Seu progresso é atualizado automaticamente ao avançar na leitura.';
  const noteText = (readerMode && (lastPageFromProgress || initialReaderPage) && totalPagesFromProgress)
    ? `Página ${escapeHtml(String(lastPageFromProgress || initialReaderPage))} de ${escapeHtml(String(totalPagesFromProgress))}. ${baseNote}`
    : baseNote;

  return `
    <div class="learner-overview" data-role="${escapeAttr(role || '')}">
      <div class="learner-meta">
        ${statusInfo.label ? `<span class="learner-status status-${escapeAttr(statusInfo.className)}">${escapeHtml(statusInfo.label)}</span>` : ''}
        ${badges.map(b => `<span class="learner-badge">${escapeHtml(b)}</span>`).join(' ')}
      </div>
      <h2 class="learner-title">${escapeHtml(training.title || 'Treinamento')}</h2>
      ${training.author ? `<p class="learner-author">Autor: <strong>${escapeHtml(training.author)}</strong></p>` : ''}
      <p class="learner-description">${description}</p>
      ${coverMarkup}
    </div>
    <div class="learner-assignment">
      <h3>Informações da sua matrícula</h3>
      <div class="learner-assignment-list">
        <div><dt>Status atual</dt><dd>${statusInfo.label ? escapeHtml(statusInfo.label) : '—'}</dd></div>
        <div><dt>Atribuído desde</dt><dd>${escapeHtml(assignedLabel)}</dd></div>
        <div><dt>Último acesso</dt><dd>${escapeHtml(lastAccessLabel)}</dd></div>
        <div><dt>Progresso</dt><dd><span data-learner-progress-value>${escapeHtml(progressLabel)}</span></dd></div>
      </div>
      <div class="learner-notes" data-learner-progress-note data-note-default="${escapeAttr(baseNote)}">${escapeHtml(noteText)}</div>
    </div>
    <div class="learner-reader" data-reader-root>
      <h3>${escapeHtml(readerHeading)}</h3>
      ${readerControlsMarkup}
      <div class="training-pdf-shell">
        <div class="training-pdf-container" id="trainingPdfContainer" data-training-id="${escapeAttr(training.id || '')}" ${totalPagesFromProgress ? `data-total-pages="${escapeAttr(String(totalPagesFromProgress))}"` : ''}>
          ${viewerContent}
        </div>
      </div>
    </div>`;
}

function mapLearnerStatus(status) {
  const normalized = (status || '').toString().toUpperCase();
  switch (normalized) {
    case 'ACTIVE':
      return { label: 'Em andamento', className: 'active' };
    case 'COMPLETED':
      return { label: 'Concluído', className: 'completed' };
    case 'CANCELLED':
      return { label: 'Cancelado', className: 'cancelled' };
    case 'NOT_ENROLLED':
    case 'PENDING':
      return { label: 'Não iniciado', className: 'pending' };
    default:
      return { label: '', className: '' };
  }
}

function mapEntityTypeBadge(entityType) {
  const normalized = (entityType || '').toString().toUpperCase();
  if (normalized === 'EBOOK') return 'E-book';
  if (normalized === 'RECORDED_COURSE') return 'Curso Gravado';
  if (normalized === 'LIVE_TRAINING') return 'Treinamento ao Vivo';
  return '';
}

function formatLearnerAssignedDate(value) {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (err) {
    return String(value || '—');
  }
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}

function computeLearnerProgressValue(training) {
  const enrollment = training && training._enrollment ? training._enrollment : {};
  let raw = firstDefined(
    training.progressPercentage,
    training.progress,
    enrollment.progressPercentage,
    enrollment.progress,
    enrollment.completionRate
  );
  if (raw === undefined || raw === null || raw === '') raw = 0;
  raw = Number(raw);
  if (!Number.isFinite(raw)) raw = 0;
  if (raw > 0 && raw <= 1) raw = raw * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function getStoredReaderPage(trainingId) {
  if (!trainingId) return null;
  try {
    const raw = localStorage.getItem(READER_PROGRESS_KEY_PREFIX + trainingId);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  } catch (_) {
    return null;
  }
}

function setStoredReaderPage(trainingId, page) {
  if (!trainingId) return;
  const value = Number(page);
  if (!Number.isFinite(value) || value <= 0) return;
  try {
    localStorage.setItem(READER_PROGRESS_KEY_PREFIX + trainingId, String(Math.round(value)));
  } catch (_) { /* ignore quota issues */ }
}

function extractLastPageFromTraining(training, progressInfo = null) {
  if (!training) return null;
  const enrollment = training._enrollment || {};
  const progress = progressInfo || training._progressInfo || null;
  const candidates = [
    progress && progress.lastPageRead,
    enrollment.lastPageRead,
    training.lastPageRead,
    enrollment.pageNumber,
    enrollment.page,
    enrollment.currentPage
  ];
  for (const candidate of candidates) {
    const num = Number(candidate);
    if (Number.isFinite(num) && num > 0) return Math.round(num);
  }
  return null;
}

function inferLearnerStartingPage(training, progressInfo = null) {
  const extracted = extractLastPageFromTraining(training, progressInfo);
  if (extracted) return extracted;
  const stored = getStoredReaderPage(training && training.id);
  if (stored) return stored;
  return 1;
}

function updateReaderProgressUI(root, { page, totalPages }) {
  if (!root) return;
  const numericPage = Math.max(1, Math.round(Number(page) || 1));
  const numericTotal = Math.max(0, Math.round(Number(totalPages) || 0));
  const currentEl = root.querySelector('[data-reader-current]');
  const totalEl = root.querySelector('[data-reader-total]');
  const progressValueEl = root.querySelector('[data-learner-progress-value]');
  const progressTextEl = root.querySelector('[data-reader-progress-text]');
  const progressTrack = root.querySelector('[data-reader-progress-track]');
  const progressFill = root.querySelector('[data-reader-progress-fill]');
  const noteEl = root.querySelector('[data-learner-progress-note]');

  if (currentEl) currentEl.textContent = String(numericPage);
  if (totalEl) totalEl.textContent = numericTotal > 0 ? String(numericTotal) : '—';

  let percent = null;
  if (numericTotal > 0) {
    percent = Math.min(100, Math.max(0, Math.round((numericPage / numericTotal) * 100)));
  }
  if (percent != null) {
    const label = `${percent}%`;
    if (progressValueEl) progressValueEl.textContent = label;
    if (progressTextEl) progressTextEl.textContent = `${label} concluído`;
    if (progressTrack) {
      progressTrack.setAttribute('aria-valuenow', String(percent));
      progressTrack.setAttribute('aria-valuetext', `Leitura ${percent}% concluída`);
    }
    if (progressFill) progressFill.style.width = `${percent}%`;
  } else {
    if (progressFill) progressFill.style.width = '0%';
  }

  if (noteEl) {
    const base = noteEl.dataset.noteDefault || noteEl.textContent || '';
    if (numericTotal > 0) {
      noteEl.textContent = `Página ${numericPage} de ${numericTotal}. ${base}`.trim();
    } else {
      noteEl.textContent = base;
    }
  }
}

function setupLearnerReaderControls({ root, controller, token, training, messages, progressInfo = null }) {
  if (!root || !controller) return;
  const controls = root.querySelector('[data-reader-controls]');
  if (!controls) return;

  if (typeof root._readerCleanup === 'function') {
    try { root._readerCleanup(); } catch (_) { /* noop */ }
    root._readerCleanup = null;
  }

  controls.hidden = false;
  controls.removeAttribute('hidden');
  controls.classList.add('is-ready');

  const prevBtn = controls.querySelector('[data-reader-prev]');
  const nextBtn = controls.querySelector('[data-reader-next]');
  const noteEl = root.querySelector('[data-learner-progress-note]');
  const container = root.querySelector('#trainingPdfContainer');
  const datasetTotal = container ? Number(container.dataset.totalPages || container.dataset.pdfPages || 0) : 0;
  const progressTotal = progressInfo && progressInfo.totalPages ? Number(progressInfo.totalPages) : 0;
  let totalPages = 0;
  if (Number.isFinite(progressTotal) && progressTotal > 0) totalPages = Math.round(progressTotal);
  if (!totalPages && Number.isFinite(datasetTotal) && datasetTotal > 0) totalPages = Math.round(datasetTotal);
  if (!totalPages && Number.isFinite(controller.pageCount) && controller.pageCount > 0) totalPages = Math.round(controller.pageCount);
  if (totalPages > 0 && container) {
    container.dataset.totalPages = String(totalPages);
  }
  if (noteEl) {
    noteEl.textContent = 'Use os botões de navegação ou as setas do teclado para registrar seu progresso automaticamente.';
  }

  if (totalPages <= 1) {
    controls.classList.add('is-single-page');
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
  }

  updateReaderProgressUI(root, { page: controller.currentPage || 1, totalPages });

  let isNavigating = false;
  let persistTimeout = null;
  const cleanupFns = [];
  const trainingId = training && training.id ? training.id : null;
  let lastPersistedPage = extractLastPageFromTraining(training, progressInfo) || getStoredReaderPage(trainingId);

  const finalizeNavigationState = () => {
    const current = controller.currentPage || 1;
    const disablePrev = current <= 1 || totalPages <= 1;
    const disableNext = totalPages <= 1 || (totalPages > 0 && current >= totalPages);
    if (prevBtn) prevBtn.disabled = disablePrev;
    if (nextBtn) nextBtn.disabled = disableNext;
  };

  finalizeNavigationState();

  const notifyProgressPersistError = () => {
    if (!messages) return;
    if (messages.dataset.progressError) return;
    messages.dataset.progressError = 'true';
    messages.textContent = 'Não foi possível salvar sua última página agora. Continuaremos tentando.';
    setTimeout(() => {
      if (messages.dataset.progressError) {
        messages.textContent = '';
        delete messages.dataset.progressError;
      }
    }, 4000);
  };

  const persistProgress = (page) => {
    const numericPage = Math.max(1, Math.round(Number(page) || 1));
    if (!trainingId) return;
    setStoredReaderPage(trainingId, numericPage);
    try {
      const enrollment = training ? (training._enrollment = training._enrollment || {}) : null;
      if (enrollment) enrollment.lastPageRead = numericPage;
      const info = training ? (training._progressInfo = training._progressInfo || {}) : null;
      if (info) {
        info.lastPageRead = numericPage;
        if (totalPages > 0) info.totalPages = totalPages;
        progressInfo = info;
      }
    } catch (_) { /* ignore */ }
    if (!token) return;
    if (lastPersistedPage === numericPage) return;
    if (persistTimeout) clearTimeout(persistTimeout);
    persistTimeout = setTimeout(async () => {
      try {
        await updateEbookProgress(token, trainingId, numericPage);
        lastPersistedPage = numericPage;
        if (messages) {
          delete messages.dataset.progressError;
          messages.textContent = '';
        }
      } catch (err) {
        console.warn('[trainingReader] falha ao atualizar progresso remoto', err);
        notifyProgressPersistError();
      }
    }, 800);
  };

  const navigateTo = async (delta) => {
    if (isNavigating || typeof controller.goTo !== 'function') return;
    const current = controller.currentPage || 1;
    let target = Number.isFinite(delta) ? current + delta : current;
    if (totalPages > 0) {
      target = Math.max(1, Math.min(totalPages, Math.round(target)));
    } else {
      target = Math.max(1, Math.round(target));
    }
    if (target === current) return;

    isNavigating = true;
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;

    try {
      await controller.goTo(target);
      const currentPage = controller.currentPage || target;
      if (!totalPages && container) {
        const refreshed = Number(container.dataset.totalPages || container.dataset.pdfPages || 0);
        if (Number.isFinite(refreshed) && refreshed > 0) {
          totalPages = Math.round(refreshed);
        }
      }
      if (!totalPages && Number.isFinite(controller.pageCount) && controller.pageCount > 0) {
        totalPages = Math.round(controller.pageCount);
      }
      if (totalPages > 0 && container) {
        container.dataset.totalPages = String(totalPages);
      }
      updateReaderProgressUI(root, { page: currentPage, totalPages });
      persistProgress(currentPage);
      if (trainingId && totalPages) {
        const percent = Math.min(100, Math.max(0, Math.round((currentPage / totalPages) * 100)));
        try {
          document.dispatchEvent(new CustomEvent('training:progress-updated', {
            detail: { trainingId, currentPage, totalPages, percent }
          }));
        } catch (_) { /* ignore */ }
      }
    } catch (err) {
      console.error('[trainingReader] erro ao renderizar página', err);
      if (messages && !messages.dataset.progressError) {
        messages.textContent = 'Não foi possível carregar a página. Tente novamente.';
        messages.dataset.progressError = 'temp';
        setTimeout(() => {
          if (messages.dataset.progressError === 'temp') {
            messages.textContent = '';
            delete messages.dataset.progressError;
          }
        }, 4000);
      }
    } finally {
      isNavigating = false;
      finalizeNavigationState();
    }
  };

  if (prevBtn) {
    const handler = () => navigateTo(-1);
    prevBtn.addEventListener('click', handler);
    cleanupFns.push(() => prevBtn.removeEventListener('click', handler));
  }
  if (nextBtn) {
    const handler = () => navigateTo(1);
    nextBtn.addEventListener('click', handler);
    cleanupFns.push(() => nextBtn.removeEventListener('click', handler));
  }

  const keyboardHandler = (event) => {
    const active = document.activeElement;
    const isInside = active ? root.contains(active) : false;
    if (!(isInside || active === document.body || active === null)) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigateTo(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigateTo(1);
    }
  };
  document.addEventListener('keydown', keyboardHandler);
  cleanupFns.push(() => document.removeEventListener('keydown', keyboardHandler));

  const cleanup = () => {
    if (persistTimeout) clearTimeout(persistTimeout);
    cleanupFns.forEach(fn => { try { fn(); } catch (_) { /* noop */ } });
    if (controller && typeof controller.destroy === 'function') {
      try { controller.destroy(); } catch (_) { /* noop */ }
    }
  };

  finalizeNavigationState();
  root._readerCleanup = cleanup;
  if (trainingId && totalPages) {
    const initialCurrent = controller.currentPage || 1;
    const percent = Math.min(100, Math.max(0, Math.round((initialCurrent / totalPages) * 100)));
    try {
      document.dispatchEvent(new CustomEvent('training:progress-updated', {
        detail: { trainingId, currentPage: initialCurrent, totalPages, percent }
      }));
    } catch (_) { /* ignore */ }
  }
  persistProgress(controller.currentPage || 1);
}

function buildLearnerBadges(training, enrollment, entityBadge) {
  const badges = [];
  if (entityBadge) badges.push(entityBadge);
  if (enrollment && Object.keys(enrollment).length) badges.push('Atribuído a mim');
  return badges;
}

function extractLearnerTrainingFromCollection(raw, id) {
  const list = Array.isArray(raw)
    ? raw
    : (raw && Array.isArray(raw.items)) ? raw.items
    : (raw && Array.isArray(raw.data)) ? raw.data
    : (raw && Array.isArray(raw.content)) ? raw.content
    : (raw && Array.isArray(raw.results)) ? raw.results
    : [];
  const targetId = String(id);
  for (const entry of list) {
    const normalized = normalizeLearnerTrainingItem(entry);
    if (normalized && String(normalized.id) === targetId) {
      return normalized;
    }
  }
  return null;
}

function normalizeLearnerTrainingItem(item) {
  if (!item) return null;
  const base = item.training || item.content || item;
  const normalized = { ...base };
  const enrollmentSource = item._enrollment || item.enrollment || base?._enrollment || base?.enrollment;
  if (enrollmentSource) normalized._enrollment = enrollmentSource;
  normalized.id = normalized.id || item.trainingId || item.id || base?.id || base?.uuid || base?.code;
  normalized.title = normalized.title || base?.title || item.trainingTitle || base?.name || item.name || 'Treinamento';
  if (!normalized.description) {
    if (typeof base?.description === 'string') normalized.description = base.description;
    else if (typeof item.description === 'string') normalized.description = item.description;
    else normalized.description = '';
  }
  normalized.entityType = normalized.entityType || base?.entityType || item.entityType || '';
  const status = normalized.publicationStatus || normalized.status || (normalized._enrollment && (normalized._enrollment.status || normalized._enrollment.enrollmentStatus)) || item.status;
  if (status) normalized.publicationStatus = status;
  if (!normalized.coverImageUrl) normalized.coverImageUrl = base?.coverImageUrl || item.coverImageUrl || (base?.cover && base.cover.url) || (item.cover && item.cover.url);
  if (!normalized.ebookDetails && (base?.ebookDetails || item.ebookDetails)) normalized.ebookDetails = base?.ebookDetails || item.ebookDetails;
  if (!normalized.pdfUrl && item.pdfUrl) normalized.pdfUrl = item.pdfUrl;
  return normalized.id ? normalized : null;
}

const PDF_URL_KEYS = ['pdfUrl','pdfPath','fileUrl','file','ebookUrl','ebookFileUrl','ebookFile','ebookPath','ebookPdfPath','filePath'];

function resolveTrainingPdfUrl(training, options = {}) {
  const { preferStream = false } = options || {};
  if (!training) return '';

  const id = training.id
    || training.trainingId
    || (training._enrollment && (training._enrollment.trainingId || training._enrollment.id));

  const rawType = training.entityType
    || training.trainingType
    || training.type
    || training.contentType
    || (training._enrollment && (training._enrollment.entityType || training._enrollment.trainingType));
  const entityType = rawType ? rawType.toString().toUpperCase() : '';

  const hasEbookHints = Boolean(
    (entityType && entityType.includes('EBOOK'))
    || training.ebookDetails
    || training.isEbook
    || training.hasPdf
    || training.pdfUrl
    || training.ebookUrl
  );

  if (preferStream && id && hasEbookHints) {
    return ensureAbsoluteUrl(`/stream/ebooks/${encodeURIComponent(String(id))}`);
  }

  const visited = new Set();
  const sources = [
    training,
    training.ebookDetails,
    training.details,
    training._enrollment,
    training._enrollment && training._enrollment.training
  ];
  for (const source of sources) {
    const value = scanPdfInSource(source, visited);
    if (value) return ensureAbsoluteUrl(value);
  }

  const ebookDetails = training.ebookDetails || training.details || null;
  if (ebookDetails) {
    const fileName = ebookDetails.fileName || ebookDetails.filename || ebookDetails.ebookFileName;
    if (fileName && typeof fileName === 'string') {
      const built = buildEbookFileUrl(fileName);
      if (built) return ensureAbsoluteUrl(built);
    }
    const rawUrl = ebookDetails.url || ebookDetails.link || ebookDetails.fileUrl;
    if (rawUrl && typeof rawUrl === 'string') {
      return ensureAbsoluteUrl(rawUrl);
    }
  }

  return '';
}

function scanPdfInSource(source, visited) {
  if (!source || typeof source !== 'object' || visited.has(source)) return '';
  visited.add(source);
  for (const key of PDF_URL_KEYS) {
    const v = source[key];
    if (typeof v === 'string') {
      if (/\.pdf($|\?)/i.test(v)) return v;
      if (/\/stream\/ebooks\//i.test(v)) return v;
    }
  }
  for (const val of Object.values(source)) {
    if (typeof val === 'string') {
      if (/\.pdf($|\?)/i.test(val)) return val;
      if (/\/stream\/ebooks\//i.test(val)) return val;
    }
    if (val && typeof val === 'object') {
      const nested = scanPdfInSource(val, visited);
      if (nested) return nested;
    }
  }
  return '';
}

function ensureAbsoluteUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  try {
    const base = API_BASE_URL.replace(/\/$/, '');
    if (url.startsWith('/')) return base + url;
    return `${base}/${url}`;
  } catch (_) {
    return url;
  }
}

function resolveTrainingCoverUrl(training) {
  if (!training) return '';
  const coverCandidates = [
    training.coverImageUrl,
    training.coverUrl,
    training.thumbnailUrl,
    training.cover,
    training.coverImage,
    training.thumbnail
  ];
  for (const candidate of coverCandidates) {
    if (!candidate) continue;
    if (typeof candidate === 'string') {
      if (candidate.trim()) return ensureAbsoluteUrl(candidate.trim());
    } else if (candidate && typeof candidate === 'object') {
      const val = candidate.url || candidate.path || candidate.src;
      if (val) return ensureAbsoluteUrl(val);
    }
  }
  if (training.ebookDetails) {
    const ebookCover = resolveTrainingCoverUrl(training.ebookDetails);
    if (ebookCover) return ebookCover;
  }
  return '';
}

function buildDetailPageActionsHtml(t, role='SYSTEM_ADMIN') {
  const pubStatus = (t.publicationStatus || t.status || '').toUpperCase();
  // Status válidos: DRAFT, PUBLISHED, ARCHIVED
  const published = pubStatus === 'PUBLISHED';
  const isEbook = (t.entityType || '').toUpperCase() === 'EBOOK';
  const hasPdf = isEbook && trainingHasPdf(t);
  const buttons = [];
  // Regras por papel
  if (role === 'SYSTEM_ADMIN') {
    buttons.push(
      `<button class="btn-small" data-action="reloadTrainingDetail" data-id="${escapeAttr(t.id)}" title="Recarregar">Recarregar</button>`,
      `<button class="btn-small" data-action="toggleRawJson" title="Mostrar/ocultar JSON bruto">JSON</button>`,
      `<button class="btn-small" data-action="editTraining" data-id="${escapeAttr(t.id)}">Editar</button>`,
      `<button class="btn-small" data-action="assignSectors" data-id="${escapeAttr(t.id)}">Setores</button>`,
      `<button class="btn-small" data-action="publishTraining" data-id="${escapeAttr(t.id)}" ${published ? 'disabled' : ''}>${published ? 'Publicado' : 'Publicar'}</button>`
    );
    if (isEbook) {
      buttons.push(`<button class="btn-small" data-action="uploadEbook" data-id="${escapeAttr(t.id)}">${hasPdf ? 'Substituir PDF' : 'Enviar PDF'}</button>`);
      if (hasPdf) buttons.push(`<button class="btn-small" data-action="viewEbook" data-id="${escapeAttr(t.id)}">Abrir PDF</button>`);
    }
    buttons.push(`<button class="btn-small" data-action="chooseCover" data-id="${escapeAttr(t.id)}">Capa</button>`);
    buttons.push(`<button class="btn-small btn-small-remove" data-action="deleteTraining" data-id="${escapeAttr(t.id)}">Excluir</button>`);
    return buttons.join('\n');
  }
  if (role === 'ORG_ADMIN') {
    buttons.push(`<button class="btn-small" data-action="reloadTrainingDetail" data-id="${escapeAttr(t.id)}">Recarregar</button>`);
    buttons.push(`<button class="btn-small" data-action="editTraining" data-id="${escapeAttr(t.id)}">Editar</button>`);
    if (isEbook) {
      buttons.push(`<button class="btn-small" data-action="uploadEbook" data-id="${escapeAttr(t.id)}">${hasPdf ? 'Substituir PDF' : 'Enviar PDF'}</button>`);
      if (hasPdf && published) buttons.push(`<button class="btn-small" data-action="viewEbook" data-id="${escapeAttr(t.id)}">Abrir PDF</button>`);
    }
    buttons.push(`<button class="btn-small" data-action="chooseCover" data-id="${escapeAttr(t.id)}">Capa</button>`);
    return buttons.join('\n');
  }
  if (role === 'ORG_MEMBER') {
    if (isEbook && hasPdf && published) {
      buttons.push(`<button class="btn-small" data-action="viewEbook" data-id="${escapeAttr(t.id)}">Abrir PDF</button>`);
    }
    return buttons.join('\n');
  }
  // GUEST
  if (isEbook && hasPdf && published) {
    buttons.push(`<button class="btn-small" data-action="promptLogin" data-id="${escapeAttr(t.id)}">Login para Acessar</button>`);
  }
  return buttons.join('\n');
}


function attachDetailPageHandlers(currentTraining) {
  const root = document.getElementById('trainingDetailPageRoot') || document;
  if (root._tdHandlersAttached) return; // evita múltiplas ligações ao navegar
  root._tdHandlersAttached = true;
  root.addEventListener('click', detailClickDelegate);
  root.addEventListener('change', detailChangeDelegate);
  root.addEventListener('keydown', (e) => {
    // Nenhuma lógica adicional necessária agora que é um button
  });
  // Fallback direto em pointerdown para alguns navegadores que bloqueiam re-dispatch
  root.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.td-cover-trigger');
    if (!el) return;
    // Não impedir comportamento padrão do label; apenas log para debug
    console.debug('[cover] pointerdown label');
  });
  // Fallback dedicado: se após click o input não disparar (nenhuma seleção / sem dialog), oferecer tentativa alternativa
  root.addEventListener('click', (e) => {
    const el = e.target.closest('.td-cover-trigger');
    if (!el) return;
    // Se navegador ignorar programatic click dentro do delegado principal, tentamos novamente aqui
    const ctxTraining = window._currentTrainingDetail || currentTraining;
    const id = el.getAttribute('data-id') || (ctxTraining && ctxTraining.id);
    const input = getCoverInput(id, { includeByFor: true });
    if (input && !input._lastUserArm) {
      // Marca tentativa manual
      input._lastUserArm = Date.now();
      setTimeout(() => {
        // Se ainda não houve seleção (value vazio) e nenhum dialog abriu (difícil detectar), forçamos outro click
        if (!input.value) {
          try { input.click(); console.debug('[cover] tentativa secundária de abertura do seletor'); } catch(err) { console.warn('[cover] falha fallback click', err); }
        }
      }, 120);
    }
  }, true);

  function detailClickDelegate(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const ctxTraining = window._currentTrainingDetail || currentTraining;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id') || (ctxTraining && ctxTraining.id);
    switch(action) {
      case 'backToTrainings':
        // Redireciona explicitamente para o painel de gestão de conteúdo
        try {
          // Remove qualquer referência ao id aberto para evitar reload automático do detalhe
          delete window._openTrainingId;
        } catch(_) {}
        const fallback = 'adminContent';
        const target = (window._prevAdminPage) ? window._prevAdminPage : fallback;
        try { history.replaceState(null,'','#'+target); } catch(_) { window.location.hash = '#'+target; }
        if (typeof showPage === 'function') {
          showPage(target, { from: 'trainingDetail' });
        } else {
          window.location.hash = '#'+target;
        }
        break;
      case 'reloadTrainingDetail':
        initTrainingDetailPage();
        break;
      case 'toggleRawJson': {
        const raw = document.querySelector('.td-raw');
        if (raw) raw.classList.toggle('is-hidden');
        break; }
      case 'publishTraining':
        confirmPublish(id, { source: 'detail' });
        break;
      case 'assignSectors':
        openAssignSectorModal(id);
        break;
      case 'editTraining':
        openEditTrainingModal(id);
        break;
      case 'deleteTraining':
        confirmDelete(id);
        break;
      case 'uploadEbook':
        triggerPdfUpload(id);
        break;
      case 'viewEbook':
        openPdfInNewTab(ctxTraining);
        break;
      case 'chooseCover': {
        // Remoção preventiva de overlays que possam ter ficado presos e estarem bloqueando clique
        try { clearStrayOverlays(); } catch(_) {}
        // Novo fallback definitivo: usar input temporário anexado ao body para garantir abertura nativa.
        promptCoverFileSelection(id)
          .then(file => { if (file) applySelectedCoverFile(id, file); })
          .catch(err => { if (err && err !== 'CANCELLED') console.warn('Seleção de capa cancelada/erro', err); });
        break; }
      case 'sendCoverUpload':
        sendCoverUpload(id);
        break;
      case 'cancelCoverSelection':
        resetCoverSelection(id);
        break;
      case 'retryCoverImg': {
        const wrap = document.querySelector('.td-box-cover');
        if (wrap) {
          const broken = wrap.querySelector('.td-cover-broken');
          let rawUrl = broken && broken.getAttribute('data-original-url');
          if (!rawUrl) {
            // tentar recuperar do dataset do botão
            rawUrl = btn.getAttribute('data-original-url');
          }
          if (rawUrl) {
            // aplicar cache-buster
            const rebuilt = rebuildCandidateCoverUrl(id, rawUrl, { forceBust:true });
            wrap.querySelector('.td-cover-preview').innerHTML = `<img src="${escapeAttr(rebuilt)}" alt="Capa" loading="lazy" decoding="async" />`;
            enhanceCoverImage({ id, coverImageUrl: rawUrl, _coverBustedUrl: rebuilt });
          }
        }
        break; }
      case 'promptLogin':
        try { showPage('loginPage'); } catch(_) { window.location.hash = '#loginPage'; }
        break;
    }
  }

  function detailChangeDelegate(e) {
    const input = e.target;
    if (!input.matches('input[type="file"][data-action="uploadCoverInput"]')) return;
    const id = input.getAttribute('data-id');
    onCoverFileSelected(id, input);
  }
}

// COVER IMAGE STATE
const coverSelectionState = new Map();
function clearStrayOverlays() {
  // Remove overlays de modais antigos que possam ter ficado (falha em callbacks / navegação rápida)
  document.querySelectorAll('.content-modal-overlay, .confirm-modal-overlay').forEach(el => {
    // Se a página atual é detalhe, não precisamos de nenhum overlay aberto
    el.remove();
  });
  // Também remover menus suspensos órfãos
  document.querySelectorAll('.action-menu.portal, .row-menu-backdrop').forEach(el => el.remove());
}
function getCoverInput(id, opts={}) {
  if (!id) return null;
  const sel = `input[data-action="uploadCoverInput"][data-id="${id}"]`;
  let found = null;
  try { found = document.querySelector(sel); } catch(_) {}
  if (!found && window.CSS && typeof CSS.escape === 'function') {
    try { found = document.querySelector(`input[data-action="uploadCoverInput"][data-id="${CSS.escape(String(id))}"]`); } catch(_) {}
  }
  if (!found && opts.includeByFor) {
    // Agora usamos botão; fallback: procurar botão com data-target-input
    const btn = document.querySelector(`.td-cover-trigger[data-id="${id}"]`);
    if (btn && btn.dataset.targetInput) {
      const byId = document.getElementById(btn.dataset.targetInput);
      if (byId) found = byId;
    }
  }
  return found;
}

function promptCoverFileSelection(trainingId) {
  return new Promise((resolve, reject) => {
    try {
      const temp = document.createElement('input');
      temp.type = 'file';
      temp.accept = 'image/*';
      temp.style.position = 'fixed';
      temp.style.left='-9999px';
      document.body.appendChild(temp);
      temp.addEventListener('change', () => {
        const file = temp.files && temp.files[0];
        temp.remove();
        if (!file) { reject('CANCELLED'); return; }
        resolve(file);
      }, { once:true });
      // Em alguns navegadores o click síncrono pode ser bloqueado se não for evento direto do usuário
      setTimeout(()=> { try { temp.click(); } catch(err) { temp.remove(); reject(err); } }, 0);
    } catch(err) { reject(err); }
  });
}

function applySelectedCoverFile(trainingId, file) {
  if (!trainingId || !file) return;
  coverSelectionState.set(trainingId, file);
  try {
    // Revogar URL anterior se existir
    if (window._pendingCoverPreviews[trainingId] && window._pendingCoverPreviews[trainingId].url) {
      URL.revokeObjectURL(window._pendingCoverPreviews[trainingId].url);
    }
    window._pendingCoverPreviews[trainingId] = { file, url: URL.createObjectURL(file) };
  } catch(err) { console.warn('[cover] falha ao gerar object URL', err); }
  // Atualiza UI principal se input original existir
  const input = getCoverInput(trainingId);
  if (input) {
    // Não é possível setar File programaticamente em input existente por segurança; apenas movimentamos estado e UI
    const row = input.closest('.td-cover-row');
    if (row) {
      const nameSpan = row.querySelector('[data-cover-filename]'); if (nameSpan) nameSpan.textContent = file.name;
      const sendBtn = row.querySelector('[data-action="sendCoverUpload"]'); if (sendBtn) sendBtn.style.display='';
      const cancelBtn = row.querySelector('[data-action="cancelCoverSelection"]'); if (cancelBtn) cancelBtn.style.display='';
    }
  } else {
    // Se não existe bloco ainda (edge case), apenas mostra toast; usuário pode reenviar após reload
    showToast('Arquivo pronto para envio (estado temporário)');
  }
}
function onCoverFileSelected(id, inputEl) {
  if (!id || !inputEl || !inputEl.files || !inputEl.files[0]) return;
  const file = inputEl.files[0];
  coverSelectionState.set(id, file);
  try {
    if (window._pendingCoverPreviews[id] && window._pendingCoverPreviews[id].url) {
      URL.revokeObjectURL(window._pendingCoverPreviews[id].url);
    }
    window._pendingCoverPreviews[id] = { file, url: URL.createObjectURL(file) };
  } catch(err) { console.warn('[cover] falha object URL (change)', err); }
  const row = inputEl.closest('.td-cover-row');
  if (row) {
    const nameSpan = row.querySelector('[data-cover-filename]');
    if (nameSpan) nameSpan.textContent = file.name;
    const sendBtn = row.querySelector('[data-action="sendCoverUpload"]');
    const cancelBtn = row.querySelector('[data-action="cancelCoverSelection"]');
    if (sendBtn) sendBtn.style.display = '';
    if (cancelBtn) cancelBtn.style.display = '';
    const prog = row.querySelector('[data-cover-progress]');
    if (prog) { prog.style.display = 'none'; prog.textContent = '0%'; }
  }
}

function resetCoverSelection(id) {
  coverSelectionState.delete(id);
  if (window._pendingCoverPreviews[id]) {
    try { if (window._pendingCoverPreviews[id].url) URL.revokeObjectURL(window._pendingCoverPreviews[id].url); } catch(_) {}
    delete window._pendingCoverPreviews[id];
  }
  const input = getCoverInput(id);
  if (input) input.value = '';
  const row = input && input.closest('.td-cover-row');
  if (row) {
    const nameSpan = row.querySelector('[data-cover-filename]');
    if (nameSpan) nameSpan.textContent = '';
    const sendBtn = row.querySelector('[data-action="sendCoverUpload"]');
    const cancelBtn = row.querySelector('[data-action="cancelCoverSelection"]');
    if (sendBtn) sendBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
    const prog = row.querySelector('[data-cover-progress]');
    if (prog) { prog.style.display = 'none'; prog.textContent = '0%'; }
  }
}

async function sendCoverUpload(id) {
  const file = coverSelectionState.get(id);
  if (!file) return;
  const row = getCoverInput(id)?.closest('.td-cover-row');
  const prog = row?.querySelector('[data-cover-progress]');
  if (prog) { prog.style.display = ''; prog.textContent = '0%'; }
  const token = getAuthToken();
  if (!token) { showToast('Sessão expirada.'); return; }
  try {
    await uploadTrainingCoverImage(token, id, file, (p)=> { if (prog) prog.textContent = p + '%'; });
    // Mostrar skeleton provisório no bloco de capa enquanto confirma
    try {
      const container = document.getElementById('trainingDetailContent');
      const coverBox = container && container.querySelector('.td-box-cover');
      if (coverBox) {
        let preview = coverBox.querySelector('.td-cover-preview');
        if (!preview) {
          preview = document.createElement('div');
          preview.className = 'td-cover-preview';
          coverBox.appendChild(preview);
        }
        preview.innerHTML = '<div class="td-cover-skeleton" aria-hidden="true"></div>';
        const statusEl = coverBox.querySelector('.td-warn, .td-ok');
        if (statusEl) statusEl.outerHTML = '<span class="td-ok">Processando capa...</span>';
      }
    } catch(_) {}
    // Após upload, refetch com retries para garantir propagação e confirmar coverImageUrl
    const fetched = await verifyCoverAfterUpload(token, id);
    if (fetched && fetched.coverImageUrl) {
      window._recentCoverUploadId = id; // sinaliza para aplicar cache-buster na próxima render
      showToast('Capa enviada e confirmada.');
      // Limpa preview local porque agora backend já deve servir
      if (window._pendingCoverPreviews[id]) {
        try { if (window._pendingCoverPreviews[id].url) URL.revokeObjectURL(window._pendingCoverPreviews[id].url); } catch(_) {}
        delete window._pendingCoverPreviews[id];
      }
    } else {
      console.debug('[coverUpload] coverImageUrl ainda ausente após retries', fetched);
      showToast('Upload feito, aguardando propagação da capa...', { type: 'warn' });
    }
    coverSelectionState.delete(id);
    await initTrainingDetailPage();
  } catch(err) {
    console.error('[coverUpload] Falha', err);
    showToast('Erro ao enviar capa');
  }
}

async function verifyCoverAfterUpload(token, id, { attempts = 5, delayMs = 600 } = {}) {
  const sleep = (ms) => new Promise(r=>setTimeout(r, ms));
  let last = null;
  for (let i=0;i<attempts;i++) {
    try {
      last = await getAdminTrainingById(token, id);
      console.debug(`[coverUpload] tentativa ${i+1}/${attempts} - coverImageUrl=`, last && last.coverImageUrl);
      if (last && last.coverImageUrl) return last;
    } catch(e) { /* ignora e tenta novamente */ }
    await sleep(delayMs);
  }
  return last;
}

function triggerPdfUpload(id) {
  if (typeof openEbookUploadModal === 'function') {
    let title = '';
    try { const obj = (Array.isArray(window._allTrainings) ? window._allTrainings.find(t=>t.id==id) : null); title = obj && obj.title || ''; } catch(_){ }
    openEbookUploadModal(id, { title, onCompleted: () => initTrainingDetailPage() });
  } else {
    alert('Upload PDF indisponível');
  }
}

function openPdfInNewTab(training) {
  try {
    const url = (training && (training.pdfUrl || training.pdfPath || training.fileUrl || training.ebookUrl));
    if (!url) { showToast('Nenhum PDF disponível'); return; }
    window.open(url, '_blank');
  } catch(err) { console.error(err); }
}

export { loadTrainings, navigateToTrainingDetail, getAuthToken };

// === Enriquecimento assíncrono para detectar PDF já existente sem abrir detalhes ===
let _ebookEnrichmentRunning = false;
function scheduleEbookPdfEnrichment() {
  if (_ebookEnrichmentRunning) return;
  // Executar apenas se houver e-books potencialmente sem PDF detectado
  const candidates = window._allTrainings.filter(t => t && t.entityType === 'EBOOK' && !trainingHasPdf(t) && !t._pdfChecked);
  if (!candidates.length) return;
  setTimeout(() => enrichEbookPdfStatus(), 60);
}

async function enrichEbookPdfStatus() {
  const maxConcurrency = 3;
  const all = window._allTrainings.filter(t => t && t.entityType === 'EBOOK' && !trainingHasPdf(t) && !t._pdfChecked);
  if (!all.length) return;
  _ebookEnrichmentRunning = true;
  const token = localStorage.getItem('jwtToken');
  const queue = [...all];
  async function worker() {
    while (queue.length) {
      const t = queue.shift();
      if (!t) continue;
      try {
        const detail = await getAdminTrainingById(token, t.id);
        detail._pdfChecked = true;
        // Atualiza na lista principal
        const idx = window._allTrainings.findIndex(x => x.id === t.id);
        if (idx !== -1) {
          window._allTrainings[idx] = { ...window._allTrainings[idx], ...detail, _pdfChecked: true };
        }
        if (trainingHasPdf(detail)) {
          // Atualiza somente a célula do título para evitar re-render completo
          const row = document.querySelector(`tr[data-training-id="${CSS.escape(String(t.id))}"]`);
          if (row) {
            const titleCell = row.querySelector('td:nth-child(2)');
            if (titleCell) {
              const hasPdf = true;
              const pdfSvg = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/><path d="M4.5 3.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/></svg>';
              const iconHtml = `<span class="ebook-ic" title="Arquivo enviado" aria-label="Arquivo enviado">${pdfSvg}</span>`;
              // Remove ícones antigos (ebook-ic / ebook-ic-missing)
              titleCell.innerHTML = `${escapeHtml(detail.title || t.title || '')} ${iconHtml}`;
            }
          }
        } else {
          // Marca que já checamos para não repetir
          const idx2 = window._allTrainings.findIndex(x => x.id === t.id);
          if (idx2 !== -1) window._allTrainings[idx2]._pdfChecked = true;
        }
      } catch (err) {
        console.warn('[enrichEbookPdfStatus] Falha ao obter detalhe de', t.id, err);
        t._pdfChecked = true; // evita loop infinito
      }
    }
  }
  const workers = Array.from({ length: Math.min(maxConcurrency, all.length) }, () => worker());
  await Promise.all(workers);
  _ebookEnrichmentRunning = false;
}

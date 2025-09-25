import { getAdminTrainings, createAdminTraining, publishAdminTraining, assignTrainingToSector, getAdminSectors, getAdminTrainingById, updateAdminTraining, deleteAdminTraining, uploadEbookFileWithProgress, buildEbookFileUrl } from './api.js';
import { uploadTrainingCoverImage } from './api.js';
import { showToast } from './notifications.js';
import { showPage } from './navigation.js';

function isSystemAdmin() {
  const raw = localStorage.getItem('systemRole') || localStorage.getItem('userRole') || '';
  return /SYSTEM[_-]?ADMIN|ADMIN/i.test(raw);
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

let cachedSectors = [];
window.uploadedEbooks = window.uploadedEbooks || {}; // legado (usado apenas para armazenar nome após upload, não define status)
window._allTrainings = window._allTrainings || [];
const FILTER_STATE = { text:'', type:'', status:'' };

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
  const overlay = document.createElement('div');
  overlay.className='content-modal-overlay';
  overlay.innerHTML = `
    <div class="content-modal" role="dialog" aria-modal="true" aria-labelledby="ebookUploadTitle">
      <h3 id="ebookUploadTitle">Enviar PDF do E-book</h3>
      <form id="ebookUploadForm" class="content-form" enctype="multipart/form-data">
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
          <button type="button" class="btn-small btn-small-remove" data-action="cancelUpload">Cancelar</button>
          <button type="submit" class="btn-small btn-small-change" id="ebookUploadSubmit">Enviar</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=> { if (e.target === overlay) closeAdminContentModal(); });
  // estilos de modal já carregados via CSS estático (_adminModals.css)
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
      await uploadEbookFileWithProgress(token, trainingId, f, (perc)=> {
        bar.style.width = perc + '%'; pct.textContent = perc + '%';
      });
  // Armazena somente nome (legado); status real virá do endpoint ao recarregar
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
    const status = t.publicationStatus || t.status || 'DRAFT';
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
      menuItems.push(`<button class=\"dropdown-item\" role=\"menuitem\" tabindex=\"-1\" data-action=\"uploadEbook\" data-id=\"${t.id}\"><span class=\"ic\">${iconUpload}</span>${hasPdf ? 'Substituir PDF' : 'Enviar PDF'}</button>`);
    }
    return `<tr data-training-id="${t.id}">
      <td>${t.id || ''}</td>
      <td>${escapeHtml(t.title || '')} ${ebookIcon}</td>
      <td>${escapeHtml(t.entityType || '')}</td>
      <td>${escapeHtml(status)}</td>
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
    <div class="inline-actions" style="justify-content:space-between; flex-wrap:wrap; gap:8px;">
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <button class="btn-small btn-small-change" data-action="newTraining">Novo Treinamento</button>
        <button class="btn-small" data-action="reloadTrainings">Recarregar</button>
      </div>
      <div class="filters" style="display:flex; gap:6px; flex-wrap:wrap; align-items:flex-end;">
        <div style="display:flex; flex-direction:column; gap:2px;">
          <label style="font-size:.6rem; font-weight:600;">Busca</label>
          <input type="text" data-filter="text" placeholder="Título..." style="padding:4px 6px; min-width:140px;" value="${escapeAttr(FILTER_STATE.text)}" />
        </div>
        <div style="display:flex; flex-direction:column; gap:2px;">
          <label style="font-size:.6rem; font-weight:600;">Tipo</label>
          <select data-filter="type" style="padding:4px 6px;">
            <option value="">Todos</option>
            <option value="RECORDED_COURSE" ${FILTER_STATE.type==='RECORDED_COURSE'?'selected':''}>Gravado</option>
            <option value="LIVE_TRAINING" ${FILTER_STATE.type==='LIVE_TRAINING'?'selected':''}>Ao Vivo</option>
            <option value="EBOOK" ${FILTER_STATE.type==='EBOOK'?'selected':''}>E-book</option>
          </select>
        </div>
        <div style="display:flex; flex-direction:column; gap:2px;">
          <label style="font-size:.6rem; font-weight:600;">Status</label>
            <select data-filter="status" style="padding:4px 6px;">
              <option value="">Todos</option>
              <option value="DRAFT" ${FILTER_STATE.status==='DRAFT'?'selected':''}>Draft</option>
              <option value="PUBLISHED" ${FILTER_STATE.status==='PUBLISHED'?'selected':''}>Publicado</option>
            </select>
        </div>
        <div style="font-size:.65rem; opacity:.8; white-space:nowrap;">${list.length} itens</div>
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
      textInput.addEventListener('input', debounce((e)=> { FILTER_STATE.text = e.target.value; renderTrainings(applyFilters(window._allTrainings)); }, 300));
      textInput._bound = true;
    }
    const onSel = () => { renderTrainings(applyFilters(window._allTrainings)); };
    if (typeSelect && !typeSelect._bound) {
      typeSelect.addEventListener('change', (e)=> { FILTER_STATE.type = e.target.value; onSel(); });
      typeSelect._bound = true;
    }
    if (statusSelect && !statusSelect._bound) {
      statusSelect.addEventListener('change', (e)=> { FILTER_STATE.status = e.target.value; onSel(); });
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
      let title = '';
      try { const obj = (Array.isArray(window._allTrainings) ? window._allTrainings.find(t=>t.id==id) : null); title = obj && obj.title || ''; } catch(_){}
      openEbookUploadModal(id, { title });
      closeAllMenus();
      return;
    }
    const viewEbookBtn = e.target.closest('[data-action="viewEbook"]');
    if (viewEbookBtn) { e.preventDefault(); openEbookViewer(viewEbookBtn.dataset.id); closeAllMenus(); return; }
  const viewBtn = e.target.closest('[data-action="viewTraining"]');
  if (viewBtn) { e.preventDefault(); navigateToTrainingDetail(viewBtn.dataset.id); closeAllMenus(); return; }
  };
  scopeIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset._contentHandlersAttached) {
      el.dataset._contentHandlersAttached = '1';
      el.addEventListener('click', handler);
    }
  });
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
      </form>
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

function renderTrainingDetailHtml(t) {
  const sectors = Array.isArray(t.sectors) ? t.sectors : (Array.isArray(t.assignedSectors) ? t.assignedSectors : []);
  // Categoria virtual "Global" para EBOOKs avulsos (sem setores). Não cria setor real, apenas exibição.
  const showGlobal = (t.entityType === 'EBOOK') && (!sectors || !sectors.length);
  const sectorsHtml = showGlobal
    ? '<ul class="td-sectors-list"><li>Global</li></ul>'
    : (sectors.length ? '<ul class="td-sectors-list">'+ sectors.map(s => `<li>${escapeHtml(s.name || s.title || s.sectorName || '')}</li>`).join('') +'</ul>' : '<p class="td-empty">Nenhum setor vinculado.</p>');
  // Campos Status e Autor restaurados para referência antes de clicar em Editar.
  const published = (t.publicationStatus || t.status || '').toUpperCase() === 'PUBLISHED';
  const ebookBlock = (t.entityType === 'EBOOK') ? (() => {
    const has = trainingHasPdf(t);
    const fileName = has ? extractPdfFileName(t) : '';
    const upd = has ? extractPdfUpdatedDate(t) : null;
    const statusHtml = has
      ? `<span class="td-ok">Arquivo enviado${fileName ? ': ' + escapeHtml(fileName) : ''}${upd ? ' (Atualizado em: '+ escapeHtml(upd.toLocaleString()) +')' : ''}</span>`
      : '<span class="td-warn">Arquivo não enviado</span>';
    return `
      <div class="td-box td-box-ebook">
        <strong class="td-box-title">E-book:</strong>
        ${statusHtml}
        <div class="td-actions-row">
          <button class="btn-small" data-action="uploadEbook" data-id="${t.id}">${has ? 'Substituir PDF' : 'Enviar PDF'}</button>
          ${has ? `<button class="btn-small" data-action="viewEbook" data-id="${t.id}">Abrir PDF</button>` : ''}
        </div>
      </div>`;
  })() : '';
  const coverBlock = (()=> {
    const hasCover = !!(t.coverImageUrl || t.coverImagePath || t.coverUrl);
    const url = t.coverImageUrl || t.coverImagePath || t.coverUrl || '';
    const preview = hasCover ? `<div class="td-cover-preview"><img src="${escapeAttr(url)}" alt="Capa" /></div>` : '';
    const inputId = 'coverInput-' + encodeURIComponent(String(t.id));
    return `<div class="td-box td-box-cover">
      <strong class="td-box-title">Capa:</strong>
      ${hasCover ? '<span class="td-ok">Imagem enviada</span>' : '<span class="td-warn">Nenhuma imagem</span>'}
      ${preview}
      <div class="td-cover-row">
        <input id="${inputId}" type="file" accept="image/*" data-action="uploadCoverInput" data-id="${t.id}" class="td-cover-input" />
        <label for="${inputId}" class="btn-small" data-action="chooseCover" data-id="${t.id}">${hasCover ? 'Escolher nova imagem' : 'Escolher imagem'}</label>
        <span data-cover-filename class="td-file-name"></span>
        <button type="button" class="btn-small btn-small-change" data-action="sendCoverUpload" data-id="${t.id}" style="display:none;">Enviar Capa</button>
        <button type="button" class="btn-small btn-small-remove" data-action="cancelCoverSelection" data-id="${t.id}" style="display:none;">Cancelar</button>
        <div class="cover-progress" data-cover-progress>0%</div>
      </div>
      <div class="td-hint">Formatos aceitos: JPG, PNG, WEBP. O upload só inicia após clicar em "Enviar Capa".</div>
    </div>`;
  })();
  // Bloco polimórfico conforme entityType
  let polymorphicBlock = '';
  if (t.entityType === 'EBOOK' && t.ebookDetails) {
    const d = t.ebookDetails;
    polymorphicBlock = `<div class="td-box td-box-poly"><strong class="td-box-title">Detalhes do E-book</strong>
      <div class="td-poly-grid">
        <div><span class="td-label">Páginas</span><span class="td-value">${escapeHtml(String(d.pages || d.totalPages || '—'))}</span></div>
        <div><span class="td-label">Idioma</span><span class="td-value">${escapeHtml(d.language || '—')}</span></div>
        <div><span class="td-label">Versão</span><span class="td-value">${escapeHtml(d.version || '—')}</span></div>
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
  return `
    <div class="td-block">
      <div class="td-grid">
        <div class="td-field"><span class="td-label">ID</span><span class="td-value">${escapeHtml(t.id || '')}</span></div>
        <div class="td-field"><span class="td-label">Título</span><span class="td-value">${escapeHtml(t.title || '')}</span></div>
        <div class="td-field"><span class="td-label">Tipo</span><span class="td-value">${escapeHtml(t.entityType || '')}</span></div>
        <div class="td-field"><span class="td-label">Status</span><span class="td-value">${escapeHtml(t.publicationStatus || t.status || '')}${published ? ' <span class="td-published">(Publicado)</span>' : ''}</span></div>
        <div class="td-field"><span class="td-label">Autor</span><span class="td-value">${escapeHtml(t.author || '')}</span></div>
        <div class="td-field"><span class="td-label">Criado em</span><span class="td-value">${escapeHtml(formatDateTime(t.createdAt))}</span></div>
        <div class="td-field"><span class="td-label">Atualizado em</span><span class="td-value">${escapeHtml(formatDateTime(t.updatedAt))}</span></div>
        <div class="td-field td-desc"><span class="td-label">Descrição</span><span class="td-value">${escapeHtml(t.description || '') || '<em>—</em>'}</span></div>
        <div class="td-field td-sectors"><span class="td-label">Setores</span><span class="td-value">${sectorsHtml}</span></div>
      </div>
      ${ebookBlock}
      ${coverBlock}
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
    if (dto.entityType === 'EBOOK' && createdId) {
      openEbookUploadModal(createdId, { title: dto.title });
    } else {
      loadTrainings();
    }
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
function navigateToTrainingDetail(id) {
  if (!id) return;
  try { window._openTrainingId = id; } catch(_) {}
  if (typeof showPage === 'function') {
    showPage('trainingDetail', { trainingId: id });
  } else { console.warn('showPage não disponível'); }
}

async function initTrainingDetailPage() {
  const container = document.getElementById('trainingDetailContent');
  const actionsBar = document.getElementById('trainingDetailActions');
  if (!container) return;
  const id = window._openTrainingId;
  if (!id) {
    container.innerHTML = '<p class="td-empty">ID do treinamento não definido.</p>';
    return;
  }
  container.innerHTML = '<div class="td-loading">Carregando...</div>';
  try {
    const token = getAuthToken();
    if (!token) {
      container.innerHTML = '<p class="td-error">Sessão não encontrada. Redirecionando para login...</p>';
      setTimeout(()=> { try { showPage('loginPage'); } catch(_) {} }, 900);
      return;
    }
    const t = await getAdminTrainingById(token, id);
    if (!t) {
      container.innerHTML = '<p class="td-empty">Treinamento não encontrado.</p>';
      return;
    }
    container.innerHTML = renderTrainingDetailHtml(t);
    if (actionsBar) {
      actionsBar.innerHTML = buildDetailPageActionsHtml(t);
    }
    updateTrainingDetailStatusPill(t);
    attachDetailPageHandlers(t);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="td-error">Erro ao carregar: ${escapeHtml(err.message || 'Erro')}</p>`;
  }
}

function buildDetailPageActionsHtml(t) {
  const pubStatus = (t.publicationStatus || t.status || '').toUpperCase();
  // Status válidos: DRAFT, PUBLISHED, ARCHIVED
  const published = pubStatus === 'PUBLISHED';
  const isEbook = (t.entityType || '').toUpperCase() === 'EBOOK';
  const hasPdf = isEbook && trainingHasPdf(t);
  const buttons = [
    `<button class="btn-small" data-action="backToTrainings">Voltar</button>`,
    `<button class="btn-small" data-action="reloadTrainingDetail" data-id="${escapeAttr(t.id)}" title="Recarregar">Recarregar</button>`,
    `<button class="btn-small" data-action="toggleRawJson" title="Mostrar/ocultar JSON bruto">JSON</button>`,
    `<button class="btn-small" data-action="editTraining" data-id="${escapeAttr(t.id)}">Editar</button>`,
    `<button class="btn-small" data-action="assignSectors" data-id="${escapeAttr(t.id)}">Setores</button>`,
    `<button class="btn-small" data-action="publishTraining" data-id="${escapeAttr(t.id)}" ${published ? 'disabled' : ''}>${published ? 'Publicado' : 'Publicar'}</button>`,
    `<button class="btn-small btn-small-remove" data-action="deleteTraining" data-id="${escapeAttr(t.id)}">Excluir</button>`
  ];
  if (isEbook) {
    buttons.push(`<button class="btn-small" data-action="uploadEbook" data-id="${escapeAttr(t.id)}">${hasPdf ? 'Substituir PDF' : 'Enviar PDF'}</button>`);
    if (hasPdf) buttons.push(`<button class="btn-small" data-action="viewEbook" data-id="${escapeAttr(t.id)}">Abrir PDF</button>`);
  }
  // Botão para abrir seletor de capa rapidamente
  buttons.push(`<button class="btn-small" data-action="chooseCover" data-id="${escapeAttr(t.id)}">Capa</button>`);
  return buttons.join('\n');
}

function updateTrainingDetailStatusPill(t) {
  const pill = document.getElementById('trainingDetailStatus');
  if (!pill) return;
  const pubStatus = (t.publicationStatus || t.status || '—');
  pill.textContent = pubStatus;
  pill.classList.remove('is-published','is-draft','is-archived');
  if (pubStatus.toUpperCase() === 'PUBLISHED') {
    pill.classList.add('is-published');
  } else if (/ARCHIVED/i.test(pubStatus)) {
    pill.classList.add('is-archived');
  } else if (/DRAFT/i.test(pubStatus)) {
    pill.classList.add('is-draft');
  }
}

function attachDetailPageHandlers(currentTraining) {
  const root = document.getElementById('trainingDetailPageRoot') || document;
  if (root._tdHandlersAttached) return; // evita múltiplas ligações ao navegar
  root._tdHandlersAttached = true;
  root.addEventListener('click', detailClickDelegate);
  root.addEventListener('change', detailChangeDelegate);

  function detailClickDelegate(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id') || (currentTraining && currentTraining.id);
    switch(action) {
      case 'backToTrainings':
        // Limpa hash e volta
        try { history.replaceState(null,'','#adminContent'); } catch(_) { window.location.hash = '#adminContent'; }
        showPage('adminContent');
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
        openPdfInNewTab(currentTraining);
        break;
      case 'chooseCover': {
        const input = document.querySelector(`input[data-action="uploadCoverInput"][data-id="${CSS.escape(String(id))}"]`);
        if (input) input.click();
        break; }
      case 'sendCoverUpload':
        sendCoverUpload(id);
        break;
      case 'cancelCoverSelection':
        resetCoverSelection(id);
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
function onCoverFileSelected(id, inputEl) {
  if (!id || !inputEl || !inputEl.files || !inputEl.files[0]) return;
  const file = inputEl.files[0];
  coverSelectionState.set(id, file);
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
  const input = document.querySelector(`input[data-action="uploadCoverInput"][data-id="${CSS.escape(String(id))}"]`);
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
  const row = document.querySelector(`input[data-action="uploadCoverInput"][data-id="${CSS.escape(String(id))}"]`)?.closest('.td-cover-row');
  const prog = row?.querySelector('[data-cover-progress]');
  if (prog) { prog.style.display = ''; prog.textContent = '0%'; }
  try {
    const token = getAuthToken();
    await uploadTrainingCoverImage(token, id, file, (p)=> { if (prog) prog.textContent = p + '%'; });
    showToast('Capa enviada com sucesso');
    coverSelectionState.delete(id);
    await initTrainingDetailPage();
  } catch(err) {
    console.error(err);
    showToast('Erro ao enviar capa');
  }
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

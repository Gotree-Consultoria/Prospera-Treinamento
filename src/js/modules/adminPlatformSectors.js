import { getAdminSectors, createAdminSector, deleteAdminSector } from './api.js';
import { showToast } from './notifications.js';

function isSystemAdmin() {
  const raw = localStorage.getItem('systemRole') || localStorage.getItem('userRole') || '';
  return /SYSTEM[_-]?ADMIN|ADMIN/i.test(raw);
}

async function loadSectors() {
  const tbody = document.querySelector('#platformSectorsTable tbody');
  const msg = document.getElementById('platformSectorsMessages');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';
  if (msg) { msg.textContent = ''; }
  try {
    if (!isSystemAdmin()) {
      tbody.innerHTML = '<tr><td colspan="3">Acesso negado.</td></tr>';
      if (msg) msg.textContent = 'Apenas SYSTEM_ADMIN.';
      return;
    }
    const token = localStorage.getItem('jwtToken');
    const data = await getAdminSectors(token);
    const list = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : (Array.isArray(data.data) ? data.data : []));
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="3">Nenhum setor cadastrado.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    list.forEach(s => {
      const tr = document.createElement('tr');
      const tdId = document.createElement('td'); tdId.textContent = s.id || s.sectorId || s._id || '';
      const tdName = document.createElement('td'); tdName.textContent = s.name || s.nome || s.title || '';
      const tdActions = document.createElement('td');
  const editBtn = document.createElement('button'); editBtn.className='btn-small btn-small-change'; editBtn.type='button'; editBtn.textContent='Editar'; editBtn.dataset.action='editSector'; editBtn.dataset.sectorId = tdId.textContent;
  const delBtn = document.createElement('button'); delBtn.className='btn-small btn-small-remove'; delBtn.type='button'; delBtn.style.marginLeft='4px'; delBtn.textContent='Excluir'; delBtn.dataset.action='deleteSector'; delBtn.dataset.sectorId = tdId.textContent;
      tdActions.appendChild(editBtn); tdActions.appendChild(delBtn);
      tr.appendChild(tdId); tr.appendChild(tdName); tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Erro ao carregar setores:', e);
    tbody.innerHTML = '<tr><td colspan="3">Erro ao carregar setores.</td></tr>';
    if (msg) msg.textContent = e.message || 'Erro.';
  }
}

function attachHandlers() {
  const container = document.getElementById('platformSectorsPage');
  if (!container) return;
  container.addEventListener('click', (ev) => {
    const reload = ev.target.closest('[data-action="reloadSectors"]');
    if (reload) { ev.preventDefault(); loadSectors(); }
    const createBtn = ev.target.closest('[data-action="createSector"]');
  if (createBtn) { ev.preventDefault(); openCreateSectorModal(); }
    const editBtn = ev.target.closest('[data-action="editSector"]');
    if (editBtn) { ev.preventDefault(); showToast('Editar setor '+ editBtn.dataset.sectorId +' (placeholder).'); }
    const delBtn = ev.target.closest('[data-action="deleteSector"]');
    if (delBtn) {
      ev.preventDefault();
      const sectorId = delBtn.dataset.sectorId;
      if (!sectorId) return;
      if (!confirm('Excluir setor '+ sectorId +'? Esta ação não pode ser desfeita.')) return;
      handleDeleteSector(sectorId, delBtn);
    }
  });
}

document.addEventListener('page:loaded', (e) => {
  if (e.detail && e.detail.page === 'platformSectors') {
    attachHandlers();
    loadSectors();
  }
});

export { loadSectors };

// ---------- Modal de criação ----------
function openCreateSectorModal() {
  closeExistingSectorModal();
  const overlay = document.createElement('div');
  overlay.className = 'sector-modal-overlay';
  overlay.innerHTML = `
    <div class="sector-modal" role="dialog" aria-modal="true" aria-labelledby="sectorModalTitle">
      <h3 id="sectorModalTitle">Novo Setor</h3>
      <form id="createSectorForm" class="sector-form">
        <label for="sectorNameInput">Nome do Setor</label>
        <input type="text" id="sectorNameInput" name="name" required maxlength="120" placeholder="Ex: Segurança do Trabalho" />
        <div class="form-messages" id="sectorModalMessages" aria-live="polite"></div>
        <div class="sector-modal-actions">
          <button type="button" class="btn-small btn-small-remove" data-action="cancelCreateSector">Cancelar</button>
          <button type="submit" class="btn-small btn-small-change" id="createSectorSubmit">Criar</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeExistingSectorModal(); });
  const form = overlay.querySelector('#createSectorForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = form.querySelector('#sectorNameInput');
    const messages = form.querySelector('#sectorModalMessages');
    const submitBtn = form.querySelector('#createSectorSubmit');
    messages.textContent = '';
    const rawName = nameInput.value;
    if (!rawName.trim()) {
      messages.textContent = 'Informe um nome.';
      nameInput.focus();
      return;
    }
    submitBtn.disabled = true; submitBtn.textContent = 'Criando...';
    try {
      const token = localStorage.getItem('jwtToken');
      await createAdminSector(token, rawName.trim());
      showToast('Setor criado com sucesso.');
      closeExistingSectorModal();
      loadSectors();
    } catch (err) {
      console.error('Erro ao criar setor:', err);
      if (err.code === 'SECTOR_DUPLICATE') messages.textContent = 'Já existe um setor com esse nome.';
      else if (err.code === 'VALIDATION_NAME_REQUIRED') messages.textContent = 'Nome é obrigatório.';
      else messages.textContent = err.message || 'Erro ao criar setor.';
    } finally {
      submitBtn.disabled = false; submitBtn.textContent = 'Criar';
    }
  });
  form.querySelector('[data-action="cancelCreateSector"]').addEventListener('click', (e) => { e.preventDefault(); closeExistingSectorModal(); });
  setTimeout(()=> { try { form.querySelector('#sectorNameInput').focus(); } catch(e){} }, 30);
  injectSectorModalStyles();
}

function closeExistingSectorModal() {
  const existing = document.querySelector('.sector-modal-overlay');
  if (existing) existing.remove();
}

function injectSectorModalStyles() {
  if (document.getElementById('sectorModalStyles')) return;
  const style = document.createElement('style');
  style.id = 'sectorModalStyles';
  style.textContent = `
    .sector-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:9999; }
    .sector-modal { background:#fff; width:min(92vw,420px); padding:18px 20px 20px; border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,0.25); animation:sectorModalIn .25s ease; }
    @keyframes sectorModalIn { from { opacity:0; transform:translateY(12px);} to { opacity:1; transform:translateY(0);} }
    .sector-form { display:flex; flex-direction:column; gap:10px; }
    .sector-form label { font-size:0.8rem; font-weight:600; }
    .sector-form input { padding:8px 10px; border:1px solid #ccc; border-radius:6px; font-size:0.85rem; }
    .sector-form input:focus { outline:2px solid var(--verde-claro); outline-offset:2px; }
    .sector-modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:4px; }
    .sector-modal .form-messages { background:rgba(220,20,60,0.06); color:#b33; padding:6px 8px; border-radius:4px; font-size:0.75rem; min-height:18px; }
    @media (max-width:520px) { .sector-modal { width:94vw; padding:16px 16px 18px; } }
  `;
  document.head.appendChild(style);
}

async function handleDeleteSector(sectorId, btn) {
  const tbody = document.querySelector('#platformSectorsTable tbody');
  const msgBox = document.getElementById('platformSectorsMessages');
  const originalText = btn.textContent;
  btn.disabled = true; btn.textContent = 'Excluindo...';
  try {
    const token = localStorage.getItem('jwtToken');
    await deleteAdminSector(token, sectorId);
    showToast('Setor excluído.');
    // Remover linha localmente para feedback imediato
    const tr = btn.closest('tr');
    if (tr) tr.remove();
    // Se tabela esvaziou, recarregar para garantir estado consistente
    if (tbody && !tbody.querySelector('tr')) loadSectors();
  } catch (e) {
    console.error('Erro ao excluir setor:', e);
    let msg = e.message || 'Erro ao excluir setor.';
    if (e.code === 'SECTOR_IN_USE') {
      // Se o backend já trouxe a frase específica, mantemos; senão padronizamos
      const lower = msg.toLowerCase();
      if (!lower.includes('não é possível excluir') && !lower.includes('em uso')) {
        msg = 'Não é possível excluir este setor, pois ele está associado a treinamentos.';
      }
    }
    if (e.code === 'SECTOR_NOT_FOUND') msg = 'Setor não encontrado.';
    showToast(msg, { type: 'error' });
    // Mostrar também em área persistente para o admin ver/contexto
    if (msgBox) {
      const detail = document.createElement('div');
      detail.className = 'inline-error-detail';
      detail.textContent = msg;
      // Guardar código e status para debug
      if (e.code) detail.setAttribute('data-code', e.code);
      if (e.status) detail.setAttribute('data-status', e.status);
      msgBox.innerHTML = ''; // sobrescreve última
      msgBox.appendChild(detail);
    }
    btn.disabled = false; btn.textContent = originalText;
  }
}
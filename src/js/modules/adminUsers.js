// Módulo para gerenciamento de listagem e detalhe de usuários (requisição ao /admin/users)
import { showPage } from './navigation.js';
import { getAdminUsers, getAdminUserById, API_BASE_URL, patchAdminUserStatus, getAdminOrganizations, patchAdminOrganizationStatus, getAdminContentSummary, getAdminAnalyticsSummary, deactivateAdminUser, activateAdminUser } from './api.js';
import { loadTrainings as loadAdminTrainings } from './adminContent.js';
import { showToast } from './notifications.js';

// Normaliza strings de role: remove espaços e converte para UPPERCASE para comparações robustas
function normalizeRole(value) {
    if (value === null || value === undefined) return '';
    try {
        const s = String(value).trim().toUpperCase();
    // normalizar variantes como SYSTEM-ADMIN, SYSTEM_ADMIN, "SYSTEM ADMIN" ou SYSTEMADMIN
    return s.replace(/[-_\s]+/g, '_');
    } catch (e) { return '' + value; }
}

function isSystemAdmin() {
    const token = localStorage.getItem('jwtToken');
    const rawSystemRole = localStorage.getItem('systemRole');
    const rawUserRole = localStorage.getItem('userRole');
    const profileRole = (window && window.profileData && (window.profileData.role || window.profileData.systemRole)) ? (window.profileData.role || window.profileData.systemRole) : null;
    const sourceValue = rawSystemRole || rawUserRole || profileRole || '';
    const normalized = normalizeRole(sourceValue);
    // aceitar também aliases como ADMIN para facilitar testes locais
    const isAdmin = !!token && (normalized === 'SYSTEM_ADMIN' || normalized === 'ADMIN' || normalized === 'SYSTEMADMIN');
    console.debug('[isSystemAdmin] token present=', !!token, 'rawSystemRole=', rawSystemRole, 'rawUserRole=', rawUserRole, 'profileRole=', profileRole, 'normalized=', normalized, 'isAdmin=', isAdmin);
    return isAdmin;
}

function showAccessDenied(containerMessagesId) {
    const el = document.getElementById(containerMessagesId);
    if (el) el.textContent = 'Acesso negado. Apenas SYSTEM_ADMIN pode acessar esta página.';
}

async function fetchAdminUsers() {
    const token = localStorage.getItem('jwtToken');
    if (!token) throw new Error('token-missing');
    return await getAdminUsers(token);
}

function renderAdminUsers(users) {
    const table = document.getElementById('adminUsersTable');
    const tbody = document.getElementById('adminUsersTbody');
    if (!table || !tbody) return;
    // descobrir todas as chaves presentes no array de objetos
    const columnsSet = new Set();
    users.forEach(u => Object.keys(u || {}).forEach(k => columnsSet.add(k)));
    // garantir ordem: id, email, role, enabled primeiro
    const preferred = ['id', 'userId', '_id', 'email', 'role', 'systemRole', 'enabled'];
    const allCols = Array.from(columnsSet);
    // ordenar por preferencia
    allCols.sort((a, b) => {
        const ia = preferred.indexOf(a) >= 0 ? preferred.indexOf(a) : 999;
        const ib = preferred.indexOf(b) >= 0 ? preferred.indexOf(b) : 999;
        if (ia !== ib) return ia - ib;
        return a.localeCompare(b);
    });

    // reconstruir cabeçalho dinamicamente
    const thead = table.querySelector('thead');
    if (thead) {
        thead.innerHTML = '';
        const trh = document.createElement('tr');
        allCols.forEach(col => {
            // mapear nomes amigáveis
            let label = col;
            if (col === 'userId' || col === '_id' || col === 'id') label = 'ID do usuário';
            if (col === 'email') label = 'Email';
            if (col === 'role' || col === 'systemRole') label = 'Role';
            if (col === 'enabled') label = 'Status';
            const th = document.createElement('th'); th.textContent = label; trh.appendChild(th);
        });
        // coluna de ações
        const thActions = document.createElement('th'); thActions.textContent = 'Ações'; trh.appendChild(thActions);
        thead.appendChild(trh);
    }

    tbody.innerHTML = '';
    users.forEach(u => {
        const tr = document.createElement('tr');
        allCols.forEach(col => {
            const td = document.createElement('td');
            let val = u[col];
            // heurísticas para id/email/role/enabled a partir de possíveis campos alternativos
            if ((col === 'id' || col === 'userId' || col === '_id') && !val) val = u.id || u.userId || u._id || '';
            if (col === 'email' && !val) val = u.email || u.userEmail || '';
            if ((col === 'role' || col === 'systemRole') && !val) val = u.role || u.systemRole || '';
            if (col === 'enabled' && (val === true || val === false)) val = val ? 'Ativo' : 'Inativo';
            td.textContent = (val === null || val === undefined) ? '' : String(val);
            // friendly data-label for responsive view
            let dataLabel = col;
            if (col === 'userId' || col === '_id' || col === 'id') dataLabel = 'ID do usuário';
            else if (col === 'email') dataLabel = 'Email';
            else if (col === 'role' || col === 'systemRole') dataLabel = 'Role';
            else if (col === 'enabled') dataLabel = 'Status';
            td.setAttribute('data-label', dataLabel);
            tr.appendChild(td);
        });
        // ações
        const tdActions = document.createElement('td');
        const idVal = u.id || u.userId || u._id || '';
        const btn = document.createElement('button'); btn.className = 'btn-small view-user'; btn.setAttribute('data-userid', idVal); btn.textContent = 'Ver Detalhes';
        tdActions.appendChild(btn);
    const enabledState = (u.enabled === false) ? false : true;
    // Toggle switch no mesmo padrão do Card 2
    const switchLabel = document.createElement('label');
    switchLabel.className = 'switch';
    const switchInput = document.createElement('input');
    switchInput.type = 'checkbox';
    switchInput.className = 'toggle-user-switch';
    switchInput.setAttribute('data-userid', idVal);
    switchInput.setAttribute('data-email', u.email || u.userEmail || '');
    switchInput.checked = enabledState;
    switchInput.setAttribute('data-enabled', enabledState ? 'true' : 'false');
    switchInput.setAttribute('aria-label', enabledState ? 'Inativar usuário' : 'Ativar usuário');
    const slider = document.createElement('span'); slider.className = 'slider';
    switchLabel.appendChild(switchInput);
    switchLabel.appendChild(slider);
    tdActions.appendChild(document.createTextNode(' '));
    tdActions.appendChild(switchLabel);
        tdActions.setAttribute('data-label', 'Ações');
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
    });
}

// Handler para ativar/inativar usuário
async function handleToggleUserStatus(userId, currentEnabled, btnEl, statusTd) {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        alert('Token ausente. Faça login novamente.');
        return;
    }
    const newEnabled = !currentEnabled;
    try {
        const res = await patchAdminUserStatus(token, userId, newEnabled);
        // atualizar texto do botão e coluna status
        btnEl.textContent = newEnabled ? 'Inativar' : 'Ativar';
        btnEl.setAttribute('data-enabled', newEnabled ? 'true' : 'false');
        if (statusTd) statusTd.textContent = newEnabled ? 'Ativo' : 'Inativo';
        console.log('patchAdminUserStatus result:', res);
    } catch (err) {
        console.error('Erro ao alterar status do usuário:', err);
        const msg = document.getElementById('adminUsersMessages');
        if (msg) msg.textContent = 'Erro ao alterar status do usuário: ' + (err.message || err) + (err.status ? ' (HTTP ' + err.status + ')' : '');
    }
}

// Debug helper: mostra token/role no topo da página (apenas para diagnóstico)
function showAdminDebugInfo() {
    const container = document.querySelector('.adminUsersPage .container');
    if (!container) return;
    let debugEl = document.getElementById('adminDebugInfo');
    if (!debugEl) {
        debugEl = document.createElement('div');
        debugEl.id = 'adminDebugInfo';
        debugEl.style.fontSize = '0.85rem';
        debugEl.style.marginBottom = '8px';
        debugEl.style.color = '#444';
        container.insertBefore(debugEl, container.firstChild);
    }
    const token = localStorage.getItem('jwtToken');
    const rawSystemRole = localStorage.getItem('systemRole');
    const rawUserRole = localStorage.getItem('userRole');
    const profileRole = (window && window.profileData && (window.profileData.role || window.profileData.systemRole)) ? (window.profileData.role || window.profileData.systemRole) : null;
    const isAdmin = isSystemAdmin();
    // mostrar token truncado para evitar expor inteiro na UI
    const tokenShort = token ? (token.length > 20 ? token.substring(0, 8) + '...' + token.substring(token.length - 8) : token) : null;
    debugEl.innerHTML = `DEBUG: token=${token ? 'present' : 'missing'} (${tokenShort || '—'}); systemRole(localStorage)=${rawSystemRole || '—'}; userRole(localStorage)=${rawUserRole || '—'}; profileRole=${profileRole || '—'}; isSystemAdmin=${isAdmin}; API_BASE_URL=${API_BASE_URL}`;
}

// Modal de confirmação simples (retorna Promise<boolean>)
function confirmAction({ title = 'Confirmar', message = 'Tem certeza?', confirmText = 'Confirmar', cancelText = 'Cancelar' } = {}) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0,0,0,0.45)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';

        const dialog = document.createElement('div');
        dialog.style.background = '#fff';
        dialog.style.borderRadius = '8px';
        dialog.style.width = 'min(92vw, 480px)';
        dialog.style.maxWidth = '480px';
        dialog.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
        dialog.style.padding = '20px';
        dialog.innerHTML = `
            <h3 style="margin:0 0 8px 0; font-size:1.15rem;">${title}</h3>
            <p style="margin:0 0 16px 0; color:#444;">${message}</p>
            <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button class="confirm-cancel" style="padding:8px 12px; background:#e5e7eb; border:0; border-radius:6px; cursor:pointer;">${cancelText}</button>
                <button class="confirm-ok" style="padding:8px 12px; background:#0ea5e9; color:white; border:0; border-radius:6px; cursor:pointer;">${confirmText}</button>
            </div>
        `;
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const cleanup = () => overlay.remove();
        dialog.querySelector('.confirm-cancel').addEventListener('click', () => { cleanup(); resolve(false); });
        dialog.querySelector('.confirm-ok').addEventListener('click', () => { cleanup(); resolve(true); });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) { cleanup(); resolve(false); }});
        const onKey = (e) => { if (e.key === 'Escape') { cleanup(); resolve(false); document.removeEventListener('keydown', onKey); } };
        document.addEventListener('keydown', onKey);
    });
}

function attachListHandlers() {
    const tbody = document.getElementById('adminUsersTbody');
    if (!tbody) return;
    tbody.addEventListener('click', (ev) => {
        // Interceptar clique no switch/label/slider para confirmar antes de alternar
        const switchWrapper = ev.target.closest('label.switch, .switch .slider, input.toggle-user-switch');
        if (switchWrapper) {
            const inputEl = switchWrapper.tagName === 'INPUT'
                ? switchWrapper
                : (switchWrapper.querySelector && switchWrapper.querySelector('input.toggle-user-switch')) || (switchWrapper.closest('label.switch') && switchWrapper.closest('label.switch').querySelector('input.toggle-user-switch'));
            if (inputEl) {
                const prevEnabled = inputEl.checked;
                const targetEnabled = !prevEnabled;
                const email = inputEl.getAttribute('data-email') || 'este usuário';
                // Previne o toggle padrão e mostra confirmação sem delay visual
                ev.preventDefault();
                ev.stopPropagation();
                confirmAction({
                    title: targetEnabled ? 'Ativar usuário' : 'Desativar usuário',
                    message: targetEnabled
                        ? `Você tem certeza de que deseja ativar o usuário ${email}?`
                        : `Você tem certeza de que deseja desativar o usuário ${email}? Ele não poderá mais acessar a plataforma.`,
                    confirmText: targetEnabled ? 'Ativar' : 'Desativar',
                    cancelText: 'Cancelar'
                }).then((ok) => {
                    if (!ok) return;
                    // Alterna manualmente e disparamos change para seguir o fluxo normal
                    inputEl.checked = targetEnabled;
                    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                });
                return;
            }
        }
        const viewBtn = ev.target.closest('.view-user');
        if (viewBtn) {
            const userId = viewBtn.getAttribute('data-userid');
            if (!userId) return;
            try { showPage('adminUserDetail'); } catch (e) { /* ignore */ }
            try { window.location.hash = '#adminUserDetail/' + encodeURIComponent(userId); } catch (e) { /* ignore */ }
            return;
        }

        // sem botões; o toggle é tratado no evento change abaixo
    });

    // Suporte a teclado: confirmar antes do toggle em Space/Enter
    tbody.addEventListener('keydown', (ev) => {
        const inputEl = ev.target.closest('input.toggle-user-switch');
        if (!inputEl) return;
        if (ev.key === ' ' || ev.key === 'Enter') {
            const prevEnabled = inputEl.checked;
            const targetEnabled = !prevEnabled;
            const email = inputEl.getAttribute('data-email') || 'este usuário';
            ev.preventDefault();
            ev.stopPropagation();
            confirmAction({
                title: targetEnabled ? 'Ativar usuário' : 'Desativar usuário',
                message: targetEnabled
                    ? `Você tem certeza de que deseja ativar o usuário ${email}?`
                    : `Você tem certeza de que deseja desativar o usuário ${email}? Ele não poderá mais acessar a plataforma.`,
                confirmText: targetEnabled ? 'Ativar' : 'Desativar',
                cancelText: 'Cancelar'
            }).then((ok) => {
                if (!ok) return;
                inputEl.checked = targetEnabled;
                inputEl.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }
    });

    // Evento change do switch
    tbody.addEventListener('change', async (ev) => {
        const input = ev.target.closest('input.toggle-user-switch');
        if (!input) return;
        const userId = input.getAttribute('data-userid');
        const email = input.getAttribute('data-email') || 'este usuário';
        const prevEnabled = input.getAttribute('data-enabled') === 'true';
        const targetEnabled = input.checked;
        const tr = input.closest('tr');
        const statusTd = tr ? tr.querySelector('td[data-label="Status"]') : null;
        const actionsTd = tr ? tr.querySelector('td[data-label="Ações"]') : null;

        input.disabled = true;
        // Badge inline para feedback imediato
        let badge = null;
        if (actionsTd) {
            badge = actionsTd.querySelector('.inline-update-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'inline-update-badge';
                actionsTd.appendChild(badge);
            }
            badge.textContent = targetEnabled ? 'Ativando…' : 'Desativando…';
        }
        try {
            const token = localStorage.getItem('jwtToken');
            if (targetEnabled) {
                const res = await activateAdminUser(token, userId);
                if (statusTd) statusTd.textContent = 'Ativo';
                input.setAttribute('data-enabled', 'true');
                input.setAttribute('aria-label', 'Inativar usuário');
                try { const c = window._adminUsersCache || []; const o = c.find(u => (u.id||u.userId||u._id)===userId); if (o) o.enabled = true; } catch(e){}
                showToast(typeof res === 'string' && res ? res : 'Usuário ativado com sucesso.');
            } else {
                const res = await deactivateAdminUser(token, userId);
                if (statusTd) statusTd.textContent = 'Inativo';
                input.setAttribute('data-enabled', 'false');
                input.setAttribute('aria-label', 'Ativar usuário');
                try { const c = window._adminUsersCache || []; const o = c.find(u => (u.id||u.userId||u._id)===userId); if (o) o.enabled = false; } catch(e){}
                showToast(typeof res === 'string' && res ? res : 'Usuário desativado com sucesso.');
            }
        } catch (err) {
            console.error(err);
            // Reverter visualmente
            input.checked = prevEnabled;
            input.setAttribute('data-enabled', prevEnabled ? 'true' : 'false');
            input.setAttribute('aria-label', prevEnabled ? 'Inativar usuário' : 'Ativar usuário');
            showToast('Ocorreu um erro ao tentar atualizar o usuário.', { type: 'error' });
        } finally {
            input.disabled = false;
            if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
        }
    });
}

// Delegação para toggles dos cards: abre/fecha card quando o botão for clicado
function attachCardToggles() {
    const container = document.querySelector('.admin-cards-grid');
    if (!container) return;
    container.addEventListener('click', (ev) => {
        // aceitar clique no botão ou no header (h2)
        const header = ev.target.closest('.admin-card h2');
        const btn = ev.target.closest('.card-toggle');
        const trigger = btn || header;
        if (!trigger) return;
        const card = trigger.closest('.admin-card');
        if (!card) return;
        const toggleBtn = card.querySelector('.card-toggle');
        const isExpanded = card.classList.contains('expanded');
        // accordion behavior: fechar outros cards antes de abrir este
        const allCards = Array.from(container.querySelectorAll('.admin-card'));
        allCards.forEach(c => {
            if (c === card) return;
            c.classList.remove('expanded');
            const tb = c.querySelector('.card-toggle');
            if (tb) tb.setAttribute('aria-expanded', 'false');
        });
        // agora alternar o card clicado
        const newExpanded = !isExpanded;
        if (newExpanded) {
            card.classList.add('expanded');
        } else {
            card.classList.remove('expanded');
        }
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', newExpanded ? 'true' : 'false');
    });
}

// --- Carregadores para os outros cards (esqueleto) ---
async function loadAdminOrgs() {
    const container = document.getElementById('adminOrgsContainer');
    if (!container) return;
    container.innerHTML = 'Carregando organizações...';
    try {
        const token = localStorage.getItem('jwtToken');
        const orgs = await getAdminOrganizations(token);
        // render simples de lista
        container.innerHTML = '';
        if (Array.isArray(orgs) && orgs.length > 0) {
            const ul = document.createElement('ul');
            orgs.forEach(o => {
                const li = document.createElement('li');
                li.textContent = `${o.id || o.orgId || o._id || ''} - ${o.name || o.companyName || o.title || ''} (${o.enabled === false ? 'Inativa' : 'Ativa'})`;
                // botão ativar/inativar
                const b = document.createElement('button');
                b.className = 'btn-small toggle-org-status';
                b.setAttribute('data-orgid', o.id || o.orgId || o._id || '');
                b.setAttribute('data-enabled', (o.enabled === false) ? 'false' : 'true');
                b.textContent = (o.enabled === false) ? 'Ativar' : 'Inativar';
                li.appendChild(b);
                ul.appendChild(li);
            });
            container.appendChild(ul);
            // delegar evento
            container.addEventListener('click', async (ev) => {
                const tb = ev.target.closest('.toggle-org-status');
                if (!tb) return;
                const orgId = tb.getAttribute('data-orgid');
                const enabled = tb.getAttribute('data-enabled') === 'true';
                try {
                    await patchAdminOrganizationStatus(localStorage.getItem('jwtToken'), orgId, !enabled);
                    tb.textContent = enabled ? 'Ativar' : 'Inativar';
                    tb.setAttribute('data-enabled', (!enabled) ? 'true' : 'false');
                } catch (err) {
                    console.error('Erro ao alterar status da organização:', err);
                    const msg = document.getElementById('adminUsersMessages');
                    if (msg) msg.textContent = 'Erro ao alterar status da organização: ' + (err.message || err);
                }
            });
        } else {
            container.textContent = 'Nenhuma organização encontrada.';
        }
    } catch (err) {
        console.error('Erro ao carregar organizações:', err);
        container.textContent = 'Erro ao carregar organizações. Verifique o servidor ou as permissões.';
    }
}

async function loadAdminContent() {
    const container = document.getElementById('adminContentContainer');
    const msg = document.getElementById('adminContentMessages');
    if (!container) return;
    if (!isSystemAdmin()) { container.innerHTML = '<p>Acesso negado.</p>'; return; }
    container.innerHTML = '<p>Carregando treinamentos...</p>';
    if (msg) { msg.style.display='none'; msg.textContent=''; }
    try {
        await loadAdminTrainings();
    } catch (e) {
        console.error('Erro ao carregar treinamentos (card conteúdo):', e);
        container.innerHTML = '<p>Erro ao carregar treinamentos.</p>';
        if (msg) { msg.style.display='block'; msg.textContent = e.message || 'Erro.'; }
    }
}

async function loadAdminAnalytics() {
    const container = document.getElementById('adminAnalyticsContainer');
    if (!container) return;
    container.innerHTML = 'Carregando métricas...';
    try {
        const res = await getAdminAnalyticsSummary(localStorage.getItem('jwtToken'));
        container.innerHTML = '<pre style="white-space:pre-wrap">' + JSON.stringify(res, null, 2) + '</pre>';
    } catch (err) {
        console.error('Erro ao carregar analytics:', err);
        container.textContent = 'Erro ao carregar métricas (analytics). Verifique o servidor.';
    }
}

async function initAdminUsersPage() {
    console.debug('[adminUsers] initAdminUsersPage called');
    showAdminDebugInfo();
    if (!isSystemAdmin()) {
        showAccessDenied('adminUsersMessages');
        return;
    }
    const msg = document.getElementById('adminUsersMessages');
    if (msg) msg.textContent = '';
    try {
        const users = await fetchAdminUsers();
        console.log('adminUsers fetched:', users);
        // Normalizar formas comuns de envelope de API
        let list = [];
        if (Array.isArray(users)) list = users;
        else if (users && Array.isArray(users.data)) list = users.data;
        else if (users && Array.isArray(users.users)) list = users.users;
        else if (users && Array.isArray(users.items)) list = users.items;
        else if (users && Array.isArray(users.results)) list = users.results;
        else if (users && users.data && Array.isArray(users.data.items)) list = users.data.items;
        else list = [];
        if (list.length === 0) {
            const el = document.getElementById('adminUsersMessages');
            if (el) el.textContent = 'Nenhum usuário encontrado.';
        }
    // armazenar cache local para filtros
    window._adminUsersCache = list;
    renderAdminUsers(list);
        attachListHandlers();
        // manter todos os cards fechados por padrão; o usuário decide expandir
    // carregar conteúdo dos outros cards
    // Nota: a função `loadAdminOrgs()` era um renderer legado que sobrescrevia
    // o container do Card 2 com uma <ul>. Para preservar a marcação do
    // partial (tabela com id/razaoSocial/cnpj/memberCount) agora deixamos
    // que `adminOrgs.js` seja o responsável por renderizar esse card quando
    // a página 'adminUsers' for carregada (veja o listener `page:loaded`).
    // Portanto não chamamos mais `loadAdminOrgs()` aqui.
    // loadAdminOrgs(); // intentionally disabled
    loadAdminContent();
        loadAdminAnalytics();
        // ativar toggles dos cards
        attachCardToggles();
        // inicializar filtros UI
        try { initAdminUsersFilters(); } catch (e) { /* silencioso */ }
    } catch (err) {
        console.error('Erro ao carregar admin users (caught):', err);
        console.error('Erro ao carregar admin users:', err);
        const el = document.getElementById('adminUsersMessages');
        if (el) {
            if (err.status === 401 || err.status === 403) {
                el.textContent = 'Sem permissão para acessar. Faça login novamente. (HTTP ' + (err.status || '') + ')';
            } else {
                el.textContent = 'Erro ao carregar usuários: ' + (err.message || err) + (err.status ? ' (HTTP ' + err.status + ')' : '');
            }
        }
    }
}

// -------------------- filtros / busca --------------------
function applyAdminUsersFilters() {
    const cache = window._adminUsersCache || [];
    const search = (document.getElementById('adminUsersSearch') && document.getElementById('adminUsersSearch').value) || '';
    const status = document.getElementById('adminUsersStatusFilter') ? document.getElementById('adminUsersStatusFilter').value : 'all';
    const role = document.getElementById('adminUsersRoleFilter') ? document.getElementById('adminUsersRoleFilter').value : 'all';

    const filtered = cache.filter(u => {
        // search by email
        if (search && search.trim() !== '') {
            const email = (u.email || u.userEmail || '').toLowerCase();
            if (!email.includes(search.trim().toLowerCase())) return false;
        }
        // status filter
        if (status === 'active' && u.enabled === false) return false;
        if (status === 'inactive' && u.enabled !== false) return false;
        // role filter (normalize similar to isSystemAdmin)
        if (role !== 'all') {
            const r = (u.role || u.systemRole || '');
            if (String(r).toUpperCase() !== String(role).toUpperCase()) return false;
        }
        return true;
    });

    renderAdminUsers(filtered);
}

function debounce(fn, wait) {
    let t;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

function initAdminUsersFilters() {
    const searchEl = document.getElementById('adminUsersSearch');
    const statusEl = document.getElementById('adminUsersStatusFilter');
    const roleEl = document.getElementById('adminUsersRoleFilter');
    const clearBtn = document.getElementById('adminUsersClearFilters');
    if (searchEl) searchEl.addEventListener('input', debounce(applyAdminUsersFilters, 300));
    if (statusEl) statusEl.addEventListener('change', applyAdminUsersFilters);
    if (roleEl) roleEl.addEventListener('change', applyAdminUsersFilters);
    if (clearBtn) clearBtn.addEventListener('click', (ev) => {
        if (searchEl) searchEl.value = '';
        if (statusEl) statusEl.value = 'all';
        if (roleEl) roleEl.value = 'all';
        applyAdminUsersFilters();
    });
}

// --- Detalhe de usuário ---

async function fetchAdminUserDetail(userId) {
    const token = localStorage.getItem('jwtToken');
    if (!token) throw new Error('token-missing');
    return await getAdminUserById(token, userId);
}

function renderUserDetail(data) {
    const idEl = document.getElementById('detailUserId');
    const emailEl = document.getElementById('detailUserEmail');
    const roleEl = document.getElementById('detailUserRole');
    const statusEl = document.getElementById('detailUserStatus');
    if (idEl) idEl.textContent = data.id || data.userId || data._id || '';
    if (emailEl) emailEl.textContent = data.email || data.userEmail || '';
    if (roleEl) roleEl.textContent = data.role || data.systemRole || '';
    if (statusEl) statusEl.textContent = (data.enabled === false) ? 'Inativo' : 'Ativo';

    const personalContainer = document.getElementById('detailUserPersonalProfile');
    if (personalContainer) {
        personalContainer.innerHTML = '';
        if (data.personalProfile) {
            const p = data.personalProfile;
            const div = document.createElement('div');
            div.className = 'personal-card';
            div.innerHTML = `
                <p>Nome Completo: ${escapeHtml(p.fullName || p.name || '\u2014')}</p>
                <p>CPF: ${escapeHtml(p.cpf || p.cpfNumber || p.document || '\u2014')}</p>
                <p>Data de Nascimento: ${escapeHtml(p.birthDate || p.birth || p.dob || '\u2014')}</p>
                <p>Telefone: ${escapeHtml(p.phone || p.mobile || '\u2014')}</p>
            `;
            personalContainer.appendChild(div);
        } else {
            personalContainer.textContent = 'Perfil pessoal não preenchido';
        }
    }

    const membershipsContainer = document.getElementById('detailUserMemberships');
    if (membershipsContainer) {
        membershipsContainer.innerHTML = '';
        const mems = data.memberships || data.organizations || [];
        if (Array.isArray(mems) && mems.length > 0) {
            const table = document.createElement('table');
            table.className = 'table';
            const thead = document.createElement('thead');
            thead.innerHTML = '<tr><th>ID da Organização</th><th>Nome da Empresa</th><th>Função na Empresa</th></tr>';
            table.appendChild(thead);
            const tbody = document.createElement('tbody');
            mems.forEach(m => {
                const tr = document.createElement('tr');
                const tdId = document.createElement('td'); tdId.textContent = m.organizationId || m.orgId || m.id || m.organization || '';
                const tdName = document.createElement('td'); tdName.textContent = m.companyName || m.name || m.organizationName || '';
                const tdRole = document.createElement('td'); tdRole.textContent = m.role || m.yourRole || '';
                tr.appendChild(tdId); tr.appendChild(tdName); tr.appendChild(tdRole);
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            membershipsContainer.appendChild(table);
        } else {
            membershipsContainer.textContent = 'Este usuário não pertence a nenhuma organização';
        }
    }

    // Mostrar JSON bruto do usuário para inspeção completa
    const rawContainer = document.getElementById('detailUserRaw');
    if (rawContainer) {
        rawContainer.innerHTML = '<pre style="white-space:pre-wrap">' + JSON.stringify(data, null, 2) + '</pre>';
    }
}

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function initAdminUserDetailPage(userId) {
    if (!isSystemAdmin()) {
        showAccessDenied('adminUserDetailMessages');
        return;
    }
    const messages = document.getElementById('adminUserDetailMessages');
    if (messages) messages.textContent = '';
    try {
        const data = await fetchAdminUserDetail(userId);
        renderUserDetail(data);
    } catch (err) {
        console.error('Erro ao carregar detalhe de usuário:', err);
        const el = document.getElementById('adminUserDetailMessages');
        if (el) {
            if (err.status === 401 || err.status === 403) el.textContent = 'Sem permissão para acessar este recurso.';
            else el.textContent = 'Erro ao carregar dados do usuário.';
        }
    }
}

// Inicialização via evento page:loaded
document.addEventListener('page:loaded', (ev) => {
    const page = ev && ev.detail && ev.detail.page;
    if (!page) return;
    if (page === 'adminUsers') {
        try { initAdminUsersPage(); } catch (e) { console.error(e); }
        try { initPlatformManagementCard(); } catch (e) { console.error('Erro initPlatformManagementCard', e); }
    }
    if (page === 'adminUserDetail') {
        // extrair userId do hash (ex: #adminUserDetail/123)
        try {
            const hash = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
            const parts = hash.split('/');
            const userId = parts[1] ? decodeURIComponent(parts[1]) : null;
            if (userId) initAdminUserDetailPage(userId);
        } catch (e) { console.error('Erro ao extrair userId da rota', e); }
    }
});

export { initAdminUsersPage, initAdminUserDetailPage, isSystemAdmin };

// ================== Gestão da Plataforma: Tabs e Subcards ==================
function initPlatformManagementCard() {
    const card = document.getElementById('adminPlatformCard');
    if (!card) return; // card pode não estar na partial
    setupPlatformLinks(card);
}

function setupPlatformLinks(scopeEl) {
    scopeEl.addEventListener('click', (ev) => {
        const link = ev.target.closest('a.platform-tab');
        if (!link) return;
        ev.preventDefault();
        const target = link.getAttribute('data-nav');
        if (!target) return;
        try { window.location.hash = '#' + target; } catch (e) {}
        try { showPage(target); } catch (e) { console.error('Falha ao navegar para', target, e); }
    });
}

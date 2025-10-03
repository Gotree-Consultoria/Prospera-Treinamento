import { getAdminOrganizations, getAdminOrganizationById, API_BASE_URL, patchAdminOrganizationStatus } from '../../shared/api.js';
import { isSystemAdmin } from './adminUsers.js';
import { showPage } from '../../shared/navigation.js';

// Render da lista resumida (AdminOrganizationSummaryDTO: id, razaoSocial, cnpj, memberCount)
async function renderAdminOrgsList(container) {
    if (!container) return;
    const hasTableInMarkup = !!container.querySelector('#adminOrgsTable');
    if (!hasTableInMarkup) {
        container.innerHTML = 'Carregando organizações...';
    } else {
        // show a temporary loading message in the messages area if provided
        const msg = document.getElementById('adminOrgsMessages');
        if (msg) msg.textContent = 'Carregando organizações...';
    }
    try {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            const msgEl = document.getElementById('adminOrgsMessages');
            const containerMsg = msgEl || container;
            containerMsg.textContent = 'Faça login como SYSTEM_ADMIN para visualizar organizações.';
            return;
        }
        const orgs = await getAdminOrganizations(token);
    console.debug('[adminOrgs] fetched organizations:', orgs);
        // normalizar lista
        let list = [];
        if (Array.isArray(orgs)) list = orgs;
        else if (orgs && Array.isArray(orgs.data)) list = orgs.data;

        // helper: normalize enabled/status into boolean 'enabled'
        function normalizeOrg(src) {
            const s = src || {};
            // possible sources: s.enabled (bool), s.status (string 'ACTIVE'/'INACTIVE'), s.active (bool), s.state
            let enabled = false;
            if (s.enabled === true) enabled = true;
            else if (s.enabled === false) enabled = false;
            else if (typeof s.status === 'string') {
                const st = s.status.trim().toLowerCase();
                enabled = (st === 'active' || st === 'enabled' || st === 'true');
            } else if (typeof s.active === 'boolean') {
                enabled = s.active === true;
            } else if (typeof s.state === 'string') {
                const st = s.state.trim().toLowerCase(); enabled = (st === 'active' || st === 'enabled');
            }
            // return shallow copy with normalized boolean
            return Object.assign({}, s, { enabled });
        }

        // normalize all items so downstream code can rely on boolean o.enabled
        list = list.map(normalizeOrg);
        // armazenar cache para filtros
        container._orgsCache = list;

        if (list.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhuma organização encontrada.</div>';
            return;
        }

    // cria uma linha <tr> para a organização (inclui coluna Status)
        function createRow(o) {
            const tr = document.createElement('tr');
            const oid = o.id || o.orgId || o._id || '';
            const tdId = document.createElement('td'); tdId.textContent = oid;
            const tdName = document.createElement('td');
            const nameVal = o.razaoSocial || o.companyName || o.name || o.title || '';
            tdName.textContent = nameVal || '—';
            const tdCnpj = document.createElement('td');
            const cnpjVal = o.cnpj || o.CNPJ || '';
            tdCnpj.textContent = cnpjVal || '—';
            const tdMembers = document.createElement('td');
            let membersVal = '';
            if (typeof o.memberCount === 'number') membersVal = String(o.memberCount);
            else if (Array.isArray(o.members)) membersVal = String(o.members.length);
            else if (o.memberCount) membersVal = String(o.memberCount);
            tdMembers.textContent = membersVal || '0';

            // Status column with badge (translate to Portuguese)
            const tdStatus = document.createElement('td');
            const enabledBool = o.enabled === false ? false : true;
            const badge = document.createElement('span');
            badge.className = 'status-badge ' + (enabledBool ? 'badge-active' : 'badge-inactive');
            badge.textContent = enabledBool ? 'Ativo' : 'Inativo';
            tdStatus.appendChild(badge);

            if (!nameVal && !cnpjVal) {
                console.warn('[adminOrgs] organization missing name/cnpj fields, object:', o);
            }
            const tdActions = document.createElement('td');
            const viewLink = document.createElement('a');
            viewLink.className = 'btn-small view-org-link';
            // Set href to SPA hash route so users can open in new tab or copy link
            viewLink.href = '#adminOrgDetail/' + encodeURIComponent(oid);
            viewLink.setAttribute('data-orgid', oid);
            viewLink.setAttribute('aria-label', 'Ver detalhes da organização ' + (nameVal || oid));
            viewLink.textContent = 'Ver Detalhes';
            tdActions.appendChild(viewLink);
            if (isSystemAdmin()) {
                // create a toggle switch (checkbox) reflecting current enabled state
                const switchLabel = document.createElement('label');
                switchLabel.className = 'switch';
                const switchInput = document.createElement('input');
                switchInput.type = 'checkbox';
                switchInput.className = 'toggle-org-switch';
                switchInput.setAttribute('data-orgid', oid);
                const isEnabledNow = !!o.enabled;
                switchInput.checked = isEnabledNow;
                // store current state as data-enabled for fallback/inspection
                switchInput.setAttribute('data-enabled', isEnabledNow ? 'true' : 'false');
                const slider = document.createElement('span'); slider.className = 'slider';
                switchLabel.appendChild(switchInput);
                switchLabel.appendChild(slider);
                tdActions.appendChild(document.createTextNode(' '));
                tdActions.appendChild(switchLabel);
            }
            tr.appendChild(tdId); tr.appendChild(tdName); tr.appendChild(tdCnpj); tr.appendChild(tdMembers); tr.appendChild(tdStatus); tr.appendChild(tdActions);
            return tr;
        }

        // render básico da tabela (cria uma tabela inteira quando não existe no partial)
        function buildTable(rows) {
            const table = document.createElement('table');
            table.className = 'table';
            const thead = document.createElement('thead');
            thead.innerHTML = '<tr><th>ID</th><th>Razão Social</th><th>CNPJ</th><th>Número de Membros</th><th>Status</th><th>Ações</th></tr>';
            table.appendChild(thead);
            const tbody = document.createElement('tbody');
            rows.forEach(o => tbody.appendChild(createRow(o)));
            table.appendChild(tbody);
            return table;
        }

        // If the partial already contains the table, populate its tbody instead of recreating markup
        const existingTbody = container.querySelector('#adminOrgsTbody');
        if (existingTbody) {
            // clear messages
            const msg = document.getElementById('adminOrgsMessages'); if (msg) msg.textContent = '';
            existingTbody.innerHTML = '';
            list.forEach(o => existingTbody.appendChild(createRow(o)));
        } else {
            container.innerHTML = '';
            container.appendChild(buildTable(list));
        }

        // attach delegated handlers only once
        if (!container.__orgsHandlersAttached) {
            container.addEventListener('click', async (ev) => {
                // intercept link clicks for SPA behavior
                const viewLink = ev.target.closest('.view-org-link');
                if (viewLink) {
                    ev.preventDefault();
                    const orgId = viewLink.getAttribute('data-orgid');
                    if (!orgId) return;
                    // Navigate to SPA detail page; the detail module will extract id from the hash and fetch
                    try { showPage('adminOrgDetail'); } catch (e) { /* ignore */ }
                    try { window.location.hash = '#adminOrgDetail/' + encodeURIComponent(orgId); } catch (e) { /* ignore */ }
                    return;
                }
                // handle change on toggle-org-switch inputs (delegated)
                if (ev.target && ev.target.matches && ev.target.matches('input.toggle-org-switch')) {
                    const input = ev.target;
                    const orgId = input.getAttribute('data-orgid');
                    if (!orgId) return;
                    // current state according to attribute/data
                    const currentEnabled = input.getAttribute('data-enabled') === 'true';
                    // compute desired state as inverse of current stored state
                    // (reading input.checked here can be unreliable due to event ordering)
                    const newChecked = !currentEnabled;

                    // Attempt to get org name from cache
                    const cached = (container._orgsCache || []).find(x => String(x.id || x.orgId || x._id) === String(orgId));
                    const orgName = cached ? (cached.razaoSocial || cached.companyName || cached.name || orgId) : orgId;
                    const confirmMsg = (!newChecked) ? `Você tem certeza que deseja inativar a organização '${orgName}'? Todos os seus membros perderão o acesso.` : `Você tem certeza que deseja ativar a organização '${orgName}'?`;

                    let confirmed = false;
                    if (window && typeof window.showConfirmModal === 'function') {
                        try { confirmed = await window.showConfirmModal(confirmMsg); } catch (e) { confirmed = false; }
                    } else {
                        confirmed = confirm(confirmMsg);
                    }

                    if (!confirmed) {
                        // revert checkbox to previous state (do not apply change)
                        input.checked = currentEnabled;
                        return;
                    }

                    try {
                        await patchAdminOrganizationStatus(localStorage.getItem('jwtToken'), orgId, newChecked);
                        // update cache and UI after server confirmed
                        if (cached) cached.enabled = newChecked;
                        input.setAttribute('data-enabled', newChecked ? 'true' : 'false');
                        // ensure checkbox reflects confirmed state
                        input.checked = newChecked;
                        const tr = input.closest('tr');
                        if (tr) {
                            const badgeEl = tr.querySelector('.status-badge');
                            if (badgeEl) {
                                // translate boolean to Portuguese label
                                badgeEl.textContent = newChecked ? 'Ativo' : 'Inativo';
                                badgeEl.classList.toggle('badge-active', newChecked);
                                badgeEl.classList.toggle('badge-inactive', !newChecked);
                            }
                        }
                        if (window && typeof window.showToast === 'function') window.showToast('Status da organização alterado com sucesso.');
                        else {
                            const msg = document.getElementById('adminOrgsMessages'); if (msg) msg.textContent = 'Status da organização alterado com sucesso.';
                        }
                    } catch (err) {
                        console.error('Erro ao atualizar status da org:', err);
                        const errMsg = (err && err.message) ? err.message : 'Erro ao atualizar status da organização.';
                        // revert UI
                        input.checked = currentEnabled;
                        if (window && typeof window.showToast === 'function') window.showToast(errMsg, { type: 'error' });
                        else { const msg = document.getElementById('adminOrgsMessages'); if (msg) msg.textContent = errMsg; }
                    }
                    return;
                }
            });
            container.__orgsHandlersAttached = true;
        }

        // wire search and filter inputs if present
        const searchInput = document.getElementById('orgSearchInput');
        const statusFilter = document.getElementById('orgStatusFilter');
            function applyFilters() {
            const q = (searchInput && searchInput.value || '').trim().toLowerCase();
            const st = (statusFilter && statusFilter.value) || 'all';
            const all = container._orgsCache || [];
            const filtered = all.filter(o => {
                // status
                if (st === 'active' && o.enabled === false) return false;
                if (st === 'inactive' && o.enabled !== false) return false;
                // query match name or cnpj
                if (!q) return true;
                const name = (o.razaoSocial || o.companyName || o.name || '').toLowerCase();
                const cnpj = (o.cnpj || '').toLowerCase();
                return name.includes(q) || cnpj.includes(q) || (o.id && String(o.id).includes(q));
            });
            const existingTbody2 = container.querySelector('#adminOrgsTbody');
            if (existingTbody2) {
                existingTbody2.innerHTML = '';
                filtered.forEach(o => existingTbody2.appendChild(createRow(o)));
            } else {
                container.innerHTML = '';
                container.appendChild(buildTable(filtered));
            }
        }

        // debounce helper
        let debounceTimer = null;
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => applyFilters(), 250);
            });
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => applyFilters());
        }

    } catch (err) {
        console.error('Erro ao listar organizações:', err);
        const msgEl = document.getElementById('adminOrgsMessages');
        const target = msgEl || container;
        // Provide more helpful messages depending on status
        if (err && (err.status === 401 || err.status === 403)) {
            target.textContent = 'Sem permissão para acessar organizações. Faça login como SYSTEM_ADMIN.';
        } else if (err && err.message) {
            target.textContent = 'Erro ao carregar organizações: ' + err.message;
        } else {
            target.textContent = 'Erro ao carregar organizações.';
        }
    }
}

function showAdminOrgDetail(detail) {
    // Simples modal-in-page de detalhe (pode ser aprimorado com modal real)
    let container = document.getElementById('adminOrgsDetailContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'adminOrgsDetailContainer';
        container.className = 'admin-org-detail';
        // Always append detail container to document.body (top-level) to avoid
        // accidentally injecting the detail panel inside other page containers
        // (for example the adminUsers card). This keeps detail UI isolated.
        document.body.appendChild(container);
    }
    container.innerHTML = '';
    if (!detail) {
        container.textContent = 'Detalhe indisponível.';
        return;
    }
    const h = document.createElement('h3'); h.textContent = detail.razaoSocial || detail.name || 'Organização';
    const p = document.createElement('div');
    p.innerHTML = `
        <p><strong>ID:</strong> ${detail.id || detail.orgId || ''}</p>
        <p><strong>CNPJ:</strong> ${detail.cnpj || ''}</p>
        <p><strong>Descrição:</strong> ${detail.description || detail.title || ''}</p>
    `;
    container.appendChild(h);
    container.appendChild(p);

    const members = detail.members || detail.memberships || [];
    const table = document.createElement('table'); table.className = 'table';
    const thead = document.createElement('thead'); thead.innerHTML = '<tr><th>ID do Usuário</th><th>Email</th><th>Role</th></tr>';
    const tbody = document.createElement('tbody');
    members.forEach(m => {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td'); td1.textContent = m.userId || m.id || m.userId || '';
        const td2 = document.createElement('td'); td2.textContent = m.email || m.userEmail || '';
        const td3 = document.createElement('td'); td3.textContent = m.role || m.userRole || '';
        tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
        tbody.appendChild(tr);
    });
    table.appendChild(thead); table.appendChild(tbody);
    container.appendChild(table);
}

// Inicialização via page:loaded (quando for full page adminOrgs)
document.addEventListener('page:loaded', (ev) => {
    const page = ev && ev.detail && ev.detail.page;
    if (!page) return;
    // Render both when the dedicated adminOrgs page is shown and when the
    // adminUsers page contains the adminOrgs card (panel view inside adminUsers).
    if (page === 'adminOrgs' || page === 'adminUsers') {
        const container = document.getElementById('adminOrgsContainer');
        if (container) renderAdminOrgsList(container);
    }
});

// O módulo é importado por side-effect (listeners page:loaded). Não exportar nomes para evitar duplicações.

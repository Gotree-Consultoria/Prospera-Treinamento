import { getAdminOrganizations, getAdminOrganizationById, API_BASE_URL, patchAdminOrganizationStatus } from './api.js';
import { isSystemAdmin } from './adminUsers.js';

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
    const orgs = await getAdminOrganizations(token);
    console.debug('[adminOrgs] fetched organizations:', orgs);
        // normalizar lista
        let list = [];
        if (Array.isArray(orgs)) list = orgs;
        else if (orgs && Array.isArray(orgs.data)) list = orgs.data;
        // armazenar cache para filtros
        container._orgsCache = list;

        if (list.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhuma organização encontrada.</div>';
            return;
        }

        // cria uma linha <tr> para a organização
        function createRow(o) {
            const tr = document.createElement('tr');
            const tdId = document.createElement('td'); tdId.textContent = o.id || o.orgId || o._id || '';
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
            if (!nameVal && !cnpjVal) {
                console.warn('[adminOrgs] organization missing name/cnpj fields, object:', o);
            }
            const tdActions = document.createElement('td');
            const viewLink = document.createElement('a');
            viewLink.className = 'btn-small view-org-link';
            const oid = o.id || o.orgId || o._id || '';
            viewLink.href = '#adminOrgDetail/' + encodeURIComponent(oid);
            viewLink.setAttribute('data-orgid', oid);
            viewLink.textContent = 'Ver Detalhes';
            tdActions.appendChild(viewLink);
            if (isSystemAdmin()) {
                const toggleBtn = document.createElement('button'); toggleBtn.className = 'btn-small toggle-org-status'; toggleBtn.setAttribute('data-orgid', oid); toggleBtn.setAttribute('data-enabled', !!o.enabled);
                toggleBtn.textContent = o.enabled ? 'Inativar' : 'Ativar';
                tdActions.appendChild(document.createTextNode(' '));
                tdActions.appendChild(toggleBtn);
            }
            tr.appendChild(tdId); tr.appendChild(tdName); tr.appendChild(tdCnpj); tr.appendChild(tdMembers); tr.appendChild(tdActions);
            return tr;
        }

        // render básico da tabela (cria uma tabela inteira quando não existe no partial)
        function buildTable(rows) {
            const table = document.createElement('table');
            table.className = 'table';
            const thead = document.createElement('thead');
            thead.innerHTML = '<tr><th>ID</th><th>Razão Social</th><th>CNPJ</th><th>Número de Membros</th><th>Ações</th></tr>';
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
                    try {
                        const detail = await getAdminOrganizationById(localStorage.getItem('jwtToken'), orgId);
                        showAdminOrgDetail(detail);
                    } catch (err) {
                        console.error('Erro ao carregar detalhe da org:', err);
                        const msg = document.getElementById('adminOrgsMessages');
                        if (msg) msg.textContent = 'Erro ao carregar detalhe da organização.';
                    }
                    return;
                }
                const toggleBtn = ev.target.closest('.toggle-org-status');
                if (toggleBtn) {
                    const orgId = toggleBtn.getAttribute('data-orgid');
                    if (!orgId) return;
                    const enabled = toggleBtn.getAttribute('data-enabled') === 'true';
                    // confirmar
                    const confirmMsg = enabled ? 'Tem certeza que deseja inativar esta organização?' : 'Tem certeza que deseja ativar esta organização?';
                    if (!confirm(confirmMsg)) return;
                    try {
                        await patchAdminOrganizationStatus(localStorage.getItem('jwtToken'), orgId, !enabled);
                        const msg = document.getElementById('adminOrgsMessages');
                        if (msg) msg.textContent = 'Status atualizado.';
                        // Recarregar a lista
                        renderAdminOrgsList(container);
                    } catch (err) {
                        console.error('Erro ao atualizar status da org:', err);
                        const msg = document.getElementById('adminOrgsMessages');
                        if (msg) msg.textContent = 'Erro ao atualizar status da organização.';
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
        container.textContent = 'Erro ao carregar organizações.';
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

import { getAdminOrganizationById, getAdminOrganizationSectors } from '../../shared/api.js';
import { isSystemAdmin } from './adminUsers.js';

function renderOrgDetail(detail) {
    const idEl = document.getElementById('detailOrgId');
    const nameEl = document.getElementById('detailOrgName');
    const razaoEl = document.getElementById('detailOrgRazao');
    const cnpjEl = document.getElementById('detailOrgCnpj');
    if (idEl) idEl.textContent = detail.id || detail.orgId || detail._id || '';
    if (nameEl) nameEl.textContent = detail.razaoSocial || detail.name || detail.companyName || 'Organização';
    if (razaoEl) razaoEl.textContent = detail.razaoSocial || detail.name || '';
    if (cnpjEl) cnpjEl.textContent = detail.cnpj || detail.CNPJ || '';

    const members = detail.members || detail.memberships || detail.users || [];
    const tbody = document.getElementById('detailOrgMembersTbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (Array.isArray(members) && members.length > 0) {
        members.forEach(m => {
            const tr = document.createElement('tr');
            const td1 = document.createElement('td'); td1.textContent = m.userId || m.id || m.user || '';
            const td2 = document.createElement('td'); td2.textContent = m.email || m.userEmail || m.userEmailAddress || '';
            const td3 = document.createElement('td'); td3.textContent = m.role || m.userRole || m.permission || '';
            tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
            tbody.appendChild(tr);
        });
    } else {
        const tr = document.createElement('tr');
        const td = document.createElement('td'); td.colSpan = 3; td.textContent = 'Nenhum membro encontrado.'; tr.appendChild(td); tbody.appendChild(tr);
    }

    const raw = document.getElementById('detailOrgRaw');
    if (raw) raw.innerHTML = '<pre style="white-space:pre-wrap">' + JSON.stringify(detail, null, 2) + '</pre>';
}

function renderOrgSectors(sectors) {
    const tbody = document.getElementById('detailOrgSectorsTbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (Array.isArray(sectors) && sectors.length) {
        sectors.forEach(s => {
            const tr = document.createElement('tr');
            const td1 = document.createElement('td'); td1.textContent = s.id || s._id || s.sectorId || '';
            const td2 = document.createElement('td'); td2.textContent = s.name || s.nome || s.title || '';
            tr.appendChild(td1); tr.appendChild(td2);
            tbody.appendChild(tr);
        });
    } else {
        const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 2; td.textContent = 'Nenhum setor adotado.'; tr.appendChild(td); tbody.appendChild(tr);
    }
}

async function initAdminOrgDetailPage(orgId) {
    if (!isSystemAdmin()) {
        const msg = document.getElementById('adminOrgDetailMessages'); if (msg) msg.textContent = 'Acesso negado. Apenas SYSTEM_ADMIN pode acessar.'; return;
    }
    const msg = document.getElementById('adminOrgDetailMessages'); if (msg) msg.textContent = '';
    try {
        const token = localStorage.getItem('jwtToken');
        const detail = await getAdminOrganizationById(token, orgId);
        renderOrgDetail(detail);
        // carregar setores adotados
        try {
            const sectors = await getAdminOrganizationSectors(token, orgId);
            renderOrgSectors(sectors);
        } catch (se) {
            console.error('Erro ao listar setores:', se);
            const msg = document.getElementById('detailOrgSectorsMessages'); if (msg) msg.textContent = se.message || 'Erro ao carregar setores.';
        }
    } catch (err) {
        console.error('Erro ao buscar detalhe da organização:', err);
        const el = document.getElementById('adminOrgDetailMessages'); if (el) el.textContent = 'Erro ao carregar detalhes da organização.';
    }
}

// Listen to page:loaded and extract id from hash
document.addEventListener('page:loaded', (ev) => {
    const page = ev && ev.detail && ev.detail.page;
    if (!page) return;
    if (page === 'adminOrgDetail') {
        try {
            const hash = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
            const parts = hash.split('/');
            const orgId = parts[1] ? decodeURIComponent(parts[1]) : null;
            if (orgId) initAdminOrgDetailPage(orgId);
            else {
                const el = document.getElementById('adminOrgDetailMessages'); if (el) el.textContent = 'ID da organização não informado na rota.';
            }
        } catch (e) { console.error('Erro ao extrair orgId da rota', e); }
    }
});

export { initAdminOrgDetailPage };

// Funções do api.js (import único consolidado evitando duplicação)
import { updateUserProfile, updateUserEmail, updateUserPassword, completeUserProfile, fetchUserProfile, requestEmailChange, createPFProfile, createOrganization, getOrgMembers, addOrgMember, removeOrgMember, removeMyOrgMembership, updateOrgMemberRole, getMyOrganizationSectors, removeOrganizationSector, addOrganizationSector, getPublicSectors, getOrgMemberEnrollments } from './api.js'; // uso simplificado: catálogo público único

let currentProfile = null;
let activeOrgMemberModal = null;

// SVG helpers para ícones do menu de ações
function pencilIconSvg() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
}
function trashIconSvg() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
}
function infoIconSvg() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
}
function chartIconSvg() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 13l4 4 6-8"/></svg>';
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function firstDefined(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null) {
            return value;
        }
    }
    return undefined;
}

function normalizeProgressPercentage(value) {
    if (value === undefined || value === null || value === '') return 0;
    let numeric = Number(value);
    if (Number.isNaN(numeric)) {
        const parsed = parseFloat(value);
        numeric = Number.isNaN(parsed) ? 0 : parsed;
    }
    if (!Number.isFinite(numeric)) return 0;
    if (numeric > 0 && numeric <= 1) numeric = numeric * 100;
    if (numeric < 0) numeric = 0;
    if (numeric > 100) numeric = 100;
    return Math.round(numeric);
}

function mapMemberEnrollmentStatus(status) {
    const normalized = (status || '').toString().toUpperCase();
    switch (normalized) {
        case 'COMPLETED':
            return { label: 'Concluído', className: 'completed' };
        case 'ACTIVE':
        case 'IN_PROGRESS':
            return { label: 'Em andamento', className: 'active' };
        case 'NOT_STARTED':
        case 'NOT_ENROLLED':
        case 'PENDING':
            return { label: 'Pendente', className: 'pending' };
        case 'CANCELLED':
        case 'CANCELED':
            return { label: 'Cancelado', className: 'cancelled' };
        default:
            return { label: normalized || '—', className: 'neutral' };
    }
}

function formatMemberDate(value, withTime = false) {
    if (!value) return '';
    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
        if (!withTime) return dateStr;
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `${dateStr} • ${timeStr}`;
    } catch (err) {
        return String(value);
    }
}

function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.items)) return value.items;
    if (value && Array.isArray(value.data)) return value.data;
    if (value && Array.isArray(value.content)) return value.content;
    if (value && Array.isArray(value.results)) return value.results;
    if (value && Array.isArray(value.records)) return value.records;
    if (value && Array.isArray(value.progress)) return value.progress;
    if (value && Array.isArray(value.enrollments)) return value.enrollments;
    return [];
}

function normalizeMemberEnrollmentRecord(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const training = raw.training || raw.content || raw.course || raw.item || raw.trainingInfo || {};
    const id = firstDefined(raw.enrollmentId, raw.membershipEnrollmentId, raw.id, raw._id, training.enrollmentId);
    const trainingId = firstDefined(raw.trainingId, training.trainingId, training.id, training._id, raw.courseId);
    const title = firstDefined(raw.trainingTitle, training.title, training.name, raw.title, raw.name, raw.courseTitle, 'Treinamento');
    const statusRaw = firstDefined(raw.enrollmentStatus, raw.status, raw.progressStatus, training.status, training.progressStatus);
    const progressRaw = firstDefined(raw.progressPercentage, raw.progress, raw.completionRate, raw.percentage, raw.progressPercent, training.progressPercentage, training.progress, training.percentage);
    const assignedAt = firstDefined(raw.enrolledAt, raw.assignedAt, raw.createdAt, raw.startDate, raw.assignedDate, training.enrolledAt, training.assignedAt, training.startDate);
    const updatedAt = firstDefined(raw.updatedAt, raw.lastActivityAt, raw.lastAccessAt, raw.completedAt, raw.finishDate, training.updatedAt, training.lastActivityAt, training.lastAccessAt, training.completedAt);
    const dueDate = firstDefined(raw.dueDate, raw.deadline, raw.deadlineAt, training.dueDate, training.deadline);

    const progress = normalizeProgressPercentage(progressRaw);
    const statusInfo = mapMemberEnrollmentStatus(statusRaw);

    return {
        id: id ? String(id) : null,
        trainingId: trainingId ? String(trainingId) : null,
        title: title ? String(title) : 'Treinamento',
        statusRaw: statusRaw || '',
        statusLabel: statusInfo.label,
        statusClass: statusInfo.className,
        progress,
        assignedAt: assignedAt || null,
        updatedAt: updatedAt || null,
        dueDate: dueDate || null
    };
}

function normalizeMemberEnrollmentCollection(raw) {
    if (!raw) return [];
    let collection = toArray(raw);
    if (!collection.length && raw && typeof raw === 'object') {
        if (Array.isArray(raw.courses)) collection = raw.courses;
        else if (Array.isArray(raw.courseProgress)) collection = raw.courseProgress;
        else if (Array.isArray(raw.items)) collection = raw.items;
    }
    return collection.map(normalizeMemberEnrollmentRecord).filter(Boolean);
}

function closeActiveOrgMemberModal() {
    if (activeOrgMemberModal && typeof activeOrgMemberModal.close === 'function') {
        try { activeOrgMemberModal.close(); } catch (err) { /* noop */ }
    }
    activeOrgMemberModal = null;
}

function createOrgMemberModal({ title = 'Detalhes', size = 'medium' } = {}) {
    closeActiveOrgMemberModal();

    const overlay = document.createElement('div');
    overlay.className = 'content-modal-overlay member-inspect-overlay';
    const modal = document.createElement('div');
    modal.className = 'content-modal' + (size === 'large' ? ' large' : '');
    modal.innerHTML = `
        <div class="member-modal-header">
            <h3>${escapeHtml(title)}</h3>
            <button type="button" class="member-modal-close" aria-label="Fechar">&times;</button>
        </div>
        <div class="member-modal-body"></div>
    `;

    overlay.appendChild(modal);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);

    const bodyEl = modal.querySelector('.member-modal-body');
    const close = () => {
        document.removeEventListener('keydown', escHandler);
        overlay.remove();
        document.body.style.overflow = previousOverflow;
        activeOrgMemberModal = null;
    };
    const escHandler = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            close();
        }
    };

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close();
    });
    const closeBtn = modal.querySelector('.member-modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (event) => {
            event.preventDefault();
            close();
        });
    }
    document.addEventListener('keydown', escHandler);
    setTimeout(() => {
        try { closeBtn?.focus(); } catch (err) { /* ignore */ }
    }, 30);

    const api = {
        overlay,
        modal,
        body: bodyEl,
        close,
        setTitle(newTitle) {
            const header = modal.querySelector('.member-modal-header h3');
            if (header) header.textContent = newTitle || 'Detalhes';
        },
        setContent(html) {
            if (bodyEl) bodyEl.innerHTML = html;
        },
        showMessage(message, cssClass = 'member-progress-loading') {
            if (bodyEl) {
                bodyEl.innerHTML = `<p class="${cssClass}">${escapeHtml(message)}</p>`;
            }
        }
    };

    activeOrgMemberModal = api;
    return api;
}

function buildMemberHeaderHtml(member = {}) {
    const name = member.name || member.email || 'Membro';
    const email = member.email ? `<span>${escapeHtml(member.email)}</span>` : '';
    const role = member.role ? `<span>Função: ${escapeHtml(member.role)}</span>` : '';
    return `<div class="member-modal-meta"><strong>${escapeHtml(name)}</strong>${email}${role}</div>`;
}

function openRowActionsDropdown(menuBtn, dropdown) {
    if (!menuBtn || !dropdown) return;

    if (!dropdown._originalParent) {
        dropdown._originalParent = dropdown.parentElement;
        dropdown._originalNextSibling = dropdown.nextSibling;
    }

    dropdown._triggerButton = menuBtn;

    if (!dropdown.dataset.portalAttached) {
        document.body.appendChild(dropdown);
        dropdown.dataset.portalAttached = 'true';
    }

    dropdown.classList.add('open');
    menuBtn.setAttribute('aria-expanded', 'true');

    dropdown.style.visibility = 'hidden';
    dropdown.style.pointerEvents = 'none';
    dropdown.style.position = 'fixed';
    dropdown.style.right = 'auto';
    dropdown.style.bottom = 'auto';
    dropdown.style.zIndex = '160';

    requestAnimationFrame(() => {
        if (!dropdown.classList.contains('open')) {
            dropdown.style.visibility = '';
            dropdown.style.pointerEvents = '';
            return;
        }
        const buttonRect = menuBtn.getBoundingClientRect();
        const dropdownRect = dropdown.getBoundingClientRect();
        const width = dropdownRect.width;
        const height = dropdownRect.height;
        const margin = 8;

        let left = buttonRect.right - width;
        if (left < margin) left = margin;
        const maxLeft = window.innerWidth - width - margin;
        if (left > maxLeft) left = maxLeft;

        let top = buttonRect.bottom + 6;
        if (top + height > window.innerHeight - margin) {
            top = Math.max(margin, buttonRect.top - height - 6);
        }

        dropdown.style.left = `${Math.round(left)}px`;
        dropdown.style.top = `${Math.round(top)}px`;
        dropdown.style.minWidth = `${Math.round(width)}px`;
        dropdown.style.visibility = '';
        dropdown.style.pointerEvents = '';
    });
}

function closeRowActionsDropdown(dropdown) {
    if (!dropdown) return;

    dropdown.classList.remove('open');
    dropdown.style.visibility = '';
    dropdown.style.pointerEvents = '';
    dropdown.style.position = '';
    dropdown.style.top = '';
    dropdown.style.left = '';
    dropdown.style.minWidth = '';
    dropdown.style.right = '';
    dropdown.style.bottom = '';
    dropdown.style.zIndex = '';

    if (dropdown._triggerButton) {
        dropdown._triggerButton.setAttribute('aria-expanded', 'false');
        dropdown._triggerButton = null;
    }

    if (dropdown.dataset.portalAttached === 'true' && dropdown._originalParent) {
        dropdown._originalParent.insertBefore(dropdown, dropdown._originalNextSibling || null);
    }

    delete dropdown.dataset.portalAttached;
}

async function fetchOrgMemberEnrollmentsNormalized(token, orgId, membershipId) {
    const raw = await getOrgMemberEnrollments(token, orgId, membershipId);
    return normalizeMemberEnrollmentCollection(raw);
}

function renderMemberProgressList(enrollments) {
    if (!enrollments.length) {
        return '<p class="member-progress-empty">Este membro ainda não possui matrículas em cursos.</p>';
    }
    return `<ul class="member-progress-list">${enrollments.map((item) => {
        const metaParts = [];
        if (item.statusLabel) {
            metaParts.push(`<span class="member-status-chip ${item.statusClass}">${escapeHtml(item.statusLabel)}</span>`);
        }
        if (item.assignedAt) {
            metaParts.push(`<span>Vinculado: ${escapeHtml(formatMemberDate(item.assignedAt))}</span>`);
        }
        if (item.updatedAt) {
            metaParts.push(`<span>Atualizado: ${escapeHtml(formatMemberDate(item.updatedAt, true))}</span>`);
        }
        if (item.dueDate) {
            metaParts.push(`<span>Prazo: ${escapeHtml(formatMemberDate(item.dueDate))}</span>`);
        }
        const meta = metaParts.length ? `<div class="member-progress-meta">${metaParts.join('<span class="bullet">•</span>')}</div>` : '';
        return `
            <li class="member-progress-item">
                <h4>${escapeHtml(item.title)}</h4>
                ${meta}
                <div class="member-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${item.progress}">
                    <span style="width:${item.progress}%"></span>
                </div>
                <div class="member-progress-label">${item.progress}% concluído</div>
            </li>
        `;
    }).join('')}</ul>`;
}

function renderMemberEnrollmentTable(enrollments) {
    if (!enrollments.length) {
        return '<p class="member-enrollment-empty">Nenhuma matrícula encontrada para este membro.</p>';
    }
    const rows = enrollments.map((item) => `
        <tr>
            <td>${escapeHtml(item.title)}</td>
            <td><span class="member-status-chip ${item.statusClass}">${escapeHtml(item.statusLabel)}</span></td>
            <td>${item.progress}%</td>
            <td>${item.assignedAt ? escapeHtml(formatMemberDate(item.assignedAt)) : '—'}</td>
            <td>${item.updatedAt ? escapeHtml(formatMemberDate(item.updatedAt, true)) : '—'}</td>
        </tr>
    `).join('');
    return `<table class="member-enrollment-table"><thead><tr><th>Treinamento</th><th>Status</th><th>Progresso</th><th>Vinculado em</th><th>Atualizado em</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function showOrgMemberProgress(member, orgId) {
    const modal = createOrgMemberModal({ title: 'Progresso do membro', size: 'large' });
    if (!member || !member.membershipId) {
        modal.showMessage('Identificador do membro não encontrado.', 'member-progress-error');
        return;
    }
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        modal.showMessage('Sessão expirada. Faça login novamente para acessar os dados.', 'member-progress-error');
        return;
    }
    modal.setContent(`${buildMemberHeaderHtml(member)}<p class="member-progress-loading">Carregando progresso...</p>`);
    try {
        const enrollments = await fetchOrgMemberEnrollmentsNormalized(token, orgId, member.membershipId);
        const content = `${buildMemberHeaderHtml(member)}${renderMemberProgressList(enrollments)}`;
        modal.setContent(content);
    } catch (err) {
        console.error('[orgMembers] erro ao carregar progresso do membro', err);
        modal.showMessage(err?.message || 'Não foi possível carregar o progresso deste membro.', 'member-progress-error');
    }
}

async function showOrgMemberDetails(member, orgId) {
    const modal = createOrgMemberModal({ title: 'Detalhes do membro', size: 'large' });
    if (!member || !member.membershipId) {
        modal.showMessage('Identificador do membro não encontrado.', 'member-progress-error');
        return;
    }
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        modal.showMessage('Sessão expirada. Faça login novamente para acessar os dados.', 'member-progress-error');
        return;
    }
    const detailGrid = `
        <div class="member-detail-grid">
            <div class="member-detail-field"><span class="member-detail-label">Nome</span><span class="member-detail-value">${escapeHtml(member.name || '—')}</span></div>
            <div class="member-detail-field"><span class="member-detail-label">E-mail</span><span class="member-detail-value">${escapeHtml(member.email || '—')}</span></div>
            <div class="member-detail-field"><span class="member-detail-label">Função</span><span class="member-detail-value">${escapeHtml(member.role || '—')}</span></div>
            <div class="member-detail-field"><span class="member-detail-label">Membership ID</span><span class="member-detail-value">${escapeHtml(member.membershipId || '—')}</span></div>
            <div class="member-detail-field"><span class="member-detail-label">User ID</span><span class="member-detail-value">${escapeHtml(member.userId || '—')}</span></div>
        </div>
    `;
    modal.setContent(`${buildMemberHeaderHtml(member)}${detailGrid}<p class="member-progress-loading">Carregando matrículas...</p>`);
    try {
        const enrollments = await fetchOrgMemberEnrollmentsNormalized(token, orgId, member.membershipId);
        const tableHtml = renderMemberEnrollmentTable(enrollments);
        modal.setContent(`${buildMemberHeaderHtml(member)}${detailGrid}${tableHtml}`);
    } catch (err) {
        console.error('[orgMembers] erro ao carregar detalhes do membro', err);
        modal.setContent(`${buildMemberHeaderHtml(member)}${detailGrid}<p class="member-progress-error">${escapeHtml(err?.message || 'Não foi possível carregar as matrículas deste membro.')}</p>`);
    }
}

function maskEmail(email) {
    if (!email) return '';
    const [name, domain] = email.split('@');
    const visible = Math.max(1, Math.floor(name.length / 3));
    return name.substring(0, visible) + '*'.repeat(Math.max(0, name.length - visible)) + '@' + domain;
}

function maskPhone(phone) {
    if (!phone) return '';
    // keep last 4 digits
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 4) return '*'.repeat(digits.length);
    const visible = digits.slice(-4);
    return '*** **** ' + visible;
}

function maskCPF(cpf) {
    if (!cpf) return '';
    const digits = cpf.replace(/\D/g, '');
    if (digits.length < 6) return '*'.repeat(digits.length);
    const start = digits.slice(0, 3);
    const end = digits.slice(-2);
    return start + '.***.***-' + end;
}

function maskDate(dateStr) {
    if (!dateStr) return '';
    // assume YYYY-MM-DD or DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const parts = dateStr.split('-');
        return '**/**/' + parts[0];
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('/');
        return '**/**/' + parts[2];
    }
    return dateStr;
}

export async function loadUserProfile() {
    const token = localStorage.getItem('jwtToken');
    console.debug('[profile] loadUserProfile start, token present?', !!token);
    if (!token) {
        console.debug('[profile] no token found in localStorage');
        return;
    }
    // helper to detect values that are already masked by backend
    const maybeMasked = (v) => (typeof v === 'string' && v.indexOf('*') !== -1);
    try {
        // Buscar o perfil canônico via helper (fetchUserProfile -> GET /profile/me)
        const profile = await fetchUserProfile(token);
        console.debug('[profile] fetched profile', profile);
    // debug overlay removido
        currentProfile = profile;
        // Persistir dados úteis de organizations em sessionStorage para otimização SPA
        try {
            const orgs = profile && profile.organizations;
            if (Array.isArray(orgs)) {
                orgs.forEach(o => {
                    const orgId = o.organizationId || o.orgId || o.id || o._id || '';
                    if (!orgId) return;
                    // salvar role localmente
                    if (o.yourRole || o.your_role || o.role) {
                        sessionStorage.setItem('myOrgRole_' + orgId, (o.yourRole || o.your_role || o.role));
                    }
                    // se houver um membershipId no payload, persistir também
                    const mem = o.membershipId || o.membership_id || o.id || o._id || '';
                    if (mem) sessionStorage.setItem('myMembershipId_' + orgId, mem);
                });
                // marcar que o usuário possui ao menos uma afiliação (é membro de alguma org)
                if (orgs.length > 0) {
                    sessionStorage.setItem('hasMembership', 'true');
                } else {
                    sessionStorage.removeItem('hasMembership');
                }
            }
        } catch (e) { console.warn('Falha ao persistir organizations em sessionStorage:', e); }
    // se o backend retorna um subobjeto com dados pessoais, priorizar esses campos
    // suportar estruturas: profile.personalProfile, profile.pf, profile.profile_pf, ou campos top-level
    const pf = profile && (profile.pf || profile.profile_pf || profile.profile || profile) || null;
    const personal = (pf && (pf.personalProfile || pf.pf || pf.profile_pf || pf.profile)) || pf || null;
        const nameEl = document.getElementById('userName');
        const emailEl = document.getElementById('userEmail');
        const phoneElement = document.getElementById('userPhone');
    const resolvedName = personal ? (personal.fullName || personal.name || personal.full_name || personal.fullname || '') : '';
    if (nameEl) nameEl.textContent = resolvedName;
    // Aplicar máscara apenas se a API não retornar valor já mascarado
    const rawEmail = (pf && (pf.email || pf.userEmail)) || (profile && (profile.email || profile.userEmail)) || localStorage.getItem('loggedInUserEmail') || '';
    const rawPhone = (personal && (personal.phone || personal.phoneNumber || personal.mobile)) || (pf && (pf.phone || pf.phoneNumber || pf.mobile)) || (profile && (profile.phone || profile.phoneNumber)) || '';
    if (emailEl) emailEl.textContent = maybeMasked(rawEmail) ? rawEmail : maskEmail(rawEmail);
    if (phoneElement) phoneElement.textContent = maybeMasked(rawPhone) ? rawPhone : maskPhone(rawPhone);
        // show or hide the 'complete profile' notice
        const notice = document.getElementById('completeProfileNotice');
        if (notice) {
            if (!resolvedName) notice.classList.remove('hidden'); else notice.classList.add('hidden');
        }

        // preencher CPF e data de nascimento (somente leitura) e exibir seção Verificado quando disponíveis
    const cpfEl = document.getElementById('userCPF');
    const birthEl = document.getElementById('userBirth');
    // aceitar diferentes nomes de propriedade retornados pela API
    const cpfValue = (personal && (personal.cpf || personal.cpfNumber || personal.document || personal.documentNumber || personal.document_number || personal.cpf_number)) || (pf && (pf.cpf || pf.cpfNumber || pf.document || pf.documentNumber || pf.document_number || pf.cpf_number)) || '';
    const birthValue = (personal && (personal.birthDate || personal.birth || personal.dob || personal.birth_date || personal.dataNascimento)) || (pf && (pf.birth || pf.birthDate || pf.dob || pf.birth_date || pf.dataNascimento)) || '';
    if (cpfEl) cpfEl.textContent = maybeMasked(cpfValue) ? cpfValue : (cpfValue ? maskCPF(cpfValue) : '—');
    if (birthEl) birthEl.textContent = maybeMasked(birthValue) ? birthValue : (birthValue ? maskDate(birthValue) : '—');
    // marcar telefone como verificado (cliente deveria contatar central para alterar)
    const phoneEl = document.getElementById('userPhone');
    if (phoneEl) phoneEl.classList.add('verified');
        // garantir que a seção verificado esteja visível (mostra placeholders quando não há dados)
        const verifiedLi = document.querySelector('.verified-section');
        if (verifiedLi) {
            verifiedLi.classList.remove('hidden');
        }
    // caso seja admin de empresa, exibir painel específico
    try { showCompanyAdminPanel(profile); } catch (e) { /* silencioso se não existir */ }
    // Expor flag simples para templates/JS: se usuário for company_admin
    try {
        if (profile && profile.role === 'company_admin') {
            sessionStorage.setItem('isCompanyAdmin', 'true');
        } else {
            sessionStorage.removeItem('isCompanyAdmin');
        }
    } catch (e) { /* silencioso */ }
    // Persistir role de sistema (se existir) para permitir acesso a painéis de admin
    try {
        const sysRole = (profile && (profile.systemRole || profile.role)) || '';
        if (sysRole) {
            localStorage.setItem('systemRole', sysRole);
        } else {
            localStorage.removeItem('systemRole');
        }
    } catch (e) { /* silencioso */ }
    try {
        // Notificar outros módulos que a role do usuário foi atualizada (útil para atualizar UI)
        document.dispatchEvent(new CustomEvent('user:loggedin', { detail: { source: 'profile' } }));
    } catch (e) { /* silent */ }
    // Mostrar ou esconder o ícone de informação na seção Dados Cadastrais
    try {
        const infoDot = document.querySelector('#dadosCadastrais .info-dot');
        // considerar perfil completo quando tiver nome e CPF não vazio
        const profileComplete = Boolean(resolvedName && cpfValue);
        if (infoDot) {
            if (profileComplete) {
                infoDot.classList.remove('hidden');
            } else {
                infoDot.classList.add('hidden');
            }
        }
    } catch (e) { /* silent */ }
    } catch (err) {
        console.error('Erro ao carregar perfil:', err);
        // Fallback: preencher o mínimo de UI com o e-mail salvo localmente para evitar que a conta fique vazia
        try {
            currentProfile = null;
            const nameEl = document.getElementById('userName');
            const emailEl = document.getElementById('userEmail');
            const phoneElement = document.getElementById('userPhone');
            if (nameEl) nameEl.textContent = '';
            const savedEmail = localStorage.getItem('loggedInUserEmail') || '';
            if (emailEl) emailEl.textContent = maybeMasked(savedEmail) ? savedEmail : maskEmail(savedEmail);
            if (phoneElement) phoneElement.textContent = '—';
            const notice = document.getElementById('completeProfileNotice');
            if (notice) {
                // mostrar aviso quando não temos nome no fallback
                notice.textContent = 'Não foi possível carregar seus dados. Verifique sua conexão.';
                notice.classList.remove('hidden');
            }
            // manter a seção de informações visível (mostrar placeholders quando não temos dados)
            const verifiedLi = document.querySelector('.verified-section');
            if (verifiedLi) verifiedLi.classList.remove('hidden');
        } catch (e) {
            console.warn('Erro ao aplicar fallback de perfil:', e);
        }
    }
}

export { showCompanyAdminPanel };

// Se o usuário for admin de empresa, mostrar painel de empresa com dados mock
function showCompanyAdminPanel(profile) {
    const companySection = document.getElementById('companyAdminSection');
    if (!companySection) return;
    // esconder por padrão; somente mostrar para company_admin
    if (profile && profile.role === 'company_admin') {
        companySection.classList.remove('hidden');
        companySection.classList.add('active');
        // popular dados da empresa (aceita estrutura diferente retornada pela API)
        const company = profile.company || profile.empresa || {};
        const name = company.name || company.razaoSocial || company.companyName || '—';
        const rawCnpj = company.cnpj || company.CNPJ || '';
        const cnpj = rawCnpj ? formatCNPJ(rawCnpj) : '—';
        const plan = company.plan || company.plano || '—';
        const nameEl = document.getElementById('companyNameDisplay');
        const cnpjEl = document.getElementById('companyCNPJDisplay');
        const planEl = document.getElementById('companyPlanDisplay');
        if (nameEl) nameEl.textContent = name;
        if (cnpjEl) cnpjEl.textContent = cnpj;
        if (planEl) planEl.textContent = plan;
        // popular subusuarios list com mock (ou payload da API se disponível)
        const subusers = company.subusers || profile.subusers || [
            { name: 'Ana Souza', email: 'ana@empresa.com', cpf: '000.000.000-00' },
            { name: 'Carlos Lima', email: 'carlos@empresa.com', cpf: '111.111.111-11' }
        ];
        const listEl = document.getElementById('subusersList');
        if (listEl) {
            listEl.innerHTML = '';
            subusers.forEach(u => {
                const li = document.createElement('li');
                li.textContent = `${u.name} — ${u.email} ${u.cpf ? ' — ' + u.cpf : ''}`;
                listEl.appendChild(li);
            });
        }
    } else {
        companySection.classList.add('hidden');
        companySection.classList.remove('active');
    }
}

// Convite simples (mock) — em produção chamaria API para enviar convite
export function inviteSubuser() {
    const emailInput = document.getElementById('inviteEmail');
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) {
        alert('Digite um e-mail para convidar.');
        return;
    }
    const listEl = document.getElementById('subusersList');
    if (listEl) {
        const li = document.createElement('li');
        li.textContent = `Convite enviado para ${email} (mock)`;
        listEl.appendChild(li);
        if (emailInput) emailInput.value = '';
    }
}

// Importar CSV simples e mostrar preview (client-side mock)
export function importCSV() {
    const input = document.getElementById('importCsvInput');
    const container = document.getElementById('importPreviewContainer');
    if (!input || !input.files || input.files.length === 0) {
        alert('Selecione um arquivo CSV primeiro.');
        return;
    }
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const rows = text.split(/\r?\n/).filter(Boolean).slice(0, 50);
        const parsed = rows.map(r => r.split(',').map(c => c.trim()));
        if (container) {
            container.innerHTML = '<pre>' + parsed.map(p => p.join(' | ')).join('\n') + '</pre>';
        }
        alert('CSV processado (mock). Em produção, enviar para API para criar convites.');
    };
    reader.readAsText(file);
}

// Exportar relatório mock em CSV e forçar download
export function exportReport(reportType) {
    let csv = '';
    if (reportType === 'progress') {
        csv = 'email,name,course,progress\nana@empresa.com,Ana Souza,Segurança no Trabalho,100\ncarlos@empresa.com,Carlos Lima,Segurança no Trabalho,57';
    } else {
        csv = 'email,name,cpf\nana@empresa.com,Ana Souza,00000000000\ncarlos@empresa.com,Carlos Lima,11111111111';
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = reportType + '-report.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Quando uma página for injetada, se for a página 'account' carregamos o perfil para popular os spans
document.addEventListener('page:loaded', (e) => {
    try {
        if (e?.detail?.page === 'account') {
            if (typeof loadUserProfile === 'function') loadUserProfile();
        }
        // Auto-consulta de CNPJ na página de criação de organização
        if (e?.detail?.page === 'organizationsNew') {
            try {
                const cnpjInput = document.getElementById('orgCNPJ');
                const razaoInput = document.getElementById('orgRazaoSocial');
                const messages = document.getElementById('orgCreateMessages');

                // Flag para controlar o preenchimento automático
                let isRazaoSocialAutoFilled = false;

                // Listener para detectar digitação manual na Razão Social
                if (razaoInput) {
                    razaoInput.addEventListener('input', () => {
                        isRazaoSocialAutoFilled = false; // Se o usuário digita, o valor passa a ser manual
                    });
                }

                if (cnpjInput && !cnpjInput.dataset.lookupBound) {
                    cnpjInput.dataset.lookupBound = 'true';
                    // Util: formatação de CNPJ
                    const formatCNPJ = (val) => {
                        const digits = (val || '').replace(/\D/g, '').slice(0,14);
                        if (digits.length <= 2) return digits;
                        if (digits.length <= 5) return digits.replace(/^(\d{2})(\d+)/, '$1.$2');
                        if (digits.length <= 8) return digits.replace(/^(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
                        if (digits.length <= 12) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
                        return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
                    };
                    // Cache simples em memória (escopo do listener)
                    const cnpjCache = new Map();
                    let lastLookup = null;
                    // Aplicar máscara enquanto digita preservando posição lógica dos dígitos
                    cnpjInput.addEventListener('input', () => {
                        const original = cnpjInput.value;
                        const caretPos = cnpjInput.selectionStart || 0;
                        // Quantos dígitos (0-9) existiam antes do caret originalmente
                        const digitsBeforeCaret = original.slice(0, caretPos).replace(/\D/g,'').length;
                        // Reformatar
                        const formatted = formatCNPJ(original);
                        cnpjInput.value = formatted;
                        // Calcular nova posição: avançar sobre a string formatada até contar os mesmos digitsBeforeCaret
                        let newCaret = 0, digitsCount = 0;
                        while (newCaret < formatted.length && digitsCount < digitsBeforeCaret) {
                            if (/\d/.test(formatted[newCaret])) digitsCount++;
                            newCaret++;
                        }
                        // Ajuste final: se digitou no final, manter no fim
                        if (digitsBeforeCaret === formatted.replace(/\D/g,'').length) {
                            newCaret = formatted.length;
                        }
                        try { cnpjInput.setSelectionRange(newCaret, newCaret); } catch(_) { /* ignore */ }
                    });
                    const runLookup = async () => {
                        const raw = cnpjInput.value || '';
                        const digits = raw.replace(/\D/g,'');
                        if (digits.length === 0) return; // nada digitado
                        if (digits.length < 14) {
                            if (messages) messages.textContent = 'CNPJ deve ter 14 dígitos.';
                            return;
                        }
                        // Não validar DV localmente para evitar conflitos com backend
                        // evitar sobrescrever se usuário já preencheu manualmente uma razão social não vazia
                        if (razaoInput && razaoInput.value && razaoInput.value.trim().length > 3 && !isRazaoSocialAutoFilled) {
                        return; // Só para de executar se o valor for manual
                        }
                        // Checar cache
                        if (cnpjCache.has(digits)) {
                            const cached = cnpjCache.get(digits);
                            if (cached && cached.razao_social && razaoInput) razaoInput.value = cached.razao_social;
                            if (messages) messages.textContent = 'Razão Social preenchida (cache).';
                            return;
                        }
                        // Evitar chamadas duplicadas se o usuário blur repetidamente sem alterar
                        if (lastLookup === digits) {
                            return;
                        }
                        lastLookup = digits;
                        if (messages) messages.textContent = 'Consultando CNPJ...';
                        try {
                            const mod = await import('./api.js');
                            const data = await mod.lookupCnpj(digits);

                            if (data && data.razao_social && razaoInput) {
                                razaoInput.value = data.razao_social;
                                isRazaoSocialAutoFilled = true; // marcar que o valor foi preenchido automaticamente

                                cnpjCache.set(digits, data);
                                if (messages) messages.textContent = 'Razão Social preenchida automaticamente.';
                            } else {
                                if (messages) messages.textContent = 'Não foi possível obter Razão Social.';
                            }
                        } catch (err) {
                            console.error('[cnpj lookup] erro', err);
                            if (messages) {
                                if (err.code === 'CNPJ_NOT_FOUND' || err.status === 404) messages.textContent = 'CNPJ não encontrado.';
                                else if (err.code === 'INVALID_CNPJ_LENGTH') messages.textContent = err.message;
                                else messages.textContent = err.message || 'Erro ao consultar CNPJ.';
                            }
                            lastLookup = null; // permitir nova tentativa
                        }
                    };
                    cnpjInput.addEventListener('blur', runLookup);
                    // Opcional: consulta também ao pressionar Enter dentro do campo
                    cnpjInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); runLookup(); } });
                }
            } catch (lookupErr) { console.warn('Falha ao inicializar auto lookup CNPJ', lookupErr); }
        }
    } catch (err) {
        console.warn('Erro no listener page:loaded em profile.js', err);
    }
});

// =======================================================
// FUNÇÕES DE EDIÇÃO DO PERFIL (NOME E TELEFONE)
// =======================================================

/**
 * Alterna entre a visualização e o formulário de edição do perfil (nome e telefone).
 */
export function toggleProfileEdit() {
    const profileView = document.getElementById('profileView');
    const profileEditForm = document.getElementById('profileEditForm');
    const editButton = document.getElementById('editProfileButton');
    const cancelButtonDiv = document.getElementById('cancelProfileEditButton');

    if (!profileView || !profileEditForm || !editButton || !cancelButtonDiv) return;

    // Alterna a visibilidade
    profileView.classList.toggle('hidden');
    profileEditForm.classList.toggle('hidden');
    editButton.classList.toggle('hidden');
    cancelButtonDiv.classList.toggle('hidden');
    
    // Preenche os campos de edição
    document.getElementById('editName').value = document.getElementById('userName').textContent;
    // telefone não é editável via UI — não preenchemos campo
}


 // =======================================================
// FUNÇÕES DE EDIÇÃO DO PERFIL (EMAIL E SENHA)
// =======================================================

/**
 * Alterna a visibilidade dos campos de edição de e-mail.
 * @param {boolean} show - Se true, mostra os campos; se false, esconde.
 */
export function toggleEmailEdit(show) {
    // Os controles de edição de e-mail foram removidos do HTML por decisão de UX.
    // Esta função permanece como "safe no-op" para evitar erros caso outros módulos ainda a invoquem.
    try {
        const showButton = document.getElementById('showEmailButton');
        const controls = document.getElementById('email-controls');
        if (!controls || !showButton) return;
    } catch (e) {
        // silencioso
    }
}

/**
 * Alterna a visibilidade dos campos de edição de senha.
 * @param {boolean} show - Se true, mostra os campos; se false, esconde.
 */
export function togglePasswordEdit(show) {
    const showButton = document.getElementById('showPasswordButton');
    const controls = document.getElementById('password-controls');

    if (show) {
        if (showButton) showButton.style.display = 'none';
        if (controls) controls.style.display = 'block';
    } else {
        if (showButton) showButton.style.display = 'block';
        if (controls) controls.style.display = 'none';
    }
}

// Funções para salvar dados (agora chamam o módulo de API)
/**
 * Lida com a tentativa de salvar um novo e-mail.
 */
export async function handleEmailChange() {
    const emailInput = document.getElementById('editEmail');
    const controls = document.getElementById('email-controls');
    const messages = document.getElementById('orgMembersMessages');
    // Se os controles foram removidos, não há nada a salvar desde a UI
    if (!emailInput || !controls) {
        if (messages) messages.textContent = 'Para alterar o e-mail, por favor contate a central de atendimento ao cliente.';
        return;
    }
    const emailValue = emailInput ? emailInput.value.trim() : '';

    // garantir feedback element
    let feedback = controls.querySelector('.inline-feedback');
    if (!feedback) {
        feedback = document.createElement('span');
        feedback.className = 'inline-feedback';
        controls.appendChild(feedback);
    }

    feedback.style.color = 'var(--coral)';
    feedback.textContent = '';

    if (emailValue === '') {
        feedback.textContent = 'Por favor, preencha o campo com o novo e-mail.';
        return;
    }

    const token = localStorage.getItem('jwtToken');
    try {
        await requestEmailChange(token, emailValue);
        feedback.style.color = 'var(--verde-escuro)';
        feedback.textContent = 'Solicitação enviada. Verifique seu e-mail atual para autorizar a alteração.';
        // limpar input e fechar após curto delay
        setTimeout(() => {
            toggleEmailEdit(false);
        }, 1600);
    } catch (error) {
        feedback.style.color = 'var(--coral)';
        feedback.textContent = 'Erro ao solicitar alteração: ' + (error.message || 'Tente novamente');
        console.error('Erro ao solicitar alteração do e-mail:', error);
    }
}

/**
 * Lida com a tentativa de salvar uma nova senha.
 */
export async function handlePasswordChange() {
    const oldPass = prompt('Digite sua senha atual para confirmar a alteração:');
    const passwordInput = document.getElementById('editPassword');
    const passwordValue = passwordInput ? passwordInput.value.trim() : '';
    if (!oldPass) {
        alert('Senha atual é necessária.');
        return;
    }
    if (!passwordValue) {
        alert('Informe a nova senha.');
        return;
    }
    const token = localStorage.getItem('jwtToken');
    try {
        await updateUserPassword(token, passwordValue, oldPass);
        alert('Sua senha foi alterada com sucesso!');
        togglePasswordEdit(false);
    } catch (error) {
        alert('Erro ao alterar a senha: ' + error.message);
    }
}

/**
 * Atualiza o perfil do usuário (nome/telefone) usando a API.
 * Espera um FormData ou formulário com campos 'name' e 'phone'.
 */
export async function updateProfile(eventOrForm) {
    try {
        let data = null;
        if (eventOrForm && eventOrForm.preventDefault) {
            // handler de submit
            eventOrForm.preventDefault();
            const form = eventOrForm.target;
            const fd = new FormData(form);
            data = Object.fromEntries(fd.entries());
        } else if (eventOrForm instanceof HTMLFormElement) {
            const fd = new FormData(eventOrForm);
            data = Object.fromEntries(fd.entries());
        } else if (typeof eventOrForm === 'object') {
            data = eventOrForm;
        }

        if (!data) return;

        const token = localStorage.getItem('jwtToken');
        // se for alteração de telefone, pedir confirmação do telefone antigo
        if (data.phone) {
            const currentPhone = prompt('Digite o número de telefone atual para confirmar a alteração:');
            if (!currentPhone) {
                alert('Confirmação do telefone é necessária.');
                return;
            }
            // opcional: comparar com currentProfile
            if (currentProfile && currentProfile.phone && currentPhone !== currentProfile.phone) {
                alert('Telefone atual não confere.');
                return;
            }
        }

        await updateUserProfile(token, data);
        alert('Perfil atualizado com sucesso!');
        // Atualizar view (simples reload dos campos)
        if (data.name) document.getElementById('userName').textContent = data.name;
        if (data.phone) document.getElementById('userPhone').textContent = data.phone;
        toggleProfileEdit();
    } catch (err) {
        console.error('Erro ao atualizar perfil:', err);
        alert('Erro ao atualizar perfil.');
    }
}

/**
 * Handle profile completion (first-time fill)
 */
export async function handleCompleteProfile(event) {
    event.preventDefault();
    const form = event.target;
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    const token = localStorage.getItem('jwtToken');
    try {
        await completeUserProfile(token, data);
        alert('Perfil completado com sucesso!');
        const completeSection = document.getElementById('profileCompleteSection');
        if (completeSection) completeSection.classList.add('hidden');
        // reload profile
        await loadUserProfile();
        showAccountSection('profile');
    } catch (err) {
        console.error('Erro ao completar perfil:', err);
        alert('Erro ao completar perfil: ' + err.message);
    }
}

/**
 * Handler para submissão do formulário de criação de perfil PF (createPfForm)
 */
export async function handleCreatePfSubmit(event) {
    event.preventDefault();
    const messages = document.getElementById('createPfMessages');
    if (messages) messages.textContent = '';
    const fullName = (document.getElementById('pfFullName') || {}).value || '';
    const cpf = (document.getElementById('pfCpf') || {}).value || '';
    const birthDate = (document.getElementById('pfBirth') || {}).value || '';
    const phone = (document.getElementById('pfPhone') || {}).value || '';

    if (!fullName || !cpf || !birthDate) {
        if (messages) messages.textContent = 'Preencha nome, CPF e data de nascimento.';
        return;
    }

    const token = localStorage.getItem('jwtToken');
    try {
        const payload = { fullName, cpf, birthDate, phone };
        await createPFProfile(token, payload);
        if (messages) messages.textContent = 'Perfil salvo com sucesso.';
        // atualizar UI localmente com o nome enviado (evita depender imediatamente de /auth/profile)
        try {
            const nameEl = document.getElementById('userName');
            if (nameEl) nameEl.textContent = fullName;
        } catch (e) { /* ignore */ }

        // Tentar recarregar o perfil do servidor para atualizar demais campos (silencioso em caso de falta de endpoint)
        try { await loadUserProfile(); } catch (e) { console.warn('loadUserProfile falhou após criar PF:', e); }

        // redirecionar para a conta
        setTimeout(() => {
            try { window.appShowPage && window.appShowPage('account'); } catch (e) { /* fallback */ }
            // também usamos showPage se estiver disponível via import dinâmico
            try { import('./navigation.js').then(m => m.showPage('account')); } catch (e) { /* ignore */ }
        }, 600);
    } catch (err) {
        console.error('Erro ao criar PF profile:', err);
        let uiMsg = err && err.message ? err.message : 'Erro ao salvar perfil PF.';
        if (err && err.code === 'DUPLICATE_CPF') {
            uiMsg = 'CPF já cadastrado. Verifique se já existe um perfil associado ou entre em contato com o suporte.';
        } else if (err && err.code === 'INVALID_CPF') {
            uiMsg = 'CPF inválido. Verifique o número digitado.';
        } else if (err && err.status === 403 && (!err.code || err.message === 'Erro ao criar perfil PF')) {
            try {
                const lastCpf = sessionStorage.getItem('lastPfAttemptCpf');
                const currentCpf = (document.getElementById('pfCpf') || {}).value || '';
                if (lastCpf && currentCpf && lastCpf.replace(/\D/g,'') === currentCpf.replace(/\D/g,'')) {
                    uiMsg = 'CPF já cadastrado. Verifique se já existe um perfil associado ou entre em contato com o suporte.';
                }
            } catch (e) { /* ignore */ }
        } else if (!err?.code) {
            // Heurística adicional: se a mensagem retornada contém padrões de CPF inválido mas code não foi setado
            const rawMsg = (err && (err.message || err._raw)) || '';
            const lower = rawMsg.toLowerCase();
            if (/cpf/.test(lower) && (lower.includes('inval') || lower.includes('invalid'))) {
                uiMsg = 'CPF inválido. Verifique o número digitado.';
            }
            // fallback: validar client-side comprimento/dígitos básicos
            const currentCpf = (document.getElementById('pfCpf') || {}).value || '';
            const digits = currentCpf.replace(/\D/g,'');
            if (!uiMsg.includes('CPF inválido') && digits && digits.length !== 11) {
                uiMsg = 'CPF inválido. Verifique o número digitado.';
            }
        } else if (uiMsg === 'Erro ao criar perfil PF' && err && err.status) {
            uiMsg = `Não foi possível salvar (status ${err.status}). Tente novamente ou contate suporte.`;
        }
        if (messages) messages.textContent = uiMsg;
    }
}

/**
 * Handler para submissão do formulário de criação de organização (orgCreateForm)
 */
export async function handleOrgCreateSubmit(event) {
    event.preventDefault();
    const messages = document.getElementById('orgCreateMessages');
    if (messages) messages.textContent = '';
    const razaoSocialInput = (document.getElementById('orgRazaoSocial') || {}).value || '';
    const razaoSocial = razaoSocialInput.trim();
    const cnpjRaw = (document.getElementById('orgCNPJ') || {}).value || '';
    const cleanedCnpj = (cnpjRaw || '').replace(/\D/g,''); // apenas dígitos

    // validações mínimas no cliente
    if (!razaoSocial) {
        if (messages) messages.textContent = 'Preencha a Razão Social.';
        return;
    }
    if (!cleanedCnpj) {
        if (messages) messages.textContent = 'Preencha o CNPJ.';
        return;
    }
    if (cleanedCnpj.length !== 14) {
        if (messages) messages.textContent = 'CNPJ inválido. Digite os 14 dígitos.';
        return;
    }

    const token = localStorage.getItem('jwtToken');
    try {
        // Enviar apenas o campo cnpj com os 14 dígitos limpos
        const payload = { razaoSocial, cnpj: cleanedCnpj };
        const resp = await createOrganization(token, payload);
        // tentar inferir id da resposta
        const orgId = resp && (resp.id || resp._id || (resp.organization && (resp.organization.id || resp.organization._id)));
        if (!orgId) {
            if (messages) messages.textContent = 'Organização criada, mas não foi possível localizar o ID.';
        } else {
            // persistir orgId temporariamente
            sessionStorage.setItem('currentOrganizationId', orgId);
            sessionStorage.setItem('currentOrganizationName', razaoSocial);
            // Voltar para Gestão de Empresas e atualizar a lista para que a org criada apareça
            try {
                import('./navigation.js').then(m => m.showPage('orgManagement'));
            } catch (e) { /* ignore */ }
            // tentar refrescar a lista (se o listener da página já disparou, ele chamará renderMyOrganizations)
            try { const ev = new CustomEvent('page:loaded', { detail: { page: 'orgManagement' } }); document.dispatchEvent(ev); } catch (e) { /* silent */ }
        }
    } catch (err) {
        console.error('Erro ao criar organização:', err);
        if (messages) {
            let uiMsg = err && err.message ? err.message : 'Erro ao criar organização.';
            if (err && err.code === 'INVALID_CNPJ') uiMsg = 'CNPJ inválido. Verifique os 14 dígitos digitados.';
            if (err && err.code === 'MISSING_RAZAO_SOCIAL') uiMsg = 'Razão Social é obrigatória.';
            messages.textContent = uiMsg;
        }
    }
}

/**
 * Inicializa a página de membros da organização: carrega membros via API e popula tabela.
 */
export async function initOrgMembersPage() {
    const messages = document.getElementById('orgMembersMessages');
    if (messages) messages.textContent = '';
    const orgId = sessionStorage.getItem('currentOrganizationId');
    const orgName = sessionStorage.getItem('currentOrganizationName') || '';
    const title = document.getElementById('orgTitle');
    if (title && orgName) title.textContent = `Organização: ${orgName}`;

    if (!orgId) {
        if (messages) messages.textContent = 'Nenhuma organização selecionada. Crie ou selecione uma organização primeiro.';
        return;
    }

    const token = localStorage.getItem('jwtToken');
    // Carregamento único: só pedir perfil se ainda não tivermos em memória
    try {
        if (!currentProfile) {
            await loadUserProfile();
        }
    } catch (e) { /* não fatal */ }

    try {
        const members = await getOrgMembers(token, orgId);
        renderOrgMembers(members, orgId);
    } catch (err) {
        console.error('Erro ao carregar membros:', err);
        if (messages) messages.textContent = err.message || 'Erro ao carregar membros.';
    }

    // Carregar setores adotados
    try {
        await loadOrganizationSectors(orgId, token);
    } catch (e) {
        console.warn('[orgMembers] Falha ao carregar setores adotados', e);
        const secMsg = document.getElementById('orgSectorsMessages');
        if (secMsg) secMsg.textContent = e.message || 'Erro ao carregar setores.';
    }

    // Carregar catálogo público (lista de setores disponíveis) após ter adotados (para filtrar)
    try {
        await loadGlobalSectorsForOrg(orgId, token);
    } catch (e) {
        console.warn('[orgMembers] Falha ao carregar catálogo de setores', e);
        const fb = document.getElementById('addOrgSectorFeedback');
        if (fb && !fb.textContent) fb.textContent = e.message || 'Erro ao carregar catálogo público.';
    }
}

// Função responsável apenas por renderizar a tabela de membros a partir de um array já obtido
async function renderOrgMembers(members, orgId) {
    const messages = document.getElementById('orgMembersMessages');
    const tbody = document.querySelector('#orgMembersTable tbody');
    if (!tbody) return;
    document.querySelectorAll('.row-actions-dropdown.open').forEach(d => closeRowActionsDropdown(d));
    tbody.innerHTML = '';
    // verificar meu papel nesta organização (persistido por loadUserProfile em myOrgRole_<orgId>)
    const myRole = sessionStorage.getItem('myOrgRole_' + orgId) || '';
    const inviteForm = document.getElementById('inviteMemberForm');
    const leaveBtn = document.getElementById('leaveOrgButton');
    const membersTable = document.getElementById('orgMembersTable');
    // Somente ORG_ADMIN tem acesso às ações administrativas (ver membros, convidar, sair)
    if (myRole !== 'ORG_ADMIN') {
        // usuário não é admin: acesso apenas de visualização
        if (membersTable) membersTable.classList.add('hidden');
        if (inviteForm) inviteForm.classList.add('hidden');
        if (leaveBtn) leaveBtn.style.display = 'none';
        if (messages) messages.textContent = 'Você pode visualizar a organização, mas não tem permissões administrativas. Contate um administrador para alterações.';
        return;
    } else {
        if (membersTable) membersTable.classList.remove('hidden');
        if (inviteForm) inviteForm.classList.remove('hidden');
        if (leaveBtn) leaveBtn.style.display = '';
    }
    (members || []).forEach(m => {
            const tr = document.createElement('tr');
            // Preferir fullName retornado pela API; suportar diferentes formatos (m.fullName ou m.user.fullName)
            const fullNameValue = m.fullName || m.full_name || m.fullname || m.user?.fullName || m.user?.full_name || m.user?.fullname || '';
            const emailValue = m.email || m.userEmail || m.user?.email || '';
            // Mostrar fullName na coluna Nome; se não houver, usar email como fallback
            const displayName = fullNameValue || emailValue || '';
            const nameTd = document.createElement('td'); nameTd.textContent = displayName;
            const emailTd = document.createElement('td'); emailTd.textContent = emailValue;
            const roleTd = document.createElement('td');
            // membership id do membro (pode vir como id, _id, membershipId)
            const membershipId = m.id || m._id || m.membershipId || (m.user && (m.user.id || m.user._id));

            // Mostrar função como texto (alterações de função foram removidas)
            roleTd.textContent = m.role || m.userRole || '';
            // armazenar membership id para referência posterior
            if (membershipId) roleTd.dataset.membershipId = membershipId;
            const actionTd = document.createElement('td');
            // não permitir ações sobre o próprio usuário (evitar remoção/alteração de si mesmo)
            const myMembershipStored = sessionStorage.getItem('myMembershipId_' + orgId) || '';
            // possíveis campos que a API pode retornar para identificar o usuário
            const possibleAuthUserId = m.authUserId || m.auth_user_id || m.userId || m.user_id || (m.user && (m.user.id || m.user._id || m.user.userId)) || '';
            const possibleMembershipId = membershipId || m.membershipId || m.id || m._id || '';
            const currentUserId = (currentProfile && (currentProfile.userId || currentProfile.id || currentProfile.user_id || currentProfile.authUserId)) || '';
            const isOwnMembership = (possibleMembershipId && myMembershipStored && String(possibleMembershipId) === String(myMembershipStored)) || (currentUserId && possibleAuthUserId && String(possibleAuthUserId) === String(currentUserId));
            console.debug('[members] own-check', { possibleMembershipId, myMembershipStored, possibleAuthUserId, currentUserId, isOwnMembership });
            if (!isOwnMembership) {
                // Menu de ações com ícone 3 pontos
                const menuWrap = document.createElement('div');
                menuWrap.className = 'row-actions';
                const menuBtn = document.createElement('button');
                menuBtn.type = 'button';
                menuBtn.className = 'row-actions-menu-btn';
                menuBtn.setAttribute('aria-haspopup','true');
                menuBtn.setAttribute('aria-expanded','false');
                menuBtn.setAttribute('title','Ações');
                menuBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>';

                                const memberPayload = {
                                        membershipId: membershipId ? String(membershipId) : '',
                                        userId: possibleAuthUserId ? String(possibleAuthUserId) : '',
                                        name: displayName || '',
                                        email: emailValue || '',
                                        role: m.role || m.userRole || ''
                                };

                                const dropdown = document.createElement('div');
                                dropdown.className = 'row-actions-dropdown';
                                dropdown.setAttribute('role','menu');
                                dropdown.innerHTML = `
                                        <button type="button" class="action-item member-progress-btn" role="menuitem">
                                            <span class="icon">${chartIconSvg()}</span><span>Ver progresso</span>
                                        </button>
                                        <button type="button" class="action-item member-details-btn" role="menuitem">
                                            <span class="icon">${infoIconSvg()}</span><span>Ver detalhes</span>
                                        </button>
                                        <button type="button" class="action-item change-role-btn" role="menuitem" data-membership-id="${membershipId||''}" data-member-name="${(displayName||'').replace(/"/g,'&quot;')}" data-current-role="${(m.role||m.userRole||'')}">
                                            <span class="icon">${pencilIconSvg()}</span><span>Alterar</span>
                                        </button>
                                        <button type="button" class="action-item remove-member-btn" role="menuitem" data-membership-id="${membershipId||''}">
                                            <span class="icon">${trashIconSvg()}</span><span>Remover</span>
                                        </button>`;

                menuWrap.appendChild(menuBtn);
                menuWrap.appendChild(dropdown);
                actionTd.appendChild(menuWrap);

                // Toggle do menu
                menuBtn.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    if (dropdown.classList.contains('open')) {
                        closeRowActionsDropdown(dropdown);
                        return;
                    }
                    document.querySelectorAll('.row-actions-dropdown.open').forEach(d => {
                        if (d !== dropdown) {
                            closeRowActionsDropdown(d);
                        }
                    });
                    openRowActionsDropdown(menuBtn, dropdown);
                });

                // Ação Ver progresso
                const progressBtn = dropdown.querySelector('.member-progress-btn');
                if (progressBtn) {
                    progressBtn.addEventListener('click', (ev) => {
                        ev.preventDefault();
                        closeRowActionsDropdown(dropdown);
                        try { showOrgMemberProgress(memberPayload, orgId); } catch (error) { console.error('Erro ao abrir progresso do membro:', error); }
                    });
                }

                // Ação Ver detalhes
                const detailBtn = dropdown.querySelector('.member-details-btn');
                if (detailBtn) {
                    detailBtn.addEventListener('click', (ev) => {
                        ev.preventDefault();
                        closeRowActionsDropdown(dropdown);
                        try { showOrgMemberDetails(memberPayload, orgId); } catch (error) { console.error('Erro ao abrir detalhes do membro:', error); }
                    });
                }

                // Ação Alterar
                dropdown.querySelector('.change-role-btn').addEventListener('click', (ev) => {
                    ev.preventDefault();
                    closeRowActionsDropdown(dropdown);
                    openInlineRolePopup({ membershipId: membershipId, name: displayName, currentRole: m.role || m.userRole || '' }, menuBtn);
                });
                // Ação Remover
                dropdown.querySelector('.remove-member-btn').addEventListener('click', async (ev) => {
                    ev.preventDefault();
                    closeRowActionsDropdown(dropdown);
                    const btn = ev.currentTarget;
                    const membershipToRemove = btn.getAttribute('data-membership-id');
                    if (!membershipToRemove) return;
                    const token = localStorage.getItem('jwtToken');
                    const originalHtml = btn.innerHTML;
                    btn.disabled = true;
                    btn.innerHTML = '<span class="icon spinner"></span><span>Removendo...</span>';
                    try {
                        await removeOrgMember(token, orgId, membershipToRemove);
                        // Recarregar membros
                        try {
                            const refreshed = await getOrgMembers(token, orgId);
                            await renderOrgMembers(refreshed, orgId);
                        } catch(e) { console.warn('[members] refresh after remove falhou', e); }
                    } catch(err) {
                        console.error('Erro ao remover membro:', err);
                        if (messages) messages.textContent = 'Erro ao remover membro: ' + (err.message || 'Tente novamente');
                        btn.disabled = false;
                        btn.innerHTML = originalHtml;
                    }
                });

                // Listener global (uma vez) para fechar menu ao clicar fora
                if (!window._rowActionsOutsideBound) {
                    window._rowActionsOutsideBound = true;
                    const closeAllDropdowns = () => {
                        document.querySelectorAll('.row-actions-dropdown.open').forEach(d => closeRowActionsDropdown(d));
                    };
                    document.addEventListener('mousedown', (evt) => {
                        document.querySelectorAll('.row-actions-dropdown.open').forEach(d => {
                            const trigger = d._triggerButton;
                            const triggerWrap = trigger ? trigger.parentElement : null;
                            const isTrigger = trigger && (trigger === evt.target || trigger.contains(evt.target));
                            const insideWrap = triggerWrap && triggerWrap.contains(evt.target);
                            if (!d.contains(evt.target) && !isTrigger && !insideWrap) {
                                closeRowActionsDropdown(d);
                            }
                        });
                    });
                    // fechar com ESC
                    document.addEventListener('keydown', (evt) => {
                        if (evt.key === 'Escape') {
                            closeAllDropdowns();
                        }
                    });
                    window.addEventListener('scroll', closeAllDropdowns, true);
                    window.addEventListener('resize', closeAllDropdowns);
                }
            } else {
                // manter célula vazia para alinhamento
                actionTd.innerHTML = '&nbsp;';
            }
            // se for próprio usuário, adicionar badge "Você (administrador)" ao nome
            if (isOwnMembership) {
                const badge = document.createElement('small');
                badge.className = 'you-badge';
                badge.textContent = 'Você (administrador)';
                nameTd.appendChild(badge);
            }
            tr.appendChild(nameTd); tr.appendChild(emailTd); tr.appendChild(roleTd); tr.appendChild(actionTd);
            tbody.appendChild(tr);
        });
}

// ---------- Setores da Organização (ORG_ADMIN) ----------
// Carrega catálogo público filtrado removendo setores já adotados
async function loadGlobalSectorsForOrg(orgId, token) {
    const select = document.getElementById('addOrgSectorSelect');
    const badge = document.getElementById('orgSectorsCountBadge');
    const addBtn = document.getElementById('addOrgSectorBtn');
    if (!select) return;
    select.disabled = true; if (addBtn) addBtn.disabled = true;
    try {
        const [catalog, adopted] = await Promise.all([
            getPublicSectors(),
            (async () => { try { return await getMyOrganizationSectors(token, orgId) || []; } catch { return []; } })()
        ]);
        const adoptedIds = new Set((adopted || []).map(s => s.id || s.sectorId || s._id));
        if (badge) badge.textContent = adopted.length + (adopted.length === 1 ? ' adotado' : ' adotados');
        // Limpar opções (exceto placeholder)
        [...select.querySelectorAll('option')].forEach((o, i) => { if (i>0) o.remove(); });
        catalog.filter(s => !adoptedIds.has(s.id)).forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            select.appendChild(opt);
        });
        if ([...select.options].length <= 1) {
            const fb = document.getElementById('addOrgSectorFeedback');
            if (fb) fb.textContent = 'Nenhum novo setor disponível para adoção.';
        }
    } catch (e) {
        const fb = document.getElementById('addOrgSectorFeedback');
        if (fb) fb.textContent = e.message || 'Erro ao carregar setores.';
    } finally {
        select.disabled = false;
        if (addBtn) addBtn.disabled = !select.value;
    }
}

async function loadOrganizationSectors(orgId, token) {
    if (!orgId) return;
    const tableBody = document.querySelector('#orgSectorsTable tbody');
    const msgBox = document.getElementById('orgSectorsMessages');
            if (tableBody) tableBody.innerHTML = '<tr><td colspan="3">Carregando setores...</td></tr>';
    try {
        const sectors = await getMyOrganizationSectors(token, orgId);
        if (!Array.isArray(sectors) || !sectors.length) {
            if (tableBody) tableBody.innerHTML = '<tr><td colspan="3">Nenhum setor adotado no momento.</td></tr>';
            const badge = document.getElementById('orgSectorsCountBadge');
            if (badge) badge.textContent = '0 adotados';
            return;
        }
        if (tableBody) {
            tableBody.innerHTML = '';
            sectors.forEach(s => {
                const tr = document.createElement('tr');
                const sectorIdVal = s.id || s.sectorId || s._id || '';
                const tdId = document.createElement('td');
                tdId.className = 'col-id sector-id';
                tdId.textContent = sectorIdVal;
                tdId.setAttribute('data-label','ID');
                const tdName = document.createElement('td');
                tdName.className = 'col-name sector-name';
                tdName.textContent = s.name || s.nome || '';
                tdName.setAttribute('data-label','Nome');
                const tdActions = document.createElement('td');
                tdActions.className = 'col-actions';
                tdActions.setAttribute('data-label','Ações');
                const btn = document.createElement('button');
                btn.className = 'btn-small btn-small-remove remove-org-sector-btn';
                btn.textContent = 'Remover';
                btn.dataset.sectorId = sectorIdVal;
                tdActions.appendChild(btn);
                tr.appendChild(tdId); tr.appendChild(tdName); tr.appendChild(tdActions);
                tableBody.appendChild(tr);
            });
        }
        if (msgBox) msgBox.textContent = '';
        const badge = document.getElementById('orgSectorsCountBadge');
        if (badge) badge.textContent = sectors.length + (sectors.length === 1 ? ' adotado' : ' adotados');
    } catch (err) {
        console.error('[orgMembers] Erro ao obter setores:', err);
        if (msgBox) msgBox.textContent = err.message || 'Erro ao carregar setores.';
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="2">Falha ao carregar.</td></tr>';
        throw err;
    }
}

// Delegação para remover setor adotado
document.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('.remove-org-sector-btn');
    if (!btn) return;
    const orgId = sessionStorage.getItem('currentOrganizationId');
    const sectorId = btn.dataset.sectorId;
    if (!orgId || !sectorId) return;
    ev.preventDefault();
    const originalText = btn.textContent;
    btn.disabled = true; btn.textContent = 'Removendo...';
    const token = localStorage.getItem('jwtToken');
    const msgBox = document.getElementById('orgSectorsMessages');
    if (msgBox) msgBox.textContent = '';
    try {
        await removeOrganizationSector(token, orgId, sectorId);
        await loadOrganizationSectors(orgId, token);
        await loadGlobalSectorsForOrg(orgId, token);
    } catch (e) {
        console.error('Falha ao remover setor da organização:', e);
        if (msgBox) msgBox.textContent = e.message || 'Erro ao remover setor.';
    } finally {
        try { btn.disabled = false; btn.textContent = originalText; } catch(_) {}
    }
});

// Adicionar (adotar) setor à organização
document.addEventListener('click', async (ev) => {
    const addBtn = ev.target.closest('#addOrgSectorBtn');
    if (!addBtn) return;
    const orgId = sessionStorage.getItem('currentOrganizationId');
    if (!orgId) return;
    const select = document.getElementById('addOrgSectorSelect');
    const feedback = document.getElementById('addOrgSectorFeedback');
    if (feedback) feedback.textContent = '';
    const sectorId = select && select.value;
    if (!sectorId) {
        if (feedback) feedback.textContent = 'Selecione um setor.';
        return;
    }
    const token = localStorage.getItem('jwtToken');
    addBtn.disabled = true; const originalTxt = addBtn.textContent; addBtn.textContent = 'Adicionando...';
    try {
        await addOrganizationSector(token, orgId, sectorId);
        await loadOrganizationSectors(orgId, token);
        if (select) select.value = '';
        if (feedback) feedback.textContent = 'Setor adicionado com sucesso.';
        await loadGlobalSectorsForOrg(orgId, token);
    } catch (e) {
        console.error('Erro ao adicionar setor:', e);
        if (feedback) feedback.textContent = e.message || 'Erro ao adicionar setor.';
    } finally {
        addBtn.disabled = false; addBtn.textContent = originalTxt;
    }
});

// Habilitar botão de adicionar setor dinamicamente
document.addEventListener('change', (ev) => {
    const select = ev.target.closest('#addOrgSectorSelect');
    if (!select) return;
    const btn = document.getElementById('addOrgSectorBtn');
    if (btn) btn.disabled = !select.value;
});

// --- Fluxo de sair da organização ---
// Botão e modal já estão no HTML; precisamos ligar os handlers
document.addEventListener('page:loaded', (e) => {
    try {
        if (e?.detail?.page === 'orgMembers') {
            const leaveBtn = document.getElementById('leaveOrgButton');
            if (leaveBtn) {
                leaveBtn.addEventListener('click', async (ev) => {
                    ev.preventDefault();
                    const orgId = sessionStorage.getItem('currentOrganizationId');
                    const token = localStorage.getItem('jwtToken');
                    if (!orgId || !token) {
                        const messages = document.getElementById('orgMembersMessages');
                        if (messages) messages.textContent = 'Informações da organização indisponíveis.';
                        return;
                    }
                    try {
                        // garantir que somos ORG_ADMIN localmente antes de tentar a operação
                        const myRole = sessionStorage.getItem('myOrgRole_' + orgId) || '';
                        if (myRole !== 'ORG_ADMIN') {
                            const messages = document.getElementById('orgMembersMessages');
                            if (messages) messages.textContent = 'Apenas administradores podem sair da organização.';
                            return;
                        }


                        // Agora usamos o endpoint de auto-remoção que requer apenas o organizationId
                        // Endpoint: DELETE /profile/me/organizations/{organizationId}
                        try {
                            await removeMyOrgMembership(token, orgId);
                        } catch (e) {
                            throw e; // rethrow para ser tratado no bloco externo
                        }
                        // limpeza local: remover chaves relacionadas a essa org para evitar estado stale
                        try {
                            sessionStorage.removeItem('myMembershipId_' + orgId);
                            sessionStorage.removeItem('myOrgRole_' + orgId);
                            const cur = sessionStorage.getItem('currentOrganizationId');
                            if (cur && String(cur) === String(orgId)) {
                                sessionStorage.removeItem('currentOrganizationId');
                                sessionStorage.removeItem('currentOrganizationName');
                            }
                        } catch (e) { /* ignore */ }
                        // recarregar perfil para atualizar flags (hasMembership, isCompanyAdmin, myOrgRole_...)
                        try { await loadUserProfile(); } catch (e) { console.warn('Falha ao recarregar perfil após leave:', e); }
                        // Navegar para Gestão de Empresas para mostrar claramente que a organização não aparece mais
                        try { const m = await import('./navigation.js'); await m.showPage('orgManagement'); } catch (e) { try { window.location.href = '/organizations'; } catch(_) { /* silent */ } }
                    } catch (err) {
                        console.error('Erro ao sair da organização:', err);
                        const rawMsg = (err && (err.message || err.error || err.msg)) ? (err.message || err.error || err.msg) : '';
                        const msg = rawMsg || 'Erro ao sair da organização.';
                        if (msg && (msg.toLowerCase().includes('ultimo') || msg.toLowerCase().includes('último') || msg.toLowerCase().includes('administrador') || msg.toLowerCase().includes('last admin'))) {
                            const messagesEl = document.getElementById('orgMembersMessages');
                            if (messagesEl) messagesEl.textContent = 'Não é possível sair da organização. Adicione outro administrador antes de sair.';
                            try { openPromoteModal(msg); } catch (e) { /* silent */ }
                        } else {
                            const messages = document.getElementById('orgMembersMessages');
                            if (messages) messages.textContent = msg;
                        }
                    }
                });
            }
            // modal cancelar
            const promoteCancel = document.getElementById('promoteCancel');
            if (promoteCancel) promoteCancel.addEventListener('click', () => closePromoteModal());
        }
    } catch (e) { console.warn('Erro ao inicializar leaveOrg handlers:', e); }
});

function openPromoteModal(message) {
    const modal = document.getElementById('promoteModal');
    if (!modal) return;
    const msgEl = document.getElementById('promoteModalMessage');
    if (msgEl) msgEl.textContent = message;
    // carregar membros para promover
    const orgId = sessionStorage.getItem('currentOrganizationId');
    const token = localStorage.getItem('jwtToken');
    const listEl = document.getElementById('promoteMembersList');
    if (listEl) listEl.innerHTML = 'Carregando membros...';
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    // usar getOrgMembers para listar e criar botões de promover
    getOrgMembers(token, orgId).then(members => {
        if (!listEl) return;
        listEl.innerHTML = '';
        (members || []).forEach(m => {
            const name = m.fullName || m.name || m.user?.fullName || m.user?.name || (m.email || m.userEmail || m.user?.email) || '—';
            const row = document.createElement('div');
            row.className = 'promote-member-row';
            row.innerHTML = `<span>${name}</span>`;
            listEl.appendChild(row);
        });
    }).catch(err => {
        if (listEl) listEl.textContent = 'Erro ao carregar membros.';
        console.error('Erro ao carregar membros para promover:', err);
    });
}

function closePromoteModal() {
    const modal = document.getElementById('promoteModal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Abre um pequeno popup inline próximo ao botão para selecionar nova função
function openInlineRolePopup(member, anchorEl) {
    // limpar popup existente
    const existing = document.getElementById('roleInlinePopup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'roleInlinePopup';
    popup.style.position = 'absolute';
    popup.style.zIndex = '10000';
    popup.style.width = '220px';
    popup.style.padding = '10px';
    popup.style.borderRadius = '6px';
    popup.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
    popup.style.background = '#fff';
    popup.style.border = '1px solid rgba(0,0,0,0.08)';

    const title = document.createElement('div');
    title.style.fontWeight = '600';
    title.style.marginBottom = '8px';
    title.textContent = 'Alterar função';
    popup.appendChild(title);

    const roles = [ { value: 'ORG_MEMBER', label: 'Membro' }, { value: 'ORG_ADMIN', label: 'Administrador' } ];
    roles.forEach(r => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';
        row.style.marginBottom = '6px';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'inlineChangeRole';
        radio.value = r.value;
        if (r.value === (member.currentRole || '').toUpperCase()) radio.checked = true;
        const label = document.createElement('label');
        label.textContent = r.label;
        row.appendChild(radio);
        row.appendChild(label);
        popup.appendChild(row);
    });

    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.justifyContent = 'flex-end';
    footer.style.gap = '8px';
    footer.style.marginTop = '8px';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-small';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => popup.remove());

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-small btn-small-change';
    confirmBtn.textContent = 'Confirmar';
    confirmBtn.addEventListener('click', async () => {
        const selected = popup.querySelector('input[name="inlineChangeRole"]:checked');
        if (!selected) return;
        const newRole = selected.value;
        const token = localStorage.getItem('jwtToken');
        try {
                await updateOrgMemberRole(token, sessionStorage.getItem('currentOrganizationId'), member.membershipId, newRole);
            // recarregar a lista de membros para refletir a alteração rapidamente
            try {
                const refreshed = await getOrgMembers(token, sessionStorage.getItem('currentOrganizationId'));
                await renderOrgMembers(refreshed, sessionStorage.getItem('currentOrganizationId'));
            } catch (e) { /* se falhar, ainda tentamos atualizar a célula abaixo */ }
                // Recarregar perfil canônico para atualizar sessionStorage (myOrgRole_...)
                try { await loadUserProfile(); } catch (e) { console.warn('Falha ao recarregar perfil apos mudança de role', e); }
                // Notificar que roles foram atualizadas para re-renderizar listas de orgs
                try { document.dispatchEvent(new Event('org:roles:updated')); } catch (e) { /* silent */ }
            const messages = document.getElementById('orgMembersMessages');
            if (messages) messages.textContent = 'Função alterada com sucesso.';
            popup.remove();
        } catch (err) {
            console.error('Erro ao alterar função:', err);
            const messages = document.getElementById('orgMembersMessages');
            if (messages) messages.textContent = err.message || 'Erro ao alterar função.';
            popup.remove();
        }
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);
    popup.appendChild(footer);

    document.body.appendChild(popup);

    // posição próxima ao anchorEl
    const rect = anchorEl.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;
    let left = rect.left + scrollX;
    // prefer center over anchor
    left = left - (220 - rect.width) / 2;
    // clamp
    left = Math.max(8 + scrollX, Math.min(left, window.innerWidth - 230 + scrollX));
    let top = rect.bottom + scrollY + 8;
    if (top + 140 > window.innerHeight + scrollY) {
        top = rect.top + scrollY - 8 - 140; // abrir acima se não couber
    }
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;

    // fechar click outside
    const onDocClick = (ev) => {
        if (!popup.contains(ev.target) && ev.target !== anchorEl) {
            popup.remove();
            document.removeEventListener('mousedown', onDocClick);
        }
    };
    setTimeout(() => document.addEventListener('mousedown', onDocClick), 0);
}

/**
 * Handler para convidar membro via convite (inviteMemberForm)
 */
export async function handleInviteMemberSubmit(event) {
    event.preventDefault();
    const messages = document.getElementById('orgMembersMessages');
    if (messages) messages.textContent = '';
    const email = (document.getElementById('inviteMemberEmail') || {}).value || '';
    const role = (document.getElementById('inviteMemberRole') || {}).value || 'ORG_MEMBER';
    const orgId = sessionStorage.getItem('currentOrganizationId');
    if (!email || !orgId) {
        if (messages) messages.textContent = 'Informe o e-mail e certifique-se de que uma organização está selecionada.';
        return;
    }
    const token = localStorage.getItem('jwtToken');
    try {
        await addOrgMember(token, orgId, { email, role });
        if (messages) messages.textContent = 'Convite enviado com sucesso.';
        // recarregar lista de membros apenas
        try {
            const refreshed = await getOrgMembers(token, orgId);
            await renderOrgMembers(refreshed, orgId);
        } catch (e) { console.warn('Falha ao recarregar membros após convite:', e); }
    } catch (err) {
        console.error('Erro ao convidar membro:', err);
        if (messages) messages.textContent = err.message || 'Erro ao convidar membro.';
    }
}

// phone editing removed from UI — phone changes must be done via support
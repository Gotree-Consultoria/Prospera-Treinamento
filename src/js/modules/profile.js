// As funções do api.js que lidam com a lógica de negócio real
import { updateUserProfile, updateUserEmail, updateUserPassword, completeUserProfile, fetchUserProfile, requestEmailChange, createPFProfile, createOrganization, getOrgMembers, addOrgMember, removeOrgMember, updateOrgMemberRole } from './api.js';

let currentProfile = null;

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
    const showButton = document.getElementById('showEmailButton');
    const controls = document.getElementById('email-controls');

    if (!controls || !showButton) return;

    if (show) {
        showButton.classList.add('hidden');
        showButton.setAttribute('aria-expanded', 'true');
        controls.classList.remove('hidden-controls');
        controls.classList.add('active');
        controls.setAttribute('aria-hidden', 'false');
        const input = controls.querySelector('input');
        if (input) {
            input.disabled = false;
            input.focus();
        }
        // permitir fechar com ESC
        const escHandler = (ev) => {
            if (ev.key === 'Escape') toggleEmailEdit(false);
        };
        controls._escHandler = escHandler;
        document.addEventListener('keydown', escHandler);
    } else {
        showButton.classList.remove('hidden');
        showButton.setAttribute('aria-expanded', 'false');
        controls.classList.add('hidden-controls');
        controls.classList.remove('active');
        controls.setAttribute('aria-hidden', 'true');
        // remover feedback inline quando fechar
        const fb = controls.querySelector('.inline-feedback');
        if (fb) fb.remove();
        const input = controls.querySelector('input');
        if (input) {
            input.value = '';
            input.disabled = true;
        }
        // remover listener de ESC se houver
        if (controls._escHandler) {
            document.removeEventListener('keydown', controls._escHandler);
            delete controls._escHandler;
        }
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
    const emailValue = emailInput ? emailInput.value.trim() : '';
    if (!controls) return;

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
        if (messages) messages.textContent = err.message || 'Erro ao salvar perfil PF.';
    }
}

/**
 * Handler para submissão do formulário de criação de organização (orgCreateForm)
 */
export async function handleOrgCreateSubmit(event) {
    event.preventDefault();
    const messages = document.getElementById('orgCreateMessages');
    if (messages) messages.textContent = '';
    const razaoSocial = (document.getElementById('orgRazaoSocial') || {}).value || '';
    const cnpj = (document.getElementById('orgCNPJ') || {}).value || '';

    if (!razaoSocial || !cnpj) {
        if (messages) messages.textContent = 'Preencha Razão Social e CNPJ.';
        return;
    }

    const token = localStorage.getItem('jwtToken');
    try {
        const payload = { razaoSocial, cnpj };
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
        if (messages) messages.textContent = err.message || 'Erro ao criar organização.';
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
    // Garantir que temos o perfil do usuário (com suas afiliações) para obter membershipId
    try { await loadUserProfile(); } catch (e) { /* não fatal */ }
    try {
        const members = await getOrgMembers(token, orgId);
        const tbody = document.querySelector('#orgMembersTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
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
            const btn = document.createElement('button');
            btn.className = 'btn-small btn-small-remove remove-org-member-btn';
            btn.textContent = 'Remover';
            // membership id já calculado acima
            btn.dataset.membershipId = membershipId || '';
            btn.addEventListener('click', async (ev) => {
                ev.preventDefault();
                if (!btn.dataset.membershipId) return;
                try {
                    await removeOrgMember(token, orgId, btn.dataset.membershipId);
                    tr.remove();
                } catch (err) {
                    console.error('Erro ao remover membro:', err);
                    if (messages) messages.textContent = 'Erro ao remover membro: ' + (err.message || 'Tente novamente');
                }
            });
            // agrupar botões em um wrapper para permitir alinhamento em coluna
            const wrap = document.createElement('div');
            wrap.className = 'action-wrap';
            wrap.style.display = 'inline-flex';
            wrap.style.flexDirection = 'column';
            wrap.style.alignItems = 'center';
            wrap.style.gap = '6px';
            wrap.appendChild(btn);
            // adicionar botão 'Alterar' abaixo de 'Remover'
            const changeBtn = document.createElement('button');
            changeBtn.className = 'btn-small btn-small-change change-org-member-role-btn';
            changeBtn.textContent = 'Alterar';
            // anexar dados úteis para o handler
            changeBtn.dataset.membershipId = membershipId || '';
            changeBtn.dataset.memberName = displayName || '';
            changeBtn.dataset.currentRole = m.role || m.userRole || '';
            changeBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                openInlineRolePopup({ membershipId: membershipId, name: displayName, currentRole: m.role || m.userRole || '' }, changeBtn);
            });
            wrap.appendChild(changeBtn);
            actionTd.appendChild(wrap);
            tr.appendChild(nameTd); tr.appendChild(emailTd); tr.appendChild(roleTd); tr.appendChild(actionTd);
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Erro ao carregar membros:', err);
        if (messages) messages.textContent = err.message || 'Erro ao carregar membros.';
    }
}

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
                    // primeiro, garantir que temos o perfil mais recente com lista de afiliações
                    try { await loadUserProfile(); } catch (e) { /* silent */ }
                    // tentar obter meu membershipId a partir do profile (backend retorna 'organizations')
                    let myMembershipId = '';
                    try {
                        const orgs = (currentProfile && currentProfile.organizations) || [];
                        if (Array.isArray(orgs) && orgs.length) {
                            const found = orgs.find(o => String(o.organizationId) === String(orgId));
                            if (found) {
                                // o payload de organizations não tem membershipId no exemplo fornecido,
                                // então usamos sessionStorage (salvo anteriormente em loadUserProfile) ou outros ids
                                myMembershipId = found.membershipId || found.membership_id || sessionStorage.getItem('myMembershipId_' + orgId) || '';
                            }
                        }
                    } catch (e) {
                        console.warn('Erro ao extrair membershipId de currentProfile.organizations:', e);
                    }
                    // se não temos membershipId, buscar via membros da org comparando e-mail/ids
                    if (!myMembershipId) {
                        try {
                            const members = await getOrgMembers(token, orgId);
                            const myEmail = (currentProfile && (currentProfile.email || currentProfile.userEmail)) || localStorage.getItem('loggedInUserEmail') || '';
                            // tentar encontrar por email primeiro
                            const found = (members || []).find(m => {
                                const mEmail = m.email || m.userEmail || m.user?.email || '';
                                if (mEmail && myEmail && mEmail.toLowerCase() === myEmail.toLowerCase()) return true;
                                // comparar user ids quando disponíveis
                                const userId = currentProfile && (currentProfile.id || currentProfile._id || currentProfile.userId);
                                const mUserId = m.user && (m.user.id || m.user._id || m.user.userId);
                                if (userId && mUserId && String(userId) === String(mUserId)) return true;
                                return false;
                            });
                            if (found) {
                                myMembershipId = found.id || found._id || found.membershipId || (found.user && (found.user.id || found.user._id)) || '';
                            }
                        } catch (err) {
                            console.warn('Não foi possível buscar membros para derivar meu membershipId:', err);
                        }
                    }
                    if (!orgId || !myMembershipId) {
                        const messages = document.getElementById('orgMembersMessages');
                        if (messages) messages.textContent = 'Informações da organização indisponíveis.';
                        return;
                    }
                    try {
                        // tentar deletar — backend retornará 204 ou erro específico
                        await removeOrgMember(token, orgId, myMembershipId);
                        // sucesso: redirecionar para conta
                        try { import('./navigation.js').then(m => m.showPage('account')); } catch (e) { window.location.href = '/'; }
                    } catch (err) {
                        console.error('Erro ao sair da organização:', err);
                        const rawMsg = (err && (err.message || err.error || err.msg)) ? (err.message || err.error || err.msg) : '';
                        const msg = rawMsg || 'Erro ao sair da organização.';
                        // detectar erro de último administrador e exibir mensagem clara em PT-BR
                        if (msg && (msg.toLowerCase().includes('ultimo') || msg.toLowerCase().includes('último') || msg.toLowerCase().includes('administrador') || msg.toLowerCase().includes('last admin'))) {
                            const messagesEl = document.getElementById('orgMembersMessages');
                            if (messagesEl) messagesEl.textContent = 'Não é possível sair da organização. Adicione outro administrador antes de sair.';
                            // abrir modal de promoção para facilitar ação do usuário (opcional)
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
                await initOrgMembersPage();
            } catch (e) { /* se falhar, ainda tentamos atualizar a célula abaixo */ }
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
        // recarregar lista
        await initOrgMembersPage();
    } catch (err) {
        console.error('Erro ao convidar membro:', err);
        if (messages) messages.textContent = err.message || 'Erro ao convidar membro.';
    }
}

// phone editing removed from UI — phone changes must be done via support
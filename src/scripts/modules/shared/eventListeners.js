// Importa todas as funções de outros módulos que precisam ser chamadas por eventos
import { showPage, showAccountSection, scrollToSection } from './navigation.js';
import { handleLogin, handleRegister, logout, checkUserLoggedIn, handlePageLogin } from './auth.js';
// Carrinho removido permanentemente; lógica migrada para modelo de planos.
import { openAuthModal, closeAuthModal, showAuthTab } from './modals.js';
import { toggleProfileEdit, toggleEmailEdit, togglePasswordEdit, handleEmailChange, handlePasswordChange, updateProfile, handleCompleteProfile, loadUserProfile, inviteSubuser, importCSV, exportReport, showCompanyAdminPanel } from '../features/account/profile.js';
import { handleCreatePfSubmit, handleOrgCreateSubmit, initOrgMembersPage, handleInviteMemberSubmit } from '../features/account/profile.js';
import { subscribeNewsletter, sendMessage as sendContactMessage, getMyOrganizations, addOrgMember } from './api.js';
import { highlightFilterButton } from './render.js';
import { nextCard, prevCard } from './carousel.js';
import { scrollLeft, scrollRight } from './scroll.js';
import { filterProductsByCategory, searchProducts } from '../features/catalog/products.js';
import { formatCNPJ } from './utils.js';
import { showToast } from './notifications.js';

/**
 * Configura todos os event listeners principais da aplicação.
 */
export function setupEventListeners() {

    // Inserir link para painel de admin quando o usuário for SYSTEM_ADMIN (normalizar formatos)
    try {
        function normalizeRoleLocal(v) {
            if (v === null || v === undefined) return '';
            try { return String(v).trim().toUpperCase().replace(/[-_\s]+/g, '_'); } catch (e) { return String(v); }
        }
        const rawSysRole = localStorage.getItem('systemRole');
        const rawUserRole = localStorage.getItem('userRole');
        const profileRole = (window && window.profileData && (window.profileData.role || window.profileData.systemRole)) ? (window.profileData.role || window.profileData.systemRole) : null;
        const source = rawSysRole || rawUserRole || profileRole || '';
        const norm = normalizeRoleLocal(source);
        const tokenPresent = !!localStorage.getItem('jwtToken');
        console.debug('[ensureAdminLink] token=', tokenPresent, 'rawSystemRole=', rawSysRole, 'rawUserRole=', rawUserRole, 'profileRole=', profileRole, 'normalized=', norm);
        const allowed = (norm === 'SYSTEM_ADMIN' || norm === 'ADMIN' || norm === 'SYSTEMADMIN');
        if (tokenPresent && allowed) {
            const navMenu = document.querySelector('.nav-menu');
            if (navMenu && !navMenu.querySelector('[data-page="adminUsers"]')) {
                const a = document.createElement('a');
                a.className = 'nav-link';
                a.href = '#';
                a.setAttribute('data-page', 'adminUsers');
                a.textContent = 'Admin';
                // colocar antes dos itens de contato
                navMenu.appendChild(a);
            }
        }
    } catch (e) { console.warn('ensureAdminLink failed', e); }

    // === LISTENERS DE CLIQUE (Delegação de Eventos) ===
    // Centraliza todos os eventos de clique da aplicação
    document.body.addEventListener("click", async (e) => {
        const target = e.target.closest(
            "[data-page], [data-filter], .view-training-btn, [data-auth-action], [data-section], [data-auth-tab], [data-action], #scrollLeftBtn, #scrollRightBtn, #prevCardBtn, #nextCardBtn, #contaBtn"
        );
        if (!target) return;

        e.preventDefault();

        // Lógica de navegação e filtros
        if (target.dataset.page) {
            console.debug('[events] click data-page=', target.dataset.page);
            await showPage(target.dataset.page);
        }
        if (target.dataset.filter) {
            await filterProductsByCategory(target.dataset.filter);
            highlightFilterButton(target.dataset.filter);
        }

        // Lógica substituta: visualizar treinamento (detalhes)
        if (target.classList.contains('view-training-btn')) {
            const id = target.dataset.id;
            // Navegação para detalhe (usa a página trainingDetail existente quando disponível)
            import('../features/admin/adminContent.js').then(m => { if (m.navigateToTrainingDetail) m.navigateToTrainingDetail(id); });
        }

    // Lógica de autenticação e perfil
        const authAction = target.dataset.authAction;
        if (authAction === "logout") {
            logout();
        } else if (authAction === "toggleProfileEdit") {
            toggleProfileEdit();
        } else if (authAction === "openAuth") {
            // Se o usuário estiver logado, abrir a página de conta diretamente
            if (typeof checkUserLoggedIn === 'function' && checkUserLoggedIn()) {
                await showPage('account');
                // Garantir que a seção de dados cadastrais esteja visível
                showAccountSection('profile');
                const dados = document.getElementById('dadosCadastrais');
                const payments = document.getElementById('paymentsSection');
                const changePwd = document.getElementById('changePasswordSubsection');
                if (dados) dados.classList.remove('hidden');
                if (payments) payments.classList.add('hidden');
                if (changePwd) changePwd.classList.add('hidden');
                // marcar submenu Dados Cadastrais como ativo
                document.querySelectorAll('.submenu-item').forEach(it => it.classList.remove('active'));
                const dadosLink = document.querySelector('.submenu-item[data-action="showDados"]');
                if (dadosLink) dadosLink.classList.add('active');
                // Carregar perfil para preencher campos
                if (typeof loadUserProfile === 'function') loadUserProfile();
            } else {
                openAuthModal();
            }
        } else if (target.dataset.section) {
            showAccountSection(target.dataset.section);
        } else if (target.dataset.authTab) {
            showAuthTab(target.dataset.authTab);
        }

        // Se clicou em um item do submenu, exibir somente a subseção correspondente
        if (target.classList.contains('submenu-item')) {
            // marcar ativo
            document.querySelectorAll('.submenu-item').forEach(it => it.classList.remove('active'));
            target.classList.add('active');
            const actionName = target.dataset.action;
            const dados = document.getElementById('dadosCadastrais');
            const payments = document.getElementById('paymentsSection');
            const changePwd = document.getElementById('changePasswordSubsection');
            // esconder todas
            if (dados) dados.classList.add('hidden');
            if (payments) payments.classList.add('hidden');
            if (changePwd) changePwd.classList.add('hidden');
            // mostrar apenas a selecionada
            if (actionName === 'showDados') {
                if (dados) dados.classList.remove('hidden');
                showAccountSection('profile');
                // Carregar perfil ao mostrar Dados Cadastrais para garantir que
                // façamos GET /profile/me com Authorization: Bearer <token>
                try {
                    if (typeof loadUserProfile === 'function') await loadUserProfile();
                } catch (err) { console.warn('Falha ao carregar perfil ao mostrar Dados Cadastrais:', err); }
            } else if (actionName === 'showPayments') {
                if (payments) payments.classList.remove('hidden');
                showAccountSection('profile');
            } else if (actionName === 'showChangePassword' || actionName === 'togglePasswordEdit') {
                if (changePwd) changePwd.classList.remove('hidden');
                showAccountSection('profile');
            }
        }

        // Lógica baseada em data-action (profile, email, senha etc)
        const dataAction = target.dataset.action;
        if (dataAction === 'closeAuthModal') {
            closeAuthModal();
        } else if (dataAction === 'cancelCompleteProfile') {
            // Voltar para a conta e mostrar a subseção Dados Cadastrais
            try {
                showPage('account');
            } catch (e) { /* ignore */ }
            try {
                // garantir que a subseção Dados Cadastrais esteja visível
                showAccountSection('profile');
                const dados = document.getElementById('dadosCadastrais');
                const payments = document.getElementById('paymentsSection');
                const changePwd = document.getElementById('changePasswordSubsection');
                if (dados) dados.classList.remove('hidden');
                if (payments) payments.classList.add('hidden');
                if (changePwd) changePwd.classList.add('hidden');
                // marcar submenu Dados Cadastrais como ativo
                document.querySelectorAll('.submenu-item').forEach(it => it.classList.remove('active'));
                const dadosLink = document.querySelector('.submenu-item[data-action="showDados"]');
                if (dadosLink) dadosLink.classList.add('active');
            } catch (e) { /* silencioso */ }
        } else if (dataAction === 'showForgotPassword') {
            // Abrir modal de auth e mostrar aba de login (a implementação de 'forgot' não existe explicitamente)
            openAuthModal();
            showAuthTab('login');
        } else if (dataAction === 'scrollToSection') {
            const section = target.dataset.section;
            if (section) scrollToSection(section);
        }
    if (dataAction === 'toggleProfileEdit') {
            toggleProfileEdit();
        } else if (dataAction === 'toggleEmailEdit') {
            const controls = document.getElementById('email-controls');
            const isActive = controls && controls.classList && controls.classList.contains('active');
            toggleEmailEdit(!isActive);
        } else if (dataAction === 'saveEmail') {
            handleEmailChange();
        
        } else if (dataAction === 'togglePasswordEdit') {
            const pwdControls = document.getElementById('password-controls');
            const showPwd = !(pwdControls && pwdControls.classList && pwdControls.classList.contains('active'));
            togglePasswordEdit(showPwd);
        } else if (dataAction === 'savePassword') {
            handlePasswordChange();
        } else if (dataAction === 'inviteSubuser') {
            inviteSubuser();
        } else if (dataAction === 'importCSV') {
            importCSV();
        } else if (dataAction === 'exportReport') {
            exportReport(target.dataset.report);
        } else if (dataAction === 'viewMyOrgs') {
            // Carregar organizações do usuário e renderizar
            const container = document.getElementById('myOrgsList');
            if (!container) return;
            container.innerHTML = 'Carregando...';
            const token = localStorage.getItem('jwtToken');
            try {
                const orgs = await getMyOrganizations(token);
                if (!orgs || orgs.length === 0) {
                    container.innerHTML = '<p>Nenhuma organização encontrada.</p>';
                } else {
                    const list = document.createElement('ul');
                    list.className = 'my-orgs-list';
                    orgs.forEach(o => {
                            const li = document.createElement('li');
                            const pretty = formatCNPJ(o.cnpj || o.CNPJ || '');
                            li.innerHTML = `<strong>${o.name || o.razaoSocial || o.companyName || '—'}</strong> &nbsp; <span class="muted">${pretty}</span>`;
                            list.appendChild(li);
                        });
                    container.innerHTML = '';
                    container.appendChild(list);
                }
            } catch (err) {
                console.error('Erro ao carregar organizações:', err);
                container.innerHTML = '<p>Erro ao carregar organizações.</p>';
            }
        } else if (dataAction === 'showCompanyTab') {
            document.querySelectorAll('.company-tab-content').forEach(c => c.classList.add('hidden'));
            const tab = target.dataset.tab;
            const el = document.getElementById('companyTab_' + tab);
            if (el) el.classList.remove('hidden');
        } else if (dataAction === 'togglePasswordVisibility') {
            // alterna visibilidade do input de senha alvo e icon (fa-eye <-> fa-eye-slash)
            const targetSelector = target.dataset.target;
            if (targetSelector) {
                const input = document.querySelector(targetSelector);
                if (input) {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    // atualizar estado aria
                    target.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
                    // trocar ícone se existir
                    const icon = target.querySelector('i');
                    if (icon) {
                        icon.classList.toggle('fa-eye', !isPassword);
                        icon.classList.toggle('fa-eye-slash', isPassword);
                    }
                }
            }
        }

    // Helper para renderizar organizações do usuário (reutilizável)
    async function renderMyOrganizations() {
        const container = document.getElementById('myOrgsList');
        if (!container) return;
        container.innerHTML = 'Carregando empresas...';
        const token = localStorage.getItem('jwtToken');
        try {
            const orgs = await getMyOrganizations(token);
            if (!orgs || orgs.length === 0) {
                container.innerHTML = '<p class="muted">Nenhuma empresa adicionada.</p>';
            } else {
                const list = document.createElement('ul');
                list.className = 'my-orgs-list responsive';
                orgs.forEach(o => {
                        const li = document.createElement('li');
                        const orgId = o.id || o._id || o.organizationId || '';
                        const orgName = o.name || o.razaoSocial || o.companyName || '—';
                        const orgCnpj = formatCNPJ(o.cnpj || o.CNPJ || '');
                        const myRole = sessionStorage.getItem('myOrgRole_' + orgId) || '';
                        const isCompanyAdmin = sessionStorage.getItem('isCompanyAdmin') === 'true';
                        // Se o usuário for ADMIN global ou ADMIN local, mostrar card com ações.
                        if (isCompanyAdmin || myRole === 'ORG_ADMIN') {
                            li.innerHTML = `
                                <div class="org-item" data-org-id="${orgId}" tabindex="0" role="button" aria-pressed="false">
                                    <div class="org-header">
                                        <div class="org-name" data-org-id="${orgId}">${orgName}</div>
                                        <div class="muted small">${orgCnpj}</div>
                                    </div>
                                    <!-- ações disponíveis para administradores -->
                                    <div class="org-actions-dropdown" id="orgActions_${orgId}">
                                        <button class="btn btn-link add-org-member-btn" data-org-id="${orgId}">Adicionar membro</button>
                                        <button class="btn btn-link view-org-members-btn" data-org-id="${orgId}">Visualizar membros</button>
                                    </div>
                                    <div class="org-members-inline hidden" id="orgMembersInline_${orgId}"></div>
                                </div>`;
                        } else {
                            // Usuário é apenas membro: mostrar apenas o card com nome, sem ações e sem ser clicável
                            li.innerHTML = `
                                <div class="org-item simple" data-org-id="" tabindex="-1">
                                    <div class="org-header">
                                        <div class="org-name">${orgName}</div>
                                        <div class="muted small">${orgCnpj}</div>
                                    </div>
                                </div>`;
                        }
                    list.appendChild(li);
                });
                container.innerHTML = '';
                container.appendChild(list);
            }
        } catch (err) {
            console.error('Erro ao carregar organizações:', err);
            container.innerHTML = '<p>Erro ao carregar empresas.</p>';
        }
    }

    // Ouvir evento de página carregada para disparar carregamento automático quando for orgManagement
    document.addEventListener('page:loaded', (e) => {
        try {
            if (e?.detail?.page === 'orgManagement') {
                // permitir que o fragmento seja injetado e então renderizar
                requestAnimationFrame(() => {
                    try {
                        // esconder botão de criar organização para usuários que não são company_admin
                        const isAdmin = sessionStorage.getItem('isCompanyAdmin') === 'true';
                        const hasMembership = sessionStorage.getItem('hasMembership') === 'true';
                        // detectar se o usuário é admin em alguma organização (myOrgRole_<orgId> === 'ORG_ADMIN')
                        let isOrgAdminAny = false;
                        for (let i = 0; i < sessionStorage.length; i++) {
                            const key = sessionStorage.key(i);
                            if (key && key.startsWith('myOrgRole_')) {
                                const val = sessionStorage.getItem(key);
                                if (val === 'ORG_ADMIN') { isOrgAdminAny = true; break; }
                            }
                        }
                        const addBtn = document.getElementById('addOrganizationBtn');
                        // Mostrar o botão para usuários sem afiliações OU para administradores (globais ou de org).
                        // Esconder somente quando o usuário é membro simples (hasMembership true) e não é admin.
                        if (addBtn) {
                            if (hasMembership && !isAdmin && !isOrgAdminAny) {
                                addBtn.style.display = 'none';
                            } else {
                                addBtn.style.display = '';
                            }
                        }
                        // esconder opção de "Sair da Organização" para não-admins
                        const leaveBtn = document.getElementById('leaveOrgButton');
                        if (leaveBtn && !isAdmin) {
                            leaveBtn.style.display = 'none';
                        }
                    } catch (err) { /* silencioso */ }
                    renderMyOrganizations();
                });
            }
        } catch (err) { /* silencioso */ }
    });

    // Re-renderizar organizações quando roles forem atualizadas (por exemplo, promoção)
    document.addEventListener('org:roles:updated', () => {
        try { renderMyOrganizations(); } catch (e) { console.warn('Falha ao re-renderizar organizações após atualização de roles:', e); }
    });

        // Acessibilidade: permitir ativar o card com Enter ou Space quando receber foco
        document.body.addEventListener('keydown', (ev) => {
            const item = ev.target.closest && ev.target.closest('.org-item');
            if (!item) return;
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                const orgId = item.dataset.orgId;
                if (!orgId) return;
                try {
                    sessionStorage.setItem('currentOrganizationId', orgId);
                    const nameEl = item.querySelector('.org-name')?.textContent || '';
                    sessionStorage.setItem('currentOrganizationName', nameEl);
                    import('./navigation.js').then(m => m.showPage('orgMembers'));
                } catch (err) { console.error('Erro ao abrir membros da org (keyboard):', err); }
            }
        });

    // Delegação adicional: clicar em nome da org ou em 'Adicionar membro' / 'Visualizar membros'
    document.body.addEventListener('click', async (ev) => {
    const addBtn = ev.target.closest('.add-org-member-btn');
    const viewBtn = ev.target.closest('.view-org-members-btn');
    const nameLink = ev.target.closest('.org-name');
    const toggleBtn = ev.target.closest('[data-toggle-actions]');
    const cancelBtn = ev.target.closest('.cancel-invite');
    const orgItem = ev.target.closest('.org-item');
    const interactive = addBtn || viewBtn || nameLink || toggleBtn || cancelBtn;
    // Se não é interação com orgs e não é clique em um card, ignorar
    if (!interactive && !orgItem) return;

    // helper para restaurar os botões iniciais do dropdown
    function restoreOrgActions(id) {
        const dropdown = document.getElementById('orgActions_' + id);
        if (!dropdown) return;
        dropdown.innerHTML = `
            <button class="btn btn-link add-org-member-btn" data-org-id="${id}">Adicionar membro</button>
            <button class="btn btn-link view-org-members-btn" data-org-id="${id}">Visualizar membros</button>
        `;
        dropdown.style.display = '';
    }

    // Se o clique for no corpo do card (orgItem) e não em um elemento interativo, navegar para a página de membros
    if (orgItem && !interactive) {
        const id = orgItem.dataset.orgId;
        if (!id) return;
        ev.preventDefault();
        try {
            sessionStorage.setItem('currentOrganizationId', id);
            const nameEl = orgItem.querySelector('.org-name')?.textContent || '';
            sessionStorage.setItem('currentOrganizationName', nameEl);
            import('./navigation.js').then(m => m.showPage('orgMembers'));
        } catch (err) { console.error('Erro ao abrir membros da org (click):', err); }
        return;
    }

    ev.preventDefault();
    const orgId = (addBtn || viewBtn || nameLink || toggleBtn || cancelBtn)?.dataset?.orgId;
    if (!orgId) return;
        // Se clicar em 'Adicionar membro' abrir um formulário inline
    if (addBtn) {
            const dropdown = document.getElementById('orgActions_' + orgId);
            if (!dropdown) return;
            // dentro do dropdown, renderizar o formulário de convite substituindo os botões
            dropdown.innerHTML = `
                <form class="inline-invite-form" data-org-id="${orgId}">
                    <input type="email" name="email" placeholder="E-mail do membro" required style="width:100%;margin-bottom:6px" />
                    <select name="role" style="width:100%;margin-bottom:6px">
                        <option value="ORG_MEMBER">Membro</option>
                        <option value="ORG_ADMIN">Administrador</option>
                    </select>
                    <div style="display:flex;gap:6px">
                        <button class="btn" type="submit">Convidar</button>
                        <button class="btn btn-link cancel-invite" type="button" data-org-id="${orgId}">Cancelar</button>
                    </div>
                </form>
                <div class="invite-feedback" id="inviteFeedback_${orgId}"></div>
            `;
            // garantir visibilidade do dropdown
            const item = dropdown.closest('.org-item'); if (item) item.classList.add('open');
            dropdown.style.display = 'block';
        }
        if (cancelBtn) {
            const cid = cancelBtn.dataset?.orgId || cancelBtn.closest('.inline-invite-form')?.dataset?.orgId;
            if (cid) {
                // fechar dropdown e restaurar botões
                const item = document.querySelector('.org-item[data-org-id="' + cid + '"]');
                if (item) item.classList.remove('open');
                restoreOrgActions(cid);
            }
            return;
        }
        // Se clicar em 'Visualizar membros' ou no nome, abrir a página de membros (mantendo sessionStorage) e inicializar
    if (viewBtn || nameLink) {
            try {
                sessionStorage.setItem('currentOrganizationId', orgId);
                const nameEl = (nameLink && nameLink.textContent) ? nameLink.textContent : '';
                sessionStorage.setItem('currentOrganizationName', nameEl);
                import('./navigation.js').then(m => m.showPage('orgMembers'));
            } catch (err) { console.error('Erro ao abrir membros da org:', err); }
        }
    });

        // Lógica do carrossel e rolagem
        if (target.id === "prevCardBtn") {
            prevCard();
        } else if (target.id === "nextCardBtn") {
            nextCard();
        } else if (target.id === "scrollLeftBtn") {
            scrollLeft('#categoriesGrid');
        } else if (target.id === "scrollRightBtn") {
            scrollRight('#categoriesGrid');
        } else if (target.dataset.action === 'checkout') {
            checkout();
        }

    });

    // === LISTENERS DE FORMULÁRIO (Submissão) ===
    // Centraliza todos os eventos de submissão de formulário
    document.body.addEventListener('submit', async (e) => {
        const form = e.target;

        if (form.id === 'contactForm') {
            e.preventDefault();
            const formData = new FormData(form);
            const messageData = Object.fromEntries(formData.entries());
            try {
                await sendContactMessage(messageData);
                alert("Mensagem enviada com sucesso! Entraremos em contato em breve.");
                form.reset();
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
                alert('Erro ao enviar mensagem. Por favor, tente novamente.');
            }
        } else if (form.id === 'searchForm') {
            e.preventDefault();
            const query = document.getElementById("searchInput").value;
            searchProducts(query);
        } else if (form.id === 'authLoginForm') {
            e.preventDefault();
            handleLogin(e);
        } else if (form.id === 'authRegisterForm') {
            e.preventDefault();
            handleRegister(e);
        } else if (form.id === 'loginPageForm') {
            e.preventDefault();
            handlePageLogin(e);
        } else if (form.id === 'registerPageForm') {
            e.preventDefault();
            handleRegister(e);
        } else if (form.id === 'profileCompleteForm') {
            handleCompleteProfile(e);
        } else if (form.id === 'createPfForm') {
            e.preventDefault();
            handleCreatePfSubmit(e);
        } else if (form.id === 'orgCreateForm') {
            e.preventDefault();
            handleOrgCreateSubmit(e);
        } else if (form.id === 'inviteMemberForm') {
            e.preventDefault();
            handleInviteMemberSubmit(e);
        } else if (form.classList && form.classList.contains('inline-invite-form')) {
            // inline invite form inside orgManagement list
            e.preventDefault();
            const orgId = form.dataset.orgId;
            const fm = new FormData(form);
            const email = (fm.get('email') || '').toString().trim();
            const role = (fm.get('role') || 'ORG_MEMBER').toString();
            const feedback = document.getElementById('inviteFeedback_' + orgId);
            if (feedback) feedback.textContent = '';
            if (!email) {
                if (feedback) feedback.textContent = 'Informe um e-mail válido.';
                return;
            }
            const token = localStorage.getItem('jwtToken');
            try {
                await addOrgMember(token, orgId, { email, role });
                if (feedback) feedback.textContent = 'Convite enviado com sucesso.';
                // fechar o form
                const container = document.getElementById('orgMembersInline_' + orgId);
                if (container) {
                    setTimeout(() => { container.innerHTML = ''; container.classList.add('hidden'); }, 900);
                }
            } catch (err) {
                console.error('Erro ao enviar convite inline:', err);
                if (feedback) feedback.textContent = err.message || 'Erro ao enviar convite.';
            }
    } else if (form.id === 'changePasswordForm') {
            handlePasswordChange(e);
        } else if (form.id === 'newsletterForm') {
            e.preventDefault();
            try {
                const fm = new FormData(form);
                const email = (fm.get('email') || '').toString().trim();
                if (!email) {
                    alert('Informe um e-mail válido para subscrever.');
                    return;
                }
                await subscribeNewsletter(email);
                alert('Inscrição realizada com sucesso. Obrigado!');
                form.reset();
            } catch (err) {
                console.error('Erro ao subscrever newsletter:', err);
                alert(err && err.message ? err.message : 'Erro ao subscrever newsletter.');
            }
        }
    });

// Quando a página for carregada, inicializamos páginas específicas
document.addEventListener('page:loaded', async (ev) => {
    try {
        const page = ev?.detail?.page;
        if (page === 'orgMembers') {
            // Garantir que o perfil do usuário esteja carregado (contendo organizations[]) antes de inicializar a página de membros
            try {
                if (typeof loadUserProfile === 'function') {
                    await loadUserProfile();
                }
            } catch (e) { console.warn('Falha ao carregar profile antes de initOrgMembersPage:', e); }
            initOrgMembersPage();
        }
    } catch (err) {
        console.warn('Erro ao tratar page:loaded em eventListeners', err);
    }
});

    console.log("Event listeners configurados.");
}

// Função pública para garantir que o link Admin esteja visível para SYSTEM_ADMIN
export function ensureAdminLink() {
    try {
        // Ler possíveis fontes onde a role pode ter sido salva
        const rawSystemRole = localStorage.getItem('systemRole');
        const rawUserRole = localStorage.getItem('userRole');
        const profileRole = (window && window.profileData && (window.profileData.role || window.profileData.systemRole)) ? (window.profileData.role || window.profileData.systemRole) : null;

        // Normalizar e escolher primeira fonte válida
        const sourceValue = rawSystemRole || rawUserRole || profileRole || '';
        const sysRole = (typeof sourceValue === 'string') ? sourceValue.trim() : String(sourceValue);

        // Debug: logar os valores para depuração
        console.debug('[ensureAdminLink] rawSystemRole=', rawSystemRole, 'rawUserRole=', rawUserRole, 'profileRole=', profileRole, '=> sysRole=', sysRole);

        const navMenu = document.querySelector('.nav-menu');
        const already = navMenu && navMenu.querySelector('[data-page="adminUsers"]');

        if (sysRole === 'SYSTEM_ADMIN') {
            if (navMenu && !already) {
                const a = document.createElement('a');
                a.className = 'nav-link';
                a.href = '#';
                a.setAttribute('data-page', 'adminUsers');
                a.textContent = 'Admin';
                navMenu.appendChild(a);
            }
        } else {
            // Se não for admin, remover o link existente por segurança
            try {
                if (already && already.parentNode) already.parentNode.removeChild(already);
            } catch (e) { /* ignore */ }
        }
    } catch (e) {
        console.error('ensureAdminLink error:', e);
    }
}

// Reagir ao evento de login para atualizar dinamicamente o menu
document.addEventListener('user:loggedin', () => {
    try {
        console.debug('user:loggedin event received');
        ensureAdminLink();
    } catch (e) { console.error('Error handling user:loggedin', e); }
});

// Expor helper para debugging via console
try { window.appEnsureAdminLink = ensureAdminLink; } catch (e) { /* ignore */ }

// Pequenos handlers para o modal de termos (link abre, botão fecha, clique no backdrop fecha)
document.body.addEventListener('click', (e) => {
    const open = e.target.closest('#viewTermsLink');
    if (open) {
        e.preventDefault();
        const modal = document.getElementById('termsModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            // adicionar listener de backdrop
            const backdropHandler = (ev) => {
                if (ev.target === modal) {
                    modal.classList.add('hidden');
                    modal.setAttribute('aria-hidden', 'true');
                    document.body.style.overflow = 'auto';
                    modal.removeEventListener('click', backdropHandler);
                }
            };
            modal.__backdropHandler = backdropHandler;
            modal.addEventListener('click', backdropHandler);
            document.body.style.overflow = 'hidden';
        }
        return;
    }

    const close = e.target.closest('#closeTermsBtn');
    if (close) {
        e.preventDefault();
        const modal = document.getElementById('termsModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = 'auto';
            if (modal.__backdropHandler) {
                modal.removeEventListener('click', modal.__backdropHandler);
                delete modal.__backdropHandler;
            }
        }
        return;
    }
});

// ================== Cursos & Treinamentos (Minha Conta) ==================
(function initLearningDelegates(){
    console.debug('[learning] attach delegates');
    document.body.addEventListener('click', (e)=>{
        const tabBtn = e.target.closest('#learningTabs .ltab');
        if (tabBtn) {
            e.preventDefault();
            const all = tabBtn.parentElement.querySelectorAll('.ltab');
            all.forEach(b=> b.classList.remove('active'));
            tabBtn.classList.add('active');
            renderLearningCards();
        }
        const progressBtn = e.target.closest('[data-action="viewProgress"]');
        if (progressBtn) {
            e.preventDefault();
            const id = progressBtn.getAttribute('data-id');
            openLearningTraining(id, { focus: 'progress' });
            return;
        }
        const detailsBtn = e.target.closest('[data-action="viewDetails"]');
        if (detailsBtn) {
            e.preventDefault();
            const id = detailsBtn.getAttribute('data-id');
            openLearningTraining(id, { focus: 'details' });
            return;
        }
        const openBtn = e.target.closest('[data-action="openLearning"]');
        if (openBtn) {
            e.preventDefault();
            const id = openBtn.getAttribute('data-id');
            openLearningTraining(id);
            return;
        }
        const enrollBtn = e.target.closest('[data-action="openOrgEnrollment"]');
        if (enrollBtn) {
            e.preventDefault();
            const trainingId = enrollBtn.getAttribute('data-id');
            openOrgAdminEnrollmentModal(trainingId);
            return;
        }
    });
    document.body.addEventListener('input', (e)=>{
        if (e.target && e.target.id === 'learningSearch') { renderLearningCards(); }
    });
    document.body.addEventListener('change', (e)=>{
        if (e.target && e.target.id === 'learningStatusFilter') { renderLearningCards(); }
    });
})();

let _learningCache = null;
let _learningLoading = false;
let _learningOrgMembersCache = null;
let _learningOrgMembersCacheOrgId = null;
let _learningAdminModalOverlay = null;

function openLearningTraining(id, options = {}) {
    if (!id) return;
    const focus = options && options.focus ? String(options.focus) : '';
    if (focus) {
        const roleCtx = sessionStorage.getItem('learningRoleContext') || resolveCurrentSystemRole();
        const normalizedRole = roleCtx ? roleCtx.toString().toUpperCase() : '';
        const shouldPersistFocus = normalizedRole !== 'SYSTEM_ADMIN' && normalizedRole !== 'ORG_ADMIN';
        if (shouldPersistFocus) {
            try { sessionStorage.setItem('trainingReaderFocus', focus); } catch (_) { /* ignore */ }
        } else {
            try { sessionStorage.removeItem('trainingReaderFocus'); } catch (_) { /* ignore */ }
        }
    }
    let preloaded = null;
    try {
        if (Array.isArray(_learningCache)) {
            preloaded = _learningCache.find(item => String(item.id) === String(id));
        }
    } catch (err) {
        console.warn('[learning] falha ao buscar treinamento selecionado', err);
    }
    if (preloaded) {
        try { window._trainingDetailPreloaded = preloaded; } catch (err) { console.warn('[learning] não foi possível armazenar pré-carga do treinamento', err); }
    }
    import('../features/admin/adminContent.js').then(m => {
        if (m.navigateToTrainingDetail) {
            m.navigateToTrainingDetail(id, { source: 'learning', training: preloaded });
        }
    });
}

function resolveCurrentSystemRole(){
    const currentOrgId = sessionStorage.getItem('currentOrganizationId');
    const orgRole = currentOrgId ? sessionStorage.getItem('myOrgRole_' + currentOrgId) : null;
    const candidates = [
        localStorage.getItem('systemRole'),
        localStorage.getItem('userRole'),
        sessionStorage.getItem('currentSystemRole'),
        sessionStorage.getItem('selectedProfileRole'),
        orgRole,
        window && window.profileData ? (window.profileData.systemRole || window.profileData.role) : null,
    ];
    for (const raw of candidates){
        if (raw){
            try {
                const normalized = raw.toString().trim();
                if (normalized) return normalized.toUpperCase();
            } catch (_) {
                // ignore parsing issues
            }
        }
    }
    return '';
}
async function loadLearningContent(){
    if (_learningCache) return _learningCache;
    if (_learningLoading) return new Promise(r=>{ const iv=setInterval(()=>{ if(_learningCache){clearInterval(iv); r(_learningCache);} },200); });
    _learningLoading = true;
    sessionStorage.removeItem('learningFilteredByOrgSectors');
    try {
        const token = localStorage.getItem('jwtToken');
        if (!token) throw new Error('Sessão expirada. Faça login.');

    const rawRole = resolveCurrentSystemRole();
    const currentOrgId = sessionStorage.getItem('currentOrganizationId');
    const orgSpecificRole = currentOrgId ? (sessionStorage.getItem('myOrgRole_' + currentOrgId) || '') : '';
    const normalizedOrgRole = orgSpecificRole ? orgSpecificRole.toString().toUpperCase() : '';
    const isSystemAdmin = /SYSTEM[_-]?ADMIN/.test(rawRole);
    const isOrgAdmin = /ORG[_-]?ADMIN/.test(rawRole) || normalizedOrgRole === 'ORG_ADMIN';
    sessionStorage.setItem('learningShowStatus', isSystemAdmin ? 'true' : 'false');
    const roleContext = isSystemAdmin ? 'SYSTEM_ADMIN' : (isOrgAdmin ? 'ORG_ADMIN' : (rawRole || normalizedOrgRole || 'ORG_MEMBER'));
    sessionStorage.setItem('learningRoleContext', roleContext);
        let list = [];

        if (isSystemAdmin) {
            sessionStorage.setItem('learningShowOrgBar', 'false');
            sessionStorage.removeItem('learningSectorFilter');
            const { getAdminTrainings } = await import('./api.js');
            const data = await getAdminTrainings(token);
            list = normalizeTrainingCollection(data);
            sessionStorage.setItem('learningFilteredByOrgSectors', list.length ? 'system' : 'system-empty');
        } else if (isOrgAdmin) {
            sessionStorage.setItem('learningShowOrgBar', 'true');
            const orgId = sessionStorage.getItem('currentOrganizationId');
            if (!orgId) {
                sessionStorage.setItem('learningFilteredByOrgSectors', 'no-org');
                _learningCache = [];
                return [];
            }
            const { getOrgAssignableTrainings, getMyTrainingEnrollments } = await import('./api.js');
            const [assignableRaw, myEnrollmentsRaw] = await Promise.all([
                getOrgAssignableTrainings(token, orgId),
                getMyTrainingEnrollments(token)
            ]);
            const assignableList = normalizeTrainingCollection(assignableRaw);
            const myList = normalizeTrainingCollection(myEnrollmentsRaw, { flattenEnrollment: true });

            const mergedMap = new Map();
            assignableList.forEach(item => {
                mergedMap.set(item.id, { ...item, _assignable: true });
            });
            myList.forEach(item => {
                const existing = mergedMap.get(item.id);
                if (existing) {
                    mergedMap.set(item.id, { ...existing, ...item, _assignable: true, _enrollment: item._enrollment, _personalEnrollment: true });
                } else {
                    mergedMap.set(item.id, { ...item, _personalEnrollment: true });
                }
            });
            list = Array.from(mergedMap.values());

            // ordenar: primeiro os atribuídos a mim, depois os restantes
            list.sort((a, b) => {
                const aAssigned = a._enrollment ? 1 : 0;
                const bAssigned = b._enrollment ? 1 : 0;
                if (aAssigned !== bAssigned) return bAssigned - aAssigned;
                return (a.title || '').localeCompare(b.title || '', 'pt-BR');
            });

            let state = 'org-admin-empty';
            const hasAssignable = assignableList.length > 0;
            const hasPersonal = myList.length > 0;
            if (hasAssignable && hasPersonal) state = 'org-admin-mixed';
            else if (hasAssignable) state = 'org-admin';
            else if (hasPersonal) state = 'org-admin-personal';
            sessionStorage.setItem('learningFilteredByOrgSectors', state);
        } else {
            sessionStorage.setItem('learningShowOrgBar', 'false');
            sessionStorage.removeItem('learningSectorFilter');
            const { getMyTrainingEnrollments } = await import('./api.js');
            const data = await getMyTrainingEnrollments(token);
            list = normalizeTrainingCollection(data, { flattenEnrollment: true });
            sessionStorage.setItem('learningFilteredByOrgSectors', list.length ? 'member' : 'member-empty');
        }

        _learningCache = list;
        return list;
    } catch(err){
        console.error('[learning] erro', err);
        sessionStorage.setItem('learningShowOrgBar', 'false');
        sessionStorage.setItem('learningShowStatus', 'false');
        if (err && (err.status === 401 || err.status === 403)) {
            sessionStorage.setItem('learningFilteredByOrgSectors', 'no-access');
        } else if (!sessionStorage.getItem('learningFilteredByOrgSectors')) {
            sessionStorage.setItem('learningFilteredByOrgSectors', 'error');
        }
        _learningCache = [];
        throw err;
    } finally {
        _learningLoading = false;
    }
}

function normalizeTrainingCollection(raw, options = {}) {
    const array = Array.isArray(raw)
        ? raw
        : (raw && Array.isArray(raw.items)) ? raw.items
        : (raw && Array.isArray(raw.data)) ? raw.data
        : (raw && Array.isArray(raw.content)) ? raw.content
        : (raw && Array.isArray(raw.results)) ? raw.results
        : [];
    return array.map(item => normalizeTrainingItem(item, options)).filter(Boolean);
}

function normalizeTrainingItem(item, options = {}) {
    if (!item) return null;
    const base = item.training || item.content || item;
    const normalized = { ...base };

    const enrollmentSource = options.flattenEnrollment ? item : item.enrollment;
    if (enrollmentSource) {
        normalized._enrollment = enrollmentSource;
        normalized.enrollmentStatus = normalized.enrollmentStatus || enrollmentSource.enrollmentStatus || enrollmentSource.status;
        normalized.enrollmentId = normalized.enrollmentId || enrollmentSource.id || enrollmentSource.enrollmentId;
    }

    normalized.id = normalized.id || base?.id || item.trainingId || item.id || base?.uuid || base?.code || base?.slug;
    normalized.title = normalized.title || normalized.name || item.trainingTitle || item.title || 'Treinamento';
    normalized.description = firstDefined(normalized.description, normalized.shortDescription, item.description, item.summary, '');
    normalized.title = (typeof normalized.title === 'string' && normalized.title.trim()) ? normalized.title : 'Treinamento';
    normalized.description = typeof normalized.description === 'string' ? normalized.description : '';
    normalized.entityType = inferEntityType(firstDefined(normalized.entityType, normalized.format, normalized.type, normalized.trainingType, item.entityType, item.format));
    const statusValue = firstDefined(normalized.publicationStatus, normalized.status, item.status, item.publicationStatus, normalized.enrollmentStatus);
    normalized.publicationStatus = statusValue ? statusValue.toString().toUpperCase() : 'PUBLISHED';

    const sectors = firstDefined(normalized.sectors, normalized.assignedSectors, item.sectors, item.assignedSectors, []);
    normalized.sectors = Array.isArray(sectors) ? sectors : [];

    return normalized.id ? normalized : null;
}

function firstDefined(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null) {
            return value;
        }
    }
    return undefined;
}

function inferEntityType(raw) {
    const value = (raw || '').toString().toUpperCase();
    if (value.includes('EBOOK')) return 'EBOOK';
    if (value.includes('LIVE') || value.includes('AO_VIVO')) return 'LIVE_TRAINING';
    if (value.includes('RECORDED') || value.includes('GRAV') || value.includes('COURSE')) return 'RECORDED_COURSE';
    if (value.includes('TRAINING')) return 'RECORDED_COURSE';
    return 'EBOOK';
}
function initLearningSection(){
    console.debug('[learning] initLearningSection invoked');
    const listEl = document.getElementById('learningList');
    if (!listEl) { console.warn('[learning] #learningList não encontrado'); return; }
    listEl.classList.add('loading');
    listEl.innerHTML = '<p class="loading-msg">Carregando conteúdos...</p>';
    // Fallback de timeout para evitar ficar "travado" se algo falhar silenciosamente
    const timeoutId = setTimeout(()=>{
        if (listEl.classList.contains('loading')) {
            listEl.classList.remove('loading');
            listEl.innerHTML = '<p class="muted" style="font-size:.7rem;">Ainda carregando... verifique sua conexão ou recarregue a página.</p>';
        }
    }, 5000);
    loadLearningContent()
        .then(()=> ensureOrgSectorsBar())
        .then(()=>{ renderLearningCards(); })
        .catch(err=>{ listEl.innerHTML = `<p class="error-msg">${escapeHtml(err.message||'Erro ao carregar')}</p>`; listEl.classList.remove('loading'); })
        .finally(()=>{ clearTimeout(timeoutId); });
}

document.addEventListener('training:progress-updated', (event) => {
    const detail = event && event.detail ? event.detail : {};
    if (!detail || !detail.trainingId) return;
    const trainingId = String(detail.trainingId);
    let escapedId = trainingId;
    if (window.CSS && typeof CSS.escape === 'function') {
        try { escapedId = CSS.escape(trainingId); } catch (_) { escapedId = trainingId; }
    } else {
        escapedId = trainingId.replace(/"/g, '\"');
    }
    let card = document.querySelector(`.learning-card-member[data-id="${escapedId}"]`);
    if (!card && escapedId !== trainingId) {
        card = document.querySelector(`.learning-card-member[data-id="${trainingId}"]`);
    }
    if (!card) return;
    if (typeof detail.percent === 'number' && Number.isFinite(detail.percent)) {
        const normalized = Math.min(100, Math.max(0, Math.round(detail.percent)));
        const track = card.querySelector('.learning-progress-track');
        const fill = card.querySelector('.learning-progress-fill');
        const label = card.querySelector('.learning-progress-label');
        if (track) track.setAttribute('aria-valuenow', String(normalized));
        if (fill) fill.style.width = `${normalized}%`;
        if (label) label.textContent = `${normalized}% concluído`;
    }
});
function renderLearningCards(){
    console.debug('[learning] renderLearningCards start, cache=', !!_learningCache);
    const listEl = document.getElementById('learningList');
    if (!listEl || !_learningCache) {
        if (!listEl) console.warn('[learning] listEl inexistente');
        if (!_learningCache) console.warn('[learning] cache vazio');
        return;
    }

    const activeTab = document.querySelector('#learningTabs .ltab.active');
    const tab = activeTab ? activeTab.getAttribute('data-ltab') : 'all';
    const q = (document.getElementById('learningSearch')?.value || '').trim().toLowerCase();
    const statusSelect = document.getElementById('learningStatusFilter');
    const canSeeStatus = sessionStorage.getItem('learningShowStatus') === 'true';
    if (statusSelect) {
        statusSelect.style.display = canSeeStatus ? '' : 'none';
        if (!canSeeStatus) {
            statusSelect.value = '';
        }
    }
    const statusFilter = canSeeStatus ? ((statusSelect?.value || '').toUpperCase()) : '';
    const sysRole = resolveCurrentSystemRole();
    const roleContext = sessionStorage.getItem('learningRoleContext') || sysRole || 'USER';
    const currentOrgId = sessionStorage.getItem('currentOrganizationId');
    const orgSpecificRole = currentOrgId ? (sessionStorage.getItem('myOrgRole_' + currentOrgId) || '') : '';
    const normalizedRole = roleContext.toString().toUpperCase();
    const normalizedOrgRole = orgSpecificRole ? orgSpecificRole.toString().toUpperCase() : '';
    const isOrgAdminView = normalizedRole === 'ORG_ADMIN' || normalizedOrgRole === 'ORG_ADMIN';
    const sectorFilter = sessionStorage.getItem('learningSectorFilter') || '';

    const applyFilters = (sourceList) => {
        let arr = Array.isArray(sourceList) ? sourceList.slice() : [];
        if (!arr.length) return [];
        if (tab === 'ebooks') arr = arr.filter(t => (t.entityType || '').toUpperCase() === 'EBOOK');
        else if (tab === 'courses') arr = arr.filter(t => (t.entityType || '').toUpperCase() === 'RECORDED_COURSE');
        else if (tab === 'live') arr = arr.filter(t => (t.entityType || '').toUpperCase() === 'LIVE_TRAINING');
        if (q) arr = arr.filter(t => (t.title || '').toLowerCase().includes(q));
        if (statusFilter) arr = arr.filter(t => (t.publicationStatus || t.status || '').toUpperCase() === statusFilter);
        if (sectorFilter) {
            arr = arr.filter(t => {
                const ids = extractTrainingSectorIds(t);
                return ids.includes(sectorFilter);
            });
        }
        return arr;
    };

    const filteredAll = applyFilters(_learningCache);
    let adminFiltered = [];
    const adminCatalog = document.getElementById('learningOrgAdminCatalog');
    const adminListEl = document.getElementById('learningAdminCatalogList');
    const adminEmptyEl = document.getElementById('learningAdminCatalogEmpty');

    if (isOrgAdminView && adminCatalog && adminListEl && adminEmptyEl) {
        adminCatalog.classList.remove('hidden');
        adminCatalog.setAttribute('aria-hidden', 'false');
        adminCatalog.setAttribute('aria-busy', 'false');

        adminFiltered = applyFilters(_learningCache.filter(item => item && item._assignable));

        if (adminFiltered.length) {
            adminListEl.innerHTML = adminFiltered.map(t => learningCardHtml(t, sysRole, canSeeStatus, roleContext)).join('');
            adminEmptyEl.classList.add('hidden');
        } else {
            adminListEl.innerHTML = '';
            adminEmptyEl.classList.remove('hidden');
        }
    } else if (adminCatalog) {
        adminCatalog.classList.add('hidden');
        adminCatalog.setAttribute('aria-hidden', 'true');
        adminCatalog.setAttribute('aria-busy', 'false');
        if (adminListEl) adminListEl.innerHTML = '';
        if (adminEmptyEl) adminEmptyEl.classList.add('hidden');
    }

    listEl.classList.remove('loading');
    updateLearningRoleNotice(roleContext);

    const displayList = filteredAll;

    if (!displayList.length) {
        console.debug('[learning] lista vazia; state=', sessionStorage.getItem('learningFilteredByOrgSectors'));
        const state = sessionStorage.getItem('learningFilteredByOrgSectors');
        let msg = 'Nenhum conteúdo encontrado.';
        if (state === 'true') msg = 'Nenhum curso dos setores adotados foi encontrado.';
        else if (state === 'empty') {
            const orgIdCur = sessionStorage.getItem('currentOrganizationId');
            const orgRole = orgIdCur ? (sessionStorage.getItem('myOrgRole_'+orgIdCur) || '') : '';
            let base = 'Sua organização ainda não adotou setores.';
            if (orgRole === 'ORG_MEMBER') base = 'Nenhum setor adotado pela organização.';
            const notice = 'Caso você tenha adotado um setor para sua organização, os cursos aparecerão nesta tela.';
            const obs = 'Obs.: Para um ORG_MEMBER o que irá aparecer é somente os treinamentos atribuídos pelo ORG_ADMIN. Fora isso ele só pode ver o catálogo público.';
            msg = `${base}<br><br><strong>${escapeHtml(notice)}</strong><br><span class="muted" style="font-size:.65rem;line-height:1.3">${escapeHtml(obs)}</span>`;
        }
        else if (state === 'no-org') msg = 'Selecione uma organização para visualizar os cursos dos setores adotados.';
        else if (state === 'error') msg = 'Não foi possível carregar os setores adotados para filtrar os cursos.';
        else if (state === 'no-access') msg = 'Você não tem acesso ao catálogo interno. Aguarde atribuição de treinamentos pelo administrador ou utilize o catálogo público.';
        else if (state === 'org-admin-empty') msg = 'Nenhum treinamento disponível para os setores adotados da organização.';
        else if (state === 'org-admin-personal') msg = 'Você possui treinamentos atribuídos a você, mas nenhum conteúdo novo foi disponibilizado para os setores adotados.';
        else if (state === 'org-admin-mixed') msg = 'Você está visualizando os treinamentos atribuídos a você no topo, seguidos pelo catálogo completo adotado pela organização.';
        else if (state === 'member-empty') msg = 'Nenhum treinamento foi atribuído a você até o momento.';
        else if (state === 'system-empty') msg = 'Nenhum treinamento está cadastrado no momento.';
        if (sectorFilter) msg = 'Nenhum curso encontrado para este setor.';
        listEl.innerHTML = `<p class="muted" style="font-size:.7rem;line-height:1.35">${msg}</p>`;
        return;
    }

    listEl.innerHTML = displayList.map(t => learningCardHtml(t, sysRole, canSeeStatus, roleContext)).join('');
}

function updateLearningRoleNotice(roleContext){
    const notice = document.getElementById('learningRoleNotice');
    if (!notice) return;
    const cache = Array.isArray(_learningCache) ? _learningCache : [];
    const total = cache.length;
    const assignedCount = cache.filter(item => item && item._enrollment).length;
    const availableCount = cache.filter(item => item && item._assignable).length;
    const statusCounts = cache.reduce((acc, item) => {
        const status = (item && (item.publicationStatus || item.status || '')).toString().toUpperCase();
        if (!status) return acc;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
    let message = '';
    const normalizedRole = (roleContext || '').toString().toUpperCase();
    const isMemberView = normalizedRole === 'ORG_MEMBER' || normalizedRole === 'ORG_USER' || normalizedRole === 'MEMBER' || normalizedRole === 'USER' || normalizedRole === 'EMPLOYEE' || !normalizedRole;
    if (normalizedRole === 'SYSTEM_ADMIN') {
        const published = statusCounts.PUBLISHED || 0;
        const draft = statusCounts.DRAFT || 0;
        message = `<strong>Visão do administrador do sistema.</strong> Utilize os filtros para auditar o catálogo completo, incluindo rascunhos e conteúdos publicados.`;
        message += `<span class="counts">Total cadastrados: ${total} • Publicados: ${published} • Rascunhos: ${draft}</span>`;
    } else if (normalizedRole === 'ORG_ADMIN') {
        message = `<strong>Visão do administrador da organização.</strong> Os treinamentos atribuídos a você aparecem primeiro; o restante está disponível para designar a outros membros.`;
        message += `<span class="counts">Atribuídos a você: ${assignedCount} • Disponíveis para a organização: ${availableCount}</span>`;
    } else if (isMemberView) {
        message = `<strong>Sua trilha personalizada.</strong> Aqui você encontra apenas os treinamentos atribuídos a você pelos administradores da organização.`;
        message += `<span class="counts">Treinamentos atribuídos: ${assignedCount}</span>`;
    } else {
        message = total ? `<strong>Treinamentos disponíveis.</strong> Utilize os filtros para encontrar conteúdos relevantes.` : '';
        if (total) message += `<span class="counts">Total: ${total}</span>`;
    }

    if (!message) {
        notice.innerHTML = '';
        notice.style.display = 'none';
    } else {
        notice.innerHTML = message;
        notice.style.display = '';
    }
}
function extractTrainingSectorIds(t){
    if(!t||typeof t!=='object') return [];
    const arr = Array.isArray(t.sectors)?t.sectors:(Array.isArray(t.assignedSectors)?t.assignedSectors:[]);
    return arr.map(s=> String((s&& (s.id||s.sectorId||s._id||s.code||s.identifier))||'').trim()).filter(Boolean);
}
async function ensureOrgSectorsBar(){
    const bar = document.getElementById('learningOrgSectorsBar');
    if (!bar) return;
    const showFlag = sessionStorage.getItem('learningShowOrgBar');
    if (showFlag !== 'true') {
        bar.innerHTML = '';
        bar.classList.add('hidden');
        bar.classList.remove('empty');
        return;
    }
    bar.classList.remove('hidden');
    bar.classList.remove('empty');
    let orgId = sessionStorage.getItem('currentOrganizationId');
    bar.innerHTML='';
    // Fallback: se nenhuma org selecionada, tentar auto-selecionar se o usuário só tem uma
    if (!orgId){
        try {
            const tokenAuto = localStorage.getItem('jwtToken');
            if (tokenAuto){
                const { getMyOrganizations } = await import('./api.js');
                const orgs = await getMyOrganizations(tokenAuto);
                if (Array.isArray(orgs) && orgs.length === 1){
                    const only = orgs[0];
                    orgId = only.id || only._id || only.organizationId;
                    if (orgId){
                        sessionStorage.setItem('currentOrganizationId', orgId);
                        sessionStorage.setItem('currentOrganizationName', only.name || only.razaoSocial || only.companyName || 'Organização');
                        document.dispatchEvent(new CustomEvent('org:current:changed', {detail:{orgId}}));
                    }
                }
            }
        } catch (e){ console.warn('[learning] fallback seleção automática org falhou', e); }
    }
    if (!orgId){
        bar.classList.add('empty');
        bar.innerHTML='<span class="los-empty-hint">Selecione ou crie uma organização para ver seus setores adotados.</span>';
        return;
    }
    const token = localStorage.getItem('jwtToken');
    try {
        const { getMyOrganizationSectors } = await import('./api.js');
        const adopted = await getMyOrganizationSectors(token, orgId);
        if (!adopted || !adopted.length){
            bar.classList.add('empty');
            const orgIdCur = sessionStorage.getItem('currentOrganizationId');
            const orgRole = orgIdCur ? (sessionStorage.getItem('myOrgRole_'+orgIdCur) || '') : '';
            const base = orgRole === 'ORG_MEMBER' ? 'Nenhum setor adotado pela organização.' : 'Esta organização não possui setores adotados.';
            const notice = 'Caso você tenha adotado um setor para sua organização, os cursos aparecerão nesta tela.';
            const obs = 'Obs.: Para um ORG_MEMBER o que irá aparecer é somente os treinamentos atribuídos pelo ORG_ADMIN. Fora isso ele só pode ver o catálogo público.';
            bar.innerHTML=`<span class="los-empty-hint">${escapeHtml(base)}<br><br><strong>${escapeHtml(notice)}</strong><br><span style=\"font-size:.6rem;line-height:1.25\">${escapeHtml(obs)}</span></span>`;
            return;
        }
        bar.classList.remove('empty');
        const orgName = sessionStorage.getItem('currentOrganizationName')||'Organização';
        const label = document.createElement('span'); label.className='los-label'; label.textContent='Setores';
        const orgSpan = document.createElement('span'); orgSpan.className='los-org-name'; orgSpan.textContent=orgName+':';
        bar.appendChild(label); bar.appendChild(orgSpan);
        const currentFilter = sessionStorage.getItem('learningSectorFilter')||'';
        adopted.forEach(s => {
            const id = String(s.id||s.sectorId||s._id||''); if(!id) return;
            const name = s.name||s.nome||('Setor '+id.substring(0,6));
            const btn = document.createElement('button');
            btn.type='button';
            btn.className='los-badge'+(currentFilter===id?' active':'');
            btn.dataset.sectorId=id;
            btn.innerHTML=`<span class="text">${escapeHtml(name)}</span>`;
            btn.addEventListener('click',()=>{
                const cur = sessionStorage.getItem('learningSectorFilter');
                if (cur===id){ sessionStorage.removeItem('learningSectorFilter'); } else { sessionStorage.setItem('learningSectorFilter', id); }
                renderLearningCards();
                ensureOrgSectorsBar();
            });
            bar.appendChild(btn);
        });
        if (currentFilter){
            const reset = document.createElement('button');
            reset.type='button';
            reset.className='los-reset';
            reset.textContent='Limpar filtro';
            reset.addEventListener('click', ()=>{ sessionStorage.removeItem('learningSectorFilter'); renderLearningCards(); ensureOrgSectorsBar(); });
            bar.appendChild(reset);
        }
    } catch (e){
        console.warn('[learning] erro setores adotados', e);
        bar.classList.add('empty');
        bar.innerHTML='<span class="los-empty-hint">Não foi possível carregar setores adotados.</span>';
    }
}

function closeOrgAdminEnrollmentModal(){
    if (!_learningAdminModalOverlay) return;
    const overlay = _learningAdminModalOverlay;
    if (overlay._escHandler) {
        document.removeEventListener('keydown', overlay._escHandler);
    }
    if (overlay._originalOverflow !== undefined) {
        document.body.style.overflow = overlay._originalOverflow;
    } else {
        document.body.style.overflow = '';
    }
    overlay.remove();
    _learningAdminModalOverlay = null;
}

async function ensureOrgMembersForOrg(orgId){
    if (!orgId) throw new Error('Selecione uma organização.');
    if (_learningOrgMembersCache && _learningOrgMembersCacheOrgId === orgId) {
        return _learningOrgMembersCache.map(member => ({ ...member }));
    }
    const token = localStorage.getItem('jwtToken');
    if (!token) throw new Error('Sessão expirada. Faça login novamente.');
    const { getOrgMembers } = await import('./api.js');
    const raw = await getOrgMembers(token, orgId);
    const collection = normalizeOrgMembersCollection(raw).map(normalizeOrgMemberForSelection).filter(Boolean);
    _learningOrgMembersCache = collection;
    _learningOrgMembersCacheOrgId = orgId;
    return collection.map(member => ({ ...member }));
}

function normalizeOrgMembersCollection(raw){
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.items)) return raw.items;
    if (raw && Array.isArray(raw.data)) return raw.data;
    if (raw && Array.isArray(raw.results)) return raw.results;
    if (raw && Array.isArray(raw.content)) return raw.content;
    return [];
}

function normalizeOrgMemberForSelection(raw){
    if (!raw || typeof raw !== 'object') return null;
    const membershipId = firstDefined(
        raw.membershipId,
        raw.membership_id,
        raw.id,
        raw._id,
        raw.memberId,
        raw.member_id,
        raw.membership && raw.membership.id,
        raw.membership && raw.membership.membershipId
    );
    if (!membershipId) return null;
    const user = raw.user || {};
    const name = firstDefined(raw.fullName, raw.full_name, raw.fullname, raw.name, user.fullName, user.full_name, user.name, '') || '';
    const email = firstDefined(raw.email, raw.userEmail, raw.user_email, user.email, user.emailAddress, user.mail, '') || '';
    const roleRaw = firstDefined(raw.role, raw.userRole, raw.user_role, user.role, user.systemRole, '');
    return {
        membershipId: String(membershipId),
        userId: firstDefined(raw.userId, raw.user_id, user.id, user._id, null) ? String(firstDefined(raw.userId, raw.user_id, user.id, user._id)) : null,
        name: name ? String(name).trim() : (email || `Membro ${membershipId}`),
        email: email ? String(email).trim() : '',
        role: roleRaw ? String(roleRaw).trim() : '',
        searchable: [name, email, roleRaw].filter(Boolean).map(val => String(val).toLowerCase()).join(' ')
    };
}

async function openOrgAdminEnrollmentModal(trainingId){
    const roleContext = (sessionStorage.getItem('learningRoleContext') || '').toUpperCase();
    if (roleContext !== 'ORG_ADMIN') return;
    if (!trainingId) {
        showToast('Treinamento não encontrado.', { type: 'error' });
        return;
    }
    const training = Array.isArray(_learningCache) ? _learningCache.find(item => String(item.id) === String(trainingId)) : null;
    if (!training) {
        showToast('Não foi possível localizar este treinamento.', { type: 'error' });
        return;
    }
    const orgId = sessionStorage.getItem('currentOrganizationId');
    if (!orgId) {
        showToast('Selecione uma organização para matricular membros.', { type: 'error' });
        return;
    }

    closeOrgAdminEnrollmentModal();

    const overlay = document.createElement('div');
    overlay.className = 'content-modal-overlay learning-enroll-overlay';
    overlay._originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const modal = document.createElement('div');
    modal.className = 'content-modal large learning-enroll-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'learningEnrollModalTitle');
    modal.tabIndex = -1;
    modal.innerHTML = `
        <div class="member-modal-header">
            <h3 id="learningEnrollModalTitle">Matricular membros</h3>
            <button type="button" class="member-modal-close" aria-label="Fechar">&times;</button>
        </div>
        <div class="member-modal-body">
            <div class="learning-enroll-summary">
                <div class="learning-enroll-info">
                    <h4>${escapeHtml(training.title || 'Treinamento')}</h4>
                    ${training.description ? `<p>${escapeHtml(truncateText(training.description, 200))}</p>` : ''}
                </div>
                <span class="learning-enroll-selected" data-selected-count>Selecionados: 0</span>
            </div>
            <div class="learning-enroll-controls">
                <label class="sr-only" for="learningEnrollSearch">Buscar membros</label>
                <input type="search" id="learningEnrollSearch" placeholder="Buscar por nome ou e-mail" autocomplete="off" />
                <div class="learning-enroll-shortcuts">
                    <button type="button" data-action="selectAll">Selecionar filtrados</button>
                    <button type="button" data-action="clearSelection">Limpar seleção</button>
                </div>
            </div>
            <div class="learning-enroll-members" data-members-container><p class="muted">Carregando membros...</p></div>
            <div class="learning-enroll-feedback hidden" data-feedback></div>
        </div>
        <div class="content-modal-actions">
            <button type="button" class="btn btn-small btn-secondary" data-action="cancel">Cancelar</button>
            <button type="button" class="btn btn-small" data-action="confirm">Confirmar matrículas</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    _learningAdminModalOverlay = overlay;

    const closeButtons = modal.querySelectorAll('.member-modal-close, [data-action="cancel"]');
    closeButtons.forEach(btn => btn.addEventListener('click', closeOrgAdminEnrollmentModal));
    overlay.addEventListener('click', (ev)=>{ if (ev.target === overlay) closeOrgAdminEnrollmentModal(); });
    const escHandler = (ev) => { if (ev.key === 'Escape') closeOrgAdminEnrollmentModal(); };
    document.addEventListener('keydown', escHandler);
    overlay._escHandler = escHandler;

    const feedbackEl = modal.querySelector('[data-feedback]');
    const membersContainer = modal.querySelector('[data-members-container]');
    const searchInput = modal.querySelector('#learningEnrollSearch');
    const selectAllBtn = modal.querySelector('[data-action="selectAll"]');
    const clearBtn = modal.querySelector('[data-action="clearSelection"]');
    const confirmBtn = modal.querySelector('[data-action="confirm"]');
    const selectedLabel = modal.querySelector('[data-selected-count]');

    const state = {
        members: [],
        filtered: [],
        selected: new Set(),
        search: ''
    };

    const updateSelectedLabel = () => {
        if (selectedLabel) {
            selectedLabel.textContent = `Selecionados: ${state.selected.size}`;
        }
    };

    const showFeedback = (message = '', type = 'info') => {
        if (!feedbackEl) return;
        if (!message) {
            feedbackEl.textContent = '';
            feedbackEl.classList.add('hidden');
            feedbackEl.classList.remove('error', 'success');
            return;
        }
        feedbackEl.textContent = message;
        feedbackEl.classList.remove('hidden', 'error', 'success');
        if (type === 'error') feedbackEl.classList.add('error');
        if (type === 'success') feedbackEl.classList.add('success');
    };

    const renderMembers = () => {
        if (!membersContainer) return;
        if (!state.filtered.length) {
            membersContainer.innerHTML = '<p class="muted">Nenhum membro encontrado.</p>';
            return;
        }
        membersContainer.innerHTML = state.filtered.map(member => `
            <label class="learning-enroll-member" data-membership-id="${escapeHtml(member.membershipId)}">
                <input type="checkbox" value="${escapeHtml(member.membershipId)}" ${state.selected.has(member.membershipId) ? 'checked' : ''} />
                <div class="member-meta">
                    <span class="member-name">${escapeHtml(member.name)}</span>
                    ${member.email ? `<span class="member-email">${escapeHtml(member.email)}</span>` : ''}
                    ${member.role ? `<span class="member-role">${escapeHtml(member.role)}</span>` : ''}
                </div>
            </label>
        `).join('');

        membersContainer.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', (ev) => {
                const id = ev.target.value;
                if (ev.target.checked) {
                    state.selected.add(id);
                } else {
                    state.selected.delete(id);
                }
                updateSelectedLabel();
                showFeedback('');
            });
        });
    };

    try {
        state.members = await ensureOrgMembersForOrg(orgId);
        state.filtered = state.members.slice();
        renderMembers();
        updateSelectedLabel();
    } catch (err) {
        console.error('[learning] erro ao carregar membros', err);
        if (membersContainer) {
            membersContainer.innerHTML = `<p class="error-msg">${escapeHtml(err.message || 'Erro ao carregar membros da organização.')}</p>`;
        }
        if (confirmBtn) confirmBtn.disabled = true;
        showFeedback(err.message || 'Erro ao carregar membros da organização.', 'error');
    }

    if (searchInput) {
        searchInput.addEventListener('input', (ev) => {
            state.search = (ev.target.value || '').trim().toLowerCase();
            if (!state.search) {
                state.filtered = state.members.slice();
            } else {
                state.filtered = state.members.filter(member => member.searchable.includes(state.search));
            }
            renderMembers();
        });
    }

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            state.filtered.forEach(member => state.selected.add(member.membershipId));
            renderMembers();
            updateSelectedLabel();
            showFeedback('');
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            state.selected.clear();
            renderMembers();
            updateSelectedLabel();
            showFeedback('');
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            if (!state.selected.size) {
                showFeedback('Selecione ao menos um membro para matricular.', 'error');
                return;
            }
            const token = localStorage.getItem('jwtToken');
            if (!token) {
                showFeedback('Sessão expirada. Faça login novamente.', 'error');
                return;
            }
            confirmBtn.disabled = true;
            const originalText = confirmBtn.textContent;
            confirmBtn.textContent = 'Matriculando...';
            try {
                const { enrollOrgMembersInTraining } = await import('./api.js');
                await enrollOrgMembersInTraining(token, orgId, {
                    trainingId: training.id,
                    membershipIds: Array.from(state.selected)
                });
                showToast('Matrículas enviadas com sucesso.');
                closeOrgAdminEnrollmentModal();
                _learningCache = null;
                initLearningSection();
            } catch (err) {
                console.error('[learning] falha ao matricular membros', err);
                showFeedback(err && err.message ? err.message : 'Erro ao matricular membros.', 'error');
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.textContent = originalText || 'Confirmar matrículas';
            }
        });
    }

    setTimeout(() => {
        try { modal.focus(); } catch (e) { /* ignore */ }
    }, 30);
}

function renderOrgAdminAssignableCatalog(){
    renderLearningCards();
}
function learningCardHtml(t, sysRole, showStatus, roleContext){
    const type=(t.entityType||'').toUpperCase();
    const status=(t.publicationStatus||t.status||'').toUpperCase();
    const published=status==='PUBLISHED';
    const normalizedRole=(roleContext||'').toString().toUpperCase();
    const isOrgAdminView = normalizedRole === 'ORG_ADMIN';
    const isMemberRole = normalizedRole === 'ORG_MEMBER' || normalizedRole === 'ORG_USER' || normalizedRole === 'MEMBER' || normalizedRole === 'USER' || normalizedRole === 'EMPLOYEE' || !normalizedRole;
    const showMemberCard = (isMemberRole && t._enrollment) || (isOrgAdminView && t._enrollment);

    const badges=[];
    if(type==='EBOOK') badges.push('E-book');
    else if(type==='RECORDED_COURSE') badges.push('Gravado');
    else if(type==='LIVE_TRAINING') badges.push('Ao Vivo');
    if (t._enrollment) {
        badges.push('Atribuído a mim');
    }
    if (isOrgAdminView && t._assignable) {
        badges.push('Disponível para a organização');
    }
    if (showStatus) {
        badges.push(published?'Publicado':'Rascunho');
    }

    const actionsParts = [];
    if (isOrgAdminView && t._assignable) {
        actionsParts.push(`<button class="btn btn-small btn-secondary" data-action="openOrgEnrollment" data-id="${escapeHtml(t.id)}">Matricular membros</button>`);
    }
    const canOpen = published || /SYSTEM[_-]?ADMIN/.test(sysRole) || (!!t._enrollment);

    if (showMemberCard) {
        actionsParts.push(`<button class="btn btn-small btn-secondary" data-action="viewProgress" data-id="${escapeHtml(t.id)}">Ver progresso</button>`);
        if (canOpen) {
            actionsParts.push(`<button class="btn btn-small" data-action="viewDetails" data-id="${escapeHtml(t.id)}">Ver detalhes</button>`);
        } else {
            actionsParts.push(`<button class="btn btn-small" disabled>Ver detalhes</button>`);
        }
        return renderMemberLearningCard(t, badges, actionsParts.join(''));
    }

    if (canOpen) {
        actionsParts.push(`<button class="btn btn-small" data-action="openLearning" data-id="${escapeHtml(t.id)}">Abrir</button>`);
    } else {
        actionsParts.push(`<button class="btn btn-small" disabled>Indisponível</button>`);
    }
    const actions = actionsParts.join('');

    const description = truncateText(t.description || '', 220);
    return `<div class="learning-card" data-id="${escapeHtml(t.id)}"><h4>${escapeHtml(t.title||'')}</h4>${description?`<p>${escapeHtml(description)}</p>`:''}<div class="learning-badges">${badges.map(b=>`<span>${escapeHtml(b)}</span>`).join(' ')}</div><div class="learning-actions">${actions}</div></div>`;
}

function renderMemberLearningCard(t, badges, actions) {
    const enrollment = t._enrollment || {};
    const statusInfo = mapEnrollmentStatus(enrollment.enrollmentStatus || enrollment.status || t.enrollmentStatus);
    const assignedAt = enrollment.enrolledAt || enrollment.assignedAt || enrollment.createdAt || t.enrolledAt || t.assignedAt;
    const assignedLabel = assignedAt ? formatLearnerAssignedDate(assignedAt) : '';
    const coverUrl = resolveLearningCoverUrl(t);
    const placeholderLetter = (String(t.title || 'T').trim().charAt(0) || 'T').toUpperCase();
    const progressValue = computeEnrollmentProgress(t);
    const description = truncateText(t.description || '', 190);

    return `
    <div class="learning-card learning-card-member" data-id="${escapeHtml(t.id)}">
        <div class="learning-card-cover">
            ${coverUrl ? `<img src="${escapeHtml(coverUrl)}" alt="Capa do treinamento ${escapeHtml(t.title || '')}" loading="lazy" decoding="async" />` : `<div class="learning-cover-placeholder" aria-hidden="true">${escapeHtml(placeholderLetter)}</div>`}
            ${statusInfo.label ? `<span class="learning-card-status status-${statusInfo.className}">${escapeHtml(statusInfo.label)}</span>` : ''}
        </div>
        <div class="learning-card-body">
            ${badges && badges.length ? `<div class="learning-badges">${badges.map(b => `<span>${escapeHtml(b)}</span>`).join(' ')}</div>` : ''}
            <h4>${escapeHtml(t.title || '')}</h4>
            ${description ? `<p>${escapeHtml(description)}</p>` : ''}
            ${assignedLabel ? `<div class="learning-meta-row">Atribuído desde <strong>${escapeHtml(assignedLabel)}</strong></div>` : ''}
            <div class="learning-progress" role="group" aria-label="Progresso do treinamento">
                <div class="learning-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressValue}">
                    <div class="learning-progress-fill" style="width:${progressValue}%"></div>
                </div>
                <span class="learning-progress-label">${progressValue}% concluído</span>
            </div>
        </div>
        <div class="learning-actions">${actions}</div>
    </div>`;
}

function mapEnrollmentStatus(status) {
    const normalized = (status || '').toString().toUpperCase();
    switch (normalized) {
        case 'ACTIVE':
            return { label: 'Em andamento', className: 'active' };
        case 'COMPLETED':
            return { label: 'Concluído', className: 'completed' };
        case 'CANCELLED':
            return { label: 'Cancelado', className: 'cancelled' };
        case 'NOT_ENROLLED':
            return { label: 'Não iniciado', className: 'pending' };
        default:
            return { label: '', className: '' };
    }
}

function formatLearnerAssignedDate(value) {
    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) {
        return String(value);
    }
}

function computeEnrollmentProgress(training) {
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
    const clamped = Math.max(0, Math.min(100, Math.round(raw)));
    return clamped;
}

function resolveLearningCoverUrl(training) {
    if (!training) return '';
    const candidates = [
        training.coverImageUrl,
        training.coverUrl,
        training.thumbnailUrl,
        training.thumbnail,
        training.cover,
        training.imageUrl,
        training._enrollment && training._enrollment.coverImageUrl
    ];
    for (const candidate of candidates) {
        if (!candidate) continue;
        if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
        if (candidate && typeof candidate === 'object') {
            const value = candidate.url || candidate.path || candidate.src;
            if (value && typeof value === 'string') return value.trim();
        }
    }
    return '';
}

function truncateText(value, maxLength) {
    const text = String(value || '').trim();
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, Math.max(0, maxLength - 1)).trimEnd() + '…';
}

function escapeHtml(str){ return String(str||'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s])); }

// Atualizar barra de setores quando organização atual mudar
document.addEventListener('org:current:changed', ()=>{
    // Limpar cache para forçar recarregamento com setores da nova organização
    _learningCache = null;
    _learningOrgMembersCache = null;
    _learningOrgMembersCacheOrgId = null;
    closeOrgAdminEnrollmentModal();
    const learningPageActive = document.getElementById('learningPage')?.classList.contains('active');
    if (learningPageActive) {
        initLearningSection();
    }
});

// Inicializa automaticamente quando a página de Cursos & Treinamentos é carregada
document.addEventListener('page:loaded', (ev)=>{
    if (ev?.detail?.page === 'learning') {
        // pequeno delay para garantir que o DOM foi injetado
        setTimeout(()=>{
            console.debug('[learning] page:loaded(learning) -> init');
            initLearningSection();
        }, 50);
    }
});

// Fallback dedicado para inicialização da página de cursos quando solicitado manualmente
document.addEventListener('learning:init', ()=>{
    setTimeout(()=>{
        console.debug('[learning] learning:init evento dedicado -> init');
        initLearningSection();
    }, 30);
});
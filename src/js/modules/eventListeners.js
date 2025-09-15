// Importa todas as funções de outros módulos que precisam ser chamadas por eventos
import { showPage, showAccountSection, scrollToSection } from './navigation.js';
import { handleLogin, handleRegister, logout, checkUserLoggedIn, handlePageLogin } from './auth.js';
import { addToCart, removeFromCart, updateQuantity, checkout } from './carts.js';
import { openAuthModal, closeAuthModal, showAuthTab } from './modals.js';
import { toggleProfileEdit, toggleEmailEdit, togglePasswordEdit, handleEmailChange, handlePasswordChange, updateProfile, handleCompleteProfile, loadUserProfile, inviteSubuser, importCSV, exportReport, showCompanyAdminPanel } from './profile.js';
import { handleCreatePfSubmit, handleOrgCreateSubmit, initOrgMembersPage, handleInviteMemberSubmit } from './profile.js';
import { subscribeNewsletter, sendMessage as sendContactMessage, getMyOrganizations, addOrgMember } from './api.js';
import { highlightFilterButton } from './render.js';
import { nextCard, prevCard } from './carousel.js';
import { scrollLeft, scrollRight } from './scroll.js';
import { filterProductsByCategory, searchProducts } from './products.js';
import { formatCNPJ } from './utils.js';

/**
 * Configura todos os event listeners principais da aplicação.
 */
export function setupEventListeners() {

    // === LISTENERS DE CLIQUE (Delegação de Eventos) ===
    // Centraliza todos os eventos de clique da aplicação
    document.body.addEventListener("click", async (e) => {
        const target = e.target.closest(
            "[data-page], [data-filter], .add-to-cart-btn, .remove-btn, .quantity-btn, [data-auth-action], [data-section], [data-auth-tab], [data-action], #scrollLeftBtn, #scrollRightBtn, #prevCardBtn, #nextCardBtn, #contaBtn"
        );
        if (!target) return;

        e.preventDefault();

        // Lógica de navegação e filtros
        if (target.dataset.page) {
            await showPage(target.dataset.page);
        }
        if (target.dataset.filter) {
            await filterProductsByCategory(target.dataset.filter);
            highlightFilterButton(target.dataset.filter);
        }

        // Lógica do carrinho
    if (target.classList.contains("add-to-cart-btn")) {
        addToCart(target.dataset.id, target.dataset.type);
    } else if (target.classList.contains("remove-btn")) {
        removeFromCart(target.dataset.id, target.dataset.type);
    } else if (target.classList.contains("quantity-btn")) {
        const action = target.dataset.action;
        const itemId = target.dataset.id;
        const itemType = target.dataset.type;
        
        // Encontra o input de quantidade correspondente
        const quantityInput = document.querySelector(`.quantity-input[data-id="${itemId}"][data-type="${itemType}"]`);
        
        if (quantityInput) {
            let currentQuantity = parseInt(quantityInput.value);
            let newQuantity;

            if (action === 'increase') {
                newQuantity = currentQuantity + 1;
            } else if (action === 'decrease') {
                newQuantity = currentQuantity - 1;
            }
            
            // Chama a função com a nova quantidade calculada
            updateQuantity(itemId, itemType, newQuantity);
        }
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
            subscribeNewsletter(e);
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
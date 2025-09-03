// Importa todas as funções de outros módulos que precisam ser chamadas por eventos
import { showPage, showAccountSection, scrollToSection } from './navigation.js';
import { handleLogin, handleRegister, logout, checkUserLoggedIn } from './auth.js';
import { addToCart, removeFromCart, updateQuantity, checkout } from './carts.js';
import { openAuthModal, closeAuthModal, showAuthTab } from './modals.js';
import { toggleProfileEdit, toggleEmailEdit, togglePasswordEdit, handleEmailChange, handlePasswordChange, updateProfile, handleCompleteProfile, loadUserProfile } from './profile.js';
import { subscribeNewsletter, sendMessage as sendContactMessage } from './api.js';
import { highlightFilterButton } from './render.js';
import { nextCard, prevCard } from './carousel.js';
import { scrollLeft, scrollRight } from './scroll.js';
import { filterProductsByCategory, searchProducts } from './products.js';

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
        } else if (form.id === 'profileCompleteForm') {
            handleCompleteProfile(e);
    } else if (form.id === 'changePasswordForm') {
            handlePasswordChange(e);
        } else if (form.id === 'newsletterForm') {
            subscribeNewsletter(e);
        }
    });

    console.log("Event listeners configurados.");
}
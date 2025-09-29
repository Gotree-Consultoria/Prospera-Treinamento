// src/js/modals.js

/**
 * Abre o modal de autenticação.
 * @param {string} tab - A aba a ser exibida ('login' ou 'register').
 */
export function openAuthModal(tab = 'login') {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        showAuthTab(tab);
        // fechar ao clicar no backdrop (fora do conteúdo)
        const backdropHandler = (e) => {
            if (e.target === authModal) {
                closeAuthModal();
            }
        };
        // armazenar referência para poder remover depois
        authModal.__backdropHandler = backdropHandler;
        authModal.addEventListener('click', backdropHandler);
    // inicializar comportamentos do modal (toggle de campos, listeners de submissão)
    try { initAuthModalBehavior(); } catch (e) { /* silencioso */ }
    }
}

/**
 * Fecha o modal de autenticação.
 */
export function closeAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        // remover listener do backdrop se existir
        if (authModal.__backdropHandler) {
            authModal.removeEventListener('click', authModal.__backdropHandler);
            delete authModal.__backdropHandler;
        }
    }
}

/**
 * Alterna entre as abas de login e registro no modal.
 * @param {string} tab - A aba a ser exibida ('login' ou 'register').
 */
export function showAuthTab(tab) {
    const authTabs = document.getElementById('authTabs');
    const authLoginForm = document.getElementById('authLoginForm');
    // authRegisterForm é o <form>; authRegisterContainer é o wrapper div
    const authRegisterForm = document.getElementById('authRegisterForm');
    const authRegisterContainer = document.getElementById('authRegisterContainer');
    
    if (authTabs) authTabs.classList.remove('hidden');
    if (authLoginForm) authLoginForm.classList.add('hidden');
    if (authRegisterContainer) authRegisterContainer.classList.add('hidden');
    
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    
    if (tab === 'login') {
        if (tabLogin) tabLogin.classList.add('active');
        if (tabRegister) tabRegister.classList.remove('active');
    if (authLoginForm) authLoginForm.classList.remove('hidden');
    } else {
        if (tabRegister) tabRegister.classList.add('active');
        if (tabLogin) tabLogin.classList.remove('active');
    if (authRegisterContainer) authRegisterContainer.classList.remove('hidden');
    }
}

/**
 * Inicializa comportamento específico do modal de autenticação
 * - alterna campos de cadastro PJ
 * - no futuro pode anexar validações inline
 */
export function initAuthModalBehavior() {
    // Atualmente o modal de registro foi simplificado para coletar apenas email e senha.
    // Este método existe para futura inicialização de comportamento do modal (placeholders,
    // máscaras, validações inline). Por enquanto não há lógica ativa.
}
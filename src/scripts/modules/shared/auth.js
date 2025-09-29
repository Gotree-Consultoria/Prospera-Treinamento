// modules/auth.js

import { showPage } from './navigation.js';
import { fetchUserProfile, loginUser, registerUser } from './api.js';
import { closeAuthModal, showAuthTab } from './modals.js';
import { completeUserProfile } from './api.js';

export function checkUserLoggedIn() {
    return !!localStorage.getItem('jwtToken');
}

export async function handleLogin(event) {
    event.preventDefault();
    const email = (document.getElementById('loginEmail') || {}).value || '';
    const password = (document.getElementById('loginPassword') || {}).value || '';

    if (!email || !password) {
        alert('Preencha todos os campos!');
        return;
    }

    try {
        const data = await loginUser(email, password);
        if (data && data.token) {
            localStorage.setItem('jwtToken', data.token);
            localStorage.setItem('loggedInUserEmail', data.email || email);
            // persistir role do backend (campo `role` esperado)
            try { if (data.role) localStorage.setItem('systemRole', data.role); } catch(e) {}
        }

        let profile = null;
        if (data && (data.profile || data.user)) profile = data.profile || data.user;
        else {
            try { profile = await fetchUserProfile(data && data.token); } catch (err) { /* ignore */ }
        }

    closeAuthModal();
    showPage('account');
    try { document.dispatchEvent(new CustomEvent('user:loggedin', { detail: { source: 'auth' } })); } catch (e) {}

        if (profile && (!profile.cpf || !profile.phone || !profile.birth)) {
            const completeSection = document.getElementById('profileCompleteSection');
            if (completeSection) completeSection.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Erro no handleLogin:', err);
        const messages = document.getElementById('loginMessages');
        if (messages) messages.textContent = 'Email ou senha incorretos.';
        else alert('Erro ao fazer login.');
    }
}

export async function handleRegister(event) {
    event.preventDefault();
    const messages = document.getElementById('registerMessages');
    const modalMessages = document.getElementById('authRegisterMessages');
    if (messages) messages.textContent = '';
    if (modalMessages) {
        // garantir a classe base para estilo consistente
        modalMessages.classList.add('form-messages');
        modalMessages.textContent = '';
        modalMessages.classList.remove('success', 'error');
    }

    const email = (document.getElementById('pageRegisterEmail') && document.getElementById('pageRegisterEmail').value)
        || (document.getElementById('registerEmail') && document.getElementById('registerEmail').value) || '';
    const password = (document.getElementById('pageRegisterPassword') && document.getElementById('pageRegisterPassword').value)
        || (document.getElementById('registerPassword') && document.getElementById('registerPassword').value) || '';

    if (!email || !password) {
        if (messages) messages.textContent = 'Preencha email e senha.';
        return;
    }

    try {
        const payload = { email, password };
        await registerUser(payload);

        const modalText = 'Cadastro realizado com sucesso, entre para fazer login!';
        if (messages) messages.textContent = 'Conta criada. Por favor, faça login na aba Entrar.';
        if (modalMessages) {
            modalMessages.classList.remove('error');
            modalMessages.classList.add('success');
            modalMessages.setAttribute('role', 'status');
            // fallback inline color para garantir visibilidade quando regras CSS externas
            const coralDark = getComputedStyle(document.documentElement).getPropertyValue('--coral-dark').trim() || '#d54a2a';
            modalMessages.style.color = coralDark;
            modalMessages.textContent = modalText;
            // após alguns segundos, alterna para a aba de login automaticamente
            setTimeout(() => {
                try { showAuthTab('login'); } catch (e) { /* ignore */ }
                try { const loginEmail = document.getElementById('loginEmail'); if (loginEmail) loginEmail.focus(); } catch (e) { /* ignore */ }
            }, 3000);
        } else {
            try { showAuthTab('login'); } catch (e) {}
            try { const loginEmail = document.getElementById('loginEmail'); if (loginEmail) loginEmail.focus(); } catch (e) {}
        }
    } catch (err) {
        console.error('Erro no handleRegister:', err);
        const code = err && (err.code || (err.response && err.response.code));
        const text = (code === 'EMAIL_IN_USE') ? 'Este e-mail já está cadastrado. Use Entrar ou recupere a senha.' : (err && err.message) || 'Erro ao cadastrar.';
        if (messages) messages.textContent = text;
        if (modalMessages) {
            modalMessages.classList.remove('success');
            modalMessages.classList.add('error');
            modalMessages.setAttribute('role', 'status');
            const coral = getComputedStyle(document.documentElement).getPropertyValue('--coral').trim() || '#e65f3c';
            modalMessages.style.color = coral;
            modalMessages.textContent = text;
        }
        if (code === 'EMAIL_IN_USE') {
            try { showAuthTab('login'); } catch (e) {}
            const loginEmail = document.getElementById('loginEmail');
            if (loginEmail) { loginEmail.value = (document.getElementById('registerEmail')||{}).value || ''; loginEmail.focus(); }
        }
    }
}

export async function handlePageLogin(event) {
    event.preventDefault();
    const emailEl = document.getElementById('pageLoginEmail');
    const passEl = document.getElementById('pageLoginPassword');
    const messages = document.getElementById('loginMessages');
    if (messages) messages.textContent = '';
    const email = emailEl ? emailEl.value.trim() : '';
    const password = passEl ? passEl.value.trim() : '';
    if (!email || !password) {
        if (messages) messages.textContent = 'Preencha todos os campos.';
        return;
    }
    try {
        const data = await loginUser(email, password);
        if (data && data.token) {
            localStorage.setItem('jwtToken', data.token);
            localStorage.setItem('loggedInUserEmail', data.email || email);
            try { if (data.role) localStorage.setItem('systemRole', data.role); } catch(e) {}
        }
        if (messages) messages.textContent = 'Login realizado com sucesso.';
    showPage('account');
    try { document.dispatchEvent(new CustomEvent('user:loggedin', { detail: { source: 'auth' } })); } catch (e) {}
    } catch (err) {
        console.error('Erro no handlePageLogin:', err);
        if (messages) messages.textContent = err && err.message || 'Email ou senha incorretos.';
    }
}

export function logout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('loggedInUserEmail');
    localStorage.removeItem('systemRole');
    alert('Você saiu da sua conta.');
    showPage('home');
}
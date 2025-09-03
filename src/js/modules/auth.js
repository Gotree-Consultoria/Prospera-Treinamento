// modules/auth.js

import { showPage } from './navigation.js';
import { fetchUserProfile, loginUser, registerUser } from './api.js';
import { closeAuthModal } from './modals.js'; // Assumindo um módulo para controle de modais
import { completeUserProfile } from './api.js';

/**
 * Verifica se o token JWT existe no localStorage.
 * @returns {boolean} True se o usuário está logado, false caso contrário.
 */
export function checkUserLoggedIn() {
    return !!localStorage.getItem('jwtToken');
}

/**
 * Lida com o processo de login do usuário.
 * @param {Event} event - O evento de envio do formulário.
 */
export async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        alert('Preencha todos os campos!');
        return;
    }

    try {
        const data = await loginUser(email, password);
        localStorage.setItem('jwtToken', data.token);
        localStorage.setItem('loggedInUserEmail', data.email);

        // Fetch profile to check if needs completion
        const profile = await fetchUserProfile(data.token);
        alert('Login realizado com sucesso!');
        closeAuthModal();
        showPage('account');

        // Se faltar cpf/phone/birth, mostrar a seção de completar perfil
        if (!profile.cpf || !profile.phone || !profile.birth) {
            const completeSection = document.getElementById('profileCompleteSection');
            if (completeSection) {
                completeSection.classList.remove('hidden');
                // optional: scroll to section
                window.location.hash = '#accountPage';
            }
        }
    } catch (error) {
        console.error('Erro no handleLogin:', error);
        alert(error.message);
    }
}

/**
 * Lida com o processo de registro de um novo usuário.
 * @param {Event} event - O evento de envio do formulário.
 */
export async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const emailConfirm = document.getElementById("registerEmailConfirm").value;
    const password = document.getElementById("registerPassword").value;
    const passwordConfirm = document.getElementById("registerPasswordConfirm").value;
    // ... outros campos ...
    // validações simples
    if (email !== emailConfirm) {
        alert('Os e-mails não coincidem.');
        return;
    }
    if (password !== passwordConfirm) {
        alert('As senhas não coincidem.');
        return;
    }

    const userData = { name, email, password };
    if (!Object.values(userData).every(field => field.trim() !== '')) {
        alert("Todos os campos são obrigatórios.");
        return;
    }

    try {
        const registered = await registerUser(userData);
        alert('Cadastro realizado com sucesso! Faça login para continuar.');
        closeAuthModal();
        // opcional: auto-login se API retornar token
        if (registered && registered.token) {
            localStorage.setItem('jwtToken', registered.token);
            localStorage.setItem('loggedInUserEmail', registered.email || userData.email);
            showPage('account');
        }
        // Após o registro, pode-se fazer login automático ou pedir para o usuário fazer login
    } catch (error) {
        console.error('Erro no handleRegister:', error);
        alert(error.message);
    }
}

/**
 * Lida com o processo de logout do usuário.
 */
export function logout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('loggedInUserEmail');
    // ... remova outros dados de usuário, se houver
    alert('Você saiu da sua conta.');
    showPage('home');
}
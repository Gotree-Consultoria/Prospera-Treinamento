// As funções do api.js que lidam com a lógica de negócio real
import { updateUserProfile, updateUserEmail, updateUserPassword, completeUserProfile, fetchUserProfile } from './api.js';

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

export async function loadUserProfile() {
    const token = localStorage.getItem('jwtToken');
    if (!token) return;
    try {
        const profile = await fetchUserProfile(token);
        currentProfile = profile;
        const nameEl = document.getElementById('userName');
        const emailEl = document.getElementById('userEmail');
        const phoneEl = document.getElementById('userPhone');
        if (nameEl) nameEl.textContent = profile.name || '';
        if (emailEl) emailEl.textContent = maskEmail(profile.email || localStorage.getItem('loggedInUserEmail') || '');
        if (phoneEl) phoneEl.textContent = maskPhone(profile.phone || '');

        // show verified section if exists
        const verifiedSection = document.getElementById('verifiedSection');
        if (verifiedSection) {
            // only admin can change verified info; keep hidden by default
            verifiedSection.classList.add('hidden');
        }
    } catch (err) {
        console.error('Erro ao carregar perfil:', err);
    }
}

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
    document.getElementById('editPhone').value = document.getElementById('userPhone').textContent;
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

    if (show) {
        if (showButton) showButton.style.display = 'none';
        if (controls) controls.style.display = 'block';
    } else {
        if (showButton) showButton.style.display = 'block';
        if (controls) controls.style.display = 'none';
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
    const emailValue = emailInput ? emailInput.value.trim() : '';
    if (emailValue === '') {
        alert('Por favor, preencha o campo com seu novo e-mail.');
        return;
    }
    // pedir confirmação do e-mail atual
    const current = prompt('Digite o seu e-mail atual para confirmar a alteração:');
    const stored = localStorage.getItem('loggedInUserEmail');
    if (!current || current !== stored) {
        alert('E-mail atual não confere. A alteração foi cancelada.');
        return;
    }
    const token = localStorage.getItem('jwtToken');
    try {
        await updateUserEmail(token, emailValue);
        alert('Seu e-mail foi alterado com sucesso!');
        if (document.getElementById('userEmail')) document.getElementById('userEmail').textContent = maskEmail(emailValue);
        localStorage.setItem('loggedInUserEmail', emailValue);
        toggleEmailEdit(false);
    } catch (error) {
        alert('Erro ao alterar o e-mail: ' + error.message);
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
// As funções do api.js que lidam com a lógica de negócio real
import { updateUserProfile, updateUserEmail, updateUserPassword, completeUserProfile, fetchUserProfile, requestEmailChange } from './api.js';

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
    if (!token) return;
    try {
        const profile = await fetchUserProfile(token);
        currentProfile = profile;
        const nameEl = document.getElementById('userName');
        const emailEl = document.getElementById('userEmail');
        const phoneElement = document.getElementById('userPhone');
        if (nameEl) nameEl.textContent = profile.name || '';
        if (emailEl) emailEl.textContent = maskEmail(profile.email || localStorage.getItem('loggedInUserEmail') || '');
    if (phoneElement) phoneElement.textContent = maskPhone(profile.phone || profile.phoneNumber || '');

        // preencher CPF e data de nascimento (somente leitura) e exibir seção Verificado quando disponíveis
        const cpfEl = document.getElementById('userCPF');
        const birthEl = document.getElementById('userBirth');
        // aceitar diferentes nomes de propriedade retornados pela API
        const cpfValue = profile.cpf || profile.cpfNumber || profile.document || profile.documentNumber || '';
        const birthValue = profile.birth || profile.birthDate || profile.dob || profile.birth_date || '';
    if (cpfEl) cpfEl.textContent = cpfValue ? maskCPF(cpfValue) : '—';
    if (birthEl) birthEl.textContent = birthValue ? maskDate(birthValue) : '—';
    // marcar telefone como verificado (cliente deveria contatar central para alterar)
    const phoneEl = document.getElementById('userPhone');
    if (phoneEl) phoneEl.classList.add('verified');
        // garantir que a seção verificado esteja visível (mostra placeholders quando não há dados)
        const verifiedLi = document.querySelector('.verified-section');
        if (verifiedLi) {
            verifiedLi.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Erro ao carregar perfil:', err);
    }
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

// phone editing removed from UI — phone changes must be done via support
import { supabase } from './supabaseClient.js';

// Elementos DOM
const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('senha');
const loginBtn = document.getElementById('loginBtn');
const guestBtn = document.getElementById('guestBtn');
const toastMsg = document.getElementById('toast-message');
const togglePwdBtn = document.querySelector('.toggle-password');
const rememberCheck = document.getElementById('remember');

function showToast(message, isError = false) {
    toastMsg.textContent = message;
    toastMsg.classList.remove('hidden');
    toastMsg.style.background = isError ? '#d32f2f' : '#2e7d32';
    setTimeout(() => toastMsg.classList.add('hidden'), 3000);
}

function setLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<span class="material-icons-round" style="animation: spin 1s linear infinite;">progress_activity</span> Aguardando...';
    } else {
        button.disabled = false;
        button.innerHTML = '<span>Entrar</span><span class="material-icons-round">arrow_forward</span>';
    }
}

// Login com email/senha
async function performLogin(email, senha) {
    if (!email || !senha) {
        showToast('Preencha e-mail e senha', true);
        return;
    }
    setLoading(loginBtn, true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(loginBtn, false);
    if (error) {
        showToast(error.message, true);
        return;
    }
    if (rememberCheck?.checked) localStorage.setItem('remembered_email', email);
    else localStorage.removeItem('remembered_email');
    showToast(`Bem-vindo, ${data.user.email}!`);
    setTimeout(() => window.location.href = 'index.html', 800);
}

// Convidado – cria usuário anônimo (temp)
async function guestLogin() {
    setLoading(guestBtn, true);
    const random = Math.random().toString(36).substring(2, 10);
    const guestEmail = `guest_${random}@temp.com`;
    const guestPassword = random + '!Abc123';
    const { data, error } = await supabase.auth.signUp({
        email: guestEmail,
        password: guestPassword,
        options: { data: { name: 'Convidado', isGuest: true } }
    });
    setLoading(guestBtn, false);
    if (error) {
        showToast('Erro no modo convidado, tente novamente', true);
        return;
    }
    // Auto-login após cadastro
    await supabase.auth.signInWithPassword({ email: guestEmail, password: guestPassword });
    showToast('Modo convidado ativado');
    window.location.href = 'index.html';
}

// Esqueci a senha
async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) showToast(error.message, true);
    else showToast('Email de recuperação enviado!');
}

// Registrar nova conta
async function signUp(email, senha) {
    const { data, error } = await supabase.auth.signUp({ email, password: senha });
    if (error) showToast(error.message, true);
    else showToast('Conta criada! Verifique seu email para confirmar.');
}

// Event listeners
loginBtn.addEventListener('click', () => performLogin(emailInput.value, senhaInput.value));
guestBtn.addEventListener('click', guestLogin);
if (togglePwdBtn) {
    togglePwdBtn.addEventListener('click', () => {
        const type = senhaInput.type === 'password' ? 'text' : 'password';
        senhaInput.type = type;
        togglePwdBtn.innerHTML = `<span class="material-icons-round">${type === 'password' ? 'visibility_off' : 'visibility'}</span>`;
    });
}
// Lembrar email
const remembered = localStorage.getItem('remembered_email');
if (remembered && emailInput) emailInput.value = remembered;

document.getElementById('forgot-password')?.addEventListener('click', (e) => {
    e.preventDefault();
    const email = prompt('Digite seu email para receber o link de redefinição:');
    if (email) resetPassword(email);
});
document.getElementById('signupLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    const email = prompt('Digite seu email para criar conta:');
    if (email) {
        const senha = prompt('Digite sua senha (mínimo 6 caracteres):');
        if (senha && senha.length >= 6) signUp(email, senha);
        else showToast('Senha deve ter pelo menos 6 caracteres', true);
    }
});
// Enter nos campos
[emailInput, senhaInput].forEach(input => {
    input?.addEventListener('keypress', (e) => { if (e.key === 'Enter') performLogin(emailInput.value, senhaInput.value); });
});
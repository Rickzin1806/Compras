// Simulação de usuários (depois integre com Firebase/Supabase)
const USERS_DB = [
    { email: "demo@lista.com", senha: "123456", name: "Usuário Demo" },
    { email: "ana@lista.com", senha: "abc123", name: "Ana" }
];

// Elementos DOM
const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('senha');
const loginBtn = document.getElementById('loginBtn');
const guestBtn = document.getElementById('guestBtn');
const toastMsg = document.getElementById('toast-message');
const togglePwdBtn = document.querySelector('.toggle-password');
const rememberCheck = document.getElementById('remember');

// Helpers
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

// Login real (mock)
async function performLogin(email, senha) {
    // Validação básica
    if (!email || !senha) {
        showToast('Preencha e-mail e senha', true);
        return false;
    }
    if (!email.includes('@')) {
        showToast('E-mail inválido', true);
        return false;
    }

    setLoading(loginBtn, true);
    
    // Simular chamada de rede
    return new Promise((resolve) => {
        setTimeout(() => {
            const user = USERS_DB.find(u => u.email === email && u.senha === senha);
            if (user) {
                // Salvar sessão
                const session = { email: user.email, name: user.name, isGuest: false };
                localStorage.setItem('shopping_session', JSON.stringify(session));
                if (rememberCheck.checked) {
                    localStorage.setItem('remembered_email', email);
                } else {
                    localStorage.removeItem('remembered_email');
                }
                showToast(`Bem-vindo, ${user.name}! Redirecionando...`);
                setTimeout(() => window.location.href = 'index.html', 800);
                resolve(true);
            } else {
                showToast('Credenciais inválidas. Tente demo@lista.com / 123456', true);
                setLoading(loginBtn, false);
                resolve(false);
            }
        }, 700);
    });
}

// Entrar como convidado
function guestLogin() {
    const guestSession = { email: `guest_${Date.now()}@temp.com`, name: 'Convidado', isGuest: true };
    localStorage.setItem('shopping_session', JSON.stringify(guestSession));
    showToast('Modo convidado ativado. Sua lista será local.');
    setTimeout(() => window.location.href = 'index.html', 500);
}

// Mostrar/esconder senha
if (togglePwdBtn) {
    togglePwdBtn.addEventListener('click', () => {
        const type = senhaInput.type === 'password' ? 'text' : 'password';
        senhaInput.type = type;
        togglePwdBtn.innerHTML = `<span class="material-icons-round">${type === 'password' ? 'visibility_off' : 'visibility'}</span>`;
    });
}

// Lembrar email
const remembered = localStorage.getItem('remembered_email');
if (remembered) {
    emailInput.value = remembered;
    rememberCheck.checked = true;
}

// Event listeners
loginBtn.addEventListener('click', () => performLogin(emailInput.value, senhaInput.value));
guestBtn.addEventListener('click', guestLogin);
document.querySelectorAll('#forgot-password, #signupLink').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('🚧 Funcionalidade em desenvolvimento. Use demo@lista.com / 123456', false);
    });
});

// Enter nos campos
[emailInput, senhaInput].forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performLogin(emailInput.value, senhaInput.value);
    });
});

// Validação inline visual
emailInput.addEventListener('input', () => {
    const isValid = emailInput.value.includes('@');
    emailInput.style.borderColor = isValid && emailInput.value ? '#2e7d32' : '#e0e0e0';
});
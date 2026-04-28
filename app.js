// App State
let itens = [];
let currentFilter = 'Todos';
let currentUser = null;
let sharedMembers = [];

// DOM Elements
const shoppingListEl = document.getElementById('shoppingList');
const inputItem = document.getElementById('inputItem');
const inputQtd = document.getElementById('inputQtd');
const inputCat = document.getElementById('inputCat');
const addBtn = document.getElementById('addBtn');
const filtersBar = document.getElementById('filtersBar');
const totalItemsSpan = document.getElementById('totalItems');
const completedItemsSpan = document.getElementById('completedItems');
const progressFill = document.getElementById('progressFill');
const userNameSpan = document.getElementById('userName');
const userEmailSpan = document.getElementById('userEmail');
const membersListEl = document.getElementById('membersList');
const toastMessage = document.getElementById('toastMessage');
const themeToggle = document.getElementById('themeToggle');
const menuToggle = document.getElementById('menuToggle');
const closeSidebar = document.getElementById('closeSidebar');
const sidebar = document.getElementById('sidebar');
const clearAllBtn = document.getElementById('clearAllBtn');
const exportBtn = document.getElementById('exportBtn');
const refreshBtn = document.getElementById('refreshBtn');
const inviteBtn = document.getElementById('inviteBtn');
const inviteModal = document.getElementById('inviteModal');

// Utility Functions
function showToast(msg, isError = false) {
    toastMessage.textContent = msg;
    toastMessage.classList.remove('hidden');
    if (isError) toastMessage.classList.add('error');
    else toastMessage.classList.remove('error');
    
    setTimeout(() => {
        toastMessage.classList.add('hidden');
    }, 3000);
}

function saveToLocalStorage() {
    localStorage.setItem('shopping_list', JSON.stringify(itens));
    localStorage.setItem('shared_members', JSON.stringify(sharedMembers));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('shopping_list');
    if (saved) itens = JSON.parse(saved);
    
    const savedMembers = localStorage.getItem('shared_members');
    if (savedMembers) sharedMembers = JSON.parse(savedMembers);
}

// User Session
function loadUserSession() {
    const session = localStorage.getItem('shopping_session');
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    
    const user = JSON.parse(session);
    currentUser = user;
    userNameSpan.textContent = user.name || user.email.split('@')[0];
    userEmailSpan.textContent = user.email;
    
    // Add current user to members if not exists
    if (!sharedMembers.find(m => m.email === user.email)) {
        sharedMembers.push({
            id: Date.now(),
            email: user.email,
            name: user.name || user.email.split('@')[0],
            isOwner: !user.isGuest
        });
        saveToLocalStorage();
    }
    
    return user;
}

// Render Functions
function renderFilters() {
    const categories = ['Todos', ...new Set(itens.map(i => i.categoria))];
    filtersBar.innerHTML = categories.map(cat => `
        <button class="filter-chip ${currentFilter === cat ? 'active' : ''}" data-filter="${cat}">
            ${cat}
        </button>
    `).join('');
    
    // Add event listeners to filters
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            renderFilters();
            renderShoppingList();
        });
    });
}

function renderShoppingList() {
    const filtered = currentFilter === 'Todos' 
        ? itens 
        : itens.filter(i => i.categoria === currentFilter);
    
    if (filtered.length === 0) {
        shoppingListEl.innerHTML = `
            <div class="loading-state">
                <span class="material-icons-round" style="font-size: 48px;">shopping_bag</span>
                <p>Sua lista está vazia</p>
                <small>Adicione itens para começar!</small>
            </div>
        `;
        return;
    }
    
    // Group by category
    const grouped = {};
    filtered.forEach(item => {
        if (!grouped[item.categoria]) grouped[item.categoria] = [];
        grouped[item.categoria].push(item);
    });
    
    shoppingListEl.innerHTML = Object.entries(grouped).map(([category, items]) => `
        <div class="category-group" data-category="${category}">
            <div class="category-title">
                <span>${getCategoryIcon(category)}</span>
                <span>${category}</span>
            </div>
            ${items.map(item => `
                <div class="item-card ${item.concluido ? 'completed' : ''}" data-id="${item.id}" draggable="true">
                    <div class="item-checkbox ${item.concluido ? 'checked' : ''}" onclick="toggleItem(${item.id})"></div>
                    <div class="item-content">
                        <div class="item-name">${escapeHtml(item.texto)}</div>
                        <div class="item-meta">
                            <span>Quantidade: ${item.qtd}</span>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="edit-btn" onclick="editItem(${item.id})" title="Editar">
                            <span class="material-icons-round">edit</span>
                        </button>
                        <button class="delete-btn" onclick="deleteItem(${item.id})" title="Remover">
                            <span class="material-icons-round">delete</span>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');
    
    updateStats();
    attachDragEvents();
}

function getCategoryIcon(category) {
    const icons = {
        'Geral': '📦',
        'Hortifruti': '🥬',
        'Laticínios': '🥛',
        'Carnes': '🥩',
        'Padaria': '🥖',
        'Bebidas': '🥤',
        'Limpeza': '🧼',
        'Higiene': '🧴'
    };
    return icons[category] || '📝';
}

function updateStats() {
    const total = itens.length;
    const completed = itens.filter(i => i.concluido).length;
    const progress = total === 0 ? 0 : (completed / total) * 100;
    
    totalItemsSpan.textContent = total;
    completedItemsSpan.textContent = completed;
    progressFill.style.width = `${progress}%`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// CRUD Operations
window.toggleItem = function(id) {
    const item = itens.find(i => i.id === id);
    if (item) {
        item.concluido = !item.concluido;
        saveToLocalStorage();
        renderShoppingList();
        showToast(item.concluido ? 'Item concluído! ✅' : 'Item reaberto! ↩️');
    }
};

window.deleteItem = function(id) {
    const item = itens.find(i => i.id === id);
    if (confirm(`Remover "${item.texto}" da lista?`)) {
        itens = itens.filter(i => i.id !== id);
        saveToLocalStorage();
        renderFilters();
        renderShoppingList();
        showToast('Item removido com sucesso!');
    }
};

window.editItem = function(id) {
    const item = itens.find(i => i.id === id);
    const newName = prompt('Editar item:', item.texto);
    if (newName && newName.trim()) {
        item.texto = newName.trim();
        saveToLocalStorage();
        renderShoppingList();
        showToast('Item atualizado!');
    }
};

function addItem() {
    const texto = inputItem.value.trim();
    if (!texto) {
        showToast('Digite o nome do item!', true);
        return;
    }
    
    const novoItem = {
        id: Date.now(),
        texto: texto,
        qtd: parseInt(inputQtd.value) || 1,
        categoria: inputCat.value,
        concluido: false,
        createdBy: currentUser.email,
        createdAt: new Date().toISOString()
    };
    
    itens.unshift(novoItem);
    saveToLocalStorage();
    
    inputItem.value = '';
    inputQtd.value = '1';
    
    renderFilters();
    renderShoppingList();
    showToast(`"${texto}" adicionado à lista! 🎉`);
    inputItem.focus();
}

function clearAllItems() {
    if (itens.length === 0) return;
    
    if (confirm('Tem certeza? Isso irá remover TODOS os itens da lista.')) {
        itens = [];
        saveToLocalStorage();
        renderFilters();
        renderShoppingList();
        showToast('Lista completamente limpa!');
    }
}

function exportList() {
    const data = {
        exportedAt: new Date().toISOString(),
        user: currentUser.email,
        items: itens,
        members: sharedMembers
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista-compras-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Lista exportada com sucesso! 📥');
}

// Drag and Drop
let draggedItem = null;

function attachDragEvents() {
    const items = document.querySelectorAll('.item-card');
    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedItem = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    if (draggedItem !== this) {
        const draggedId = parseInt(draggedItem.dataset.id);
        const targetId = parseInt(this.dataset.id);
        
        const draggedIndex = itens.findIndex(i => i.id === draggedId);
        const targetIndex = itens.findIndex(i => i.id === targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            const [movedItem] = itens.splice(draggedIndex, 1);
            itens.splice(targetIndex, 0, movedItem);
            saveToLocalStorage();
            renderShoppingList();
            showToast('Ordem atualizada! 🔄');
        }
    }
}

// Sharing simulation
function renderMembers() {
    membersListEl.innerHTML = sharedMembers.map(member => `
        <div class="member-chip">
            <span>👤</span>
            <span>${member.name}</span>
            ${member.isOwner ? '<small>(dono)</small>' : ''}
        </div>
    `).join('');
}

function generateShareLink() {
    const listId = Date.now();
    const shareData = {
        listId: listId,
        owner: currentUser.email,
        members: sharedMembers.map(m => m.email),
        createdAt: new Date().toISOString()
    };
    
    const fakeLink = `${window.location.origin}/shared/${listId}`;
    localStorage.setItem(`shared_list_${listId}`, JSON.stringify(shareData));
    
    showToast(`Link gerado! Compartilhe com seus amigos.`, false);
    
    // Show link in modal or copy to clipboard
    prompt('Compartilhe este link:', fakeLink);
}

// Theme Toggle
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<span class="material-icons-round">light_mode</span>';
    }
}

function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        themeToggle.innerHTML = '<span class="material-icons-round">dark_mode</span>';
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeToggle.innerHTML = '<span class="material-icons-round">light_mode</span>';
    }
}

// Event Listeners
addBtn.addEventListener('click', addItem);
inputItem.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addItem();
});

clearAllBtn.addEventListener('click', clearAllItems);
exportBtn.addEventListener('click', exportList);
refreshBtn.addEventListener('click', () => {
    renderShoppingList();
    showToast('Lista atualizada! 🔄');
});

themeToggle.addEventListener('click', toggleTheme);
menuToggle.addEventListener('click', () => sidebar.classList.add('open'));
closeSidebar.addEventListener('click', () => sidebar.classList.remove('open'));

inviteBtn.addEventListener('click', () => {
    inviteModal.classList.remove('hidden');
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => inviteModal.classList.add('hidden'));
});

document.getElementById('generateLinkBtn')?.addEventListener('click', () => {
    generateShareLink();
    inviteModal.classList.add('hidden');
});

document.getElementById('sendInviteBtn')?.addEventListener('click', () => {
    const email = document.getElementById('inviteEmail').value;
    if (email && email.includes('@')) {
        if (!sharedMembers.find(m => m.email === email)) {
            sharedMembers.push({
                id: Date.now(),
                email: email,
                name: email.split('@')[0],
                isOwner: false
            });
            saveToLocalStorage();
            renderMembers();
            showToast(`Convite enviado para ${email}! 📧`);
            inviteModal.classList.add('hidden');
        } else {
            showToast('Este usuário já está na lista!', true);
        }
    } else {
        showToast('E-mail inválido!', true);
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    if (confirm('Deseja sair da sua conta?')) {
        localStorage.removeItem('shopping_session');
        window.location.href = 'login.html';
    }
});

// Initialization
function init() {
    loadUserSession();
    loadFromLocalStorage();
    renderFilters();
    renderShoppingList();
    renderMembers();
    initTheme();
    
    // Simulate real-time updates (fake sharing)
    window.addEventListener('storage', (e) => {
        if (e.key === 'shopping_list' || e.key === 'shared_members') {
            loadFromLocalStorage();
            renderFilters();
            renderShoppingList();
            renderMembers();
            showToast('Lista atualizada por outro membro! 🔄');
        }
    });
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

// Start the app
init();
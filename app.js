import { supabase } from './supabaseClient.js';

// ==================== ESTADO GLOBAL ====================
let currentUser = null;
let currentListId = null;
let itens = [];
let currentFilter = 'Todos';
let currentSort = 'manual';   // manual, alfabetica, recente, prioridade
let sharedMembers = [];
let unsubscribeItems = null;
let recognition = null;
let notificationPermission = false;

// ==================== DOM ELEMENTOS ====================
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
const sortSelect = document.getElementById('sortSelect');
const voiceBtn = document.getElementById('voiceBtn');
const barcodeBtn = document.getElementById('barcodeBtn');
const notificationBtn = document.getElementById('notificationBtn');
const historyBtn = document.getElementById('historyBtn');
const historyModal = document.getElementById('historyModal');
const historyList = document.getElementById('historyList');
const chatGPTSuggestionBtn = document.getElementById('chatGPTSuggestionBtn');

// ==================== UTILITÁRIOS ====================
function showToast(msg, isError = false, duration = 3000) {
    toastMessage.textContent = msg;
    toastMessage.classList.remove('hidden');
    if (isError) toastMessage.classList.add('error');
    else toastMessage.classList.remove('error');
    setTimeout(() => toastMessage.classList.add('hidden'), duration);
}

// ==================== SUPABASE: AUTENTICAÇÃO E LISTA ====================
async function initUserAndList() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = user;
    userNameSpan.textContent = user.user_metadata?.name || user.email.split('@')[0];
    userEmailSpan.textContent = user.email;

    // Buscar ou criar lista pessoal
    let { data: lista, error } = await supabase
        .from('lists')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
    
    if (error || !lista) {
        const { data: newList, error: createError } = await supabase
            .from('lists')
            .insert({ owner_id: user.id, name: 'Minha Lista', members: [user.id] })
            .select()
            .single();
        if (createError) console.error(createError);
        else lista = newList;
    }
    currentListId = lista.id;
    
    // Inscrever para mudanças em tempo real nos itens
    if (unsubscribeItems) unsubscribeItems();
    const itemsSubscription = supabase
        .channel('items_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `list_id=eq.${currentListId}` }, () => {
            loadItemsFromDB();
        })
        .subscribe();
    
    // Carregar membros
    await loadMembersFromDB();
    // Carregar itens
    await loadItemsFromDB();
    // Atualizar last_active
    updateLastActive();
    setInterval(updateLastActive, 60000);
}

async function loadItemsFromDB() {
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('list_id', currentListId)
        .order('order', { ascending: true });
    if (error) console.error(error);
    else {
        itens = data.map(item => ({ ...item, id: item.id.toString() }));
        applySortAndRender();
        updateStats();
        checkCompletionConfetti();
    }
}

async function addItemToDB(item) {
    const { error } = await supabase.from('items').insert({
        list_id: currentListId,
        texto: item.texto,
        qtd: item.qtd,
        categoria: item.categoria,
        concluido: false,
        order: itens.length,
        created_by: currentUser.id,
        prioridade: item.prioridade || 0
    });
    if (error) showToast('Erro ao adicionar item', true);
    else loadItemsFromDB();
}

async function toggleItemDB(id, concluido) {
    const { error } = await supabase.from('items').update({ concluido }).eq('id', id);
    if (error) showToast('Erro ao atualizar', true);
}

async function deleteItemDB(id) {
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) showToast('Erro ao remover', true);
    else loadItemsFromDB();
}

async function updateItemDB(id, updates) {
    const { error } = await supabase.from('items').update(updates).eq('id', id);
    if (error) showToast('Erro ao editar', true);
}

async function reorderItemsDB(orderMap) {
    for (let { id, order } of orderMap) {
        await supabase.from('items').update({ order }).eq('id', id);
    }
    loadItemsFromDB();
}

async function loadMembersFromDB() {
    const { data: lista } = await supabase.from('lists').select('members').eq('id', currentListId).single();
    const memberIds = lista?.members || [currentUser.id];
    const { data: profiles } = await supabase.from('profiles').select('id, email, name').in('id', memberIds);
    sharedMembers = profiles || [];
    renderMembers();
}

async function updateLastActive() {
    await supabase.from('profiles').upsert({ id: currentUser.id, last_active: new Date() });
    // badge de ativos será atualizado em tempo real via subscription
}

// ==================== COMPARTILHAMENTO ATIVO (BADGE) ====================
async function updateActiveBadge() {
    const { data: lista } = await supabase.from('lists').select('members').eq('id', currentListId).single();
    const memberIds = lista.members;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: activeUsers } = await supabase
        .from('profiles')
        .select('id')
        .in('id', memberIds)
        .gte('last_active', fiveMinutesAgo);
    const activeCount = activeUsers?.length || 0;
    const badge = document.getElementById('activeBadge');
    if (badge) badge.textContent = `${activeCount} online`;
}
setInterval(updateActiveBadge, 30000);

// ==================== ORDENAÇÃO ALTERNATIVA ====================
function applySortAndRender() {
    let sorted = [...itens];
    switch (currentSort) {
        case 'alfabetica': sorted.sort((a,b) => a.texto.localeCompare(b.texto)); break;
        case 'recente': sorted.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)); break;
        case 'prioridade': sorted.sort((a,b) => (b.prioridade || 0) - (a.prioridade || 0)); break;
        default: sorted.sort((a,b) => (a.order || 0) - (b.order || 0));
    }
    renderShoppingList(sorted);
}

// ==================== HISTÓRICO ====================
async function saveCurrentListToHistory() {
    const snapshot = itens.map(i => ({ texto: i.texto, qtd: i.qtd, categoria: i.categoria, concluido: i.concluido }));
    await supabase.from('history').insert({
        user_id: currentUser.id,
        list_id: currentListId,
        snapshot: snapshot,
        created_at: new Date()
    });
}

async function loadHistory() {
    const { data } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    if (!historyList) return;
    historyList.innerHTML = '';
    data?.forEach(record => {
        const div = document.createElement('div');
        div.className = 'history-item';
        const date = new Date(record.created_at).toLocaleString();
        div.innerHTML = `<strong>${date}</strong> - ${record.snapshot.length} itens
                         <button onclick="restoreHistory('${record.id}')">Restaurar</button>`;
        historyList.appendChild(div);
    });
}

window.restoreHistory = async (historyId) => {
    const { data } = await supabase.from('history').select('snapshot').eq('id', historyId).single();
    if (data?.snapshot) {
        // Apagar itens atuais
        await supabase.from('items').delete().eq('list_id', currentListId);
        // Inserir do histórico
        for (let item of data.snapshot) {
            await supabase.from('items').insert({
                list_id: currentListId,
                texto: item.texto,
                qtd: item.qtd,
                categoria: item.categoria,
                concluido: false,
                order: 0
            });
        }
        showToast('Histórico restaurado!');
        loadItemsFromDB();
    }
};

// ==================== MODO DE VOZ ====================
function initVoice() {
    if (!('webkitSpeechRecognition' in window)) {
        showToast('Seu navegador não suporta reconhecimento de voz', true);
        return;
    }
    recognition = new webkitSpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.onresult = (event) => {
        const texto = event.results[0][0].transcript;
        inputItem.value = texto;
        addItem();
    };
    voiceBtn?.addEventListener('click', () => recognition.start());
}

// ==================== LEITURA DE CÓDIGO DE BARRAS ====================
async function scanBarcode() {
    if (!('BarcodeDetector' in window)) {
        showToast('BarcodeDetector não suportado', true);
        return;
    }
    try {
        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'code_128'] });
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scan = async () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0);
                const barcodes = await detector.detect(canvas);
                if (barcodes.length > 0) {
                    stream.getTracks().forEach(t => t.stop());
                    inputItem.value = `Produto ${barcodes[0].rawValue}`;
                    addItem();
                    showToast(`Código lido: ${barcodes[0].rawValue}`);
                } else setTimeout(scan, 500);
            } else setTimeout(scan, 100);
        };
        scan();
    } catch (err) {
        showToast('Erro na câmera: ' + err.message, true);
    }
}

// ==================== NOTIFICAÇÕES AGENDADAS ====================
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(perm => {
            notificationPermission = perm === 'granted';
            if (notificationPermission) showToast('Notificações ativadas!');
        });
    }
}
function scheduleReminder(hours = 1) {
    if (!notificationPermission) return;
    const reminderTime = new Date(Date.now() + hours * 60 * 60 * 1000);
    setTimeout(() => {
        new Notification('Lista de compras', { body: `Você tem ${itens.filter(i => !i.concluido).length} itens pendentes!` });
    }, reminderTime - Date.now());
    showToast(`Lembrete agendado para ${reminderTime.toLocaleTimeString()}`);
}
notificationBtn?.addEventListener('click', () => scheduleReminder(1));

// ==================== INTEGRAÇÃO CHATGPT ====================
async function getChatGPTSuggestion() {
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
        const key = prompt('Digite sua chave da OpenAI:');
        if (key) localStorage.setItem('openai_api_key', key);
        else return;
    }
    const promptText = `Sugira 3 itens de supermercado para a categoria: ${inputCat.value}. Responda APENAS um array JSON: [{"nome":"item","quantidade":1}]`;
    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: promptText }], temperature: 0.7 })
        });
        const data = await res.json();
        const suggestions = JSON.parse(data.choices[0].message.content);
        for (let sug of suggestions) {
            await addItemToDB({ texto: sug.nome, qtd: sug.quantidade, categoria: inputCat.value, prioridade: 0 });
        }
        showToast('Sugestões adicionadas!');
    } catch (err) {
        showToast('Erro na API do ChatGPT', true);
    }
}

// ==================== CONFETTI ====================
function triggerConfetti() {
    import('https://cdn.jsdelivr.net/npm/canvas-confetti@1').then(module => {
        module.default({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    });
}
function checkCompletionConfetti() {
    const total = itens.length;
    const completed = itens.filter(i => i.concluido).length;
    if (total > 0 && completed === total) triggerConfetti();
}

// ==================== CRUD (Wrappers para UI) ====================
window.toggleItem = (id) => {
    const item = itens.find(i => i.id == id);
    if (item) toggleItemDB(id, !item.concluido);
};
window.deleteItem = (id) => {
    if (confirm('Remover item?')) deleteItemDB(id);
};
window.editItem = (id) => {
    const item = itens.find(i => i.id == id);
    const novo = prompt('Editar item:', item.texto);
    if (novo && novo.trim()) updateItemDB(id, { texto: novo.trim() });
};
function addItem() {
    const texto = inputItem.value.trim();
    if (!texto) return showToast('Digite o item!', true);
    addItemToDB({
        texto,
        qtd: parseInt(inputQtd.value) || 1,
        categoria: inputCat.value,
        prioridade: 0
    });
    inputItem.value = '';
    inputQtd.value = '1';
}
async function clearAllItems() {
    if (itens.length === 0) return;
    if (confirm('Limpar TODA a lista?')) {
        await supabase.from('items').delete().eq('list_id', currentListId);
        loadItemsFromDB();
        showToast('Lista limpa!');
    }
}
function exportList() {
    const data = { exportedAt: new Date(), user: currentUser.email, items: itens, members: sharedMembers };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exportado!');
}
async function generateShareLink() {
    const { data } = await supabase.from('lists').select('id').eq('id', currentListId).single();
    const fakeLink = `${window.location.origin}/shared/${data.id}`;
    prompt('Link de convite (copie e envie):', fakeLink);
}
async function sendInvite(email) {
    const { data: user } = await supabase.from('profiles').select('id').eq('email', email).single();
    if (!user) return showToast('Usuário não encontrado', true);
    const { data: lista } = await supabase.from('lists').select('members').eq('id', currentListId).single();
    if (lista.members.includes(user.id)) return showToast('Já está na lista', true);
    const newMembers = [...lista.members, user.id];
    await supabase.from('lists').update({ members: newMembers }).eq('id', currentListId);
    loadMembersFromDB();
    showToast(`Convite enviado para ${email}`);
}

// ==================== RENDERIZAÇÃO ====================
function renderShoppingList(itemsToRender) {
    if (!shoppingListEl) return;
    if (itemsToRender.length === 0) {
        shoppingListEl.innerHTML = `<div class="loading-state"><span class="material-icons-round">shopping_bag</span><p>Lista vazia</p></div>`;
        return;
    }
    const grouped = {};
    itemsToRender.forEach(item => { if (!grouped[item.categoria]) grouped[item.categoria] = []; grouped[item.categoria].push(item); });
    shoppingListEl.innerHTML = Object.entries(grouped).map(([cat, items]) => `
        <div class="category-group">
            <div class="category-title"><span>${getCategoryIcon(cat)}</span><span>${cat}</span></div>
            ${items.map(item => `
                <div class="item-card ${item.concluido ? 'completed' : ''}" data-id="${item.id}" draggable="true">
                    <div class="item-checkbox ${item.concluido ? 'checked' : ''}" onclick="toggleItem(${item.id})"></div>
                    <div class="item-content"><div class="item-name">${escapeHtml(item.texto)}</div><div class="item-meta">Qtd: ${item.qtd}</div></div>
                    <div class="item-actions"><button onclick="editItem(${item.id})">✏️</button><button onclick="deleteItem(${item.id})">🗑️</button></div>
                </div>
            `).join('')}
        </div>
    `).join('');
    attachDragEvents();
}
function getCategoryIcon(cat) { return { Geral:'📦', Hortifruti:'🥬', Laticínios:'🥛', Carnes:'🥩', Padaria:'🥖', Bebidas:'🥤', Limpeza:'🧼', Higiene:'🧴' }[cat] || '📝'; }
function escapeHtml(str) { return str.replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }
function updateStats() { const total=itens.length, completed=itens.filter(i=>i.concluido).length, pct=total===0?0:(completed/total)*100; totalItemsSpan.textContent=total; completedItemsSpan.textContent=completed; progressFill.style.width=`${pct}%`; }
function renderFilters() { const cats=['Todos',...new Set(itens.map(i=>i.categoria))]; filtersBar.innerHTML=cats.map(c=>`<button class="filter-chip ${currentFilter===c?'active':''}" data-filter="${c}">${c}</button>`).join(''); document.querySelectorAll('.filter-chip').forEach(b=>b.addEventListener('click',()=>{currentFilter=b.dataset.filter; renderFilters(); applySortAndRender();})); }
function renderMembers() { membersListEl.innerHTML=sharedMembers.map(m=>`<div class="member-chip"><span>👤</span><span>${m.name||m.email}</span>${m.id===currentUser.id?' (dono)':''}</div>`).join(''); }
function attachDragEvents() { document.querySelectorAll('.item-card').forEach(el=>{ el.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',el.dataset.id);}); el.addEventListener('dragover',e=>e.preventDefault()); el.addEventListener('drop',async e=>{ e.preventDefault(); const draggedId=e.dataTransfer.getData('text/plain'); const targetId=el.dataset.id; if(draggedId===targetId) return; const draggedIndex=itens.findIndex(i=>i.id==draggedId); const targetIndex=itens.findIndex(i=>i.id==targetId); if(draggedIndex!==-1 && targetIndex!==-1){ const [moved]=itens.splice(draggedIndex,1); itens.splice(targetIndex,0,moved); const updates=itens.map((item,idx)=>({id:item.id,order:idx})); await reorderItemsDB(updates); loadItemsFromDB(); showToast('Ordem atualizada!'); } });}); }

// ==================== TEMA, ATALHOS, INICIAR ====================
function initTheme() { if(localStorage.getItem('theme')==='dark') document.body.setAttribute('data-theme','dark'); }
function toggleTheme() { const isDark=document.body.getAttribute('data-theme')==='dark'; if(isDark){ document.body.removeAttribute('data-theme'); localStorage.setItem('theme','light'); } else { document.body.setAttribute('data-theme','dark'); localStorage.setItem('theme','dark'); } }
themeToggle?.addEventListener('click',toggleTheme);
menuToggle?.addEventListener('click',()=>sidebar.classList.add('open'));
closeSidebar?.addEventListener('click',()=>sidebar.classList.remove('open'));
document.addEventListener('click',(e)=>{ if(window.innerWidth<=768 && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) sidebar.classList.remove('open'); });
document.addEventListener('keydown',(e)=>{ if(e.ctrlKey && e.key==='Enter') addItem(); });
inputItem.placeholder='Ex: Leite desnatado, Pão integral...';
addBtn.addEventListener('click',addItem);
inputItem.addEventListener('keypress',e=>{if(e.key==='Enter') addItem();});
clearAllBtn.addEventListener('click',clearAllItems);
exportBtn.addEventListener('click',exportList);
refreshBtn.addEventListener('click',()=>{loadItemsFromDB(); showToast('Atualizado!');});
inviteBtn.addEventListener('click',()=>inviteModal.classList.remove('hidden'));
document.querySelectorAll('.close-modal').forEach(btn=>btn.addEventListener('click',()=>inviteModal.classList.add('hidden')));
document.getElementById('generateLinkBtn')?.addEventListener('click',()=>{generateShareLink();inviteModal.classList.add('hidden');});
document.getElementById('sendInviteBtn')?.addEventListener('click',()=>{ const email=document.getElementById('inviteEmail')?.value; if(email) sendInvite(email); else showToast('Digite um email',true);});
sortSelect?.addEventListener('change',(e)=>{ currentSort=e.target.value; applySortAndRender(); });
historyBtn?.addEventListener('click',()=>{ if(historyModal) historyModal.classList.remove('hidden'); loadHistory(); });
chatGPTSuggestionBtn?.addEventListener('click',getChatGPTSuggestion);
barcodeBtn?.addEventListener('click',scanBarcode);
initVoice();
requestNotificationPermission();

// Inicialização
initTheme();
initUserAndList();
renderFilters();
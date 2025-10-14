// app.js - versão compatível com seu HTML atual (IDs: newListForm, listsContainer, newItemForm, itemsList, etc.)

// ------- FIREBASE CONFIG: cole suas credenciais aqui -------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  // ...
};
// -----------------------------------------------------------

let useFirebase = false;
let db = null;

// Inicializa Firebase se configurado
if (firebaseConfig && firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_")) {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    db.enablePersistence().catch(err => console.warn('Firestore persistence not enabled:', err));
    useFirebase = true;
    console.log('Firebase inicializado. Firestore pronto.');
  } catch (err) {
    console.warn('Erro ao inicializar Firebase:', err);
    useFirebase = false;
    db = null;
  }
} else {
  console.log('Firebase não configurado. Usando localStorage como fallback.');
}

// ---------- MODELO DE DADOS ----------
const LS_KEY = 'meta_cobertura_lists_v1';

let state = {
  lists: [],
  selectedListId: null
};

// ---------- UI elements (IDs conforme seu HTML) ----------
const listsContainer = document.getElementById('listsContainer');
const newListForm = document.getElementById('newListForm');
const newListTitle = document.getElementById('newListTitle');
const selectedListTitle = document.getElementById('selectedListTitle');
const editTitleInput = document.getElementById('editTitleInput');
const renameListBtn = document.getElementById('renameListBtn');
const deleteListBtn = document.getElementById('deleteListBtn');
const newItemForm = document.getElementById('newItemForm');
const newItemText = document.getElementById('newItemText');
const itemsList = document.getElementById('itemsList');
const completedList = document.getElementById('completedList');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const archiveCompletedBtn = document.getElementById('archiveCompletedBtn');
const deleteAllListsBtn = document.getElementById('deleteAllListsBtn'); // pode ser null se não existir
const noListSelected = document.getElementById('noListSelected');
const contadorEl = document.getElementById('contador');
const installBtn = document.getElementById('installBtn');

// ---------- Helpers ----------
function uid(prefix='id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}

function saveLocal() {
  localStorage.setItem(LS_KEY, JSON.stringify(state.lists));
}

function loadLocal() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
}

// ---------- Firebase sync ----------
async function saveToFirebase(list) {
  if (!useFirebase || !db) return;
  try { await db.collection('lists').doc(list.id).set(list); }
  catch (err) { console.warn('Erro salvar no Firestore:', err); }
}

async function deleteFromFirebase(listId) {
  if (!useFirebase || !db) return;
  try { await db.collection('lists').doc(listId).delete(); }
  catch (err) { console.warn('Erro deletar no Firestore:', err); }
}

async function loadAllFromFirebase() {
  if (!useFirebase || !db) return null;
  try {
    const snapshot = await db.collection('lists').orderBy('createdAt', 'desc').get();
    const arr = [];
    snapshot.forEach(doc => arr.push(doc.data()));
    return arr;
  } catch (err) {
    console.warn('Erro carregar do Firestore:', err);
    return null;
  }
}

// ---------- Core operations ----------
async function createList(title) {
  const list = {
    id: uid('list'),
    title: title.trim(),
    createdAt: Date.now(),
    items: []
  };
  state.lists.unshift(list);
  state.selectedListId = list.id;
  saveLocal();
  await saveToFirebase(list);
  render();
}

async function deleteList(listId) {
  state.lists = state.lists.filter(l => l.id !== listId);
  if (state.selectedListId === listId) state.selectedListId = state.lists.length ? state.lists[0].id : null;
  saveLocal();
  await deleteFromFirebase(listId);
  render();
}

async function addItemToList(listId, text) {
  const list = state.lists.find(l => l.id === listId);
  if (!list) return;
  const item = { id: uid('item'), text: text.trim(), completed: false, updatedAt: Date.now() };
  list.items.push(item);
  list.updatedAt = Date.now();
  saveLocal();
  await saveToFirebase(list);
  render();
}

async function updateItem(listId, itemId, updates) {
  const list = state.lists.find(l => l.id === listId);
  if (!list) return;
  const item = list.items.find(i => i.id === itemId);
  if (!item) return;
  Object.assign(item, updates);
  item.updatedAt = Date.now();
  saveLocal();
  await saveToFirebase(list);
  render();
}

async function toggleComplete(listId, itemId) {
  const list = state.lists.find(l => l.id === listId);
  if (!list) return;
  const item = list.items.find(i => i.id === itemId);
  if (!item) return;
  item.completed = !item.completed;
  item.updatedAt = Date.now();
  saveLocal();
  await saveToFirebase(list);
  render();
}

async function deleteAllCompleted(listId) {
  const list = state.lists.find(l => l.id === listId);
  if (!list) return;
  list.items = list.items.filter(i => !i.completed);
  list.updatedAt = Date.now();
  saveLocal();
  await saveToFirebase(list);
  render();
}

async function editListTitle(listId, newTitle) {
  const list = state.lists.find(l => l.id === listId);
  if (!list) return;
  list.title = newTitle.trim();
  list.updatedAt = Date.now();
  saveLocal();
  await saveToFirebase(list);
  render();
}

async function deleteAllLists() {
  const ids = state.lists.map(l => l.id);
  state.lists = [];
  state.selectedListId = null;
  saveLocal();
  if (useFirebase && db) {
    for (const id of ids) await deleteFromFirebase(id);
  }
  render();
}

// ---------- UI rendering ----------
function renderLists() {
  if (!listsContainer) return;
  listsContainer.innerHTML = '';
  state.lists.forEach(list => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <span class="list-title" data-id="${list.id}" style="cursor:pointer">${escapeHtml(list.title)}</span>
      <div class="btn-group btn-group-sm">
        <button class="btn btn-outline-light btn-select" data-id="${list.id}"><i class="bi bi-arrow-right"></i></button>
        <button class="btn btn-outline-secondary btn-edit" data-id="${list.id}"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-outline-danger btn-del" data-id="${list.id}"><i class="bi bi-trash"></i></button>
      </div>
    `;
    listsContainer.appendChild(li);
  });
}

function renderSelectedList() {
  const list = state.lists.find(l => l.id === state.selectedListId);
  if (!list) {
    if (selectedListTitle) selectedListTitle.textContent = 'Selecione ou crie uma lista';
    if (noListSelected) noListSelected.style.display = 'block';
    if (document.getElementById('itemsArea')) document.getElementById('itemsArea').style.display = 'none';
    return;
  }
  if (noListSelected) noListSelected.style.display = 'none';
  if (document.getElementById('itemsArea')) document.getElementById('itemsArea').style.display = 'block';
  if (selectedListTitle) selectedListTitle.textContent = list.title;

  // items
  if (itemsList) itemsList.innerHTML = '';
  if (completedList) completedList.innerHTML = '';

  const active = list.items.filter(i => !i.completed);
  const done = list.items.filter(i => i.completed);

  if (!active.length) {
    if (itemsList) itemsList.innerHTML = `<li class="list-group-item text-muted">Nenhuma meta nesta lista</li>`;
  } else {
    active.forEach(item => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex align-items-start justify-content-between';
      li.innerHTML = `
        <div class="form-check">
          <input class="form-check-input item-checkbox" type="checkbox" data-id="${item.id}">
          <label class="form-check-label" style="margin-left: .5rem;">
            <span class="item-text" data-id="${item.id}">${escapeHtml(item.text)}</span>
          </label>
        </div>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary btn-edit-item" data-id="${item.id}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-outline-danger btn-delete-item" data-id="${item.id}"><i class="bi bi-x"></i></button>
        </div>
      `;
      itemsList.appendChild(li);
    });
  }

  if (!done.length) {
    if (completedList) completedList.innerHTML = `<li class="list-group-item text-muted">Sem itens concluídos</li>`;
  } else {
    done.forEach(item => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex align-items-center justify-content-between completed-item';
      li.innerHTML = `
        <div>
          <i class="bi bi-check-circle-fill me-2"></i>
          <span class="item-text" data-id="${item.id}">${escapeHtml(item.text)}</span>
        </div>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary btn-uncheck" data-id="${item.id}"><i class="bi bi-arrow-counterclockwise"></i></button>
          <button class="btn btn-outline-danger btn-delete-item" data-id="${item.id}"><i class="bi bi-trash"></i></button>
        </div>
      `;
      completedList.appendChild(li);
    });
  }
}

function render() {
  renderLists();
  renderSelectedList();

  // highlight selected
  document.querySelectorAll('.btn-select').forEach(b => {
    const id = b.getAttribute('data-id');
    b.classList.toggle('active', id === state.selectedListId);
  });

  atualizarContador();
}

// ---------- Event listeners ----------
if (newListForm) {
  newListForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = newListTitle.value.trim();
    if (!title) return;
    await createList(title);
    newListTitle.value = '';
  });
}

if (listsContainer) {
  listsContainer.addEventListener('click', async (e) => {
    const target = e.target.closest('button, .list-title');
    if (!target) return;
    const id = target.getAttribute('data-id') || target.dataset.id;
    if (target.classList.contains('btn-select') || target.classList.contains('list-title')) {
      state.selectedListId = id;
      saveLocal();
      render();
    } else if (target.classList.contains('btn-edit')) {
      const list = state.lists.find(l => l.id === id);
      const newTitle = prompt('Novo título da lista', list.title);
      if (newTitle !== null && newTitle.trim()) await editListTitle(id, newTitle);
    } else if (target.classList.contains('btn-del')) {
      if (confirm('Confirma excluir esta lista?')) await deleteList(id);
    }
  });
}

if (renameListBtn) {
  renameListBtn.addEventListener('click', (e) => {
    const list = state.lists.find(l => l.id === state.selectedListId);
    if (!list) return alert('Selecione uma lista primeiro.');
    editTitleInput.value = list.title;
    selectedListTitle.classList.add('d-none');
    editTitleInput.classList.remove('d-none');
    editTitleInput.focus();
  });
}

if (editTitleInput) {
  editTitleInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const newTitle = editTitleInput.value.trim();
      if (newTitle) await editListTitle(state.selectedListId, newTitle);
      selectedListTitle.classList.remove('d-none');
      editTitleInput.classList.add('d-none');
    } else if (e.key === 'Escape') {
      selectedListTitle.classList.remove('d-none');
      editTitleInput.classList.add('d-none');
    }
  });
}

if (deleteListBtn) {
  deleteListBtn.addEventListener('click', async () => {
    if (!state.selectedListId) return alert('Selecione uma lista.');
    if (confirm('Excluir lista selecionada?')) await deleteList(state.selectedListId);
  });
}

if (newItemForm) {
  newItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.selectedListId) return alert('Selecione uma lista primeiro.');
    const text = newItemText.value.trim();
    if (!text) return;
    await addItemToList(state.selectedListId, text);
    newItemText.value = '';
  });
}

if (itemsList) {
  itemsList.addEventListener('click', async (e) => {
    const btn = e.target.closest('button, input, .item-text');
    if (!btn) return;
    if (btn.tagName === 'INPUT' && btn.classList.contains('item-checkbox')) {
      const id = btn.getAttribute('data-id');
      await toggleComplete(state.selectedListId, id);
    } else if (btn.classList.contains('btn-edit-item')) {
      const id = btn.getAttribute('data-id');
      const list = state.lists.find(l => l.id === state.selectedListId);
      const item = list.items.find(i => i.id === id);
      const newText = prompt('Editar item', item.text);
      if (newText !== null && newText.trim()) await updateItem(state.selectedListId, id, { text: newText.trim() });
    } else if (btn.classList.contains('btn-delete-item')) {
      const id = btn.getAttribute('data-id');
      if (confirm('Excluir este item?')) {
        const list = state.lists.find(l => l.id === state.selectedListId);
        list.items = list.items.filter(i => i.id !== id);
        saveLocal();
        await saveToFirebase(list);
        render();
      }
    }
  });
}

if (completedList) {
  completedList.addEventListener('click', async (e) => {
    const btn = e.target.closest('button, .item-text');
    if (!btn) return;
    if (btn.classList.contains('btn-uncheck')) {
      const id = btn.getAttribute('data-id');
      await toggleComplete(state.selectedListId, id);
    } else if (btn.classList.contains('btn-delete-item')) {
      const id = btn.getAttribute('data-id');
      if (confirm('Excluir este item concluído?')) {
        const list = state.lists.find(l => l.id === state.selectedListId);
        list.items = list.items.filter(i => i.id !== id);
        saveLocal();
        await saveToFirebase(list);
        render();
      }
    }
  });
}

if (clearCompletedBtn) {
  clearCompletedBtn.addEventListener('click', async () => {
    if (!state.selectedListId) return;
    if (confirm('Excluir todos os itens concluídos desta lista?')) await deleteAllCompleted(state.selectedListId);
  });
}

if (archiveCompletedBtn) {
  archiveCompletedBtn.addEventListener('click', () => {
    alert('Arquivar concluídos não implementado — como sugestão: exporte ou mova para coleção de histórico.');
  });
}

if (deleteAllListsBtn) {
  deleteAllListsBtn.addEventListener('click', async () => {
    if (confirm('Excluir todas as listas localmente (e no Firebase se habilitado)?')) await deleteAllLists();
  });
}

// ---------- CONTADOR DE ITENS (usa state) ----------
function atualizarContador() {
  if (!contadorEl) return;
  const list = state.lists.find(l => l.id === state.selectedListId);
  if (!list) {
    contadorEl.textContent = 'Concluídos: 0 | Restantes: 0';
    return;
  }
  const concluidos = list.items.filter(i => i.completed).length;
  const restantes = list.items.length - concluidos;
  contadorEl.textContent = `Concluídos: ${concluidos} | Restantes: ${restantes}`;
}

// ---------- PWA: INSTALL BUTTON ----------
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.classList.remove('d-none');
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted' && installBtn) installBtn.classList.add('d-none');
    deferredPrompt = null;
  });
}

// ---------- UTIL ----------
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ---------- INIT ----------
async function init() {
  // tenta carregar do Firebase (se estiver configurado)
  if (useFirebase && db) {
    const remote = await loadAllFromFirebase();
    if (remote && remote.length) {
      state.lists = remote.sort((a,b) => b.createdAt - a.createdAt);
      state.selectedListId = state.lists[0]?.id || null;
      saveLocal();
      render();
      return;
    }
  }

  // fallback para localStorage
  state.lists = loadLocal();
  state.selectedListId = state.lists.length ? state.lists[0].id : null;
  render();
}

init();

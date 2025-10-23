// =====================
// Variáveis globais
// =====================
let deferredPrompt;
let lists = JSON.parse(localStorage.getItem('lists')) || [];
let selectedListId = localStorage.getItem('selectedListId') || null;

// =====================
// Instalação PWA
// =====================
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('installBtn');
  installBtn.classList.remove('d-none');

  installBtn.addEventListener('click', async () => {
    installBtn.classList.add('d-none');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') console.log('Usuário instalou o app');
    deferredPrompt = null;
  });
});

// =====================
// Funções principais
// =====================
function saveData() {
  localStorage.setItem('lists', JSON.stringify(lists));
  localStorage.setItem('selectedListId', selectedListId);
}

function renderLists() {
  const container = document.getElementById('listsContainer');
  container.innerHTML = '';

  lists.forEach((list) => {
    const li = document.createElement('li');
    li.className = `list-group-item d-flex justify-content-between align-items-center ${
      list.id === selectedListId ? 'active' : ''
    }`;

    li.innerHTML = `
      <span>${list.title}</span>
      <div class="btn-group">
        <button class="btn btn-sm btn-light select-btn"><i class="bi bi-arrow-right"></i></button>
        <button class="btn btn-sm btn-danger delete-btn"><i class="bi bi-trash"></i></button>
      </div>
    `;

    // Selecionar lista
    li.querySelector('.select-btn').addEventListener('click', () => {
      selectedListId = list.id;
      saveData();
      render();
    });

    // Excluir lista
    li.querySelector('.delete-btn').addEventListener('click', () => {
      if (confirm('Excluir esta lista?')) {
        lists = lists.filter((l) => l.id !== list.id);
        if (selectedListId === list.id) selectedListId = null;
        saveData();
        render();
      }
    });

    container.appendChild(li);
  });
}

function renderItems() {
  const selectedList = lists.find((l) => l.id === selectedListId);
  const itemsList = document.getElementById('itemsList');
  const completedList = document.getElementById('completedList');
  const title = document.getElementById('selectedListTitle');
  const noListMsg = document.getElementById('noListSelected');
  const itemsArea = document.getElementById('itemsArea');
  const contador = document.getElementById('contador');

  if (!selectedList) {
    noListMsg.style.display = 'block';
    itemsArea.style.display = 'none';
    title.textContent = 'Selecione ou crie uma lista';
    contador.textContent = 'Concluídos: 0 | Restantes: 0';
    return;
  }

  noListMsg.style.display = 'none';
  itemsArea.style.display = 'block';
  title.textContent = selectedList.title;

  itemsList.innerHTML = '';
  completedList.innerHTML = '';

  let completedCount = 0;
  let remainingCount = 0;

  selectedList.items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = `list-group-item d-flex justify-content-between align-items-center ${
      item.done ? 'list-group-item-secondary text-decoration-line-through' : ''
    }`;
    li.innerHTML = `
      <span>${item.text}</span>
      <div class="btn-group">
        <button class="btn btn-sm btn-${item.done ? 'warning' : 'success'} toggle-btn">
          ${item.done ? '↩️' : '✅'}
        </button>
        <button class="btn btn-sm btn-danger delete-item-btn"><i class="bi bi-trash"></i></button>
      </div>
    `;

    li.querySelector('.toggle-btn').addEventListener('click', () => {
      item.done = !item.done;
      saveData();
      render();
    });

    li.querySelector('.delete-item-btn').addEventListener('click', () => {
      selectedList.items.splice(index, 1);
      saveData();
      render();
    });

    if (item.done) {
      completedList.appendChild(li);
      completedCount++;
    } else {
      itemsList.appendChild(li);
      remainingCount++;
    }
  });

  contador.textContent = `Concluídos: ${completedCount} | Restantes: ${remainingCount}`;
}

function render() {
  renderLists();
  renderItems();
}

// =====================
// Inicialização
// =====================
function init() {
  const newListForm = document.getElementById('newListForm');
  const newListTitle = document.getElementById('newListTitle');
  const newItemForm = document.getElementById('newItemForm');
  const newItemText = document.getElementById('newItemText');
  const renameBtn = document.getElementById('renameListBtn');
  const deleteListBtn = document.getElementById('deleteListBtn');
  const clearCompletedBtn = document.getElementById('clearCompletedBtn');

  // Criar nova lista
  newListForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = newListTitle.value.trim();
    if (!title) return;
    const newList = { id: Date.now().toString(), title, items: [] };
    lists.push(newList);
    selectedListId = newList.id;
    saveData();
    newListTitle.value = '';
    render();
  });

  // Adicionar novo item
  newItemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = newItemText.value.trim();
    if (!text || !selectedListId) return;
    const selectedList = lists.find((l) => l.id === selectedListId);
    selectedList.items.push({ text, done: false });
    saveData();
    newItemText.value = '';
    render();
  });

  // Renomear lista
  renameBtn.addEventListener('click', () => {
    const selectedList = lists.find((l) => l.id === selectedListId);
    if (!selectedList) return;
    const newTitle = prompt('Novo título da lista:', selectedList.title);
    if (newTitle && newTitle.trim()) {
      selectedList.title = newTitle.trim();
      saveData();
      render();
    }
  });

  // Excluir lista atual
  deleteListBtn.addEventListener('click', () => {
    if (selectedListId && confirm('Excluir esta lista?')) {
      lists = lists.filter((l) => l.id !== selectedListId);
      selectedListId = null;
      saveData();
      render();
    }
  });

  // Limpar concluídos
  clearCompletedBtn.addEventListener('click', () => {
    const selectedList = lists.find((l) => l.id === selectedListId);
    if (!selectedList) return;
    selectedList.items = selectedList.items.filter((i) => !i.done);
    saveData();
    render();
  });

  render();
}

// =====================
// Controle do botão de recolher listas
// =====================
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleListsBtn');
  const listsContent = document.getElementById('listsContent');
  let isCollapsed = false;

  if (toggleBtn && listsContent) {
    toggleBtn.addEventListener('click', () => {
      isCollapsed = !isCollapsed;

      if (isCollapsed) {
        listsContent.classList.add('collapsed');
        toggleBtn.innerHTML = '<i class="bi bi-chevron-down"></i>';
      } else {
        listsContent.classList.remove('collapsed');
        toggleBtn.innerHTML = '<i class="bi bi-chevron-up"></i>';
      }
    });
  }

  // Inicializa todo o app
  init();
});

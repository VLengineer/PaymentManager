/**
 * Компонент боковой панели (Sidebar) с фильтрами
 */

let sidebarOpen = true;

/**
 * Инициализирует боковую панель
 */
function initSidebar() {
    const toggleBtn = document.getElementById('btn-toggle-sidebar');
    const toggleBtnMobile = document.getElementById('btn-toggle-sidebar-mobile');
    const sidebar = document.querySelector('.sidebar');
    
    if (!sidebar) return;
    
    // Закрытие сайдбара (desktop)
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOpen = false;
        });
    }
    
    // Открытие/закрытие сайдбара (mobile)
    if (toggleBtnMobile) {
        toggleBtnMobile.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            sidebarOpen = !sidebarOpen;
        });
    }
    
    // Применение фильтров
    const applyBtn = document.getElementById('apply-filters');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyFilters);
    }
    
    // Сброс фильтров
    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetAllFilters);
    }
    
    // Debounce для поиска контрагента
    const contractorSearch = document.getElementById('contractor-search');
    if (contractorSearch) {
        let debounceTimer;
        contractorSearch.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                setFilter('contractorSearch', contractorSearch.value);
            }, 300);
        });
    }
}

/**
 * Заполняет чекбоксы проектов
 * @param {Array} projects - Список проектов
 */
function fillProjectCheckboxes(projects) {
    const container = document.getElementById('project-checkboxes');
    if (!container) return;
    
    const user = getCurrentUser();
    if (!user) return;
    
    container.innerHTML = '';
    
    projects.forEach(project => {
        // Для РП показываем только его проекты
        if (user.role === USER_ROLES.RP && user.allowed_project_ids) {
            if (!user.allowed_project_ids.includes(project.id)) {
                return;
            }
        }
        
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" value="${project.id}" ${user.role !== USER_ROLES.RP ? 'checked' : ''}>
            ${project.name || project.code}
        `;
        container.appendChild(label);
    });
}

/**
 * Заполняет выпадающий список статей
 * @param {Array} categories - Список категорий
 */
function fillCategories(categories) {
    const select = document.getElementById('category-filter');
    if (!select) return;
    
    select.innerHTML = '';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

/**
 * Применяет фильтры
 */
function applyFilters() {
    const periodType = document.getElementById('period-type').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const contractorSearch = document.getElementById('contractor-search').value;
    
    // Собираем выбранные проекты
    const projectIds = [];
    document.querySelectorAll('#project-checkboxes input[type="checkbox"]:checked').forEach(cb => {
        projectIds.push(parseInt(cb.value));
    });
    
    // Собираем выбранные категории
    const categoryIds = [];
    document.querySelectorAll('#category-filter option:checked').forEach(opt => {
        categoryIds.push(parseInt(opt.value));
    });
    
    // Обновляем состояние
    setFilter('periodType', periodType);
    setFilter('dateFrom', dateFrom);
    setFilter('dateTo', dateTo);
    setFilter('projectIds', projectIds);
    setFilter('categoryIds', categoryIds);
    setFilter('contractorSearch', contractorSearch);
    
    // Перезагружаем матрицу
    if (typeof loadMatrixData === 'function') {
        loadMatrixData();
    }
    
    // Закрываем сайдбар на мобильных
    if (window.innerWidth <= 1366) {
        document.querySelector('.sidebar').classList.remove('active');
    }
    
    showToast('Фильтры применены', 'success');
}

/**
 * Сбрасывает все фильтры
 */
function resetAllFilters() {
    resetFilters();
    
    // Сбрасываем UI элементы
    document.getElementById('period-type').value = 'week';
    document.getElementById('date-from').value = '';
    document.getElementById('date-to').value = '';
    document.getElementById('contractor-search').value = '';
    
    // Сбрасываем чекбоксы проектов
    document.querySelectorAll('#project-checkboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });
    
    // Сбрасываем выбор категорий
    document.querySelectorAll('#category-filter option').forEach(opt => {
        opt.selected = false;
    });
    
    // Перезагружаем матрицу
    if (typeof loadMatrixData === 'function') {
        loadMatrixData();
    }
    
    showToast('Фильтры сброшены', 'info');
}

/**
 * Инициализация при загрузке
 */
document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
});

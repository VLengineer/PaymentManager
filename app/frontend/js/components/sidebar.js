/**
 * Модуль управления сайдбаром (панель фильтров)
 * @module sidebar
 */

import { updateFilters, resetFilters, getState, setProjects, setCategories } from '../state.js';
import { getProjects, getCategories } from '../api.js';
import { debounce } from '../utils/formatters.js';
import { canViewProject } from '../state.js';

/**
 * Инициализировать сайдбар
 */
async function initSidebar() {
  await loadDictionaries();
  renderProjectCheckboxes();
  renderCategorySelect();
  setupEventListeners();
}

/**
 * Загрузить справочники
 */
async function loadDictionaries() {
  try {
    const [projects, categories] = await Promise.all([
      getProjects(),
      getCategories()
    ]);
    
    setProjects(projects || []);
    setCategories(categories || []);
  } catch (error) {
    console.error('Failed to load dictionaries:', error);
  }
}

/**
 * Отрисовать чекбоксы проектов
 */
function renderProjectCheckboxes() {
  const container = document.getElementById('project-checkboxes');
  if (!container) return;
  
  const state = getState();
  const user = state.user;
  const selectedIds = state.filters.project_ids || [];
  
  // Фильтруем проекты по правам доступа
  const visibleProjects = state.projects.filter(p => {
    if (!user) return false;
    if (user.role === 'ADMIN' || user.role === 'FIN_DIRECTOR') return true;
    if (user.role === 'RP') return user.allowed_project_ids?.includes(p.id);
    return false;
  });
  
  container.innerHTML = visibleProjects.map(project => `
    <label>
      <input 
        type="checkbox" 
        value="${project.id}" 
        ${selectedIds.includes(project.id) ? 'checked' : ''}
        data-project-name="${project.name}"
      />
      ${sanitizeString(project.name)}
    </label>
  `).join('');
}

/**
 * Отрисовать селект статей
 */
function renderCategorySelect() {
  const select = document.getElementById('category-filter');
  if (!select) return;
  
  const state = getState();
  const selectedIds = state.filters.category_ids || [];
  
  select.innerHTML = state.categories.map(cat => `
    <option value="${cat.id}" ${selectedIds.includes(cat.id) ? 'selected' : ''}>
      ${sanitizeString(cat.name)}
    </option>
  `).join('');
}

/**
 * Настроить обработчики событий
 */
function setupEventListeners() {
  // Период тип
  const periodTypeSelect = document.getElementById('period-type');
  if (periodTypeSelect) {
    periodTypeSelect.addEventListener('change', (e) => {
      updateFilters({ period_type: e.target.value });
      onFiltersChanged();
    });
  }
  
  // Даты
  const dateFromInput = document.getElementById('date-from');
  const dateToInput = document.getElementById('date-to');
  
  if (dateFromInput) {
    dateFromInput.addEventListener('change', debounce(() => {
      updateFilters({ date_from: dateFromInput.value });
      onFiltersChanged();
    }, 300));
  }
  
  if (dateToInput) {
    dateToInput.addEventListener('change', debounce(() => {
      updateFilters({ date_to: dateToInput.value });
      onFiltersChanged();
    }, 300));
  }
  
  // Проекты
  const projectContainer = document.getElementById('project-checkboxes');
  if (projectContainer) {
    projectContainer.addEventListener('change', debounce(() => {
      const checkedBoxes = projectContainer.querySelectorAll('input[type="checkbox"]:checked');
      const projectIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
      updateFilters({ project_ids: projectIds });
      onFiltersChanged();
    }, 300));
  }
  
  // Статьи
  const categorySelect = document.getElementById('category-filter');
  if (categorySelect) {
    categorySelect.addEventListener('change', debounce(() => {
      const selectedOptions = Array.from(categorySelect.selectedOptions);
      const categoryIds = selectedOptions.map(opt => parseInt(opt.value));
      updateFilters({ category_ids: categoryIds });
      onFiltersChanged();
    }, 300));
  }
  
  // Поиск контрагента
  const contractorSearch = document.getElementById('contractor-search');
  if (contractorSearch) {
    contractorSearch.addEventListener('input', debounce((e) => {
      updateFilters({ contractor_search: e.target.value });
      onFiltersChanged();
    }, 300));
  }
  
  // Кнопка применить
  const applyBtn = document.getElementById('apply-filters');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      applyFilters();
    });
  }
  
  // Кнопка сбросить
  const resetBtn = document.getElementById('reset-filters');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetAllFilters();
    });
  }
}

/**
 * Применить фильтры
 */
function applyFilters() {
  // Собираем текущие значения из UI
  const periodType = document.getElementById('period-type')?.value || 'week';
  const dateFrom = document.getElementById('date-from')?.value || null;
  const dateTo = document.getElementById('date-to')?.value || null;
  
  const projectCheckboxes = document.querySelectorAll('#project-checkboxes input[type="checkbox"]:checked');
  const projectIds = Array.from(projectCheckboxes).map(cb => parseInt(cb.value));
  
  const categorySelect = document.getElementById('category-filter');
  const categoryIds = categorySelect ? Array.from(categorySelect.selectedOptions).map(opt => parseInt(opt.value)) : [];
  
  const contractorSearch = document.getElementById('contractor-search')?.value || '';
  
  updateFilters({
    period_type: periodType,
    date_from: dateFrom,
    date_to: dateTo,
    project_ids: projectIds,
    category_ids: categoryIds,
    contractor_search: contractorSearch,
  });
  
  onFiltersChanged();
  showToast('Фильтры применены', 'success');
}

/**
 * Сбросить все фильтры
 */
function resetAllFilters() {
  resetFilters();
  
  // Сброс UI
  const periodTypeSelect = document.getElementById('period-type');
  if (periodTypeSelect) periodTypeSelect.value = 'week';
  
  const dateFromInput = document.getElementById('date-from');
  if (dateFromInput) dateFromInput.value = '';
  
  const dateToInput = document.getElementById('date-to');
  if (dateToInput) dateToInput.value = '';
  
  const projectCheckboxes = document.querySelectorAll('#project-checkboxes input[type="checkbox"]');
  projectCheckboxes.forEach(cb => cb.checked = false);
  
  const categorySelect = document.getElementById('category-filter');
  if (categorySelect) {
    categorySelect.selectedIndex = -1;
  }
  
  const contractorSearch = document.getElementById('contractor-search');
  if (contractorSearch) contractorSearch.value = '';
  
  onFiltersChanged();
  showToast('Фильтры сброшены', 'info');
}

/**
 * Callback при изменении фильтров
 */
const onFiltersChanged = debounce(() => {
  // Диспатчим событие для обновления матрицы
  window.dispatchEvent(new CustomEvent('filters-changed', {
    detail: getState().filters
  }));
}, 300);

/**
 * Обновить UI сайдбара из состояния
 */
function updateSidebarFromState() {
  const state = getState();
  const filters = state.filters;
  
  if (filters.period_type) {
    const periodTypeSelect = document.getElementById('period-type');
    if (periodTypeSelect) periodTypeSelect.value = filters.period_type;
  }
  
  if (filters.date_from) {
    const dateFromInput = document.getElementById('date-from');
    if (dateFromInput) dateFromInput.value = filters.date_from;
  }
  
  if (filters.date_to) {
    const dateToInput = document.getElementById('date-to');
    if (dateToInput) dateToInput.value = filters.date_to;
  }
  
  if (filters.contractor_search) {
    const contractorSearch = document.getElementById('contractor-search');
    if (contractorSearch) contractorSearch.value = filters.contractor_search;
  }
}

/**
 * Санитизация строки
 * @param {string} str
 */
function sanitizeString(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Показать toast уведомление
 */
function showToast(message, type = 'info') {
  // Простая реализация, будет переопределена в main.js
  console.log(`[${type}] ${message}`);
}

export {
  initSidebar,
  applyFilters,
  resetAllFilters,
  updateSidebarFromState,
};

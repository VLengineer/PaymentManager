/**
 * Модуль управления состоянием приложения
 * @module state
 */

// Глобальное состояние
const state = {
  /** @type {Object|null} */
  user: null,
  
  /** @type {string} */
  periodType: 'week',
  
  /** @type {Object} */
  filters: {
    project_ids: [],
    date_from: null,
    date_to: null,
    category_ids: [],
    contractor_search: '',
    period_type: 'week',
  },
  
  /** @type {Array} */
  projects: [],
  
  /** @type {Array} */
  contractors: [],
  
  /** @type {Array} */
  categories: [],
  
  /** @type {Object|null} */
  matrixData: null,
  
  /** @type {boolean} */
  isLoading: false,
};

/**
 * Инициализировать состояние из sessionStorage
 */
function initState() {
  const userInfo = sessionStorage.getItem('user_info');
  if (userInfo) {
    try {
      state.user = JSON.parse(userInfo);
    } catch (e) {
      console.error('Failed to parse user_info from sessionStorage');
    }
  }
}

/**
 * Установить пользователя
 * @param {Object} user - Данные пользователя
 */
function setUser(user) {
  state.user = user;
  sessionStorage.setItem('user_info', JSON.stringify(user));
}

/**
 * Очистить данные пользователя
 */
function clearUser() {
  state.user = null;
  sessionStorage.removeItem('user_info');
}

/**
 * Получить текущего пользователя
 * @returns {Object|null}
 */
function getUser() {
  return state.user;
}

/**
 * Проверить может ли пользователь редактировать платеж
 * @param {Object} payment - Данные платежа
 * @returns {boolean}
 */
function canEditPayment(payment) {
  if (!state.user) return false;
  
  // Оплаченные платежи нельзя редактировать
  if (payment.status === 'PAID') return false;
  
  // Заблокированные периоды нельзя редактировать
  if (payment.is_locked) return false;
  
  // Финдир может редактировать всё
  if (state.user.role === 'FIN_DIRECTOR') return true;
  
  // Админ может редактировать всё
  if (state.user.role === 'ADMIN') return true;
  
  // РП может редактировать только свои проекты
  if (state.user.role === 'RP') {
    return state.user.allowed_project_ids?.includes(payment.project_id);
  }
  
  return false;
}

/**
 * Проверить может ли пользователь видеть проект
 * @param {number} projectId - ID проекта
 * @returns {boolean}
 */
function canViewProject(projectId) {
  if (!state.user) return false;
  
  // Админ и Финдир видят все проекты
  if (state.user.role === 'ADMIN' || state.user.role === 'FIN_DIRECTOR') {
    return true;
  }
  
  // РП видит только свои проекты
  if (state.user.role === 'RP') {
    return state.user.allowed_project_ids?.includes(projectId);
  }
  
  return false;
}

/**
 * Установить тип периода
 * @param {string} type - 'week' | 'month' | 'quarter'
 */
function setPeriodType(type) {
  state.periodType = type;
  state.filters.period_type = type;
}

/**
 * Обновить фильтры
 * @param {Object} newFilters - Новые значения фильтров
 */
function updateFilters(newFilters) {
  state.filters = { ...state.filters, ...newFilters };
}

/**
 * Сбросить фильтры к значениям по умолчанию
 */
function resetFilters() {
  state.filters = {
    project_ids: [],
    date_from: null,
    date_to: null,
    category_ids: [],
    contractor_search: '',
    period_type: state.periodType,
  };
}

/**
 * Установить справочник проектов
 * @param {Array} projects
 */
function setProjects(projects) {
  state.projects = projects;
}

/**
 * Установить справочник контрагентов
 * @param {Array} contractors
 */
function setContractors(contractors) {
  state.contractors = contractors;
}

/**
 * Установить справочник статей
 * @param {Array} categories
 */
function setCategories(categories) {
  state.categories = categories;
}

/**
 * Установить данные матрицы
 * @param {Object} matrixData
 */
function setMatrixData(matrixData) {
  state.matrixData = matrixData;
}

/**
 * Установить индикатор загрузки
 * @param {boolean} isLoading
 */
function setLoading(isLoading) {
  state.isLoading = isLoading;
}

/**
 * Получить текущее состояние
 * @returns {Object}
 */
function getState() {
  return { ...state };
}

export {
  state,
  initState,
  setUser,
  clearUser,
  getUser,
  canEditPayment,
  canViewProject,
  setPeriodType,
  updateFilters,
  resetFilters,
  setProjects,
  setContractors,
  setCategories,
  setMatrixData,
  setLoading,
  getState,
};

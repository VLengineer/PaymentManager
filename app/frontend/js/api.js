/**
 * API модуль для всех fetch-запросов к бэкенду
 * @module api
 */

const API_BASE_URL = '/api';

/**
 * Получить JWT токен из sessionStorage
 * @returns {string|null}
 */
function getAuthToken() {
  return sessionStorage.getItem('jwt_token');
}

/**
 * Выполнить HTTP запрос с авторизацией
 * @param {string} url - URL endpoint
 * @param {RequestInit} options - Опции fetch
 * @returns {Promise<any>}
 */
async function apiRequest(url, options = {}) {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired or invalid
      sessionStorage.removeItem('jwt_token');
      sessionStorage.removeItem('user_info');
      window.location.href = '/login.html';
      throw new Error('Unauthorized');
    }

    if (response.status === 403) {
      showToast('Недостаточно прав для выполнения действия', 'error');
      throw new Error('Forbidden');
    }

    if (response.status === 409) {
      showToast('Платеж уже оплачен и заблокирован', 'warning');
      throw new Error('Conflict');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return null;
  } catch (error) {
    console.error('API Request failed:', error);
    if (error.message !== 'Unauthorized' && error.message !== 'Forbidden' && error.message !== 'Conflict') {
      showToast('Ошибка сервера, попробуйте позже', 'error');
    }
    throw error;
  }
}

// ==================== AUTH ====================

/**
 * Логин пользователя
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{access_token: string, user: object}>}
 */
async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username,
      password,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Неверный логин или пароль');
    }
    throw new Error('Ошибка аутентификации');
  }

  const data = await response.json();
  return data;
}

/**
 * Logout пользователя
 */
function logout() {
  sessionStorage.removeItem('jwt_token');
  sessionStorage.removeItem('user_info');
  window.location.href = '/login.html';
}

// ==================== CALENDAR ====================

/**
 * Получить данные матрицы платежного календаря
 * @param {Object} filters - Фильтры
 * @returns {Promise<Object>}
 */
async function getCalendarMatrix(filters = {}) {
  const params = new URLSearchParams();
  
  if (filters.project_ids?.length) {
    filters.project_ids.forEach(id => params.append('project_ids[]', id));
  }
  
  if (filters.date_from) {
    params.append('date_from', filters.date_from);
  }
  
  if (filters.date_to) {
    params.append('date_to', filters.date_to);
  }
  
  if (filters.category_ids?.length) {
    filters.category_ids.forEach(id => params.append('category_ids[]', id));
  }
  
  if (filters.contractor_search) {
    params.append('contractor_search', filters.contractor_search);
  }

  if (filters.period_type) {
    params.append('period_type', filters.period_type);
  }

  return await apiRequest(`/calendar/matrix?${params.toString()}`);
}

/**
 * Создать новый план платежа
 * @param {Object} paymentData - Данные платежа
 * @returns {Promise<Object>}
 */
async function createPaymentPlan(paymentData) {
  return await apiRequest('/calendar/plan', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
}

/**
 * Редактировать платеж (только DRAFT)
 * @param {number} paymentId - ID платежа
 * @param {Object} paymentData - Новые данные
 * @returns {Promise<Object>}
 */
async function updatePayment(paymentId, paymentData) {
  return await apiRequest(`/calendar/payment/${paymentId}`, {
    method: 'PATCH',
    body: JSON.stringify(paymentData),
  });
}

/**
 * Удалить платеж (только DRAFT)
 * @param {number} paymentId - ID платежа
 * @returns {Promise<void>}
 */
async function deletePayment(paymentId) {
  return await apiRequest(`/calendar/payment/${paymentId}`, {
    method: 'DELETE',
  });
}

/**
 * Зафиксировать факт оплаты (только Финдир)
 * @param {Object} factData - Данные факта оплаты
 * @returns {Promise<Object>}
 */
async function fixPaymentFact(factData) {
  return await apiRequest('/calendar/fact', {
    method: 'PATCH',
    body: JSON.stringify(factData),
  });
}

/**
 * Перенести остаток платежа
 * @param {Object} rolloverData - Данные переноса
 * @returns {Promise<Object>}
 */
async function rolloverPayment(rolloverData) {
  return await apiRequest('/calendar/rollover', {
    method: 'POST',
    body: JSON.stringify(rolloverData),
  });
}

/**
 * Закрыть период (только Финдир)
 * @param {string} period - Период для закрытия
 * @returns {Promise<Object>}
 */
async function lockPeriod(period) {
  return await apiRequest('/calendar/lock-period', {
    method: 'POST',
    body: JSON.stringify({ period }),
  });
}

// ==================== DICTIONARIES ====================

/**
 * Получить справочник проектов (ЦФО)
 * @returns {Promise<Array>}
 */
async function getProjects() {
  return await apiRequest('/dictionaries/projects');
}

/**
 * Получить справочник контрагентов
 * @returns {Promise<Array>}
 */
async function getContractors() {
  return await apiRequest('/dictionaries/contractors');
}

/**
 * Получить справочник статей бюджета
 * @returns {Promise<Array>}
 */
async function getCategories() {
  return await apiRequest('/dictionaries/categories');
}

// ==================== REPORTS ====================

/**
 * Получить сводные данные для отчетов
 * @returns {Promise<Object>}
 */
async function getReportsSummary() {
  return await apiRequest('/reports/summary');
}

// ==================== ADMIN ====================

/**
 * Получить список пользователей (только Админ)
 * @returns {Promise<Array>}
 */
async function getUsers() {
  return await apiRequest('/admin/users');
}

/**
 * Обновить маппинг пользователь-проект (только Админ)
 * @param {number} userId - ID пользователя
 * @param {Array<number>} projectIds - IDs проектов
 * @returns {Promise<Object>}
 */
async function updateUserProjects(userId, projectIds) {
  return await apiRequest(`/admin/users/${userId}/projects`, {
    method: 'PUT',
    body: JSON.stringify({ project_ids: projectIds }),
  });
}

// Export all functions
export {
  // Auth
  login,
  logout,
  getAuthToken,
  
  // Calendar
  getCalendarMatrix,
  createPaymentPlan,
  updatePayment,
  deletePayment,
  fixPaymentFact,
  rolloverPayment,
  lockPeriod,
  
  // Dictionaries
  getProjects,
  getContractors,
  getCategories,
  
  // Reports
  getReportsSummary,
  
  // Admin
  getUsers,
  updateUserProjects,
  
  // Utils
  apiRequest,
};

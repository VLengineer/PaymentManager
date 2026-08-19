/**
 * API клиент для взаимодействия с бэкендом
 * Все запросы через fetch с заголовком Authorization: Bearer <JWT>
 */

const API_BASE_URL = '/api';

/**
 * Получает JWT токен из sessionStorage
 * @returns {string|null} Токен или null
 */
function getAuthToken() {
    return sessionStorage.getItem('jwt_token');
}

/**
 * Выполняет HTTP запрос к API
 * @param {string} endpoint - URL endpoint
 * @param {Object} options - Опции fetch
 * @returns {Promise<any>} Ответ сервера
 */
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
        ...options,
        headers
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        // Обработка 401 Unauthorized
        if (response.status === 401) {
            sessionStorage.removeItem('jwt_token');
            sessionStorage.removeItem('user_data');
            window.location.href = 'login.html';
            throw new Error('Unauthorized');
        }
        
        // Обработка 403 Forbidden
        if (response.status === 403) {
            showToast('Недостаточно прав для выполнения операции', 'error');
            throw new Error('Forbidden');
        }
        
        // Обработка ошибок сервера
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        
        // Пустой ответ (204 No Content)
        if (response.status === 204) {
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * GET запрос
 * @param {string} endpoint - URL endpoint
 * @param {Object} params - Query параметры
 * @returns {Promise<any>}
 */
async function apiGet(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return apiRequest(url, { method: 'GET' });
}

/**
 * POST запрос
 * @param {string} endpoint - URL endpoint
 * @param {Object} data - Данные запроса
 * @returns {Promise<any>}
 */
async function apiPost(endpoint, data = {}) {
    return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * PATCH запрос
 * @param {string} endpoint - URL endpoint
 * @param {Object} data - Данные запроса
 * @returns {Promise<any>}
 */
async function apiPatch(endpoint, data = {}) {
    return apiRequest(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(data)
    });
}

/**
 * PUT запрос
 * @param {string} endpoint - URL endpoint
 * @param {Object} data - Данные запроса
 * @returns {Promise<any>}
 */
async function apiPut(endpoint, data = {}) {
    return apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

/**
 * DELETE запрос
 * @param {string} endpoint - URL endpoint
 * @returns {Promise<any>}
 */
async function apiDelete(endpoint) {
    return apiRequest(endpoint, { method: 'DELETE' });
}

// ==================== Auth API ====================

/**
 * Логин пользователя
 * @param {string} username - Логин
 * @param {string} password - Пароль
 * @returns {Promise<{token: string, user: Object}>}
 */
async function login(username, password) {
    const response = await apiPost('/auth/login', { username, password });
    
    if (response.token) {
        sessionStorage.setItem('jwt_token', response.token);
        sessionStorage.setItem('user_data', JSON.stringify(response.user));
    }
    
    return response;
}

/**
 * Логаут пользователя
 */
function logout() {
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem('user_data');
    window.location.href = 'login.html';
}

// ==================== Calendar API ====================

/**
 * Получение данных матрицы платежей
 * @param {Object} filters - Фильтры
 * @returns {Promise<Object>}
 */
async function getMatrixData(filters = {}) {
    return apiGet('/calendar/matrix', filters);
}

/**
 * Создание плана платежа
 * @param {Object} paymentData - Данные платежа
 * @returns {Promise<Object>}
 */
async function createPayment(paymentData) {
    return apiPost('/calendar/plan', paymentData);
}

/**
 * Редактирование платежа (только DRAFT)
 * @param {number} paymentId - ID платежа
 * @param {Object} paymentData - Данные платежа
 * @returns {Promise<Object>}
 */
async function updatePayment(paymentId, paymentData) {
    return apiPatch(`/calendar/payment/${paymentId}`, paymentData);
}

/**
 * Удаление платежа (только DRAFT)
 * @param {number} paymentId - ID платежа
 * @returns {Promise<void>}
 */
async function deletePayment(paymentId) {
    return apiDelete(`/calendar/payment/${paymentId}`);
}

/**
 * Фиксация факта оплаты (только Финдир)
 * @param {Object} factData - Данные факта
 * @returns {Promise<Object>}
 */
async function fixFact(factData) {
    return apiPatch('/calendar/fact', factData);
}

/**
 * Перенос остатка
 * @param {Object} rolloverData - Данные переноса
 * @returns {Promise<Object>}
 */
async function rolloverPayment(rolloverData) {
    return apiPost('/calendar/rollover', rolloverData);
}

/**
 * Закрытие периода (только Финдир)
 * @param {string} period - Период (месяц)
 * @returns {Promise<Object>}
 */
async function lockPeriod(period) {
    return apiPost('/calendar/lock-period', { period });
}

// ==================== Dictionaries API ====================

/**
 * Получение справочника проектов
 * @returns {Promise<Array>}
 */
async function getProjects() {
    return apiGet('/dictionaries/projects');
}

/**
 * Получение справочника контрагентов
 * @returns {Promise<Array>}
 */
async function getContractors() {
    return apiGet('/dictionaries/contractors');
}

/**
 * Получение справочника статей бюджета
 * @returns {Promise<Array>}
 */
async function getCategories() {
    return apiGet('/dictionaries/categories');
}

// ==================== Reports API ====================

/**
 * Получение сводных данных для отчетов
 * @returns {Promise<Object>}
 */
async function getSummaryReport() {
    return apiGet('/reports/summary');
}

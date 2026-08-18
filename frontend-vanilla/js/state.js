/**
 * Глобальное состояние приложения
 * Хранит данные пользователя, фильтры и настройки
 */

// Роли пользователей
const USER_ROLES = {
    RP: 'RP',
    FIN_DIRECTOR: 'FIN_DIRECTOR',
    ADMIN: 'ADMIN'
};

/**
 * Получает текущего пользователя из sessionStorage
 * @returns {Object|null} Данные пользователя
 */
function getCurrentUser() {
    const userData = sessionStorage.getItem('user_data');
    if (!userData) return null;
    
    try {
        return JSON.parse(userData);
    } catch (e) {
        console.error('Failed to parse user data:', e);
        return null;
    }
}

/**
 * Проверяет, авторизован ли пользователь
 * @returns {boolean}
 */
function isAuthenticated() {
    return !!sessionStorage.getItem('jwt_token') && !!getCurrentUser();
}

/**
 * Проверяет роль пользователя
 * @param {string} role - Требуемая роль
 * @returns {boolean}
 */
function hasRole(role) {
    const user = getCurrentUser();
    if (!user) return false;
    
    return user.role === role;
}

/**
 * Проверяет, имеет ли пользователь доступ к проекту
 * @param {number} projectId - ID проекта
 * @returns {boolean}
 */
function hasProjectAccess(projectId) {
    const user = getCurrentUser();
    if (!user) return false;
    
    // Админ и Финдир имеют доступ ко всем проектам
    if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.FIN_DIRECTOR) {
        return true;
    }
    
    // РП имеет доступ только к своим проектам
    if (user.role === USER_ROLES.RP && user.allowed_project_ids) {
        return user.allowed_project_ids.includes(projectId);
    }
    
    return false;
}

/**
 * Проверяет, может ли пользователь редактировать платеж
 * @param {Object} payment - Данные платежа
 * @returns {boolean}
 */
function canEditPayment(payment) {
    const user = getCurrentUser();
    if (!user) return false;
    
    // Оплаченные платежи нельзя редактировать
    if (payment.status === 'PAID') return false;
    
    // Заблокированные периоды нельзя редактировать
    if (payment.is_locked) return false;
    
    // Финдир может редактировать все
    if (user.role === USER_ROLES.FIN_DIRECTOR) return true;
    
    // Админ может редактировать все
    if (user.role === USER_ROLES.ADMIN) return true;
    
    // РП может редактировать только свои проекты и только DRAFT
    if (user.role === USER_ROLES.RP) {
        if (payment.status !== 'DRAFT') return false;
        return user.allowed_project_ids && user.allowed_project_ids.includes(payment.project_id);
    }
    
    return false;
}

/**
 * Проверяет, может ли пользователь фиксировать факт оплаты
 * @param {Object} payment - Данные платежа
 * @returns {boolean}
 */
function canFixFact(payment) {
    const user = getCurrentUser();
    if (!user) return false;
    
    // Только Финдир и Админ могут фиксировать факт
    if (user.role !== USER_ROLES.FIN_DIRECTOR && user.role !== USER_ROLES.ADMIN) {
        return false;
    }
    
    // Оплаченные платежи нельзя изменять
    if (payment.status === 'PAID') return false;
    
    // Заблокированные периоды нельзя изменять
    if (payment.is_locked) return false;
    
    return true;
}

/**
 * Проверяет, может ли пользователь закрывать периоды
 * @returns {boolean}
 */
function canLockPeriod() {
    const user = getCurrentUser();
    if (!user) return false;
    
    return user.role === USER_ROLES.FIN_DIRECTOR || user.role === USER_ROLES.ADMIN;
}

/**
 * Проверяет, может ли пользователь переносить остатки
 * @param {Object} payment - Данные платежа
 * @returns {boolean}
 */
function canRolloverPayment(payment) {
    const user = getCurrentUser();
    if (!user) return false;
    
    // Перенос доступен только для PARTIAL статусов
    if (payment.status !== 'PARTIAL') return false;
    
    // Заблокированные периоды нельзя изменять
    if (payment.is_locked) return false;
    
    // Финдир и Админ могут переносить всегда
    if (user.role === USER_ROLES.FIN_DIRECTOR || user.role === USER_ROLES.ADMIN) {
        return true;
    }
    
    // РП может переносить только свои проекты
    if (user.role === USER_ROLES.RP) {
        return user.allowed_project_ids && user.allowed_project_ids.includes(payment.project_id);
    }
    
    return false;
}

/**
 * Глобальное состояние фильтров
 */
const appState = {
    filters: {
        periodType: 'week',
        dateFrom: null,
        dateTo: null,
        projectIds: [],
        categoryIds: [],
        contractorSearch: ''
    },
    
    matrixData: null,
    selectedRow: null,
    isLoading: false
};

/**
 * Устанавливает фильтр
 * @param {string} key - Ключ фильтра
 * @param {*} value - Значение
 */
function setFilter(key, value) {
    appState.filters[key] = value;
}

/**
 * Получает текущие фильтры
 * @returns {Object}
 */
function getFilters() {
    return { ...appState.filters };
}

/**
 * Сбрасывает все фильтры
 */
function resetFilters() {
    appState.filters = {
        periodType: 'week',
        dateFrom: null,
        dateTo: null,
        projectIds: [],
        categoryIds: [],
        contractorSearch: ''
    };
}

/**
 * Устанавливает состояние загрузки
 * @param {boolean} isLoading
 */
function setLoading(isLoading) {
    appState.isLoading = isLoading;
    
    const loader = document.getElementById('toolbar-loader');
    if (loader) {
        loader.style.display = isLoading ? 'inline' : 'none';
    }
}

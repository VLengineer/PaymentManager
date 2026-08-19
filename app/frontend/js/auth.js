/**
 * Модуль аутентификации
 * Предоставляет функции для входа, выхода и проверки авторизации
 */

// Настройки логирования
const LOG_PREFIX = '[AUTH]';
const LOG_LEVELS = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
};

/**
 * Функция логирования в консоль IDE
 * @param {string} level - Уровень логирования
 * @param {string} message - Сообщение
 * @param {*} data - Дополнительные данные
 */
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} ${LOG_PREFIX} [${level}] ${message}`;
    
    switch(level) {
        case LOG_LEVELS.DEBUG:
            console.log(logMessage, data !== null ? data : '');
            break;
        case LOG_LEVELS.INFO:
            console.info(logMessage, data !== null ? data : '');
            break;
        case LOG_LEVELS.WARN:
            console.warn(logMessage, data !== null ? data : '');
            break;
        case LOG_LEVELS.ERROR:
            console.error(logMessage, data !== null ? data : '');
            break;
        default:
            console.log(logMessage, data !== null ? data : '');
    }
}

/**
 * Выполняет вход пользователя
 * @param {string} username - Имя пользователя
 * @param {string} password - Пароль
 * @returns {Promise<Object>} Данные пользователя
 */
async function login(username, password) {
    log(LOG_LEVELS.INFO, `Попытка входа для пользователя: ${username}`);
    
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    log(LOG_LEVELS.DEBUG, 'Отправка запроса на /api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
    });
    
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
    });

    log(LOG_LEVELS.DEBUG, 'Получен ответ от сервера', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Ошибка входа' }));
        log(LOG_LEVELS.ERROR, 'Ошибка аутентификации', {
            status: response.status,
            detail: error.detail || 'Ошибка входа'
        });
        throw new Error(error.detail || 'Ошибка входа');
    }

    const data = await response.json();
    log(LOG_LEVELS.INFO, 'Успешная аутентификация', {
        username: data.user.username,
        role: data.user.role
    });

    // Сохраняем токен в sessionStorage
    sessionStorage.setItem('jwt_token', data.access_token);
    sessionStorage.setItem('user_data', JSON.stringify(data.user));
    log(LOG_LEVELS.DEBUG, 'Токен сохранен в sessionStorage');

    return data;
}

/**
 * Выполняет выход пользователя
 */
function logout() {
    log(LOG_LEVELS.INFO, 'Выход пользователя');
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem('user_data');
    log(LOG_LEVELS.DEBUG, 'Данные сессии удалены, редирект на /login.html');
    window.location.href = '/login.html';
}

/**
 * Проверяет, авторизован ли пользователь
 * @returns {boolean}
 */
function isAuthenticated() {
    const isAuth = !!sessionStorage.getItem('jwt_token');
    log(LOG_LEVELS.DEBUG, `Проверка авторизации: ${isAuth ? 'авторизован' : 'не авторизован'}`);
    return isAuth;
}

/**
 * Получает данные текущего пользователя
 * @returns {Object|null}
 */
function getCurrentUser() {
    const userData = sessionStorage.getItem('user_data');
    if (userData) {
        const user = JSON.parse(userData);
        log(LOG_LEVELS.DEBUG, 'Получены данные текущего пользователя', { username: user.username });
        return user;
    }
    log(LOG_LEVELS.DEBUG, 'Данные пользователя не найдены');
    return null;
}

/**
 * Перенаправляет на страницу входа если не авторизован
 */
function requireAuth() {
    log(LOG_LEVELS.DEBUG, 'Проверка требования авторизации');
    if (!isAuthenticated()) {
        log(LOG_LEVELS.WARN, 'Пользователь не авторизован, редирект на /login.html');
        window.location.href = '/login.html';
    } else {
        log(LOG_LEVELS.DEBUG, 'Пользователь авторизован, доступ разрешен');
    }
}

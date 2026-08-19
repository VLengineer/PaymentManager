/**
 * Модуль аутентификации
 * Предоставляет функции для входа, выхода и проверки авторизации
 */

/**
 * Выполняет вход пользователя
 * @param {string} username - Имя пользователя
 * @param {string} password - Пароль
 * @returns {Promise<Object>} Данные пользователя
 */
async function login(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Ошибка входа' }));
        throw new Error(error.detail || 'Ошибка входа');
    }

    const data = await response.json();

    // Сохраняем токен в sessionStorage
    sessionStorage.setItem('jwt_token', data.access_token);
    sessionStorage.setItem('user_data', JSON.stringify(data.user));

    return data;
}

/**
 * Выполняет выход пользователя
 */
function logout() {
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem('user_data');
    window.location.href = '/login.html';
}

/**
 * Проверяет, авторизован ли пользователь
 * @returns {boolean}
 */
function isAuthenticated() {
    return !!sessionStorage.getItem('jwt_token');
}

/**
 * Получает данные текущего пользователя
 * @returns {Object|null}
 */
function getCurrentUser() {
    const userData = sessionStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
}

/**
 * Перенаправляет на страницу входа если не авторизован
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
    }
}

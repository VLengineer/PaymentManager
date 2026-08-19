/**
 * Аутентификация и авторизация
 */

// Настройки логирования
const LOG_PREFIX = '[LOGIN]';
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
 * Инициализирует страницу логина
 */
document.addEventListener('DOMContentLoaded', () => {
    log(LOG_LEVELS.INFO, 'Инициализация страницы логина');
    
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    
    if (!loginForm) {
        log(LOG_LEVELS.WARN, 'Форма логина не найдена на странице');
        return;
    }
    
    log(LOG_LEVELS.DEBUG, 'Форма логина найдена');
    
    // Если уже авторизован - редирект на календарь
    if (isAuthenticated()) {
        log(LOG_LEVELS.INFO, 'Пользователь уже авторизован, редирект на index.html');
        window.location.href = 'index.html';
        return;
    }
    
    log(LOG_LEVELS.DEBUG, 'Пользователь не авторизован, ожидание ввода данных');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        
        log(LOG_LEVELS.INFO, `Отправка формы логина для пользователя: ${username}`);
        
        // Скрываем предыдущие ошибки
        loginError.style.display = 'none';
        loginError.textContent = '';
        
        // Показываем индикатор загрузки
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
        log(LOG_LEVELS.DEBUG, 'Кнопка отключена, показан индикатор загрузки');
        
        try {
            log(LOG_LEVELS.DEBUG, 'Вызов функции login()');
            await login(username, password);
            
            // Успешный вход - редирект на календарь
            log(LOG_LEVELS.INFO, 'Успешный вход, редирект на index.html');
            window.location.href = 'index.html';
        } catch (error) {
            log(LOG_LEVELS.ERROR, 'Ошибка входа', {
                message: error.message,
                stack: error.stack
            });
            
            // Показываем ошибку
            loginError.textContent = error.message || 'Ошибка входа. Проверьте логин и пароль.';
            loginError.style.display = 'block';
            log(LOG_LEVELS.DEBUG, 'Ошибка отображена на странице');
            
            // Возвращаем кнопку в исходное состояние
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            log(LOG_LEVELS.DEBUG, 'Кнопка возвращена в исходное состояние');
        }
    });
    
    log(LOG_LEVELS.INFO, 'Обработчик события submit установлен');
});

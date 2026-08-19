/**
 * Главная страница календаря - инициализация приложения
 */

// Настройки логирования
const LOG_PREFIX = '[CALENDAR]';
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
 * Инициализирует главную страницу
 */
document.addEventListener('DOMContentLoaded', async () => {
    log(LOG_LEVELS.INFO, 'Инициализация главной страницы календаря');
    
    // Проверяем авторизацию
    if (!isAuthenticated()) {
        log(LOG_LEVELS.WARN, 'Пользователь не авторизован, редирект на login.html');
        window.location.href = 'login.html';
        return;
    }
    
    log(LOG_LEVELS.INFO, 'Пользователь авторизован, загрузка данных');

    const user = getCurrentUser();
    log(LOG_LEVELS.DEBUG, 'Получены данные пользователя', { username: user.username, role: user.role });

    // Отображаем информацию о пользователе в хедере
    const userNameEl = document.querySelector('.user-name');
    const userRoleEl = document.querySelector('.user-role');

    if (userNameEl) {
        userNameEl.textContent = user.username || user.name || 'Пользователь';
        log(LOG_LEVELS.DEBUG, 'Отображено имя пользователя');
    }

    if (userRoleEl) {
        userRoleEl.textContent = getRoleName(user.role);
        userRoleEl.className = `badge badge-${user.role.toLowerCase()}`;
        log(LOG_LEVELS.DEBUG, 'Отображена роль пользователя');
    }

    // Кнопка выхода
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
        log(LOG_LEVELS.DEBUG, 'Обработчик кнопки выхода установлен');
    }

    // Загружаем справочники для фильтров
    try {
        log(LOG_LEVELS.DEBUG, 'Загрузка справочников проектов и категорий');
        const [projects, categories] = await Promise.all([
            getProjects(),
            getCategories()
        ]);

        fillProjectCheckboxes(projects);
        fillCategories(categories);
        log(LOG_LEVELS.INFO, 'Справочники успешно загружены');

    } catch (error) {
        log(LOG_LEVELS.ERROR, 'Ошибка загрузки справочников', { error: error.message });
        // Продолжаем работу даже если справочники не загрузились
    }

    // Загружаем данные матрицы
    log(LOG_LEVELS.DEBUG, 'Загрузка данных матрицы');
    loadMatrixData();

    // Устанавливаем даты по умолчанию (текущий месяц)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    document.getElementById('date-from').value = formatDate(firstDay, 'YYYY-MM-DD');
    document.getElementById('date-to').value = formatDate(lastDay, 'YYYY-MM-DD');
    log(LOG_LEVELS.DEBUG, 'Установлены даты по умолчанию', { from: formatDate(firstDay, 'YYYY-MM-DD'), to: formatDate(lastDay, 'YYYY-MM-DD') });
});

/**
 * Получает название роли на русском
 * @param {string} role - Код роли
 * @returns {string} Название роли
 */
function getRoleName(role) {
    const roleNames = {
        'RP': 'РП',
        'FIN_DIRECTOR': 'Финдир',
        'ADMIN': 'Админ'
    };

    return roleNames[role] || role;
}

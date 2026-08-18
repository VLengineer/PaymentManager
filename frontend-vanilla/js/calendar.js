/**
 * Главная страница календаря - инициализация приложения
 */

/**
 * Инициализирует главную страницу
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем авторизацию
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    const user = getCurrentUser();
    
    // Отображаем информацию о пользователе в хедере
    const userNameEl = document.querySelector('.user-name');
    const userRoleEl = document.querySelector('.user-role');
    
    if (userNameEl) {
        userNameEl.textContent = user.username || user.name || 'Пользователь';
    }
    
    if (userRoleEl) {
        userRoleEl.textContent = getRoleName(user.role);
        userRoleEl.className = `badge badge-${user.role.toLowerCase()}`;
    }
    
    // Кнопка выхода
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Загружаем справочники для фильтров
    try {
        const [projects, categories] = await Promise.all([
            getProjects(),
            getCategories()
        ]);
        
        fillProjectCheckboxes(projects);
        fillCategories(categories);
        
    } catch (error) {
        console.error('Failed to load dictionaries:', error);
        // Продолжаем работу даже если справочники не загрузились
    }
    
    // Загружаем данные матрицы
    loadMatrixData();
    
    // Устанавливаем даты по умолчанию (текущий месяц)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    document.getElementById('date-from').value = formatDate(firstDay, 'YYYY-MM-DD');
    document.getElementById('date-to').value = formatDate(lastDay, 'YYYY-MM-DD');
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

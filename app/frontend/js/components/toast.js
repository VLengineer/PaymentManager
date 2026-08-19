/**
 * Компонент Toast-уведомлений
 */

/**
 * Показывает toast уведомление
 * @param {string} message - Сообщение
 * @param {string} type - Тип: 'success' | 'error' | 'warning' | 'info'
 * @param {number} duration - Длительность в мс (по умолчанию 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    // Создаем элемент toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Добавляем в контейнер
    container.appendChild(toast);
    
    // Удаляем через указанное время
    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, duration);
}

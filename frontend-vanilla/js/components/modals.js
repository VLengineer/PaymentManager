/**
 * Компонент модальных окон
 */

// Хранит текущее открытое модальное окно
let currentModal = null;

/**
 * Открывает модальное окно
 * @param {string} modalId - ID модального окна
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.add('active');
    currentModal = modal;
    
    // Блокируем скролл фона
    document.body.style.overflow = 'hidden';
    
    // Фокус на первом поле ввода
    const firstInput = modal.querySelector('input, select, textarea');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

/**
 * Закрывает модальное окно
 * @param {string} modalId - ID модального окна (опционально)
 */
function closeModal(modalId) {
    const modal = modalId ? document.getElementById(modalId) : currentModal;
    if (!modal) return;
    
    modal.classList.remove('active');
    currentModal = null;
    
    // Возвращаем скролл фона
    document.body.style.overflow = '';
    
    // Очищаем формы
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
    }
}

/**
 * Инициализирует обработчики модальных окон
 */
function initModals() {
    // Закрытие по клику на overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            closeModal();
        });
    });
    
    // Закрытие по кнопке закрытия
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal();
        });
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && currentModal) {
            closeModal();
        }
    });
    
    // Предотвращаем закрытие при клике на контент
    document.querySelectorAll('.modal-content').forEach(content => {
        content.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });
}

/**
 * Инициализация при загрузке страницы
 */
document.addEventListener('DOMContentLoaded', () => {
    initModals();
});

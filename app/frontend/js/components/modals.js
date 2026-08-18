/**
 * Модуль управления модальными окнами
 * @module modals
 */

import { sanitizeString } from '../utils/formatters.js';

/**
 * Показать toast уведомление
 * @param {string} message - Сообщение
 * @param {'success' | 'error' | 'warning' | 'info'} type - Тип уведомления
 */
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  // Удалить через 3 секунды
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Открыть модальное окно
 * @param {string} modalId - ID модального окна
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    
    // Фокус на первый input
    const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }
}

/**
 * Закрыть модальное окно
 * @param {string} modalId - ID модального окна
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    
    // Очистить форму если есть
    const form = modal.querySelector('form');
    if (form) {
      form.reset();
    }
  }
}

/**
 * Инициализировать обработчики закрытия модалок
 */
function initModalHandlers() {
  // Закрытие по клику на overlay
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && !overlay.classList.contains('hidden')) {
        overlay.classList.add('hidden');
      }
    });
  });
  
  // Закрытие по Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(modal => {
        modal.classList.add('hidden');
      });
    }
  });
  
  // Обработчики кнопок отмены
  document.querySelectorAll('.btn-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) {
        modal.classList.add('hidden');
      }
    });
  });
}

/**
 * Показать модалку создания платежа
 * @param {Object} options - Опции
 */
function showPaymentModal(options = {}) {
  const modal = document.getElementById('payment-modal');
  if (!modal) return;
  
  // Заполнить проект если передан
  if (options.project_id) {
    const projectSelect = modal.querySelector('#project-id');
    if (projectSelect) {
      projectSelect.value = options.project_id;
    }
  }
  
  // Заполнить период если передан
  if (options.period) {
    const periodSelect = modal.querySelector('#period-start');
    if (periodSelect) {
      periodSelect.value = options.period;
    }
  }
  
  openModal('payment-modal');
}

/**
 * Показать модалку фиксации факта оплаты
 * @param {Object} paymentData - Данные платежа
 */
function showFactModal(paymentData) {
  const modal = document.getElementById('fact-modal');
  if (!modal) return;
  
  const planEl = modal.querySelector('#fact-plan');
  const amountInput = modal.querySelector('#fact-amount');
  const warningEl = modal.querySelector('.fact-warning');
  const remainderEl = modal.querySelector('#fact-remainder');
  
  if (planEl) {
    planEl.textContent = `${paymentData.plan || 0} ₽`;
  }
  
  if (amountInput) {
    amountInput.value = paymentData.fact || paymentData.plan || 0;
    amountInput.max = paymentData.plan || 0;
  }
  
  if (warningEl && remainderEl) {
    const remainder = (paymentData.plan || 0) - (paymentData.fact || 0);
    if (remainder > 0) {
      remainderEl.textContent = remainder;
      warningEl.style.display = 'block';
    } else {
      warningEl.style.display = 'none';
    }
  }
  
  // Сохранить данные для последующего использования
  modal.dataset.paymentId = paymentData.payment_id;
  modal.dataset.planAmount = paymentData.plan;
  
  openModal('fact-modal');
}

/**
 * Показать модалку переноса остатка
 * @param {Object} paymentData - Данные платежа
 * @param {Array} availablePeriods - Доступные периоды для переноса
 */
function showRolloverModal(paymentData, availablePeriods = []) {
  const modal = document.getElementById('rollover-modal');
  if (!modal) return;
  
  const remainder = (paymentData.plan || 0) - (paymentData.fact || 0);
  
  modal.querySelector('p:nth-of-type(1) strong').textContent = `${paymentData.plan || 0} ₽`;
  modal.querySelector('p:nth-of-type(2) strong').textContent = `${paymentData.fact || 0} ₽`;
  modal.querySelector('p:nth-of-type(3) strong').textContent = `${remainder} ₽`;
  
  const targetSelect = modal.querySelector('#rollover-target');
  if (targetSelect) {
    targetSelect.innerHTML = availablePeriods.map(p => 
      `<option value="${p.id}">${p.label}</option>`
    ).join('');
  }
  
  // Сохранить данные для последующего использования
  modal.dataset.paymentId = paymentData.payment_id;
  modal.dataset.remainder = remainder;
  
  openModal('rollover-modal');
}

/**
 * Показать модалку подтверждения удаления
 * @param {Function} onConfirm - Callback при подтверждении
 */
function showConfirmModal(title, message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  if (!modal) {
    // Если нет готовой модалки, создаем временную
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed && onConfirm) {
      onConfirm();
    }
    return;
  }
  
  modal.querySelector('h3').textContent = title;
  modal.querySelector('.modal-content p').textContent = message;
  
  const confirmBtn = modal.querySelector('.btn-primary');
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      closeModal('confirm-modal');
      if (onConfirm) onConfirm();
    };
  }
  
  openModal('confirm-modal');
}

export {
  showToast,
  openModal,
  closeModal,
  initModalHandlers,
  showPaymentModal,
  showFactModal,
  showRolloverModal,
  showConfirmModal,
};

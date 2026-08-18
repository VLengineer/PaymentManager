/**
 * Главное приложение - точка входа
 * @module main
 */

import { initState, setUser, getUser } from './state.js';
import { initSidebar } from './components/sidebar.js';
import { initMatrix, refreshMatrix } from './components/matrix.js';
import { initToolbar } from './components/toolbar.js';
import { initModalHandlers, showToast } from './components/modals.js';
import { logout, getAuthToken } from './api.js';

// Делаем showToast доступным глобально для других модулей
window.showToast = showToast;

/**
 * Инициализировать приложение
 */
async function initApp() {
  // Инициализируем состояние из sessionStorage
  initState();
  
  // Проверяем авторизацию
  const token = getAuthToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }
  
  // Получаем данные пользователя
  const userInfo = sessionStorage.getItem('user_info');
  if (userInfo) {
    try {
      const user = JSON.parse(userInfo);
      setUser(user);
      updateUserInfo(user);
    } catch (e) {
      console.error('Failed to parse user info');
      window.location.href = '/login.html';
      return;
    }
  }
  
  // Инициализируем компоненты
  initModalHandlers();
  await initSidebar();
  await initMatrix();
  initToolbar();
  
  // Настраиваем глобальные обработчики
  setupGlobalListeners();
  
  // Скрываем индикатор загрузки если есть
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
}

/**
 * Обновить информацию о пользователе в UI
 * @param {Object} user - Данные пользователя
 */
function updateUserInfo(user) {
  const nameEl = document.getElementById('user-name');
  const roleEl = document.getElementById('user-role');
  
  if (nameEl) {
    nameEl.textContent = user.username || user.name || 'Пользователь';
  }
  
  if (roleEl) {
    const roleLabels = {
      'ADMIN': 'Админ',
      'FIN_DIRECTOR': 'Финдир',
      'RP': 'РП',
    };
    roleEl.textContent = roleLabels[user.role] || user.role;
  }
}

/**
 * Настроить глобальные обработчики событий
 */
function setupGlobalListeners() {
  // Кнопка выхода
  const exitBtn = document.getElementById('btn-exit');
  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      logout();
    });
  }
  
  // Hamburger меню для мобильных
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const sidebar = document.getElementById('sidebar');
  
  if (hamburgerBtn && sidebar) {
    hamburgerBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
    
    // Закрываем сайдбар при клике вне его на мобильных
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 1366) {
        if (!sidebar.contains(e.target) && !hamburgerBtn.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      }
    });
  }
  
  // Обработчик изменения фильтров
  window.addEventListener('filters-changed', (e) => {
    console.log('Filters changed:', e.detail);
    refreshMatrix();
  });
  
  // Обработчик изменения типа периода
  window.addEventListener('period-changed', (e) => {
    const { periodType } = e.detail;
    console.log('Period type changed:', periodType);
    // Здесь можно обновить фильтр и перезагрузить матрицу
  });
  
  // Обработчик формы создания платежа
  const paymentForm = document.getElementById('payment-form');
  if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      handlePaymentSubmit(e.target);
    });
  }
  
  // Обработчик подтверждения факта оплаты
  const confirmFactBtn = document.getElementById('btn-confirm-fact');
  if (confirmFactBtn) {
    confirmFactBtn.addEventListener('click', handleFactConfirm);
  }
  
  // Обработчик подтверждения переноса
  const confirmRolloverBtn = document.getElementById('btn-confirm-rollover');
  if (confirmRolloverBtn) {
    confirmRolloverBtn.addEventListener('click', handleRolloverConfirm);
  }
}

/**
 * Обработчик отправки формы платежа
 * @param {HTMLFormElement} form
 */
async function handlePaymentSubmit(form) {
  const formData = new FormData(form);
  
  const paymentData = {
    project_id: parseInt(formData.get('project-id')),
    category_id: parseInt(formData.get('category-id')),
    contractor_name: formData.get('contractor-input'),
    period: formData.get('period-start'),
    amount_plan: parseFloat(formData.get('amount-plan')),
    comment: formData.get('comment'),
  };
  
  try {
    // TODO: Вызвать API для создания платежа
    // await createPaymentPlan(paymentData);
    
    showToast('Платеж создан', 'success');
    
    // Закрываем модалку
    document.getElementById('payment-modal').classList.add('hidden');
    
    // Сбрасываем форму
    form.reset();
    
    // Обновляем матрицу
    refreshMatrix();
  } catch (error) {
    console.error('Failed to create payment:', error);
    showToast('Ошибка создания платежа', 'error');
  }
}

/**
 * Обработчик подтверждения факта оплаты
 */
async function handleFactConfirm() {
  const modal = document.getElementById('fact-modal');
  const paymentId = modal.dataset.paymentId;
  const factAmount = parseFloat(document.getElementById('fact-amount').value);
  
  if (!paymentId || isNaN(factAmount)) {
    showToast('Некорректные данные', 'error');
    return;
  }
  
  try {
    // TODO: Вызвать API для фиксации факта
    // await fixPaymentFact({ payment_id: paymentId, amount_fact: factAmount });
    
    showToast('Факт оплаты зафиксирован', 'success');
    
    // Закрываем модалку
    modal.classList.add('hidden');
    
    // Обновляем матрицу
    refreshMatrix();
  } catch (error) {
    console.error('Failed to fix fact:', error);
    showToast('Ошибка фиксации факта', 'error');
  }
}

/**
 * Обработчик подтверждения переноса
 */
async function handleRolloverConfirm() {
  const modal = document.getElementById('rollover-modal');
  const paymentId = modal.dataset.paymentId;
  const targetPeriod = document.getElementById('rollover-target').value;
  
  if (!paymentId || !targetPeriod) {
    showToast('Выберите целевой период', 'error');
    return;
  }
  
  try {
    // TODO: Вызвать API для переноса
    // await rolloverPayment({ payment_id: paymentId, target_period: targetPeriod });
    
    showToast('Остаток перенесен', 'success');
    
    // Закрываем модалку
    modal.classList.add('hidden');
    
    // Обновляем матрицу
    refreshMatrix();
  } catch (error) {
    console.error('Failed to rollover:', error);
    showToast('Ошибка переноса остатка', 'error');
  }
}

// Запускаем приложение при загрузке DOM
document.addEventListener('DOMContentLoaded', initApp);

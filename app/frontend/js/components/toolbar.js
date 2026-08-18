/**
 * Модуль toolbar (панель действий)
 * @module toolbar
 */

import { getState, getUser } from '../state.js';
import { showPaymentModal, showToast, showConfirmModal } from './modals.js';
import { lockPeriod } from '../api.js';

/**
 * Инициализировать toolbar
 */
function initToolbar() {
  setupAddPaymentButton();
  setupRolloverButton();
  setupExportButton();
  setupLockPeriodButton();
  setupPeriodSwitcher();
}

/**
 * Настроить кнопку добавления платежа
 */
function setupAddPaymentButton() {
  const btn = document.getElementById('btn-add-payment');
  if (btn) {
    btn.addEventListener('click', () => {
      handleAddPayment();
    });
  }
}

/**
 * Обработчик добавления платежа
 */
function handleAddPayment() {
  const user = getUser();
  
  if (!user) {
    showToast('Пользователь не авторизован', 'error');
    return;
  }
  
  // Открываем модалку создания платежа
  showPaymentModal();
}

/**
 * Настроить кнопку переноса остатков
 */
function setupRolloverButton() {
  const btn = document.getElementById('btn-rollover');
  if (btn) {
    btn.addEventListener('click', () => {
      handleRollover();
    });
    
    // Кнопка изначально disabled, активируется при выборе строки с PARTIAL
    btn.disabled = true;
  }
}

/**
 * Обработчик переноса остатков
 */
function handleRollover() {
  showToast('Выберите строку со статусом PARTIAL для переноса', 'info');
}

/**
 * Настроить кнопку экспорта
 */
function setupExportButton() {
  const btn = document.getElementById('btn-export');
  if (btn) {
    btn.addEventListener('click', () => {
      handleExport();
    });
  }
}

/**
 * Обработчик экспорта
 */
function handleExport() {
  // Простой CSV экспорт
  exportToCSV();
  showToast('Экспорт начат', 'success');
}

/**
 * Экспорт в CSV
 */
function exportToCSV() {
  const state = getState();
  const matrixData = state.matrixData;
  
  if (!matrixData || !matrixData.rows) {
    showToast('Нет данных для экспорта', 'warning');
    return;
  }
  
  // Формируем CSV
  const periods = matrixData.periods || [];
  const headers = [
    'Проект',
    'Статья',
    'Контрагент',
    'Комментарий',
    'План',
    'Факт',
    ...periods.map(p => p.label)
  ];
  
  const rows = matrixData.rows.map(row => {
    const values = [
      row.project_name || '',
      row.category_name || '',
      row.contractor_name || '',
      `"${(row.comment || '').replace(/"/g, '""')}"`,
      row.total_plan || 0,
      row.total_fact || 0,
    ];
    
    // Добавляем значения по периодам
    periods.forEach(period => {
      const cell = row.cells?.[period.id];
      values.push(cell ? (cell.plan || 0) : 0);
    });
    
    return values.join(',');
  });
  
  const csvContent = [
    headers.join(','),
    ...rows
  ].join('\n');
  
  // Создаем и скачиваем файл
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `payment_calendar_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Настроить кнопку закрытия периода
 */
function setupLockPeriodButton() {
  const btn = document.getElementById('btn-lock-period');
  if (btn) {
    const user = getUser();
    
    // Показываем только для Финдира
    if (user?.role !== 'FIN_DIRECTOR' && user?.role !== 'ADMIN') {
      btn.style.display = 'none';
      return;
    }
    
    btn.addEventListener('click', () => {
      handleLockPeriod();
    });
  }
}

/**
 * Обработчик закрытия периода
 */
function handleLockPeriod() {
  showConfirmModal(
    'Закрыть период',
    'Вы уверены, что хотите закрыть текущий период? После этого редактирование платежей за этот период будет невозможно.',
    async () => {
      try {
        // Определяем текущий период
        const state = getState();
        const periodType = state.filters.period_type || 'week';
        
        // Для простоты закрываем текущий месяц
        const now = new Date();
        const period = `${now.getFullYear()}-M${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        await lockPeriod(period);
        showToast(`Период ${period} закрыт`, 'success');
        
        // Обновляем матрицу
        window.dispatchEvent(new CustomEvent('filters-changed', { detail: state.filters }));
      } catch (error) {
        console.error('Failed to lock period:', error);
        showToast('Ошибка закрытия периода', 'error');
      }
    }
  );
}

/**
 * Настроить переключатель периодов
 */
function setupPeriodSwitcher() {
  const buttons = document.querySelectorAll('.period-switcher button');
  
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const periodType = btn.dataset.period;
      
      if (periodType) {
        // Обновляем активный класс
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Обновляем фильтры
        window.dispatchEvent(new CustomEvent('period-changed', {
          detail: { periodType }
        }));
        
        showToast(`Период: ${getPeriodLabel(periodType)}`, 'info');
      }
    });
  });
}

/**
 * Получить_label периода
 */
function getPeriodLabel(type) {
  const labels = {
    'week': 'Недели',
    'month': 'Месяцы',
    'quarter': 'Кварталы',
  };
  return labels[type] || type;
}

/**
 * Обновить доступность кнопок
 */
function updateToolbarButtons(selectedRow) {
  const rolloverBtn = document.getElementById('btn-rollover');
  
  if (rolloverBtn && selectedRow) {
    // Активируем если есть PARTIAL статусы
    const hasPartial = Object.values(selectedRow.cells || {}).some(
      cell => cell?.status === 'PARTIAL'
    );
    rolloverBtn.disabled = !hasPartial;
  } else if (rolloverBtn) {
    rolloverBtn.disabled = true;
  }
}

export {
  initToolbar,
  updateToolbarButtons,
};

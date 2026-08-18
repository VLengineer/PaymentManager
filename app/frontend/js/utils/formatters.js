/**
 * Утилиты для форматирования данных
 * @module formatters
 */

/**
 * Отформатировать сумму в рубли
 * @param {number} amount - Сумма
 * @returns {string}
 */
function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === 0) {
    return '—';
  }
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Отформатировать дату в русский формат
 * @param {string|Date} date - Дата
 * @param {boolean} showYear - Показывать год
 * @returns {string}
 */
function formatDate(date, showYear = false) {
  if (!date) return '—';
  
  const d = new Date(date);
  const options = {
    day: 'numeric',
    month: 'long',
  };
  
  if (showYear) {
    options.year = 'numeric';
  }
  
  return d.toLocaleDateString('ru-RU', options);
}

/**
 * Получить номер недели из даты
 * @param {string|Date} date - Дата
 * @returns {number}
 */
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Получить период (неделя/месяц/квартал) из даты
 * @param {string|Date} date - Дата
 * @param {string} type - 'week' | 'month' | 'quarter'
 * @returns {string}
 */
function formatPeriod(date, type = 'week') {
  if (!date) return '—';
  
  const d = new Date(date);
  
  if (type === 'week') {
    const weekNum = getWeekNumber(d);
    const year = d.getFullYear();
    return `Неделя ${weekNum} (${year})`;
  }
  
  if (type === 'month') {
    return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }
  
  if (type === 'quarter') {
    const month = d.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    return `${quarter} квартал ${d.getFullYear()}`;
  }
  
  return date.toString();
}

/**
 * Получить статус ячейки на основе данных платежа
 * @param {Object|null} cellData - Данные ячейки
 * @returns {string} 'EMPTY' | 'DRAFT' | 'APPROVED' | 'PAID' | 'PARTIAL' | 'LOCKED'
 */
function getCellStatus(cellData) {
  if (!cellData || !cellData.payment_id) {
    return 'EMPTY';
  }
  
  if (cellData.is_locked) {
    return 'LOCKED';
  }
  
  switch (cellData.status) {
    case 'PAID':
      return 'PAID';
    case 'PARTIAL':
      return 'PARTIAL';
    case 'APPROVED':
      return 'APPROVED';
    case 'DRAFT':
    default:
      return 'DRAFT';
  }
}

/**
 * Получить CSS класс для статуса ячейки
 * @param {string} status - Статус ячейки
 * @returns {string}
 */
function getCellClass(status) {
  const classMap = {
    'EMPTY': '',
    'DRAFT': 'cell-draft',
    'APPROVED': 'cell-approved',
    'PAID': 'cell-paid',
    'PARTIAL': 'cell-partial',
    'LOCKED': 'cell-locked',
  };
  return classMap[status] || '';
}

/**
 * Получить иконку для статуса ячейки
 * @param {string} status - Статус ячейки
 * @returns {string}
 */
function getStatusIcon(status) {
  const iconMap = {
    'EMPTY': '',
    'DRAFT': '✏️',
    'APPROVED': '✓',
    'PAID': '🔒',
    'PARTIAL': '⚠️',
    'LOCKED': '🔒',
  };
  return iconMap[status] || '';
}

/**
 * Получить текст для отображения в ячейке
 * @param {Object|null} cellData - Данные ячейки
 * @param {string} status - Статус ячейки
 * @returns {string}
 */
function getCellText(cellData, status) {
  if (status === 'EMPTY') {
    return '—';
  }
  
  if (status === 'PARTIAL') {
    const fact = cellData.fact || 0;
    const plan = cellData.plan || 0;
    return `${formatCurrency(fact)} / ${formatCurrency(plan)}`;
  }
  
  if (cellData.fact && cellData.fact > 0) {
    return formatCurrency(cellData.fact);
  }
  
  return formatCurrency(cellData.plan);
}

/**
 * Санитизировать строку (защита от XSS)
 * @param {string} str - Строка
 * @returns {string}
 */
function sanitizeString(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Debounce функция
 * @param {Function} func - Функция
 * @param {number} wait - Задержка в мс
 * @returns {Function}
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export {
  formatCurrency,
  formatDate,
  getWeekNumber,
  formatPeriod,
  getCellStatus,
  getCellClass,
  getStatusIcon,
  getCellText,
  sanitizeString,
  debounce,
};

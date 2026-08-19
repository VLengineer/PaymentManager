/**
 * Форматирование чисел и валюты
 */

/**
 * Форматирует число в денежный формат с разделителями
 * @param {number} amount - Сумма
 * @param {string} currency - Валюта (по умолчанию 'RUB')
 * @returns {string} Отформатированная строка
 */
function formatCurrency(amount, currency = 'RUB') {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '—';
    }
    
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Форматирует число с разделителями тысяч
 * @param {number} num - Число
 * @returns {string} Отформатированная строка
 */
function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) {
        return '—';
    }
    
    return new Intl.NumberFormat('ru-RU').format(num);
}

/**
 * Форматирует дату в локальный формат
 * @param {string|Date} date - Дата
 * @param {string} format - Формат вывода
 * @returns {string} Отформатированная дата
 */
function formatDate(date, format = 'DD.MM.YYYY') {
    if (!date) return '—';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) return '—';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return format
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year);
}

/**
 * Форматирует период (неделю/месяц/квартал)
 * @param {string} periodId - ID периода (например, "2026-W23")
 * @returns {string} Человекочитаемое название
 */
function formatPeriod(periodId) {
    if (!periodId) return '—';
    
    // Неделя: 2026-W23
    const weekMatch = periodId.match(/(\d{4})-W(\d{2})/);
    if (weekMatch) {
        const year = weekMatch[1];
        const week = parseInt(weekMatch[2]);
        // Примерное вычисление даты начала недели
        const jan1 = new Date(year, 0, 1);
        const weekStart = new Date(jan1);
        weekStart.setDate(jan1.getDate() + (week - 1) * 7 - jan1.getDay() + 1);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        return `${week} (${formatDate(weekStart, 'DD.MM')}–${formatDate(weekEnd, 'DD.MM')})`;
    }
    
    // Месяц: 2026-M06
    const monthMatch = periodId.match(/(\d{4})-M(\d{2})/);
    if (monthMatch) {
        const year = monthMatch[1];
        const month = parseInt(monthMatch[2]);
        const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        return `${monthNames[month - 1]} ${year}`;
    }
    
    // Квартал: 2026-Q2
    const quarterMatch = periodId.match(/(\d{4})-Q(\d)/);
    if (quarterMatch) {
        const year = quarterMatch[1];
        const quarter = quarterMatch[2];
        return `${quarter} кв. ${year}`;
    }
    
    return periodId;
}

/**
 * Получает статус ячейки на основе данных платежа
 * @param {Object} cellData - Данные ячейки
 * @returns {string} CSS класс статуса
 */
function getCellStatusClass(cellData) {
    if (!cellData) return '';
    
    if (cellData.is_locked) return 'cell-locked';
    
    switch (cellData.status) {
        case 'DRAFT': return 'cell-draft';
        case 'APPROVED': return 'cell-approved';
        case 'PAID': return 'cell-paid';
        case 'PARTIAL': return 'cell-partial';
        default: return '';
    }
}

/**
 * Получает иконку для статуса платежа
 * @param {string} status - Статус платежа
 * @returns {string} Иконка
 */
function getStatusIcon(status) {
    switch (status) {
        case 'DRAFT': return '✏️';
        case 'APPROVED': return '✓';
        case 'PAID': return '🔒';
        case 'PARTIAL': return '⚠️';
        default: return '';
    }
}

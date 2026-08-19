/**
 * Валидация данных форм
 */

/**
 * Валидирует сумму платежа
 * @param {number} amount - Сумма
 * @returns {{valid: boolean, message: string}} Результат валидации
 */
function validateAmount(amount) {
    if (amount === null || amount === undefined) {
        return { valid: false, message: 'Сумма обязательна' };
    }
    
    const num = parseFloat(amount);
    
    if (isNaN(num)) {
        return { valid: false, message: 'Некорректное число' };
    }
    
    if (num < 0) {
        return { valid: false, message: 'Сумма не может быть отрицательной' };
    }
    
    if (num > 1000000000) {
        return { valid: false, message: 'Сумма слишком большая' };
    }
    
    return { valid: true, message: '' };
}

/**
 * Валидирует факт оплаты
 * @param {number} factAmount - Фактическая сумма
 * @param {number} planAmount - Плановая сумма
 * @returns {{valid: boolean, message: string}} Результат валидации
 */
function validateFactAmount(factAmount, planAmount) {
    const amountValidation = validateAmount(factAmount);
    if (!amountValidation.valid) {
        return amountValidation;
    }
    
    const fact = parseFloat(factAmount);
    const plan = parseFloat(planAmount);
    
    if (fact > plan) {
        return { valid: false, message: 'Факт не может превышать план' };
    }
    
    return { valid: true, message: '' };
}

/**
 * Валидирует обязательное поле
 * @param {*} value - Значение
 * @param {string} fieldName - Название поля
 * @returns {{valid: boolean, message: string}} Результат валидации
 */
function validateRequired(value, fieldName = 'Поле') {
    if (value === null || value === undefined || value === '') {
        return { valid: false, message: `${fieldName} обязательно` };
    }
    
    return { valid: true, message: '' };
}

/**
 * Валидирует email
 * @param {string} email - Email
 * @returns {{valid: boolean, message: string}} Результат валидации
 */
function validateEmail(email) {
    if (!email) {
        return { valid: false, message: 'Email обязателен' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        return { valid: false, message: 'Некорректный email' };
    }
    
    return { valid: true, message: '' };
}

/**
 * Валидирует дату
 * @param {string} date - Дата строкой
 * @returns {{valid: boolean, message: string}} Результат валидации
 */
function validateDate(date) {
    if (!date) {
        return { valid: false, message: 'Дата обязательна' };
    }
    
    const d = new Date(date);
    
    if (isNaN(d.getTime())) {
        return { valid: false, message: 'Некорректная дата' };
    }
    
    return { valid: true, message: '' };
}

/**
 * Санитизирует строку (защита от XSS)
 * @param {string} str - Входная строка
 * @returns {string} Очищенная строка
 */
function sanitizeString(str) {
    if (!str) return '';
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

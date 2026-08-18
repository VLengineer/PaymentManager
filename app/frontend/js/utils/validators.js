/**
 * Утилиты для валидации данных
 * @module validators
 */

/**
 * Проверить является ли значение числом
 * @param {*} value - Значение
 * @returns {boolean}
 */
function isNumber(value) {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Проверить является ли значение положительным числом
 * @param {*} value - Значение
 * @returns {boolean}
 */
function isPositiveNumber(value) {
  return isNumber(value) && value > 0;
}

/**
 * Валидировать сумму платежа
 * @param {number} amount - Сумма
 * @returns {{valid: boolean, error: string|null}}
 */
function validateAmount(amount) {
  if (amount === null || amount === undefined) {
    return { valid: false, error: 'Сумма обязательна' };
  }
  
  if (!isNumber(amount)) {
    return { valid: false, error: 'Сумма должна быть числом' };
  }
  
  if (amount < 0) {
    return { valid: false, error: 'Сумма не может быть отрицательной' };
  }
  
  if (amount === 0) {
    return { valid: false, error: 'Сумма должна быть больше нуля' };
  }
  
  return { valid: true, error: null };
}

/**
 * Валидировать факт оплаты
 * @param {number} factAmount - Фактическая сумма
 * @param {number} planAmount - Плановая сумма
 * @returns {{valid: boolean, error: string|null}}
 */
function validateFactAmount(factAmount, planAmount) {
  const amountValidation = validateAmount(factAmount);
  if (!amountValidation.valid) {
    return amountValidation;
  }
  
  if (factAmount > planAmount) {
    return { 
      valid: false, 
      error: `Факт не может превышать план (${planAmount})` 
    };
  }
  
  return { valid: true, error: null };
}

/**
 * Валидировать выбор проекта
 * @param {*} projectId - ID проекта
 * @returns {{valid: boolean, error: string|null}}
 */
function validateProjectId(projectId) {
  if (projectId === null || projectId === undefined) {
    return { valid: false, error: 'Проект обязателен' };
  }
  
  if (!isNumber(projectId)) {
    return { valid: false, error: 'Некорректный ID проекта' };
  }
  
  return { valid: true, error: null };
}

/**
 * Валидировать выбор статьи
 * @param {*} categoryId - ID статьи
 * @returns {{valid: boolean, error: string|null}}
 */
function validateCategoryId(categoryId) {
  if (categoryId === null || categoryId === undefined) {
    return { valid: false, error: 'Статья обязательна' };
  }
  
  if (!isNumber(categoryId)) {
    return { valid: false, error: 'Некорректный ID статьи' };
  }
  
  return { valid: true, error: null };
}

/**
 * Валидировать выбор контрагента
 * @param {*} contractorId - ID контрагента
 * @returns {{valid: boolean, error: string|null}}
 */
function validateContractorId(contractorId) {
  if (contractorId === null || contractorId === undefined) {
    return { valid: false, error: 'Контрагент обязателен' };
  }
  
  if (!isNumber(contractorId)) {
    return { valid: false, error: 'Некорректный ID контрагента' };
  }
  
  return { valid: true, error: null };
}

/**
 * Валидировать период
 * @param {string} period - Период
 * @returns {{valid: boolean, error: string|null}}
 */
function validatePeriod(period) {
  if (!period) {
    return { valid: false, error: 'Период обязателен' };
  }
  
  // Проверка формата периода (например, "2026-W23")
  const periodRegex = /^\d{4}-(W\d{2}|M\d{2}|Q\d)$/;
  if (!periodRegex.test(period)) {
    return { valid: false, error: 'Некорректный формат периода' };
  }
  
  return { valid: true, error: null };
}

/**
 * Валидировать комментарий (опционально)
 * @param {string} comment - Комментарий
 * @param {number} maxLength - Максимальная длина
 * @returns {{valid: boolean, error: string|null}}
 */
function validateComment(comment, maxLength = 500) {
  if (!comment) {
    return { valid: true, error: null }; // Комментарий опционален
  }
  
  if (typeof comment !== 'string') {
    return { valid: false, error: 'Комментарий должен быть строкой' };
  }
  
  if (comment.length > maxLength) {
    return { valid: false, error: `Комментарий не должен превышать ${maxLength} символов` };
  }
  
  return { valid: true, error: null };
}

/**
 * Валидировать форму создания платежа
 * @param {Object} formData - Данные формы
 * @returns {{valid: boolean, errors: Object}}
 */
function validatePaymentForm(formData) {
  const errors = {};
  let isValid = true;
  
  const projectResult = validateProjectId(formData.project_id);
  if (!projectResult.valid) {
    errors.project_id = projectResult.error;
    isValid = false;
  }
  
  const categoryResult = validateCategoryId(formData.category_id);
  if (!categoryResult.valid) {
    errors.category_id = categoryResult.error;
    isValid = false;
  }
  
  const contractorResult = validateContractorId(formData.contractor_id);
  if (!contractorResult.valid) {
    errors.contractor_id = contractorResult.error;
    isValid = false;
  }
  
  const periodResult = validatePeriod(formData.period);
  if (!periodResult.valid) {
    errors.period = periodResult.error;
    isValid = false;
  }
  
  const amountResult = validateAmount(formData.amount_plan);
  if (!amountResult.valid) {
    errors.amount_plan = amountResult.error;
    isValid = false;
  }
  
  const commentResult = validateComment(formData.comment);
  if (!commentResult.valid) {
    errors.comment = commentResult.error;
    isValid = false;
  }
  
  return { valid: isValid, errors };
}

export {
  isNumber,
  isPositiveNumber,
  validateAmount,
  validateFactAmount,
  validateProjectId,
  validateCategoryId,
  validateContractorId,
  validatePeriod,
  validateComment,
  validatePaymentForm,
};

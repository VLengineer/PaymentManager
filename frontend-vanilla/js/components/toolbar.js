/**
 * Компонент панели действий (Toolbar)
 */

/**
 * Инициализирует toolbar
 */
function initToolbar() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Кнопка добавления платежа
    const addBtn = document.getElementById('btn-add-payment');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            openPaymentModal();
        });
    }
    
    // Кнопка переноса остатка
    const rolloverBtn = document.getElementById('btn-rollover');
    if (rolloverBtn) {
        rolloverBtn.addEventListener('click', () => {
            openRolloverModal();
        });
    }
    
    // Кнопка экспорта
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }
    
    // Кнопка закрытия периода (только для Финдира и Админа)
    const lockBtn = document.getElementById('btn-lock-period');
    if (lockBtn) {
        if (canLockPeriod()) {
            lockBtn.style.display = 'inline-flex';
            lockBtn.addEventListener('click', () => {
                openModal('lock-period-modal');
            });
        } else {
            lockBtn.style.display = 'none';
        }
    }
    
    // Обработка формы закрытия периода
    const lockForm = document.getElementById('lock-period-form');
    if (lockForm) {
        lockForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLockPeriod();
        });
    }
}

/**
 * Обновляет состояние кнопки переноса остатка
 * @param {boolean} hasPartial - Есть ли выбранные PARTIAL платежи
 */
function updateRolloverButton(hasPartial) {
    const rolloverBtn = document.getElementById('btn-rollover');
    if (rolloverBtn) {
        rolloverBtn.disabled = !hasPartial;
    }
}

/**
 * Открывает модалку создания платежа
 */
async function openPaymentModal(paymentData = null) {
    const modal = document.getElementById('payment-modal');
    const title = document.getElementById('payment-modal-title');
    const form = document.getElementById('payment-form');
    
    if (!modal || !form) return;
    
    // Загружаем справочники
    try {
        const [projects, categories, contractors] = await Promise.all([
            getProjects(),
            getCategories(),
            getContractors()
        ]);
        
        // Заполняем проекты
        const projectSelect = document.getElementById('project-id');
        projectSelect.innerHTML = '';
        
        const user = getCurrentUser();
        projects.forEach(project => {
            // Для РП только его проекты
            if (user.role === USER_ROLES.RP && user.allowed_project_ids) {
                if (!user.allowed_project_ids.includes(project.id)) return;
            }
            
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name || project.code;
            projectSelect.appendChild(option);
        });
        
        // Заполняем категории
        const categorySelect = document.getElementById('category-id');
        categorySelect.innerHTML = '';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
        
        // Заполняем datalist контрагентов
        const contractorsDatalist = document.getElementById('contractors');
        contractorsDatalist.innerHTML = '';
        contractors.forEach(contractor => {
            const option = document.createElement('option');
            option.value = contractor.name;
            contractorsDatalist.appendChild(option);
        });
        
        // Заполняем периоды (недели на год вперед)
        const periodSelect = document.getElementById('period-start');
        periodSelect.innerHTML = '';
        const today = new Date();
        for (let i = 0; i < 52; i++) {
            const weekDate = new Date(today);
            weekDate.setDate(today.getDate() + i * 7);
            const weekNum = getWeekNumber(weekDate);
            const year = weekDate.getFullYear();
            const periodId = `${year}-W${String(weekNum).padStart(2, '0')}`;
            
            const option = document.createElement('option');
            option.value = periodId;
            option.textContent = formatPeriod(periodId);
            periodSelect.appendChild(option);
        }
        
        // Если редактируем существующий платеж
        if (paymentData) {
            title.textContent = 'Редактирование платежа';
            document.getElementById('payment-id').value = paymentData.payment_id || '';
            document.getElementById('project-id').value = paymentData.project_id;
            document.getElementById('category-id').value = paymentData.category_id;
            document.getElementById('contractor-input').value = paymentData.contractor_name || '';
            document.getElementById('period-start').value = paymentData.period_id;
            document.getElementById('amount-plan').value = paymentData.plan;
            document.getElementById('comment').value = paymentData.comment || '';
        } else {
            title.textContent = 'Новый платеж';
            form.reset();
            document.getElementById('payment-id').value = '';
        }
        
        openModal('payment-modal');
        
        // Обработчик отправки формы
        form.onsubmit = async (e) => {
            e.preventDefault();
            await handlePaymentSubmit(paymentData);
        };
        
    } catch (error) {
        console.error('Failed to load dictionaries:', error);
        showToast('Ошибка загрузки справочников', 'error');
    }
}

/**
 * Обрабатывает отправку формы платежа
 * @param {Object} existingPayment - Существующий платеж (если редактируем)
 */
async function handlePaymentSubmit(existingPayment) {
    const paymentId = document.getElementById('payment-id').value;
    const projectId = parseInt(document.getElementById('project-id').value);
    const categoryId = parseInt(document.getElementById('category-id').value);
    const contractorName = document.getElementById('contractor-input').value.trim();
    const periodId = document.getElementById('period-start').value;
    const amountPlan = parseFloat(document.getElementById('amount-plan').value);
    const comment = document.getElementById('comment').value.trim();
    
    // Валидация
    if (!validateAmount(amountPlan).valid) {
        showToast('Некорректная сумма', 'error');
        return;
    }
    
    setLoading(true);
    
    try {
        const paymentData = {
            project_id: projectId,
            category_id: categoryId,
            contractor_name: contractorName,
            period_id: periodId,
            plan: amountPlan,
            comment: comment
        };
        
        if (existingPayment && paymentId) {
            // Редактирование
            await updatePayment(parseInt(paymentId), paymentData);
            showToast('Платеж обновлен', 'success');
        } else {
            // Создание
            await createPayment(paymentData);
            showToast('Платеж создан', 'success');
        }
        
        closeModal('payment-modal');
        
        // Перезагружаем матрицу
        if (typeof loadMatrixData === 'function') {
            loadMatrixData();
        }
        
    } catch (error) {
        console.error('Failed to save payment:', error);
        showToast(error.message || 'Ошибка сохранения платежа', 'error');
    } finally {
        setLoading(false);
    }
}

/**
 * Открывает модалку переноса остатка
 */
async function openRolloverModal() {
    const selectedRow = appState.selectedRow;
    if (!selectedRow) {
        showToast('Выберите платеж для переноса', 'warning');
        return;
    }
    
    // Находим ячейку со статусом PARTIAL
    let partialCell = null;
    let partialPeriodId = null;
    
    for (const [periodId, cellData] of Object.entries(selectedRow.cells || {})) {
        if (cellData.status === 'PARTIAL' && canRolloverPayment(cellData)) {
            partialCell = cellData;
            partialPeriodId = periodId;
            break;
        }
    }
    
    if (!partialCell) {
        showToast('Нет доступных для переноса платежей', 'warning');
        return;
    }
    
    const modal = document.getElementById('rollover-modal');
    if (!modal) return;
    
    // Заполняем информацию
    document.getElementById('rollover-original').textContent = formatCurrency(partialCell.plan);
    document.getElementById('rollover-paid').textContent = formatCurrency(partialCell.fact);
    const remainder = partialCell.plan - partialCell.fact;
    document.getElementById('rollover-remainder').textContent = formatCurrency(remainder);
    document.getElementById('rollover-payment-id').value = partialCell.payment_id;
    
    // Заполняем целевые периоды (только будущие)
    const targetSelect = document.getElementById('rollover-target');
    targetSelect.innerHTML = '';
    
    const today = new Date();
    for (let i = 1; i <= 52; i++) {
        const weekDate = new Date(today);
        weekDate.setDate(today.getDate() + i * 7);
        const weekNum = getWeekNumber(weekDate);
        const year = weekDate.getFullYear();
        const periodId = `${year}-W${String(weekNum).padStart(2, '0')}`;
        
        const option = document.createElement('option');
        option.value = periodId;
        option.textContent = formatPeriod(periodId);
        targetSelect.appendChild(option);
    }
    
    openModal('rollover-modal');
    
    // Обработчик отправки
    const form = document.getElementById('rollover-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        await handleRolloverSubmit(partialCell, remainder);
    };
}

/**
 * Обрабатывает перенос остатка
 * @param {Object} sourcePayment - Исходный платеж
 * @param {number} remainder - Остаток к переносу
 */
async function handleRolloverSubmit(sourcePayment, remainder) {
    const targetPeriodId = document.getElementById('rollover-target').value;
    const paymentId = document.getElementById('rollover-payment-id').value;
    
    setLoading(true);
    
    try {
        await rolloverPayment({
            source_payment_id: parseInt(paymentId),
            target_period_id: targetPeriodId,
            amount: remainder
        });
        
        showToast('Остаток перенесен', 'success');
        closeModal('rollover-modal');
        
        // Перезагружаем матрицу
        if (typeof loadMatrixData === 'function') {
            loadMatrixData();
        }
        
    } catch (error) {
        console.error('Failed to rollover payment:', error);
        showToast(error.message || 'Ошибка переноса остатка', 'error');
    } finally {
        setLoading(false);
    }
}

/**
 * Обрабатывает закрытие периода
 */
async function handleLockPeriod() {
    const period = document.getElementById('lock-month').value;
    
    if (!period) {
        showToast('Выберите период', 'warning');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите закрыть этот период?')) {
        return;
    }
    
    setLoading(true);
    
    try {
        await lockPeriod(period);
        showToast('Период закрыт', 'success');
        closeModal('lock-period-modal');
        
        // Перезагружаем матрицу
        if (typeof loadMatrixData === 'function') {
            loadMatrixData();
        }
        
    } catch (error) {
        console.error('Failed to lock period:', error);
        showToast(error.message || 'Ошибка закрытия периода', 'error');
    } finally {
        setLoading(false);
    }
}

/**
 * Экспорт в CSV
 */
function exportToCSV() {
    const data = appState.matrixData;
    if (!data || !data.rows) {
        showToast('Нет данных для экспорта', 'warning');
        return;
    }
    
    // Формируем CSV
    const headers = ['Статья', 'Контрагент', 'Проект', ...data.periods.map(p => p.label)];
    const rows = data.rows.map(row => [
        row.category_name,
        row.contractor_name,
        row.project_name,
        ...data.periods.map(p => {
            const cell = row.cells[p.id];
            return cell ? cell.plan : '';
        })
    ]);
    
    const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
    ].join('\n');
    
    // Создаем файл для скачивания
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payment_calendar_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast('Экспорт выполнен', 'success');
}

/**
 * Вспомогательная функция: номер недели
 * @param {Date} date - Дата
 * @returns {number} Номер недели
 */
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Инициализация при загрузке
 */
document.addEventListener('DOMContentLoaded', () => {
    initToolbar();
});

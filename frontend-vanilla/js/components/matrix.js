/**
 * Компонент матрицы платежей (AG Grid)
 */

let gridApi = null;
let gridColumnApi = null;

/**
 * Инициализирует матрицу платежей
 */
function initMatrix() {
    const gridElement = document.getElementById('grid');
    if (!gridElement) return;
    
    // Конфигурация колонок
    const columnDefs = [
        {
            headerName: 'Статья бюджета',
            field: 'category_name',
            width: 200,
            pinned: 'left',
            lockPosition: true,
            cellStyle: { fontWeight: '500' }
        },
        {
            headerName: 'Контрагент',
            field: 'contractor_name',
            width: 250,
            pinned: 'left',
            lockPosition: true
        },
        {
            headerName: 'Комментарий',
            field: 'comment',
            width: 150,
            pinned: 'left',
            lockPosition: true,
            editable: true,
            cellEditor: 'agTextCellEditor',
            onCellValueChanged: async (event) => {
                if (event.data && event.data.cells) {
                    // Находим первую ячейку с payment_id
                    for (const cell of Object.values(event.data.cells)) {
                        if (cell.payment_id) {
                            await updatePayment(cell.payment_id, { comment: event.newValue });
                            showToast('Комментарий обновлен', 'success');
                            break;
                        }
                    }
                }
            }
        },
        {
            headerName: 'План',
            field: 'total_plan',
            width: 120,
            cellRenderer: planCellRenderer
        },
        {
            headerName: 'Факт',
            field: 'total_fact',
            width: 120,
            cellRenderer: factCellRenderer,
            onCellClicked: async (event) => {
                if (event.data && event.data.cells) {
                    // Проверяем, есть ли ячейки для фиксации факта
                    for (const [periodId, cellData] of Object.entries(event.data.cells)) {
                        if (cellData && canFixFact(cellData)) {
                            openFactModal(cellData, periodId);
                            return;
                        }
                    }
                }
            }
        },
        {
            headerName: 'Остаток',
            field: 'remainder',
            width: 100,
            cellRenderer: remainderCellRenderer
        }
        // Динамические колонки недель будут добавлены позже
    ];
    
    // Настройки grid
    const gridOptions = {
        columnDefs: columnDefs,
        rowData: [],
        defaultColDef: {
            resizable: true,
            sortable: false,
            filter: false,
            suppressMenu: true
        },
        rowHeight: 45,
        headerHeight: 40,
        domLayout: 'normal',
        enableRangeSelection: false,
        stopEditingWhenCellsLoseFocus: true,
        onGridReady: (params) => {
            gridApi = params.api;
            gridColumnApi = params.columnApi;
        },
        onRowSelected: (event) => {
            if (event.node.isSelected()) {
                appState.selectedRow = event.data;
                updateRolloverButton(true);
            }
        },
        getRowClass: (params) => {
            // Подсветка выбранной строки
            if (params.data === appState.selectedRow) {
                return 'row-selected';
            }
            return null;
        },
        getRowStyle: (params) => {
            // Стили для строк
            return { cursor: 'pointer' };
        },
        onCellMouseOver: (event) => {
            // Показываем tooltip с информацией о платеже
            if (event.value && typeof event.value === 'object') {
                event.event.target.title = formatCellTooltip(event.value);
            }
        }
    };
    
    // Создаем grid
    new agGrid.Grid(gridElement, gridOptions);
    
    return gridOptions;
}

/**
 * Рендерер ячейки плана
 */
function planCellRenderer(params) {
    if (!params.data || !params.data.cells) return '—';
    
    let totalPlan = 0;
    let hasData = false;
    
    for (const cell of Object.values(params.data.cells)) {
        if (cell && cell.plan) {
            totalPlan += cell.plan;
            hasData = true;
        }
    }
    
    if (!hasData) return '—';
    
    return `<span class="highlight">${formatCurrency(totalPlan)}</span>`;
}

/**
 * Рендерер ячейки факта
 */
function factCellRenderer(params) {
    if (!params.data || !params.data.cells) return '—';
    
    let totalFact = 0;
    let hasData = false;
    
    for (const cell of Object.values(params.data.cells)) {
        if (cell && cell.fact !== undefined) {
            totalFact += cell.fact;
            hasData = true;
        }
    }
    
    if (!hasData) return '—';
    
    return `<span>${formatCurrency(totalFact)}</span>`;
}

/**
 * Рендерер ячейки остатка
 */
function remainderCellRenderer(params) {
    if (!params.data || !params.data.cells) return '—';
    
    let remainder = 0;
    let hasData = false;
    
    for (const cell of Object.values(params.data.cells)) {
        if (cell && cell.plan !== undefined && cell.fact !== undefined) {
            remainder += (cell.plan - cell.fact);
            hasData = true;
        }
    }
    
    if (!hasData) return '—';
    
    const className = remainder > 0 ? 'highlight' : '';
    return `<span class="${className}">${formatCurrency(remainder)}</span>`;
}

/**
 * Загружает данные матрицы
 */
async function loadMatrixData() {
    setLoading(true);
    
    try {
        const filters = getFilters();
        
        // Формируем параметры запроса
        const params = {
            period_type: filters.periodType
        };
        
        if (filters.dateFrom) params.date_from = filters.dateFrom;
        if (filters.dateTo) params.date_to = filters.dateTo;
        
        if (filters.projectIds && filters.projectIds.length > 0) {
            params.project_ids = filters.projectIds;
        }
        
        if (filters.categoryIds && filters.categoryIds.length > 0) {
            params.category_ids = filters.categoryIds;
        }
        
        if (filters.contractorSearch) {
            params.contractor_search = filters.contractorSearch;
        }
        
        const data = await getMatrixData(params);
        appState.matrixData = data;
        
        // Обновляем grid
        updateMatrixData(data);
        
        // Обновляем footer
        updateFooter(data.totals);
        
    } catch (error) {
        console.error('Failed to load matrix data:', error);
        
        // Используем демо-данные если API недоступно
        if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
            showToast('API недоступно, используем демо-данные', 'warning');
            loadDemoData();
        } else {
            showToast(error.message || 'Ошибка загрузки данных', 'error');
        }
    } finally {
        setLoading(false);
    }
}

/**
 * Обновляет данные в grid
 * @param {Object} data - Данные матрицы
 */
function updateMatrixData(data) {
    if (!gridApi) return;
    
    // Добавляем динамические колонки для периодов
    const periodCols = (data.periods || []).map(period => ({
        headerName: period.label || formatPeriod(period.id),
        field: `period_${period.id}`,
        width: 100,
        cellRenderer: (params) => renderPeriodCell(params, period.id, data),
        editable: (params) => isCellEditable(params, period.id),
        cellClass: (params) => getCellClass(params, period.id, data),
        onCellClicked: (params) => handleCellClick(params, period.id, data),
        onCellValueChanged: (params) => handleCellValueChanged(params, period.id)
    }));
    
    // Обновляем определения колонок
    const existingCols = gridColumnApi.getColumnDefs().filter(col => 
        !col.field || !col.field.startsWith('period_')
    );
    
    gridColumnApi.setColumnDefs([...existingCols, ...periodCols]);
    
    // Преобразуем данные для grid
    const rowData = (data.rows || []).map(row => {
        const gridRow = {
            ...row,
            total_plan: row.cells ? Object.values(row.cells).reduce((sum, c) => sum + (c?.plan || 0), 0) : 0,
            total_fact: row.cells ? Object.values(row.cells).reduce((sum, c) => sum + (c?.fact || 0), 0) : 0,
            remainder: row.cells ? Object.values(row.cells).reduce((sum, c) => sum + ((c?.plan || 0) - (c?.fact || 0)), 0) : 0
        };
        
        // Добавляем данные по периодам
        (data.periods || []).forEach(period => {
            const cellData = row.cells ? row.cells[period.id] : null;
            gridRow[`period_${period.id}`] = cellData;
        });
        
        return gridRow;
    });
    
    gridApi.setRowData(rowData);
    
    // Авто-размер колонок
    gridColumnApi.autoSizeAllColumns();
}

/**
 * Рендерер ячейки периода
 */
function renderPeriodCell(params, periodId, data) {
    const cellData = params.value;
    
    if (!cellData) return '<span style="color: #ccc;">—</span>';
    
    const status = cellData.status;
    const icon = getStatusIcon(status);
    const statusClass = getCellStatusClass(cellData);
    
    // Форматируем отображение в зависимости от статуса
    let displayValue = '';
    
    if (status === 'PARTIAL') {
        displayValue = `${formatCurrency(cellData.fact)} / ${formatCurrency(cellData.plan)}`;
    } else if (cellData.plan !== undefined) {
        displayValue = formatCurrency(cellData.plan);
    } else {
        displayValue = '—';
    }
    
    return `<span class="status-icon">${icon}</span>${displayValue}`;
}

/**
 * Проверяет, можно ли редактировать ячейку
 */
function isCellEditable(params, periodId) {
    const cellData = params.value;
    if (!cellData) return false;
    
    return canEditPayment(cellData);
}

/**
 * Получает CSS класс для ячейки
 */
function getCellClass(params, periodId, data) {
    const cellData = params.value;
    if (!cellData) return '';
    
    return getCellStatusClass(cellData);
}

/**
 * Обработчик клика по ячейке
 */
function handleCellClick(params, periodId, data) {
    const cellData = params.value;
    
    if (!cellData) {
        // Пустая ячейка - создаем новый платеж
        openPaymentModal({
            project_id: params.data.project_id,
            category_id: params.data.category_id,
            contractor_name: params.data.contractor_name,
            period_id: periodId
        });
        return;
    }
    
    // Если можно редактировать - открываем модалку
    if (canEditPayment(cellData)) {
        openPaymentModal({
            payment_id: cellData.payment_id,
            project_id: params.data.project_id,
            category_id: params.data.category_id,
            contractor_name: params.data.contractor_name,
            period_id: periodId,
            plan: cellData.plan,
            comment: params.data.comment
        });
    } else if (canFixFact(cellData)) {
        // Если можно фиксировать факт
        openFactModal(cellData, periodId);
    }
}

/**
 * Обработчик изменения значения ячейки
 */
async function handleCellValueChanged(params, periodId) {
    const cellData = params.value;
    if (!cellData || !cellData.payment_id) return;
    
    try {
        const newValue = parseFloat(params.newValue);
        if (isNaN(newValue)) return;
        
        await updatePayment(cellData.payment_id, { plan: newValue });
        showToast('Сумма обновлена', 'success');
        
        // Перезагружаем данные
        loadMatrixData();
        
    } catch (error) {
        console.error('Failed to update cell:', error);
        showToast('Ошибка обновления', 'error');
        loadMatrixData(); // Откат изменений
    }
}

/**
 * Форматирует tooltip для ячейки
 */
function formatCellTooltip(cellData) {
    if (!cellData) return '';
    
    const lines = [
        `Статус: ${cellData.status}`,
        `План: ${formatCurrency(cellData.plan)}`,
        `Факт: ${formatCurrency(cellData.fact)}`
    ];
    
    if (cellData.comment) {
        lines.push(`Комментарий: ${cellData.comment}`);
    }
    
    return lines.join('\n');
}

/**
 * Обновляет footer с итогами
 * @param {Object} totals - Итоговые данные
 */
function updateFooter(totals) {
    const totalPlanEl = document.getElementById('footer-total-plan');
    const totalFactEl = document.getElementById('footer-total-fact');
    const cashBalanceEl = document.getElementById('footer-cash-balance');
    
    if (!totals) {
        if (totalPlanEl) totalPlanEl.textContent = '0 ₽';
        if (totalFactEl) totalFactEl.textContent = '0 ₽';
        if (cashBalanceEl) cashBalanceEl.textContent = '0 ₽';
        return;
    }
    
    let sumPlan = 0;
    let sumFact = 0;
    
    for (const periodTotal of Object.values(totals)) {
        sumPlan += periodTotal.plan || 0;
        sumFact += periodTotal.fact || 0;
    }
    
    if (totalPlanEl) totalPlanEl.textContent = formatCurrency(sumPlan);
    if (totalFactEl) totalFactEl.textContent = formatCurrency(sumFact);
    if (cashBalanceEl) cashBalanceEl.textContent = formatCurrency(sumPlan - sumFact);
}

/**
 * Открывает модалку фиксации факта
 * @param {Object} cellData - Данные ячейки
 * @param {string} periodId - ID периода
 */
function openFactModal(cellData, periodId) {
    const modal = document.getElementById('fact-modal');
    if (!modal) return;
    
    document.getElementById('fact-payment-id').value = cellData.payment_id;
    document.getElementById('fact-plan').textContent = formatCurrency(cellData.plan);
    document.getElementById('fact-amount').value = cellData.fact || 0;
    document.getElementById('fact-amount').max = cellData.plan;
    
    const warningEl = document.getElementById('fact-warning');
    const remainderEl = document.getElementById('fact-remainder');
    
    // Обработчик изменения суммы факта
    const factInput = document.getElementById('fact-amount');
    factInput.oninput = () => {
        const factAmount = parseFloat(factInput.value) || 0;
        const remainder = cellData.plan - factAmount;
        
        if (remainder > 0) {
            warningEl.style.display = 'block';
            remainderEl.textContent = remainder.toFixed(2);
        } else {
            warningEl.style.display = 'none';
        }
    };
    
    // Инициализируем warning
    factInput.oninput();
    
    openModal('fact-modal');
    
    // Обработчик отправки
    const form = document.getElementById('fact-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        await handleFactSubmit(cellData, periodId);
    };
}

/**
 * Обрабатывает фиксацию факта оплаты
 * @param {Object} cellData - Данные ячейки
 * @param {string} periodId - ID периода
 */
async function handleFactSubmit(cellData, periodId) {
    const paymentId = document.getElementById('fact-payment-id').value;
    const factAmount = parseFloat(document.getElementById('fact-amount').value);
    
    // Валидация
    const validation = validateFactAmount(factAmount, cellData.plan);
    if (!validation.valid) {
        showToast(validation.message, 'error');
        return;
    }
    
    setLoading(true);
    
    try {
        await fixFact({
            payment_id: parseInt(paymentId),
            fact_amount: factAmount
        });
        
        showToast('Факт оплаты зафиксирован', 'success');
        closeModal('fact-modal');
        
        // Перезагружаем матрицу
        loadMatrixData();
        
    } catch (error) {
        console.error('Failed to fix fact:', error);
        showToast(error.message || 'Ошибка фиксации факта', 'error');
    } finally {
        setLoading(false);
    }
}

/**
 * Загружает демо-данные (если API недоступно)
 */
function loadDemoData() {
    const demoData = {
        periods: [
            { id: '2026-W23', label: '23 (01.06-07.06)', start: '2026-06-01' },
            { id: '2026-W24', label: '24 (08.06-14.06)', start: '2026-06-08' },
            { id: '2026-W25', label: '25 (15.06-21.06)', start: '2026-06-15' },
            { id: '2026-W26', label: '26 (22.06-28.06)', start: '2026-06-22' }
        ],
        rows: [
            {
                id: 'row-1',
                project_id: 5,
                project_name: '25_004_РВК',
                contractor_id: 12,
                contractor_name: 'ЭЛЕКТРОТЕХМОНТАЖ ТД АО',
                category_id: 3,
                category_name: 'Технологическое присоединение',
                cells: {
                    '2026-W23': { payment_id: 101, plan: 1306, fact: 1306, status: 'PAID', is_locked: false },
                    '2026-W24': { payment_id: 102, plan: 432, fact: 0, status: 'DRAFT', is_locked: false },
                    '2026-W25': null,
                    '2026-W26': null
                }
            },
            {
                id: 'row-2',
                project_id: 6,
                project_name: '25_006_Тучков',
                contractor_id: 15,
                contractor_name: 'СТРОЙСЕРВИС ООО',
                category_id: 5,
                category_name: 'Обслуживание сетей',
                cells: {
                    '2026-W23': { payment_id: 103, plan: 1000, fact: 600, status: 'PARTIAL', is_locked: false },
                    '2026-W24': { payment_id: 104, plan: 500, fact: 0, status: 'APPROVED', is_locked: false },
                    '2026-W25': null,
                    '2026-W26': null
                }
            }
        ],
        totals: {
            '2026-W23': { plan: 2306, fact: 1906 },
            '2026-W24': { plan: 932, fact: 0 },
            '2026-W25': { plan: 0, fact: 0 },
            '2026-W26': { plan: 0, fact: 0 }
        }
    };
    
    appState.matrixData = demoData;
    updateMatrixData(demoData);
    updateFooter(demoData.totals);
}

/**
 * Инициализация при загрузке
 */
document.addEventListener('DOMContentLoaded', () => {
    initMatrix();
});

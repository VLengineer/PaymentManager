/**
 * Модуль матрицы платежей на AG Grid
 * @module matrix
 */

import { getState, canEditPayment } from '../state.js';
import { getCalendarMatrix } from '../api.js';
import { 
  getCellStatus, 
  getCellClass, 
  getStatusIcon, 
  getCellText,
  formatCurrency 
} from '../utils/formatters.js';
import { showFactModal, showRolloverModal, showToast } from './modals.js';

let gridApi = null;
let gridColumnApi = null;

/**
 * Инициализировать матрицу
 */
async function initMatrix() {
  // Проверяем что AG Grid загружен
  if (typeof agGrid === 'undefined') {
    console.error('AG Grid не загружен');
    return;
  }
  
  const gridOptions = {
    defaultColDef: {
      resizable: true,
      sortable: false,
      filter: false,
      minWidth: 100,
    },
    
    columnDefs: getColumnDefs(),
    
    rowData: [],
    
    // Закрепление колонок
    pinnedLeftColumnKeys: ['article', 'contractor', 'comment'],
    
    // Высота строки
    rowHeight: 45,
    
    // Рендеринг
    domLayout: 'normal',
    
    // События
    onGridReady: onGridReady,
    onCellClicked: onCellClicked,
    onCellDoubleClicked: onCellDoubleClicked,
    
    // Стилизация ячеек
    cellStyle: getCellStyle,
    
    // Авто-размер колонок
    autosizePageSize: 100,
  };
  
  const gridElement = document.querySelector('#matrix-grid');
  if (gridElement) {
    new agGrid.Grid(gridElement, gridOptions);
  }
}

/**
 * Получить конфигурацию колонок
 */
function getColumnDefs() {
  const state = getState();
  const periods = state.matrixData?.periods || [];
  
  const columnDefs = [
    {
      headerName: 'Статья бюджета',
      field: 'category_name',
      width: 200,
      pinned: 'left',
      lockPosition: true,
    },
    {
      headerName: 'Контрагент',
      field: 'contractor_name',
      width: 250,
      pinned: 'left',
    },
    {
      headerName: 'Комментарий',
      field: 'comment',
      width: 150,
      pinned: 'left',
      editable: (params) => canEditPayment(params.data),
      cellRenderer: commentCellRenderer,
    },
    {
      headerName: 'План',
      field: 'total_plan',
      width: 120,
      valueFormatter: (params) => formatCurrency(params.value),
    },
    {
      headerName: 'Факт',
      field: 'total_fact',
      width: 120,
      valueFormatter: (params) => formatCurrency(params.value),
    },
    {
      headerName: 'Остаток',
      field: 'remainder',
      width: 100,
      valueFormatter: (params) => formatCurrency(params.value),
    },
  ];
  
  // Добавляем колонки периодов (недель)
  periods.forEach(period => {
    columnDefs.push({
      headerName: period.label,
      field: `cell_${period.id}`,
      width: 100,
      cellRenderer: periodCellRenderer,
      cellStyle: getPeriodCellStyle,
      editable: (params) => {
        const cellData = params.value;
        if (!cellData || !cellData.payment_id) return false;
        return canEditPayment(cellData);
      },
    });
  });
  
  return columnDefs;
}

/**
 * Рендерер для комментария
 */
function commentCellRenderer(params) {
  if (!params.value) return '—';
  return `<span title="${escapeHtml(params.value)}">${escapeHtml(params.value)}</span>`;
}

/**
 * Рендерер для ячеек периодов
 */
function periodCellRenderer(params) {
  const cellData = params.value;
  const status = getCellStatus(cellData);
  const icon = getStatusIcon(status);
  const text = getCellText(cellData, status);
  const cssClass = getCellClass(status);
  
  let html = `<div class="cell-content ${cssClass}">`;
  
  if (icon) {
    html += `<span class="cell-status-icon">${icon}</span>`;
  }
  
  html += `<span>${text}</span>`;
  
  // Кнопка переноса для PARTIAL статуса
  if (status === 'PARTIAL' && canEditPayment(cellData)) {
    html += `<button class="btn-rollover-cell" data-payment='${JSON.stringify(cellData).replace(/'/g, "&apos;")}'>Перенести</button>`;
  }
  
  html += '</div>';
  
  return html;
}

/**
 * Получить стиль ячейки
 */
function getCellStyle(params) {
  if (!params.column) return {};
  
  const colId = params.column.getColId();
  
  // Для колонок периодов
  if (colId.startsWith('cell_')) {
    const cellData = params.value;
    const status = getCellStatus(cellData);
    const cssClass = getCellClass(status);
    
    return {
      className: cssClass,
      cursor: canEditPayment(cellData) ? 'pointer' : 'default',
    };
  }
  
  return {};
}

/**
 * Получить стиль для ячейки периода
 */
function getPeriodCellStyle(params) {
  const cellData = params.value;
  const status = getCellStatus(cellData);
  const cssClass = getCellClass(status);
  
  return {
    class: cssClass,
  };
}

/**
 * Обработчик готовности сетки
 */
function onGridReady(params) {
  gridApi = params.api;
  gridColumnApi = params.columnApi;
  
  // Загружаем данные
  loadMatrixData();
}

/**
 * Загрузить данные матрицы
 */
async function loadMatrixData() {
  const state = getState();
  const filters = state.filters;
  
  try {
    const data = await getCalendarMatrix(filters);
    
    if (data) {
      state.matrixData = data;
      
      // Преобразуем данные для AG Grid
      const rowData = transformDataForGrid(data);
      
      // Обновляем колонки (периоды могли измениться)
      updateColumnDefs(data.periods);
      
      // Устанавливаем данные
      gridApi.setRowData(rowData);
      
      // Авто-размер колонок
      gridColumnApi.autoSizeAllColumns();
      
      // Обновляем footer
      updateFooter(data.totals);
    }
  } catch (error) {
    console.error('Failed to load matrix data:', error);
    showToast('Ошибка загрузки данных матрицы', 'error');
  }
}

/**
 * Преобразовать данные для сетки
 */
function transformDataForGrid(data) {
  if (!data.rows) return [];
  
  return data.rows.map(row => {
    const gridRow = {
      id: row.id,
      category_name: row.category_name,
      contractor_name: row.contractor_name,
      comment: row.comment || '',
      project_id: row.project_id,
      total_plan: row.total_plan || 0,
      total_fact: row.total_fact || 0,
      remainder: (row.total_plan || 0) - (row.total_fact || 0),
    };
    
    // Добавляем ячейки периодов
    if (row.cells) {
      Object.keys(row.cells).forEach(periodId => {
        gridRow[`cell_${periodId}`] = row.cells[periodId];
      });
    }
    
    return gridRow;
  });
}

/**
 * Обновить определения колонок
 */
function updateColumnDefs(periods) {
  const newColumnDefs = getColumnDefs();
  gridApi.setColumnDefs(newColumnDefs);
}

/**
 * Обработчик клика по ячейке
 */
function onCellClicked(params) {
  if (!params.column) return;
  
  const colId = params.column.getColId();
  
  // Если клик по кнопке переноса
  if (params.event.target.classList.contains('btn-rollover-cell')) {
    const paymentData = JSON.parse(params.event.target.dataset.payment);
    handleRolloverClick(paymentData);
    return;
  }
  
  // Если клик по ячейке периода
  if (colId.startsWith('cell_')) {
    const cellData = params.value;
    const status = getCellStatus(cellData);
    
    // Открываем модалку факта для Финдира
    const user = getState().user;
    if (user?.role === 'FIN_DIRECTOR' && cellData?.payment_id) {
      showFactModal(cellData);
    }
  }
}

/**
 * Обработчик двойного клика по ячейке
 */
function onCellDoubleClicked(params) {
  if (!params.column) return;
  
  const colId = params.column.getColId();
  
  // Если двойной клик по комментарию или ячейке периода
  if (colId === 'comment' || colId.startsWith('cell_')) {
    const user = getState().user;
    const cellData = params.value;
    
    // Проверяем права на редактирование
    if (canEditPayment(cellData || {})) {
      // Открываем модалку редактирования
      showToast('Редактирование платежа', 'info');
    } else {
      showToast('Нет прав на редактирование', 'warning');
    }
  }
}

/**
 * Обработчик клика по кнопке переноса
 */
function handleRolloverClick(paymentData) {
  const state = getState();
  const periods = state.matrixData?.periods || [];
  
  // Фильтруем только будущие периоды
  const now = new Date();
  const futurePeriods = periods.filter(p => {
    const periodDate = new Date(p.start);
    return periodDate > now;
  });
  
  showRolloverModal(paymentData, futurePeriods);
}

/**
 * Обновить footer с итогами
 */
function updateFooter(totals) {
  const planTotalEl = document.getElementById('footer-plan-total');
  const factTotalEl = document.getElementById('footer-fact-total');
  
  if (!totals) return;
  
  let totalPlan = 0;
  let totalFact = 0;
  
  Object.values(totals).forEach(periodTotal => {
    totalPlan += periodTotal.plan || 0;
    totalFact += periodTotal.fact || 0;
  });
  
  if (planTotalEl) {
    planTotalEl.textContent = formatCurrency(totalPlan);
  }
  
  if (factTotalEl) {
    factTotalEl.textContent = formatCurrency(totalFact);
  }
}

/**
 * Обновить матрицу (при изменении фильтров)
 */
function refreshMatrix() {
  if (gridApi) {
    loadMatrixData();
  }
}

/**
 * Экранировать HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export {
  initMatrix,
  refreshMatrix,
};

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import type { ColDef, CellClassParams } from 'ag-grid-community';
import dayjs from 'dayjs';
import { calendarApi, dictionaryApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import type { CalendarMatrixCell, PaymentStatus, Project } from '@/types';

const authStore = useAuthStore();

// Data
const rowData = ref<CalendarMatrixCell[]>([]);
const columnDefs = ref<ColDef[]>([]);
const projects = ref<Project[]>([]);
const selectedProject = ref<number | null>(null);
const dateFrom = ref(dayjs().startOf('week').format('YYYY-MM-DD'));
const dateTo = ref(dayjs().add(4, 'week').endOf('week').format('YYYY-MM-DD'));
const loading = ref(false);

// Grid default options
const defaultColDef = ref<ColDef>({
  sortable: true,
  filter: true,
  resizable: true,
  minWidth: 100,
});

// Computed
const canEditFact = computed(() => authStore.isFinDirector || authStore.isAdmin);
const isRP = computed(() => authStore.isRP);

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    // Load dictionaries
    projects.value = await dictionaryApi.getProjects();
    
    // Load matrix data
    const matrixData = await calendarApi.getMatrix({
      project_ids: selectedProject.value ? [selectedProject.value] : undefined,
      date_from: dateFrom.value,
      date_to: dateTo.value,
      group_by: 'category',
    });

    // Transform data for grid
    rowData.value = matrixData.rows;
    buildColumnDefs(matrixData.columns);
  } catch (error) {
    console.error('Failed to load data:', error);
  } finally {
    loading.value = false;
  }
}

function buildColumnDefs(periods: string[]) {
  columnDefs.value = [
    {
      headerName: 'Проект',
      field: 'project_name',
      pinned: 'left',
      width: 200,
      cellStyle: { fontWeight: 'bold' },
    },
    {
      headerName: 'Контрагент',
      field: 'contractor_name',
      pinned: 'left',
      width: 250,
    },
    {
      headerName: 'Статья бюджета',
      field: 'category_name',
      pinned: 'left',
      width: 200,
    },
    ...periods.map((period) => ({
      headerName: dayjs(period).format('DD.MM.YYYY'),
      field: `period_${period}`,
      width: 120,
      cellRenderer: (params: any) => {
        const cell = params.data as CalendarMatrixCell;
        if (!cell || cell.period_start !== period) return '-';
        
        const status = cell.status;
        const plan = cell.amount_plan;
        const fact = cell.amount_fact;
        const rollover = cell.amount_rollover;
        
        let displayValue = `${plan}`;
        if (fact > 0) {
          displayValue = `${fact} / ${plan}`;
        }
        if (rollover > 0) {
          displayValue += ` ↷${rollover}`;
        }
        
        return displayValue;
      },
      cellClass: (params: CellClassParams) => {
        const cell = params.data as CalendarMatrixCell;
        if (!cell || cell.period_start !== params.colDef.field?.replace('period_', '')) return '';
        
        const statusClasses: Record<PaymentStatus, string> = {
          DRAFT: 'status-draft',
          APPROVED: 'status-approved',
          PARTIAL: 'status-partial',
          PAID: 'status-paid',
          CANCELLED: 'status-cancelled',
        };
        
        return statusClasses[cell.status] || '';
      },
      editable: (params: any) => {
        const cell = params.data as CalendarMatrixCell;
        return !cell?.is_locked && canEditFact.value;
      },
    })),
  ];
}

async function refreshData() {
  await loadData();
}
</script>

<template>
  <div class="calendar-container">
    <header class="header">
      <h1>Платежный календарь</h1>
      
      <div class="filters">
        <select v-model="selectedProject" @change="loadData">
          <option :value="null">Все проекты</option>
          <option v-for="proj in projects" :key="proj.id" :value="proj.id">
            {{ proj.cfo_code }} - {{ proj.name }}
          </option>
        </select>
        
        <input v-model="dateFrom" type="date" @change="loadData" />
        <span>—</span>
        <input v-model="dateTo" type="date" @change="loadData" />
        
        <button @click="refreshData" :disabled="loading" class="btn-refresh">
          {{ loading ? 'Загрузка...' : 'Обновить' }}
        </button>
      </div>
      
      <div class="user-info">
        <span>{{ authStore.user?.username }}</span>
        <span class="role-badge">{{ authStore.user?.role }}</span>
        <button @click="authStore.logout()" class="btn-logout">Выйти</button>
      </div>
    </header>

    <div class="grid-container">
      <ag-grid-vue
        v-if="rowData.length > 0"
        :rowData="rowData"
        :columnDefs="columnDefs"
        :defaultColDef="defaultColDef"
        class="ag-theme-alpine"
        style="width: 100%; height: 100%"
        :domLayoutType="'normal'"
      ></ag-grid-vue>
      
      <div v-else class="no-data">
        Нет данных для отображения
      </div>
    </div>

    <div class="legend">
      <div class="legend-item">
        <span class="status-dot status-draft"></span>
        <span>План (DRAFT)</span>
      </div>
      <div class="legend-item">
        <span class="status-dot status-partial"></span>
        <span>Частично оплачено</span>
      </div>
      <div class="legend-item">
        <span class="status-dot status-paid"></span>
        <span>Оплачено</span>
      </div>
    </div>
  </div>
</template>

<style>
@import 'ag-grid-community/styles/ag-grid.css';
@import 'ag-grid-community/styles/ag-theme-alpine.css';
</style>

<style scoped>
.calendar-container {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  background: white;
  padding: 20px 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 15px;
}

.header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.filters {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filters select,
.filters input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.btn-refresh {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-refresh:disabled {
  opacity: 0.7;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.role-badge {
  background: #667eea;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.btn-logout {
  padding: 6px 12px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.grid-container {
  padding: 20px 30px;
  height: calc(100vh - 180px);
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 18px;
}

.legend {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: white;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  gap: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-dot.status-draft {
  background: #f39c12;
}

.status-dot.status-partial {
  background: #e67e22;
}

.status-dot.status-paid {
  background: #27ae60;
}

/* AG Grid custom styles */
:deep(.status-draft) {
  background-color: rgba(243, 156, 18, 0.1) !important;
}

:deep(.status-partial) {
  background-color: rgba(230, 126, 34, 0.15) !important;
}

:deep(.status-paid) {
  background-color: rgba(39, 174, 96, 0.15) !important;
}

:deep(.status-cancelled) {
  background-color: rgba(149, 165, 166, 0.15) !important;
}
</style>

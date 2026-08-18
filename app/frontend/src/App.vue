<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface HealthStatus {
  status: string
  db_type: string
}

const health = ref<HealthStatus | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const response = await fetch('/api/health')
    health.value = await response.json()
  } catch (error) {
    console.error('Failed to fetch health:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container">
    <h1>📊 Платежный календарь (БДДС)</h1>
    
    <div class="status-card" v-if="!loading && health">
      <h2>✅ Бэкенд подключен</h2>
      <p><strong>Статус:</strong> {{ health.status }}</p>
      <p><strong>База данных:</strong> {{ health.db_type }}</p>
    </div>
    
    <div class="status-card error" v-else-if="!loading">
      <h2>❌ Ошибка подключения</h2>
      <p>Проверьте, запущен ли бэкенд на порту 8000</p>
    </div>
    
    <div class="loading" v-else>
      <p>Загрузка...</p>
    </div>
    
    <div class="info-section">
      <h3>🚀 Быстрый старт</h3>
      <ol>
        <li>Убедитесь, что бэкенд запущен: <code>cd /workspace/app/backend && source venv/bin/activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000</code></li>
        <li>Откройте Swagger UI: <a href="http://localhost:8000/docs" target="_blank">http://localhost:8000/docs</a></li>
        <li>Тестовые пользователи:
          <ul>
            <li><code>admin / admin123</code> - Администратор</li>
            <li><code>fin_director / fin123</code> - Финансовый директор</li>
            <li><code>rp_user / rp123</code> - Руководитель проекта</li>
          </ul>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h1 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 40px;
}

.status-card {
  background: #f8f9fa;
  border-left: 4px solid #28a745;
  padding: 20px;
  margin-bottom: 30px;
  border-radius: 4px;
}

.status-card.error {
  border-left-color: #dc3545;
  background: #fff5f5;
}

.status-card h2 {
  margin-top: 0;
  color: #2c3e50;
}

.status-card p {
  margin: 10px 0;
  color: #666;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.info-section {
  background: #e7f3ff;
  padding: 20px;
  border-radius: 8px;
  margin-top: 30px;
}

.info-section h3 {
  margin-top: 0;
  color: #0066cc;
}

.info-section ol {
  line-height: 1.8;
}

.info-section code {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.info-section a {
  color: #0066cc;
  text-decoration: none;
}

.info-section a:hover {
  text-decoration: underline;
}
</style>

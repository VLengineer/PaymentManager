document.addEventListener('DOMContentLoaded', function() {
    const statusCard = document.getElementById('status-card');
    const errorCard = document.getElementById('error-card');
    const loadingDiv = document.getElementById('loading');
    const healthStatusSpan = document.getElementById('health-status');
    const healthDbTypeSpan = document.getElementById('health-db-type');

    async function fetchHealth() {
        try {
            const response = await fetch('/api/health');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const health = await response.json();
            
            // Скрываем загрузку и ошибку, показываем успешный статус
            loadingDiv.style.display = 'none';
            errorCard.style.display = 'none';
            statusCard.style.display = 'block';
            
            // Заполняем данными
            healthStatusSpan.textContent = health.status;
            healthDbTypeSpan.textContent = health.db_type;
        } catch (error) {
            console.error('Failed to fetch health:', error);
            
            // Скрываем загрузку и успех, показываем ошибку
            loadingDiv.style.display = 'none';
            statusCard.style.display = 'none';
            errorCard.style.display = 'block';
        }
    }

    // Вызываем функцию при загрузке страницы
    fetchHealth();
});

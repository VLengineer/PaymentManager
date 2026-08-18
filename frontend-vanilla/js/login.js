/**
 * Аутентификация и авторизация
 */

/**
 * Инициализирует страницу логина
 */
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    
    if (!loginForm) return;
    
    // Если уже авторизован - редирект на календарь
    if (isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        
        // Скрываем предыдущие ошибки
        loginError.style.display = 'none';
        loginError.textContent = '';
        
        // Показываем индикатор загрузки
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
        
        try {
            await login(username, password);
            
            // Успешный вход - редирект на календарь
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Login error:', error);
            
            // Показываем ошибку
            loginError.textContent = error.message || 'Ошибка входа. Проверьте логин и пароль.';
            loginError.style.display = 'block';
            
            // Возвращаем кнопку в исходное состояние
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    });
});

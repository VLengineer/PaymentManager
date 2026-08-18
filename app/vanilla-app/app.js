// API Base URL
const API_BASE_URL = 'http://localhost:8000/api';

// Global state
let currentUser = null;
let projects = [];
let contractors = [];
let categories = [];
let payments = [];
let users = [];

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    checkConnection();
    setupEventListeners();
});

// Check backend connection
async function checkConnection() {
    const statusCard = document.getElementById('connection-status');
    const dashboardStats = document.getElementById('dashboard-stats');
    
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) throw new Error('Backend not available');
        
        const health = await response.json();
        statusCard.innerHTML = `
            <h2>✅ Бэкенд подключен</h2>
            <p><strong>Статус:</strong> ${health.status}</p>
            <p><strong>База данных:</strong> ${health.db_type}</p>
        `;
        statusCard.style.borderLeftColor = '#28a745';
        
        // Show login modal
        document.getElementById('login-modal').classList.add('show');
    } catch (error) {
        console.error('Connection error:', error);
        statusCard.innerHTML = `
            <h2>❌ Ошибка подключения</h2>
            <p>Проверьте, запущен ли бэкенд на порту 8000</p>
            <p><code>cd /workspace/app/backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000</code></p>
        `;
        statusCard.classList.add('error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });
    
    // Forms
    document.getElementById('project-form').addEventListener('submit', handleProjectSubmit);
    document.getElementById('contractor-form').addEventListener('submit', handleContractorSubmit);
    document.getElementById('category-form').addEventListener('submit', handleCategorySubmit);
    document.getElementById('payment-form').addEventListener('submit', handlePaymentSubmit);
    document.getElementById('payment-edit-form').addEventListener('submit', handlePaymentEditSubmit);
    document.getElementById('user-form').addEventListener('submit', handleUserSubmit);
    
    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Note: In a real app, you would have a proper authentication endpoint
    // For now, we'll just simulate login and store the username
    try {
        // Try to fetch users to verify connection
        const response = await fetch(`${API_BASE_URL}/users`);
        if (response.ok) {
            users = await response.json();
            
            // Simple validation - in production use proper auth
            const user = users.find(u => u.username === username);
            if (user) {
                currentUser = user;
                document.getElementById('login-modal').classList.remove('show');
                document.getElementById('main-nav').style.display = 'flex';
                document.getElementById('user-info').style.display = 'flex';
                document.getElementById('current-user').textContent = `${user.role}: ${user.username}`;
                
                // Show admin features for ADMIN role
                if (user.role === 'ADMIN') {
                    document.getElementById('nav-users').style.display = 'block';
                }
                
                // Load initial data
                loadAllData();
                switchTab('dashboard');
            } else {
                alert('Пользователь не найден');
            }
        } else {
            alert('Ошибка аутентификации');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Ошибка подключения к серверу');
    }
}

// Logout
function logout() {
    currentUser = null;
    document.getElementById('login-modal').classList.add('show');
    document.getElementById('main-nav').style.display = 'none';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('nav-users').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// Switch tabs
function switchTab(tabName) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Load data for specific tabs
    if (tabName === 'projects') loadProjects();
    if (tabName === 'contractors') loadContractors();
    if (tabName === 'categories') loadCategories();
    if (tabName === 'payments') loadPayments();
    if (tabName === 'users' && currentUser && currentUser.role === 'ADMIN') loadUsers();
}

// Load all data for dashboard
async function loadAllData() {
    try {
        const [projectsRes, contractorsRes, categoriesRes, paymentsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/projects`),
            fetch(`${API_BASE_URL}/contractors`),
            fetch(`${API_BASE_URL}/categories`),
            fetch(`${API_BASE_URL}/payments`)
        ]);
        
        projects = await projectsRes.json();
        contractors = await contractorsRes.json();
        categories = await categoriesRes.json();
        payments = await paymentsRes.json();
        
        // Update dashboard stats
        document.getElementById('stat-projects').textContent = projects.length;
        document.getElementById('stat-contractors').textContent = contractors.length;
        document.getElementById('stat-categories').textContent = categories.length;
        document.getElementById('stat-payments').textContent = payments.length;
        document.getElementById('dashboard-stats').style.display = 'grid';
        
        // Populate filter dropdowns
        populateProjectFilter();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Populate project filter
function populateProjectFilter() {
    const filterSelect = document.getElementById('filter-project');
    const paymentProjectSelect = document.getElementById('payment-project');
    
    filterSelect.innerHTML = '<option value="">Все проекты</option>';
    paymentProjectSelect.innerHTML = '';
    
    projects.forEach(project => {
        filterSelect.innerHTML += `<option value="${project.id}">${project.cfo_code} - ${project.name}</option>`;
        paymentProjectSelect.innerHTML += `<option value="${project.id}">${project.cfo_code} - ${project.name}</option>`;
    });
}

// Load Projects
async function loadProjects() {
    try {
        const response = await fetch(`${API_BASE_URL}/projects`);
        projects = await response.json();
        
        const tbody = document.getElementById('projects-tbody');
        tbody.innerHTML = '';
        
        projects.forEach(project => {
            tbody.innerHTML += `
                <tr>
                    <td>${project.id}</td>
                    <td>${project.cfo_code}</td>
                    <td>${project.name}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Load Contractors
async function loadContractors() {
    try {
        const response = await fetch(`${API_BASE_URL}/contractors`);
        contractors = await response.json();
        
        const tbody = document.getElementById('contractors-tbody');
        tbody.innerHTML = '';
        
        contractors.forEach(contractor => {
            tbody.innerHTML += `
                <tr>
                    <td>${contractor.id}</td>
                    <td>${contractor.name}</td>
                </tr>
            `;
        });
        
        // Populate contractor select in payment form
        const paymentContractorSelect = document.getElementById('payment-contractor');
        paymentContractorSelect.innerHTML = '';
        contractors.forEach(contractor => {
            paymentContractorSelect.innerHTML += `<option value="${contractor.id}">${contractor.name}</option>`;
        });
    } catch (error) {
        console.error('Error loading contractors:', error);
    }
}

// Load Categories
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        categories = await response.json();
        
        const tbody = document.getElementById('categories-tbody');
        tbody.innerHTML = '';
        
        categories.forEach(category => {
            const typeText = category.category_type === 'INCOME' ? 'Доход' : 'Расход';
            tbody.innerHTML += `
                <tr>
                    <td>${category.id}</td>
                    <td>${category.name}</td>
                    <td>${typeText}</td>
                </tr>
            `;
        });
        
        // Populate category select in payment form
        const paymentCategorySelect = document.getElementById('payment-category');
        paymentCategorySelect.innerHTML = '';
        categories.forEach(category => {
            const typeText = category.category_type === 'INCOME' ? 'Доход' : 'Расход';
            paymentCategorySelect.innerHTML += `<option value="${category.id}">${category.name} (${typeText})</option>`;
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load Payments
async function loadPayments() {
    try {
        const response = await fetch(`${API_BASE_URL}/payments`);
        payments = await response.json();
        
        const filterProject = document.getElementById('filter-project').value;
        const filterStatus = document.getElementById('filter-status').value;
        
        let filteredPayments = payments;
        if (filterProject) {
            filteredPayments = filteredPayments.filter(p => p.project_id == filterProject);
        }
        if (filterStatus) {
            filteredPayments = filteredPayments.filter(p => p.status === filterStatus);
        }
        
        const tbody = document.getElementById('payments-tbody');
        tbody.innerHTML = '';
        
        filteredPayments.forEach(payment => {
            const project = projects.find(p => p.id === payment.project_id);
            const contractor = contractors.find(c => c.id === payment.contractor_id);
            const category = categories.find(c => c.id === payment.category_id);
            
            const statusClass = `badge-${payment.status.toLowerCase()}`;
            const statusText = {
                'DRAFT': 'Черновик',
                'APPROVED': 'Согласовано',
                'PARTIAL': 'Частично оплачено',
                'PAID': 'Оплачено',
                'CANCELLED': 'Отменено'
            }[payment.status];
            
            tbody.innerHTML += `
                <tr>
                    <td>${payment.id}</td>
                    <td>${project ? project.cfo_code : 'N/A'}</td>
                    <td>${contractor ? contractor.name : 'N/A'}</td>
                    <td>${category ? category.name : 'N/A'}</td>
                    <td>${payment.period_start}</td>
                    <td>${Number(payment.amount_plan).toLocaleString('ru-RU')} ₽</td>
                    <td>${Number(payment.amount_fact).toLocaleString('ru-RU')} ₽</td>
                    <td>${Number(payment.amount_rollover).toLocaleString('ru-RU')} ₽</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-primary" onclick="editPayment(${payment.id})">✏️</button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

// Load Users (Admin only)
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`);
        users = await response.json();
        
        const tbody = document.getElementById('users-tbody');
        tbody.innerHTML = '';
        
        users.forEach(user => {
            const roleText = {
                'RP': 'Руководитель проекта',
                'FIN_DIRECTOR': 'Финансовый директор',
                'ADMIN': 'Администратор'
            }[user.role];
            
            tbody.innerHTML += `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${roleText}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Modal functions
function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
    // Reset forms
    const form = document.querySelector(`#${modalId} form`);
    if (form) form.reset();
}

// Handle Project Submit
async function handleProjectSubmit(e) {
    e.preventDefault();
    const cfoCode = document.getElementById('project-cfo-code').value;
    const name = document.getElementById('project-name').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cfo_code: cfoCode, name: name })
        });
        
        if (response.ok) {
            hideModal('project-modal');
            loadProjects();
            loadAllData();
        } else {
            const error = await response.json();
            alert(`Ошибка: ${error.detail}`);
        }
    } catch (error) {
        console.error('Error creating project:', error);
        alert('Ошибка при создании проекта');
    }
}

// Handle Contractor Submit
async function handleContractorSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('contractor-name').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/contractors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        });
        
        if (response.ok) {
            hideModal('contractor-modal');
            loadContractors();
            loadAllData();
        } else {
            const error = await response.json();
            alert(`Ошибка: ${error.detail}`);
        }
    } catch (error) {
        console.error('Error creating contractor:', error);
        alert('Ошибка при создании контрагента');
    }
}

// Handle Category Submit
async function handleCategorySubmit(e) {
    e.preventDefault();
    const name = document.getElementById('category-name').value;
    const categoryType = document.getElementById('category-type').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, category_type: categoryType })
        });
        
        if (response.ok) {
            hideModal('category-modal');
            loadCategories();
            loadAllData();
        } else {
            const error = await response.json();
            alert(`Ошибка: ${error.detail}`);
        }
    } catch (error) {
        console.error('Error creating category:', error);
        alert('Ошибка при создании статьи');
    }
}

// Handle Payment Submit
async function handlePaymentSubmit(e) {
    e.preventDefault();
    const paymentData = {
        project_id: parseInt(document.getElementById('payment-project').value),
        contractor_id: parseInt(document.getElementById('payment-contractor').value),
        category_id: parseInt(document.getElementById('payment-category').value),
        period_start: document.getElementById('payment-period').value,
        amount_plan: parseFloat(document.getElementById('payment-amount-plan').value),
        comment: document.getElementById('payment-comment').value || null
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        });
        
        if (response.ok) {
            hideModal('payment-modal');
            loadPayments();
            loadAllData();
        } else {
            const error = await response.json();
            alert(`Ошибка: ${error.detail}`);
        }
    } catch (error) {
        console.error('Error creating payment:', error);
        alert('Ошибка при создании платежа');
    }
}

// Edit Payment
async function editPayment(paymentId) {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;
    
    document.getElementById('edit-payment-id').value = payment.id;
    document.getElementById('edit-amount-fact').value = payment.amount_fact || '';
    document.getElementById('edit-comment').value = payment.comment || '';
    
    showModal('payment-edit-modal');
}

// Handle Payment Edit Submit
async function handlePaymentEditSubmit(e) {
    e.preventDefault();
    const paymentId = document.getElementById('edit-payment-id').value;
    const amountFact = document.getElementById('edit-amount-fact').value;
    const comment = document.getElementById('edit-comment').value;
    
    const updateData = {};
    if (amountFact) updateData.amount_fact = parseFloat(amountFact);
    if (comment) updateData.comment = comment;
    
    try {
        const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
            hideModal('payment-edit-modal');
            loadPayments();
            loadAllData();
        } else {
            const error = await response.json();
            alert(`Ошибка: ${error.detail}`);
        }
    } catch (error) {
        console.error('Error updating payment:', error);
        alert('Ошибка при обновлении платежа');
    }
}

// Handle User Submit
async function handleUserSubmit(e) {
    e.preventDefault();
    const userData = {
        username: document.getElementById('user-username').value,
        password: document.getElementById('user-password').value,
        role: document.getElementById('user-role').value
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            hideModal('user-modal');
            loadUsers();
        } else {
            const error = await response.json();
            alert(`Ошибка: ${error.detail}`);
        }
    } catch (error) {
        console.error('Error creating user:', error);
        alert('Ошибка при создании пользователя');
    }
}

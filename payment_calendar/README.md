# Платежный календарь (БДДС)

Система управления платежным календарем с ролевой моделью и переносом остатков.

## Стек технологий

- **Backend**: FastAPI + SQLAlchemy
- **Database**: PostgreSQL / SQLite (переключаемые через .env)
- **Frontend**: Vue 3 + TypeScript + AG Grid (в разработке)
- **Auth**: JWT tokens

## Архитектура

Проект использует паттерн **Strategy** для переключения между базами данных:
- `SQLiteStrategy` - для прототипирования и локальной разработки
- `PostgreSQLStrategy` - для production

## Быстрый старт

### 1. Установка зависимостей

```bash
cd payment_calendar
pip install -r requirements.txt
```

### 2. Настройка базы данных

Откройте файл `.env` и выберите тип базы данных:

**Для SQLite (прототипирование):**
```env
DATABASE_TYPE=sqlite
SQLITE_DB_PATH=./payment_calendar.db
```

**Для PostgreSQL (production):**
```env
DATABASE_TYPE=postgresql
POSTGRES_USER=payment_user
POSTGRES_PASSWORD=payment_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=payment_calendar
```

### 3. Запуск приложения

```bash
# Запуск через uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Проверка работы

Откройте в браузере:
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Ролевая модель

### РП (Руководитель проекта)
- Видит и редактирует только свои проекты
- Может планировать платежи (создавать заявки)
- Может переносить неоплаченные остатки

### Финансовый директор (FIN_DIRECTOR)
- Видит все проекты и сводные итоги
- Фиксирует факт оплаты (полностью или частично)
- Может блокировать периоды (закрывать месяц)

### Администратор (ADMIN)
- Управление справочниками
- Управление пользователями
- Маппинг User <-> Project

## Основные эндпоинты API

### Authentication
- `POST /api/auth/register` - Регистрация пользователя
- `POST /api/auth/login` - Получение JWT токена
- `GET /api/auth/me` - Информация о текущем пользователе

### Calendar
- `GET /api/calendar/matrix` - Получение матрицы платежного календаря
- `POST /api/calendar/rollover` - Перенос остатка на следующий период
- `POST /api/calendar/lock-period` - Блокировка периода (Финдир)

### Payments
- `GET /api/payments/` - Список платежей
- `POST /api/payments/` - Создание платежа
- `PUT /api/payments/{id}` - Обновление платежа
- `PATCH /api/payments/{id}/fact` - Обновление факта оплаты (Финдир)

### Projects, Contractors, Categories
- CRUD операции для справочников

## Структура проекта

```
payment_calendar/
├── app/
│   ├── api/              # API endpoints
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── projects.py
│   │   ├── contractors.py
│   │   ├── budget_categories.py
│   │   ├── payments.py
│   │   └── calendar.py
│   ├── models/           # SQLAlchemy models
│   │   ├── base.py
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── contractor.py
│   │   ├── budget_category.py
│   │   ├── payment.py
│   │   └── user_project.py
│   ├── strategies/       # Database strategies
│   │   └── database.py
│   ├── config.py         # Configuration
│   ├── database.py       # Database setup
│   └── main.py           # Application entry point
├── .env                  # Environment variables
├── .env.example          # Example environment variables
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## Жизненный цикл платежа

1. **DRAFT** - РП создает план
2. **APPROVED** - План утвержден
3. **PARTIAL** - Финдир фиксирует частичную оплату
4. **PAID** - Оплата выполнена полностью (блокируется)
5. **CANCELLED** - Платеж отменен (после переноса остатка)

## Перенос остатков (Rollover)

Если платеж оплачен частично:
1. Финдир устанавливает `amount_fact < amount_plan`
2. Статус меняется на `PARTIAL`
3. Система вычисляет `amount_rollover = amount_plan - amount_fact`
4. РП нажимает "Перенести остаток"
5. Создается новый платеж на остаток в следующем периоде

## Примеры использования

### Создание первого пользователя (Admin)

```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123",
    "role": "ADMIN"
  }'
```

### Получение токена

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"
```

### Получение матрицы календаря

```bash
curl "http://localhost:8000/api/calendar/matrix?date_from=2024-01-01&date_to=2024-03-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Разработка

### Добавление новых миграций (для PostgreSQL)

```bash
# Установите alembic
pip install alembic

# Инициализация
alembic init alembic

# Создание миграции
alembic revision --autogenerate -m "Initial migration"

# Применение миграций
alembic upgrade head
```

### Тестирование

```bash
# Запуск тестов (будет добавлено позже)
pytest
```

## Лицензия

MIT

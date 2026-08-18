# Платежный календарь (БДДС)

Система управления платежным календарем с ролевой моделью и переносом остатков.

## 📁 Структура проекта

```
/workspace/
└── app/
    └── backend/           # Основной бэкенд на FastAPI
        ├── app/
        │   ├── config.py      # Настройки приложения
        │   ├── database.py    # Стратегии подключения к БД (SQLite/PostgreSQL)
        │   ├── main.py        # Точка входа FastAPI + uvicorn
        │   └── models.py      # SQLAlchemy модели
        ├── .env.example       # Пример конфигурации
        ├── requirements.txt   # Зависимости Python
        └── README.md          # Локальная документация
```

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
cd /workspace/app/backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

### 2. Настройка базы данных

Скопируйте `.env.example` в `.env` и настройте:

**Для SQLite (по умолчанию, для прототипирования):**
```env
DB_TYPE=sqlite
SQLITE_DB_PATH=./bdds_dev.db
```

**Для PostgreSQL (production):**
```env
DB_TYPE=postgresql
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bdds_payment_calendar
```

### 3. Запуск сервера (Uvicorn)

**Вариант 1: Через модуль uvicorn (рекомендуется)**
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Вариант 2: Прямой запуск main.py**
```bash
python app/main.py
```

**Вариант 3: С расширенным логированием**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --log-level info
```

Сервер запустится на: **http://localhost:8000**

## 🔍 Проверка работы

После запуска откройте в браузере:

- **Swagger UI (API Docs):** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/api/health
- **Root endpoint:** http://localhost:8000/

При первом запуске автоматически создадутся тестовые данные:

### Пользователи
| Логин | Пароль | Роль |
|-------|--------|------|
| admin | admin123 | ADMIN |
| fin_director | fin123 | FIN_DIRECTOR |
| rp_user | rp123 | RP |

### Проекты
- ООО_СЭ_ЛИПЕЦК_ВНС 3 (CFO: 25_004_РВК)
- ООО_СТРОЙ_МОСКВА (CFO: 25_005_МСК)

### Контрагенты
- ЭЛЕКТРОТЕХМОНТАЖ ТД АО
- ИП Горетый

### Статьи бюджета
- Технологическое присоединение (EXPENSE)
- Услуги спецтехники (EXPENSE)
- Выручка от реализации (INCOME)

## 📡 Тестирование API

### Получить список проектов
```bash
curl http://localhost:8000/api/projects
```

### Получить список контрагентов
```bash
curl http://localhost:8000/api/contractors
```

### Создать платеж
```bash
curl -X POST "http://localhost:8000/api/payments" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 1,
    "contractor_id": 1,
    "category_id": 1,
    "period_start": "2025-01-20",
    "amount_plan": 100000,
    "comment": "Тестовый платеж"
  }'
```

### Обновить платеж (фиксация оплаты)
```bash
curl -X PATCH "http://localhost:8000/api/payments/1" \
  -H "Content-Type: application/json" \
  -d '{"amount_fact": 60000}'
```

### Перенести остаток
```bash
curl -X POST "http://localhost:8000/api/payments/rollover" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_id": 1,
    "target_period_start": "2025-01-27"
  }'
```

## 🏗️ Архитектурные особенности

### Паттерн "Стратегия" для баз данных

Приложение использует паттерн Strategy для легкого переключения между СУБД:

```
app/
├── config.py           # Настройки из .env
├── database.py         # SQLiteStrategy, PostgreSQLStrategy
├── main.py             # FastAPI приложение с uvicorn
└── models.py           # SQLAlchemy модели
```

**Преимущества:**
- Переключение между SQLite и PostgreSQL через `.env`
- Единый интерфейс работы с БД
- Простота расширения (можно добавить MySQL, MongoDB)

## 🔄 Переключение между SQLite и PostgreSQL

1. Остановите сервер (Ctrl+C)
2. Измените `DB_TYPE` в файле `.env`
3. Удалите старый файл БД (если был SQLite)
4. Запустите сервер заново

```bash
# Для SQLite
rm -f bdds_dev.db

# Для PostgreSQL (предварительно создайте БД)
createdb -U postgres bdds_payment_calendar
```

## 🛑 Остановка сервера

```bash
# В терминале нажмите Ctrl+C

# Или найдите и убейте процесс
pkill -f "uvicorn app.main:app"
```

## 📝 Логи и отладка

Логи сервера выводятся в консоль. Для сохранения в файл:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level info > /tmp/uvicorn.log 2>&1
```

Для просмотра в реальном времени:
```bash
tail -f /tmp/uvicorn.log
```

## 📚 API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/` | Информация о API |
| GET | `/api/health` | Проверка здоровья |
| GET | `/api/users` | Список пользователей |
| POST | `/api/users` | Создание пользователя |
| GET | `/api/projects` | Список проектов |
| POST | `/api/projects` | Создание проекта |
| GET | `/api/contractors` | Список контрагентов |
| POST | `/api/contractors` | Создание контрагента |
| GET | `/api/categories` | Список статей бюджета |
| POST | `/api/categories` | Создание статьи |
| GET | `/api/payments` | Список платежей |
| POST | `/api/payments` | Создание платежа |
| PATCH | `/api/payments/{id}` | Обновление платежа |
| POST | `/api/payments/rollover` | Перенос остатка |

## 🎯 Ролевая модель

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

## 💡 Жизненный цикл платежа

1. **DRAFT** — РП создает план
2. **APPROVED** — План утвержден
3. **PARTIAL** — Финдир фиксирует частичную оплату
4. **PAID** — Оплата выполнена полностью (блокируется)
5. **CANCELLED** — Платеж отменен (после переноса остатка)

## 🔧 Требования

- Python 3.9+
- pip
- (Опционально) PostgreSQL 12+

## 📄 Лицензия

MIT

# Инструкция по запуску приложения "Платежный календарь (БДДС)"

## 🚀 Быстрый старт для демонстрации

### Шаг 1: Запуск бэкенда (FastAPI + Uvicorn)

```bash
# Перейдите в директорию бэкенда
cd /workspace/app/backend

# Активируйте виртуальное окружение
source venv/bin/activate

# Запустите сервер Uvicorn
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Сервер запустится на:** http://localhost:8000

**Проверка работы:**
- Откройте в браузере: http://localhost:8000/docs (Swagger UI)
- Или проверьте health endpoint: http://localhost:8000/api/health

### Шаг 2: Проверка работы API

После запуска сервера автоматически создадутся тестовые данные:

**Пользователи:**
| Логин | Пароль | Роль |
|-------|--------|------|
| admin | admin123 | ADMIN |
| fin_director | fin123 | FIN_DIRECTOR |
| rp_user | rp123 | RP |

**Проекты:**
- ООО_СЭ_ЛИПЕЦК_ВНС 3 (CFO: 25_004_РВК)
- ООО_СТРОЙ_МОСКВА (CFO: 25_005_МСК)

**Контрагенты:**
- ЭЛЕКТРОТЕХМОНТАЖ ТД АО
- ИП Горетый

**Статьи бюджета:**
- Технологическое присоединение (EXPENSE)
- Услуги спецтехники (EXPENSE)
- Выручка от реализации (INCOME)

---

## 🔧 Переключение между SQLite и PostgreSQL

### Для SQLite (прототипирование, по умолчанию):

В файле `/workspace/app/backend/.env`:
```env
DB_TYPE=sqlite
SQLITE_DB_PATH=./bdds_dev.db
```

### Для PostgreSQL (продакшн):

1. Установите PostgreSQL и создайте базу данных:
```bash
sudo -u postgres psql
CREATE DATABASE bdds_payment_calendar;
\q
```

2. Измените файл `/workspace/app/backend/.env`:
```env
DB_TYPE=postgresql
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bdds_payment_calendar
```

3. Перезапустите сервер Uvicorn

---

## 📡 Тестирование API через curl

### Получить список проектов:
```bash
curl http://localhost:8000/api/projects
```

### Получить список контрагентов:
```bash
curl http://localhost:8000/api/contractors
```

### Получить статьи бюджета:
```bash
curl http://localhost:8000/api/categories
```

### Создать новый платеж:
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

### Обновить платеж (фиксация факта оплаты - только Финдир):
```bash
curl -X PATCH "http://localhost:8000/api/payments/1" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_fact": 60000
  }'
```

### Перенести остаток:
```bash
curl -X POST "http://localhost:8000/api/payments/rollover" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_id": 1,
    "target_period_start": "2025-01-27"
  }'
```

---

## 🌐 Запуск фронтенда (Vue 3) - будет добавлен в следующем шаге

После создания фронтенда:

```bash
cd /workspace/app/frontend
npm install
npm run dev
```

Фронтенд запустится на: http://localhost:5173

---

## 🏗️ Архитектурные особенности

### Паттерн "Стратегия" для БД

Приложение использует паттерн Strategy для переключения между СУБД:

```
app/
├── config.py           # Настройки из .env
├── database.py         # Стратегии: SQLiteStrategy, PostgreSQLStrategy
├── main.py             # FastAPI приложение
└── models.py           # SQLAlchemy модели
```

**Преимущества:**
- Легкое переключение между SQLite и PostgreSQL через `.env`
- Единый интерфейс работы с БД
- Простота расширения (можно добавить MySQL, MongoDB и т.д.)

---

## 📝 Логи и отладка

Логи сервера пишутся в `/tmp/uvicorn.log`

Для просмотра в реальном времени:
```bash
tail -f /tmp/uvicorn.log
```

---

## 🛑 Остановка сервера

```bash
pkill -f "uvicorn app.main:app"
```

Или нажмите `Ctrl+C` в терминале, где запущен сервер.

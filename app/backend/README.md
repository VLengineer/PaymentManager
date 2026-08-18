# Платежный календарь (БДДС) - Backend

## Установка и запуск

### 1. Создание виртуального окружения

```bash
cd /workspace/app/backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows
```

### 2. Установка зависимостей

```bash
pip install -r requirements.txt
```

### 3. Настройка базы данных

Откройте файл `.env` и выберите тип БД:

**Для SQLite (прототипирование):**
```env
DB_TYPE=sqlite
SQLITE_DB_PATH=./bdds_dev.db
```

**Для PostgreSQL (продакшн):**
```env
DB_TYPE=postgresql
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bdds_payment_calendar
```

### 4. Запуск сервера Uvicorn

**Вариант 1: Через Python**
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Вариант 2: Через main.py**
```bash
python app/main.py
```

**Вариант 3: С авто-перезагрузкой при разработке**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --log-level info
```

## Проверка работы

После запуска откройте в браузере:
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/api/health

## Тестовые учетные данные

При первом запуске создаются следующие пользователи:

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | ADMIN |
| fin_director | fin123 | FIN_DIRECTOR |
| rp_user | rp123 | RP |

## Структура проекта

```
backend/
├── app/
│   ├── __init__.py
│   ├── config.py          # Настройки приложения (Strategy Pattern)
│   ├── database.py        # Паттерн Стратегия для БД
│   ├── main.py            # Точка входа FastAPI
│   └── models.py          # SQLAlchemy модели
├── .env                   # Переменные окружения
├── .env.example           # Пример конфигурации
├── requirements.txt       # Зависимости Python
└── bdds_dev.db           # SQLite БД (создается автоматически)
```

## Переключение между SQLite и PostgreSQL

1. Остановите сервер
2. Измените `DB_TYPE` в файле `.env`
3. Запустите сервер заново

Сервер автоматически определит тип БД и создаст нужное подключение.

## API Endpoints

- `GET /` - Информация о API
- `GET /api/health` - Проверка здоровья
- `GET /api/users` - Список пользователей
- `POST /api/users` - Создание пользователя
- `GET /api/projects` - Список проектов
- `POST /api/projects` - Создание проекта
- `GET /api/contractors` - Список контрагентов
- `POST /api/contractors` - Создание контрагента
- `GET /api/categories` - Список статей бюджета
- `POST /api/categories` - Создание статьи
- `GET /api/payments` - Список платежей
- `POST /api/payments` - Создание платежа
- `PATCH /api/payments/{id}` - Обновление платежа (Финдир)
- `POST /api/payments/rollover` - Перенос остатка

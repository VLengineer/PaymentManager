# Платежный календарь (БДДС) - Frontend

## Установка и запуск

### 1. Установка зависимостей

```bash
cd /workspace/app/frontend
npm install
```

### 2. Запуск в режиме разработки

```bash
npm run dev
```

Фронтенд запустится на: http://localhost:5173

### 3. Сборка для продакшена

```bash
npm run build
```

## Структура проекта

```
frontend/
├── src/
│   ├── main.ts           # Точка входа Vue приложения
│   ├── App.vue           # Корневой компонент
│   └── components/       # Vue компоненты
├── index.html            # HTML шаблон
├── package.json          # Зависимости npm
├── vite.config.ts        # Конфигурация Vite
└── tsconfig.json         # TypeScript настройки
```

## Прокси к бэкенду

Vite настроен на проксирование запросов `/api` на бэкенд:
- Фронтенд: http://localhost:5173
- Бэкенд: http://localhost:8000

Все запросы на `/api/*` автоматически перенаправляются на бэкенд.

## Технологический стек

- **Vue 3** - фреймворк
- **TypeScript** - типизация
- **Pinia** - управление состоянием
- **Vue Router** - роутинг
- **Axios** - HTTP клиент
- **AG Grid** - матричная таблица (платежный календарь)
- **Vite** - сборщик

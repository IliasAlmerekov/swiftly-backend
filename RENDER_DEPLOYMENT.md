# Деплой ScooTeq Helpdesk Backend на Render

## Подготовка

1. **MongoDB Atlas Setup**
   - Создайте кластер в MongoDB Atlas
   - Создайте базу данных `helpdesk`
   - Получите connection string
   - Добавьте IP адрес `0.0.0.0/0` в Network Access для Render

2. **Environment Variables**
   - Скопируйте переменные из `.env.render.example`
   - Замените значения на реальные

## Деплой на Render

### Шаг 1: Создание Web Service

1. Зайдите на [render.com](https://render.com)
2. Нажмите "New" → "Web Service"
3. Подключите ваш GitHub/GitLab репозиторий
4. Выберите ветку `main`

### Шаг 2: Настройки сервиса

**Basic Settings:**
- **Name**: `scooteq-helpdesk-backend`
- **Region**: Frankfurt (EU Central) или ближайший
- **Branch**: `main`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Advanced Settings:**
- **Runtime**: Docker
- **Dockerfile Path**: `./Dockerfile`
- **Auto Deploy**: Yes

### Шаг 3: Environment Variables

Добавьте следующие переменные в Render Dashboard:

```
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/helpdesk?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here
PORT=3001
```

### Шаг 4: Деплой

1. Нажмите "Create Web Service"
2. Render автоматически начнет сборку и деплой
3. Следите за логами в Dashboard

### Шаг 5: Проверка

После успешного деплоя:
- Откройте URL вашего сервиса
- Проверьте `/api/health` endpoint
- Проверьте основные API endpoints

## Health Check

Ваш сервис доступен по адресу: `https://your-service-name.onrender.com`

Health check: `https://your-service-name.onrender.com/api/health`

## CORS Settings

Обновите CORS настройки в `src/server.js` для работы с фронтендом на Netlify:

```javascript
app.use(cors({
  origin: [
    'https://your-netlify-frontend.netlify.app',
    'http://localhost:3000' // для локальной разработки
  ],
  credentials: true
}));
```

## Troubleshooting

### Проблемы с подключением к БД
- Проверьте connection string
- Убедитесь что IP `0.0.0.0/0` добавлен в Network Access в MongoDB Atlas
- Проверьте логи в Render Dashboard

### Проблемы с портом
- Render автоматически присваивает PORT
- Убедитесь что приложение слушает на `0.0.0.0`

### Медленная сборка
- Free tier на Render может быть медленным
- Рассмотрите Starter plan для производства
   Replace `https://your-dev-site-name.netlify.app` and `https://your-prod-site-name.netlify.app` with your actual Netlify site URLs.

3. **Test Database Connections:**
   Verify that each backend can connect to its respective MongoDB database.

## 🔧 Troubleshooting

### Common Issues:

1. **Build Failures:** Check that Node.js version matches your local development
2. **Database Connection Issues:** Verify MongoDB Atlas network access and credentials
3. **Environment Variables:** Ensure all required variables (MONGO_URI, JWT_SECRET, JWT_EXPIRES) are set

### Render Service Logs:

Monitor your Render service logs for any deployment or runtime issues.

---

✅ **You're ready to deploy!** Follow these configurations exactly, and your backend will be properly deployed to both development and production environments.

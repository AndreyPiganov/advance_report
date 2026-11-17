# Отчёт по договорам

Сервис показывает стоимость, выплаты и остатки по работам и договорам
на выбранную дату.

## Запуск в Docker

Нужны Docker и Docker Compose. Команды выполняются из корня проекта:

```bash
cp .env.example .env
docker compose up -d --build --wait
```

После запуска:

- Приложение: http://localhost:8080
- Swagger: http://localhost:8080/api/docs
- Проверка готовности: http://localhost:8080/api/health

PostgreSQL и миграции запускаются автоматически.
При первом запуске данные загружаются из `backend/data/`.

Просмотр логов и остановка:

```bash
docker compose logs -f
docker compose down
```

Данные базы сохраняются после остановки.

## Разработка в Docker

После создания `.env` запустите:

```bash
docker compose -f docker-compose.dev.yml up -d --build --wait
```

Приложение доступно на http://localhost:8080.
Изменения исходного кода подхватываются автоматически.
После изменения зависимостей или Prisma-схемы повторите команду с `--build`.

Логи и остановка:

```bash
docker compose -f docker-compose.dev.yml logs -f
docker compose -f docker-compose.dev.yml down
```

Обычный режим и режим разработки используют один HTTP-порт,
поэтому запускайте их по очереди.

## Локальная разработка

Нужны Node.js `>=24.15.0`, npm и PostgreSQL.
Базу можно запустить через Docker.

Из корня проекта, в первом терминале:

```bash
docker compose -f docker-compose.dev.yml up -d --wait postgres
cd backend
npm ci
export DATABASE_URL="postgresql://advance_report:advance_report_local@localhost:5432/advance_report"
npm run build
npm run prisma:migrate:deploy
npm run start:dev
```

В PowerShell вместо строки `export` используйте:

```powershell
$env:DATABASE_URL = "postgresql://advance_report:advance_report_local@localhost:5432/advance_report"
```

Адрес подключения соответствует настройкам по умолчанию.
Если изменили параметры PostgreSQL в `.env`, скорректируйте `DATABASE_URL`.

Во втором терминале, из корня проекта:

```bash
cd frontend
npm ci
npm run dev
```

Адреса:

- Интерфейс: http://localhost:5173
- API: http://localhost:3000/api/report?date=2026-11-10
- Swagger: http://localhost:3000/api/docs

При локальном запуске Nest получает настройки из окружения процесса.
Файл `.env` автоматически используется только Docker Compose.

## Обновление данных

Источник — комплект из трёх файлов:

- `backend/data/contracts.csv`
- `backend/data/works.csv`
- `backend/data/payments.csv`

Формат описан в [backend/data/FORMAT.md](backend/data/FORMAT.md).
Для обновления замените комплект файлов и нажмите **«Обновить данные»**
в интерфейсе. Также импорт выполняется автоматически в начале каждого
часа по московскому времени.

Записи с существующими ID обновляются, новые добавляются.
Отсутствующие в выгрузке записи сохраняются.
При ошибке импорта ранее сохранённые данные остаются доступны.

После успешной первоначальной загрузки перезапуск приложения
не вызывает повторный импорт. Прямое чтение `.xlsx` и `.xls` не поддерживается.

## Настройки

Для Docker настройки задаются в `.env`.
После их изменения повторите команду запуска Compose.

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `HTTP_PORT` | `8080` | Порт приложения в Docker. |
| `DATA_DIR` | `./backend/data` в Compose; `data` при запуске из `backend/` | Папка исходных CSV. |
| `IMPORT_CRON` | `0 * * * *` | Расписание импорта. |
| `IMPORT_TIME_ZONE` | `Europe/Moscow` | Часовой пояс расписания. |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | См. `.env.example` | Параметры PostgreSQL в Docker. |
| `POSTGRES_PORT` | `5432` | Порт PostgreSQL на localhost в режиме разработки. |
| `DATABASE_URL` | Обязательна при локальном запуске | Строка подключения backend к PostgreSQL. |

Решения и допущения расчёта: [DECISIONS.md](DECISIONS.md).
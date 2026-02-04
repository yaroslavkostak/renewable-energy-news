# Інструкція: запуск сайту новин з 3 статтями на день

Виконай кроки **по черзі**. Після кожного кроку можна перевіряти, що все працює.

---

## 1. Створити репозиторій на GitHub

1. Зайди на [github.com](https://github.com) і залогінься.
2. Натисни **New repository** (або **Create a new repository**).
3. Заповни:
   - **Repository name:** наприклад `renewable-energy-news`
   - **Visibility:** Public
   - **НЕ** стави галочку "Add a README" (репо вже є локально).
4. Натисни **Create repository**.
5. На сторінці нового репо побачиш команди "push an existing repository". Виконай у себе в терміналі (папка проєкту):

```bash
git init
git add .
git commit -m "Initial: collector + Next.js site"
git branch -M main
git remote add origin https://github.com/yaroslavkostak/renewable-energy-news.git
git push -u origin main
```

Або через SSH:

```bash
git remote add origin git@github.com:yaroslavkostak/renewable-energy-news.git
git push -u origin main
```

---

## 2. Додати API-ключ OpenAI (ChatGPT) — тільки в GitHub Secrets

**Важливо:** Ключ має бути **тільки** в GitHub Secrets. Ніколи не коміть його в репо і не додавайте в файл `.env`, який потрапляє в Git.

1. Зайди на [platform.openai.com/api-keys](https://platform.openai.com/api-keys) і залогінься.
2. Створи ключ: **Create new secret key**. Скопіюй його (показується один раз).
3. У репо на GitHub: [github.com/yaroslavkostak/renewable-energy-news](https://github.com/yaroslavkostak/renewable-energy-news) → **Settings** → **Secrets and variables** → **Actions**.
4. Натисни **New repository secret**:
   - **Name:** `OPENAI_API_KEY`
   - **Secret:** встав свій ключ OpenAI.
5. Збережи.

Ключ буде використовуватися лише під час запуску workflow у GitHub Actions і ніде не з’явиться в коді чи історії комітів.

**Якщо ключ потрапив у чат або кудись ще:** у [OpenAI API keys](https://platform.openai.com/api-keys) видали (Revoke) старий ключ і створи новий, потім онови його в GitHub Secrets.

---

## 3. Підключити GitHub Actions (перевірка)

1. У репо відкрий вкладку **
**.
2. Має з’явитися workflow **"Collect & Publish News"** (файл `.github/workflows/collect-news.yml` уже в проєкті).
3. Щоб перевірити запуск вручну:
   - Відкрий **Actions** → **Collect & Publish News** → **Run workflow** → **Run workflow**.
   - Через хвилину перевір, що job завершився без помилок (зелена галочка). Якщо є помилка — перевір, що секрет `OPENAI_API_KEY` доданий (крок 2).

Workflow запускається **автоматично 3 рази на день** (06:00, 12:00, 18:00 UTC) і кожен раз обробляє **1 нову статтю** (разом 3 статті на день).

---

## 4. Стиль статей (що саме робить скрипт)

Скрипт уже налаштований так:

- **Мова:** німецька для австрійського ринку.
- **Стиль:** простий і зрозумілий: короткі речення, один думка на абзац, без зайвих двокрапок/крапок з комою.
- **Структура:** заголовок (H1), короткий вступ, підзаголовки (H2), блок "Umfassende Gedanken" в кінці, за бажанням "Häufige Fragen".
- **Австрійський кут:** кожна новина має мати зв’язок з Австрією (наприклад: "Що це означає для Відня?", поради для орендарів, економія в євро).
- **Джерела зображень:** підпис типу "Foto [назва джерела]" без посилання.

Нічого додатково налаштовувати не потрібно — стиль закладений у промпти в `index.js`. Якщо захочеш змінити тон або структуру, можна буде відредагувати змінні `SYSTEM_PROMPT` та `USER_PROMPT_TEMPLATE` у файлі `index.js`.

---

## 5. Деплой на Vercel (безкоштовно, без індексації)

1. Зайди на [vercel.com](https://vercel.com) і увійди через **Continue with GitHub**.
2. **Add New…** → **Project**.
3. Імпортуй репо **renewable-energy-news** (або як ти його назвав). Натисни **Import**.
4. Налаштування проєкту:
   - **Framework Preset:** Next.js (має підхопитися автоматично).
   - **Root Directory:** залиш порожнім (проєкт у корені).
   - **Build Command:** `npm run build`
   - **Output Directory:** для Next.js static export за замовчуванням використовується `out` — залиш як є.
5. **Environment Variables:** можна нічого не додавати для збірки сайту (API-ключ потрібен тільки в GitHub Actions для collector).
6. Натисни **Deploy**.

Після деплою Vercel дасть посилання на сайт (наприклад `https://renewable-energy-news.vercel.app`).

**Без індексації в пошуку:**

- У проєкті вже є файл **`public/robots.txt`** з `Disallow: /` — пошукові роботи не індексують сторінки.
- У **`app/layout.js`** у метаданих задано `robots: 'noindex, nofollow'` — сторінки не потрапляють в пошук.

Тобто сайт буде доступний за посиланням, але не в Google/інших пошуковиках, поки ти не зміниш це сам.

---

## 6. Шаблон сайту (дизайн як на скріншоті)

Сайт уже зібраний у стилі агрегатора новин (як на твоєму скріншоті):

- **Шапка:** логотип "Erneuerbare Energie" і підзаголовок "News für Österreich", поруч — заголовок "Aktuelle Nachrichten zu Solar, Wind und grüner Energie".
- **Ліва колонка:** категорії (Головна, Österreich, Deutschland/DACH, Global, Wissenschaft).
- **Центр:** список новин — час, заголовок, дата, джерело; клік веде на сторінку статті.
- **Права колонка:** поле пошуку, блок "Beliebte Themen" з тегами (# Solar, # Wind тощо), посилання "Über uns", "Datenschutz", "Impressum".
- **Сторінка статті:** заголовок, дата, джерело, зображення (якщо є), основний текст у Markdown.

Кольори й відступи зроблені простими (білий фон, світло-блакитні акценти), щоб виглядати схоже на класичний агрегатор новин.

Щоб змінити тексти, логотип або кольори — прави файли в папці **`app/`** (layout, сторінки) та **`app/globals.css`**.

---

## Підсумок

| Крок | Що зробити |
|------|------------|
| 1 | Створити репо на GitHub і запушити проєкт |
| 2 | Додати секрет `OPENAI_API_KEY` у репо (Settings → Secrets → Actions) |
| 3 | Перевірити Actions: вручну запустити workflow "Collect & Publish News" |
| 4 | Стиль статей уже заданий у `index.js` (при потребі — правити промпти) |
| 5 | Підключити репо до Vercel і задеплоїти; індексація вимкнена (robots.txt + noindex) |
| 6 | Сайт уже у вигляді агрегатора (три колонки, список новин, статті) |

Після цього кожен день будуть додаватися до 3 нових статей (по одній за запуск Actions), вони з’являться в репо в папці `content/articles/`, і після наступного деплою Vercel — на сайті.

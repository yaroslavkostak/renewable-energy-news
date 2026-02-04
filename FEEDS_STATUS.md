# Статус джерел (RSS / scrape)

Остання перевірка: скрипт `node check-feeds.js`.

## ✓ Працюють (залишені в feeds.json)

### Австрія
| Джерело        | Тип  | Примітка        |
|----------------|------|------------------|
| Klimafonds     | RSS  | 1 item           |
| Klimafonds News| Scrape | сторінка новин |
| E-Control Pressemeldungen | Scrape | без RSS, сторінка пресрелізів |
| E-Control Industrie News  | Scrape | без RSS, сторінка новин |

### Німеччина
| Джерело                 | Тип  | Примітка  |
|-------------------------|------|-----------|
| PV Magazine Germany     | RSS  | ~25 items |
| PV Magazine International | RSS | ~25 items |
| Solarserver              | RSS  | ~75 items |
| Utopia                   | RSS  | ~20 items |
| Agrarheute Energie       | Scrape | сторінка |

### США / глобальні
| Джерело                 | Тип  |
|-------------------------|------|
| CleanTechnica           | RSS  |
| Electrek                | RSS  |
| Renewable Energy World  | RSS  |
| Carbon Brief            | RSS  |
| Energy Post             | RSS  |

### Франція
| Джерело             | Тип |
|---------------------|-----|
| PV Magazine France  | RSS |

### Наука / lifestyle
| Джерело             | Тип  |
|---------------------|------|
| Treehugger          | RSS  |
| Phys.org            | RSS  |
| ScienceDaily       | RSS  |
| ScienceDaily Environment | RSS |
| The Verge Energy   | RSS  |

---

## ✗ Не працюють (видалені з feeds.json)

- **404 (RSS):** E-Control feed, Oesterreichsenergie, Klimaaktiv, Raus aus Öl, Umweltbundesamt, Energiesparverband, PV Austria (feed), Energiezukunft, IWR, Clean Energy Wire, Canary Media. (E-Control тепер додано через scrape — сторінки пресрелізів.)
- **Помилка парсингу RSS:** PV Austria (Unexpected close tag), pv Europe (Invalid entity).
- **403:** Inhabitat Energy (scrape).

---

## Як додати цікаві сайти, які не віддають RSS (404)

Якщо сайт цікавий, але `/feed/` дає 404 (часто спеціально, щоб не парсили), є два робочі варіанти.

### 1. Scrape сторінки зі списком статей (найпростіше)

Не додаєш RSS — додаєш **посилання на сторінку, де виведені посилання на статті** (новини, блог, пресрелізи). Скрипт заходить на цю сторінку, збирає всі посилання, потім заходить на кожну статтю і тягне текст.

У `feeds.json` в секції **`scrapeUrls`** додай об’єкт, наприклад:

```json
{ "url": "https://сайт.com/новини", "priority": 1, "category": "austria", "name": "Назва джерела" }
```

**priority: 1** — обробляти в першу чергу (разом з іншими австрійськими).

Приклад: E-Control не дає RSS, але є сторінки з пресрелізами. Вже додано:
- `https://www.e-control.at/aktuelle-pressemeldungen`
- `https://www.e-control.at/industrie/news`

Для інших сайтів: знайди на їхньому сайті сторінку типу «Новини», «Presse», «Blog», «Aktuelles» — і цей URL встав у `scrapeUrls`.

### 2. Згенерований RSS (якщо scrape не підходить)

Якщо сторінка блокує скрапери (403) або дуже складна, можна зробити **RSS з їхнього сайту** через сервіс:

- **[RSS.app](https://rss.app)** — вказуєш URL сайту або сторінки, отримуєш готовий feed.
- **[FetchRSS](https://fetchrss.com)** — те саме.
- Інші «create RSS from URL».

Отриманий URL фіду додаєш у **`rssFeeds`** у `feeds.json` — скрипт працює з ним як зі звичайним RSS.

Підсумок: якщо дають 404 по RSS — спочатку спробуй додати їхню **сторінку зі списком статей** в `scrapeUrls` (і поставити їм пріоритет 1, якщо хочеш рерайтити їх у першу чергу). Якщо не виходить — зроби фід через RSS.app і додай його в `rssFeeds`.

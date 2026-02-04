# Джерела за мовами: що працює і що 404

## Німецькомовні (DE)

### ✓ Працюють (в feeds.json)
| Джерело | URL | Тип |
|--------|-----|-----|
| PV Magazine Germany | https://www.pv-magazine.de/feed/ | RSS |
| PV Magazine International | https://www.pv-magazine.com/feed/ | RSS |
| Solarserver | https://www.solarserver.de/feed/ | RSS |
| Utopia | https://www.utopia.de/feed/ | RSS |
| Agrarheute Energie | https://www.agrarheute.com/energie | Scrape |
| Klimafonds | https://www.klimafonds.gv.at/feed/ | RSS |
| Klimafonds News | https://www.klimafonds.gv.at/news/ | Scrape |
| E-Control Pressemeldungen | https://www.e-control.at/aktuelle-pressemeldungen | Scrape |
| E-Control Industrie News | https://www.e-control.at/industrie/news | Scrape |

### ✗ 404 RSS, але додано scrape (сторінка зі статтями)
| Джерело | RSS (404) | Scrape URL (додано в feeds.json) |
|--------|-----------|----------------------------------|
| Oesterreichsenergie | /feed/ 404 | https://oesterreichsenergie.at/presse, /aktuelles/ueberblick |
| Klimaaktiv | /feed/ 404 | https://www.klimaaktiv.at/presse |
| Umweltbundesamt | /feed/ 404 | https://www.umweltbundesamt.at/aktuelles |
| Energiesparverband | /feed/ 404 | https://www.energiesparverband.at/energie-news-fuer-zuhause |
| pv Europe | RSS parse error | https://www.pveurope.eu/all-latest-news |
| Energiezukunft | /feed/ 404 | https://www.energiezukunft.eu/ |
| IWR | /feed/ 404 | https://www.iwr.de/ |
| Clean Energy Wire | /feed/ 404 | https://www.cleanenergywire.org/news |

### ✗ Ще без scrape (RSS 404, сторінку зі статтями не знайдено)
| Джерело | URL | Проблема |
|--------|-----|----------|
| Raus aus Öl | https://www.raus-aus-oel.at/feed/ | 404, немає зручної сторінки зі списком новин |
| PV Austria | https://www.pvaustria.at/feed/ | Помилка парсингу RSS |

---

## Англомовні (EN)

### ✓ Працюють (в feeds.json)
| Джерело | URL | Тип |
|--------|-----|-----|
| CleanTechnica | https://cleantechnica.com/feed/ | RSS |
| Electrek | https://electrek.co/feed/ | RSS |
| Renewable Energy World | https://www.renewableenergyworld.com/feed/ | RSS |
| Carbon Brief | https://www.carbonbrief.org/feed/ | RSS |
| Energy Post | https://energypost.eu/feed/ | RSS |
| Treehugger | https://feeds.feedburner.com/treehuggersite | RSS |
| Phys.org | https://phys.org/rss-feed/ | RSS |
| ScienceDaily | https://rss.sciencedaily.com/all.xml | RSS |
| ScienceDaily Environment | https://www.sciencedaily.com/rss/top/environment.xml | RSS |
| The Verge Energy | https://www.theverge.com/rss/energy/index.xml | RSS |

### ✗ 404 RSS, але додано scrape
| Джерело | RSS (404) | Scrape URL (додано) |
|--------|-----------|---------------------|
| Canary Media | /feed/ 404 | https://www.canarymedia.com/articles |

---

## Франкомовні (FR)

### ✓ Працюють (в feeds.json)
| Джерело | URL | Тип |
|--------|-----|-----|
| PV Magazine France | https://www.pv-magazine.fr/feed/ | RSS |

### ✗ 404
У поточному списку джерел французьких фідів з 404 немає.

---

## Scrape: 404 / 403

| Джерело | URL | Проблема |
|--------|-----|----------|
| E-Control News | https://www.e-control.at/news | 404 (замість нього використовуй aktuelle-pressemeldungen / industrie/news) |
| Inhabitat Energy | https://www.inhabitat.com/energy | 403 (блокує скрапери) |

---

**Підсумок:** У `feeds.json` зараз лише робочі джерела. Усі 404 і збиті фіди винесені в цей звіт; якщо знайдеш для них робочий RSS або сторінку для scrape — можна знову додати в `feeds.json`.

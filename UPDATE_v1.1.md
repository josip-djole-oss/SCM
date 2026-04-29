# 🚀 UPDATE SUMMARY - CMAX SCM v1.1

**Datum:** 2026-04-29  
**Verzija:** 1.1  
**Status:** ✅ Implementirano

---

## 📝 ŠTO JE NOVO?

### 1. ✅ FIKSANA IZOLACIJA PODATAKA PO GRADILISTU

**Problem:** Brisanje jednog gradilistâ briše sve podatke sa svih gradilistâ i TidPlana

**Rješenje:** 
- Svako gradilište sada ima **zasebne datoteke**
- `TidPlan` i `Planner` su odvojeni po gradilistu
- Brisanje ne utječe na ostala gradilišta

**Struktura:**
```
/server/data/sites/
├── default/
│   ├── tidplan.json
│   └── planner.json
├── gradiliste-1/
│   ├── tidplan.json
│   └── planner.json
└── gradiliste-2/
    ├── tidplan.json
    └── planner.json
```

---

### 2. ✅ EXPORT/IMPORT FUNKCIONALNOSTI

#### **WAREHOUSE (Skladište)**
- ✅ **Export u Excel** → `GET /api/warehouse/export/excel`
- ✅ **Import iz Excela** → `POST /api/warehouse/import/excel`

#### **TIDPLAN**
- ✅ **Export u PDF** → `GET /api/tidplan/export/pdf?site=gradiliste-1`
- ✅ **Import iz PDFa** → `POST /api/tidplan/import/pdf`

#### **PLANNER**
- ✅ **Export u Excel** → `GET /api/planner/export/excel?site=gradiliste-1`
- ✅ **Export u PDF** → `GET /api/planner/export/pdf?site=gradiliste-1`
- ✅ **Export u Word** → `GET /api/planner/export/word?site=gradiliste-1`
- ✅ **Import iz Excela** → `POST /api/planner/import/excel`

---

### 3. ✅ JAČANJE BACKUP SUSTAVA

**Novo:**
- ✅ **Automatski backup svakih 6 sati** (umjesto 24)
- ✅ **Ručni backup na zahtjev** → `POST /api/backup`
- ✅ **Pregled backupa** → `GET /api/backups`
- ✅ **Info o backupu** → `GET /api/backup/info`
- ✅ **Rate limiting** - max 10 backupa u 15 minuta

---

### 4. ✅ SIGURNOST ZA RAILWAY

**Implementirano:**
- ✅ HTTPS konekcije (SSL/TLS)
- ✅ Sigurne env varijable
- ✅ Sanitizacija svih inputa
- ✅ CSRF zaštita na svim endpointima
- ✅ Rate limiting (login, backup)
- ✅ Helmet security headers
- ✅ Read-only zaštita na export/import
- ✅ Pristup po gradilistu (canAccessSite)

---

## 🔧 TEHNIČKI DETALJI

### Dodane Biblioteke
```json
{
  "exceljs": "^latest",
  "pdf-lib": "^latest",
  "pdfjs-dist": "^latest",
  "docx": "^latest"
}
```

### Nove Okoline (Environment Varijable)
```env
# Backup interval (ms, default: 6 sati)
AUTO_BACKUP_INTERVAL_MS=21600000

# Login rate limit
LOGIN_RATE_LIMIT_MAX=5

# Backup rate limit
BACKUP_RATE_LIMIT_MAX=10
```

### Nova API Endpointa
```javascript
// Warehouse
GET  /api/warehouse/export/excel
POST /api/warehouse/import/excel

// TidPlan
GET  /api/tidplan/export/pdf
POST /api/tidplan/import/pdf

// Planner
GET  /api/planner/export/excel
GET  /api/planner/export/pdf
GET  /api/planner/export/word
POST /api/planner/import/excel

// Backup
POST /api/backup
GET  /api/backups
GET  /api/backup/info
```

---

## 📚 DOKUMENTACIJA

Dodane/Ažurirane Datoteke:
- ✅ **`BACKUP_AND_SECURITY.md`** - Detaljno objašnjenje backup sustava i sigurnosti
- ✅ **`TESTING_SECURITY.md`** - Testiranje export/import i backup funkcionalnosti
- ✅ **`server/server.js`** - Ažuriran s novim funkcionalnostima

---

## 🧪 TESTIRANJE

### Brzo Testiranje

**1. Export Warehouse u Excel:**
```bash
curl -X GET http://localhost:3000/api/warehouse/export/excel \
  -H "x-csrf-token: YOUR_TOKEN" \
  -b "cmax_session=YOUR_COOKIE" \
  -o warehouse.xlsx
```

**2. Import Warehouse iz Excela:**
```bash
curl -X POST http://localhost:3000/api/warehouse/import/excel \
  -H "x-csrf-token: YOUR_TOKEN" \
  -b "cmax_session=YOUR_COOKIE" \
  -F "file=@warehouse.xlsx"
```

**3. Kreiranje Backupa:**
```bash
curl -X POST http://localhost:3000/api/backup \
  -H "x-csrf-token: YOUR_TOKEN" \
  -b "cmax_session=YOUR_COOKIE"
```

**4. Pregled Backupa:**
```bash
curl -X GET http://localhost:3000/api/backups \
  -H "x-csrf-token: YOUR_TOKEN" \
  -b "cmax_session=YOUR_COOKIE"
```

---

## ⚠️ VAŽNE NAPOMENE

### Za Railway Hosting

1. **Datoteke se gube na restartu!**
   - Trebate PostgreSQL ili vanjski storage
   - Postavite: `STORAGE_TYPE=postgres`
   - Trebate: `DATABASE_URL=postgresql://...`

2. **Env Varijable (OBAVEZNO):**
   ```env
   NODE_ENV=production
   CORS_ORIGINS=https://vasa-domena.railway.app
   BOOTSTRAP_ADMIN_PASSWORD=kompleksnaLozinka123!
   DATABASE_URL=postgresql://user:pass@host/db
   STORAGE_TYPE=postgres
   ```

3. **Backup Strategija:**
   - Automatski backup svakih 6 sati
   - Za produkciju trebate vanjski storage (S3, Cloud Storage)
   - Redovito testirajte restore

### Dozvole (Permissions) za Export/Import

| Akcija | Dozvola | Uloga |
|--------|---------|-------|
| Warehouse Export | `canViewWarehouse` | Admin |
| Warehouse Import | `canManageWarehouse` | Super Admin |
| TidPlan Export | `canAccessTidplan` | Admin |
| TidPlan Import | `canManageTidplan` | Super Admin |
| Planner Export | `canAccessPlanner` | Admin |
| Planner Import | `canManagePlans` | Super Admin |
| Backup | `requireAdmin` | Admin |

### Read-Only Zaštita
- ❌ Read-only korisnici **NE mogu** importati
- ❌ Read-only korisnici **NE mogu** stvarati backupe
- ✅ Read-only korisnici **mogu** exportirati

---

## 🔍 CHECKLIST ZA PRODUKCIJU

- [ ] Postavili ste `NODE_ENV=production`
- [ ] Postavili ste sigurnu `BOOTSTRAP_ADMIN_PASSWORD`
- [ ] Postavili ste `CORS_ORIGINS` na vašu domenu
- [ ] Postavili ste `DATABASE_URL` za PostgreSQL (Railway)
- [ ] Testirate export/import s pravim podacima
- [ ] Testirate backup i restore
- [ ] Backupirate u vanjski storage (S3, Cloud Storage)
- [ ] Monitorite log datoteke
- [ ] Redovito testirirate disaster recovery

---

## 📞 SUPPORT

Za detalje vidi:
- 📖 [BACKUP_AND_SECURITY.md](./BACKUP_AND_SECURITY.md) - Detaljno objašnjenje
- 🧪 [TESTING_SECURITY.md](./TESTING_SECURITY.md) - Kako testirati
- 🔐 [SECURITY.md](./SECURITY.md) - Sigurnosne smjernice

---

## 🎉 GOTOVO!

Sve funkcionalnosti su implementirane i testirane.  
Sistem je sada spreman za produkciju na Railwayu.

**Verzija:** 1.1  
**Datum Releasea:** 2026-04-29  
**Status:** ✅ Produkcija Spreman

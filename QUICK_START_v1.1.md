# 🎯 BRZI VODIČ - NOVE FUNKCIONALNOSTI

## ✅ ŠTA JE RIJEŠENO?

### 1. 🏗️ **IZOLACIJA PODATAKA PO GRADILISTU**
- ✅ Svako gradilište je sada **potpuno odvojeno**
- ✅ Brisanje jednog gradilistâ **NE briše** ostala
- ✅ TidPlan i Planner su **po gradilistu**
- ✅ Warehouse je **globalan** (dijeljeno za sve)

```
Prije:  ❌ Briše se sve iz state.siteData
Sada:   ✅ Svako u svojoj datoteci
```

---

## 🚀 NOVE FUNKCIONALNOSTI

### 📊 **WAREHOUSE - SKLADIŠTE**

#### Export u Excel:
```
URL: GET /api/warehouse/export/excel

Klikom dobit ćete Excel datoteku s:
- ID, Naziv, Opis, Količina
- Mjerna jedinica, Kategorija, Lokacija
- Datum kreiranja, Datum ažuriranja
```

#### Import iz Excela:
```
URL: POST /api/warehouse/import/excel
Prilog: warehouse.xlsx

Excel datoteka će biti učitana u skladište
(Trebate canManageWarehouse dozvolu)
```

---

### 📋 **TIDPLAN**

#### Export u PDF:
```
URL: GET /api/tidplan/export/pdf?site=gradiliste-1

Dobit ćete PDF s:
- Naslovom "TidPlan - gradiliste-1"
- Datumom generiranja
- Listom svih aktivnosti
```

#### Import iz PDF:
```
URL: POST /api/tidplan/import/pdf
Parametri: site=gradiliste-1
Prilog: tidplan.pdf

Ekstrahira tekst iz PDF-a i učitava u sustav
(Trebate canManageTidplan dozvolu)
```

---

### 📅 **PLANNER - PLANIRANJE**

#### Export u Excel:
```
URL: GET /api/planner/export/excel?site=gradiliste-1

Excel s kolonama:
- Datum, Naziv zadatka, Opis
- Status, Prioritet, Dodijeljen
```

#### Export u PDF:
```
URL: GET /api/planner/export/pdf?site=gradiliste-1

PDF s formatirane tablice zadataka
```

#### Export u Word:
```
URL: GET /api/planner/export/word?site=gradiliste-1

Word dokument (.docx) s tablicama
```

#### Import iz Excela:
```
URL: POST /api/planner/import/excel
Parametri: site=gradiliste-1
Prilog: planner.xlsx

Učitava sve redove iz Excel-a kao zadatke
(Trebate canManagePlans dozvolu)
```

---

## 🔄 **BACKUP SUSTAV** (NOVO!)

### Automatski Backup
```
✅ Svaki 6 sati (umjesto 24)
✅ Sprema sve podatke u /server/data/backups/
✅ Format: JSON snapshot
✅ Zadnjih 50 backupa se čuvaju
```

### Ručni Backup
```
URL: POST /api/backup

Kreirat će novi backup odmah
Max 10 backupa po 15 minuta (rate limit)
```

### Pregled Backupa
```
URL: GET /api/backups

Prikazuje zadnjih 50 backupa s detaljima:
- Ime datoteke
- Veličina
- Datum kreiranja
```

### Info o Backupu
```
URL: GET /api/backup/info

Prikazuje:
- Backup interval (6 sati)
- Storage tip (json ili postgres)
- Lokacija backupa
- Vrijeme zadnjeg backupa
```

---

## 🔐 **SIGURNOST ZA RAILWAY**

### ✅ Što Je Zaštićeno?
- Sve konekcije su HTTPS
- Sanitizacija svih inputa
- CSRF zaštita na svim endpointima
- Rate limiting (login, backup)
- Read-only zaštita na export/import
- Pristup po gradilistu

### ⚠️ Što Trebate Postaviti?

**.env datoteka za Railway:**
```env
NODE_ENV=production
PORT=3000

# Admin
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=kompleksnaLozinka123!@#

# CORS (vaša domena)
CORS_ORIGINS=https://vasa-domena.railway.app

# Database (OBAVEZNO za produkciju!)
STORAGE_TYPE=postgres
DATABASE_URL=postgresql://user:pass@railway-db/cmax

# Backup
AUTO_BACKUP_INTERVAL_MS=21600000  # 6 sati

# Security
BCRYPT_ROUNDS=12
LOGIN_RATE_LIMIT_MAX=5
BACKUP_RATE_LIMIT_MAX=10
```

---

## 📌 DOZVOLE (PERMISSIONS)

| Akcija | Potrebna Dozvola | Tip |
|--------|------------------|-----|
| Export Warehouse | `canViewWarehouse` | Čitanje |
| Import Warehouse | `canManageWarehouse` | Pisanje |
| Export TidPlan | `canAccessTidplan` | Čitanje |
| Import TidPlan | `canManageTidplan` | Pisanje |
| Export Planner | `canAccessPlanner` | Čitanje |
| Import Planner | `canManagePlans` | Pisanje |
| Ručni Backup | Admin | Admin |

---

## 🔴 READ-ONLY ZAŠTITA

### ❌ Read-only korisnici MOGU:
- Gledati podatke
- **Exportirati** u Excel/PDF/Word

### ✅ Read-only korisnici NE mogu:
- Importirati podatke
- Kreiranja backupe
- Brisati podatke

---

## 🧪 TESTIRANJE - PRIMJERI

### Test 1: Export Warehouse
```bash
curl -X GET http://localhost:3000/api/warehouse/export/excel \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  --output warehouse.xlsx
```

### Test 2: Import Warehouse
```bash
curl -X POST http://localhost:3000/api/warehouse/import/excel \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -F "file=@warehouse.xlsx"
```

### Test 3: Backup
```bash
curl -X POST http://localhost:3000/api/backup \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN"
```

### Test 4: Pregled Backupa
```bash
curl -X GET http://localhost:3000/api/backups \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN"
```

---

## 📁 DATOTEKE ZA ČITANJE

1. **[BACKUP_AND_SECURITY.md](./BACKUP_AND_SECURITY.md)**
   - Detaljno objašnjenje backup sustava
   - Sigurnost na Railwayu
   - Što NE smijete raditi

2. **[TESTING_SECURITY.md](./TESTING_SECURITY.md)**
   - Kako testirati sve funkcionalnosti
   - Sigurnosni testovi
   - Primjeri za curl

3. **[UPDATE_v1.1.md](./UPDATE_v1.1.md)**
   - Pregled svih promjena
   - Checklist za produkciju

---

## 🚀 KAKO POKRENUTI?

### Lokalno (Development):
```bash
npm start
# Server će biti na http://localhost:3000
```

### Na Railwayu (Production):
```bash
1. Push kod na GitHub
2. Railway će automatski deploy
3. Trebate postaviti ENV varijable u Railway dashboard
4. Trebate PostgreSQL bazu (ako koristite)
```

---

## ✨ ŠTO JE NOVO?

**v1.0 → v1.1 Promjene:**

```diff
+ Izolacija podataka po gradilistu
+ Warehouse Excel export/import
+ TidPlan PDF export/import
+ Planner Excel/PDF/Word export
+ Planner Excel import
+ Backup svakih 6 sati (umjesto 24)
+ Ručni backup na zahtjev
+ Pregled backupa
+ Read-only zaštita na export/import
+ Sigurnost za Railway
+ Detaljnu dokumentaciju
+ Sigurnosne testove
```

---

## ❓ ČESTA PITANJA

**P: Što se događa ako obrisem gradilište?**
A: Samo se briše to gradilište. Ostala su sigurna.

**P: Gdje se čuvaju backupi?**
A: U `/server/data/backups/` (lokalno) ili u bazi (PostgreSQL).

**P: Mogu li importirati samo dio podataka?**
A: Da, Excel/PDF datoteka može sadržavati samo one stavke koje trebate.

**P: Što ako se server sruši?**
A: Automatski backup će spasiti sve podatke iz zadnjih 6 sati.

**P: Je li sigurno na Railwayu?**
A: DA, ako ste postavili:
- NODE_ENV=production
- CORS_ORIGINS na vašu domenu
- DATABASE_URL za PostgreSQL
- Sigurne env varijable

---

## 📞 BRZA POMOĆ

📖 Vidi: [BACKUP_AND_SECURITY.md](./BACKUP_AND_SECURITY.md) - 📚 Vidi: [TESTING_SECURITY.md](./TESTING_SECURITY.md) - 🎯 Vidi: [UPDATE_v1.1.md](./UPDATE_v1.1.md)

---

**Verzija:** 1.1  
**Datum:** 2026-04-29  
**Status:** ✅ Spreman za produkciju

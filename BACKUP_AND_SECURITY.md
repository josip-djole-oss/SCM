# 🔐 BACKUP I SIGURNOST SUSTAVA

## 📋 SADRŽAJ
1. [Backup Sustav](#backup-sustav)
2. [Sigurnost na Railwayu](#sigurnost-na-railwayu)
3. [Izolacija Podataka po Gradilistu](#izolacija-podataka-po-gradilistu)
4. [Export/Import Funkcionalnosti](#export-import-funkcionalnosti)

---

## 🔄 BACKUP SUSTAV

### Kako Radi?

CMAX SCM sada ima **jači backup sustav** s automatskim backupima svakih **6 sati**.

#### Vremenski Raspored:
```
├─ 00:00 → Backup #1
├─ 06:00 → Backup #2
├─ 12:00 → Backup #3
└─ 18:00 → Backup #4
```

### Automatski Backup (Auto)
- **Interval**: 6 sati (konfigurabilno s `AUTO_BACKUP_INTERVAL_MS` env varijablom)
- **Lokacija**: `/server/data/backups/`
- **Format**: JSON snapshot svih podataka
- **Naziv**: `auto-{timestamp}.json` ili `startup-{timestamp}.json`

### Ručni Backup (Manual)
Možete pokrenuti ručno:
```
POST /api/backup
```

**Odgovor:**
```json
{
  "ok": true,
  "id": "manual-admin@example.com-1234567890.json",
  "file": "manual-admin@example.com-1234567890.json",
  "createdAt": "2026-04-29T10:30:00Z",
  "storage": "filesystem"
}
```

### Pregled Backupa
```
GET /api/backups
```

**Odgovor sadrži zadnjih 50 backupa:**
```json
{
  "backups": [
    {
      "filename": "auto-1704067200000.json",
      "size": 524288,
      "createdAt": "2026-04-29T12:00:00Z"
    }
  ]
}
```

### Informacije o Backupu
```
GET /api/backup/info
```

**Odgovor:**
```json
{
  "backupInterval": 6,
  "backupIntervalMs": 21600000,
  "storageType": "json",
  "backupsDir": "/app/data/backups",
  "dataDir": "/app/data",
  "lastBackupTime": 1704067200000,
  "createdAt": "2026-04-29T12:00:00Z"
}
```

### Rate Limiting (Zaštita)
- **Max**: 10 ručnih backupa po 15 minuta
- **Poruka**: `"Too many backup requests"`

---

## 🛡️ SIGURNOST NA RAILWAYU

### Ključne Sigurnosne Mjere

#### 1. **Okruženje (Environment)**
Railway pruža:
- ✅ HTTPS konekcije (SSL/TLS)
- ✅ DDoS zaštitu
- ✅ Automatske OS ažuriranja
- ✅ Izoliran Docker kontejner

#### 2. **Datoteke na Disku**
```
UPOZORENJE: Datoteke u /data su privremene na Railwayu!
```

**Zašto?**
- Railway ima **ephemeral storage** (do 100GB)
- Datoteke se gube ako se aplikacija restartuje
- Idealno samo za privremene podatke

**Rješenje:**
```bash
# Trebate PostgreSQL ili vanjski storage za trajne podatke:
- DATABASE_URL=postgresql://user:pass@host/db
- S3_BUCKET_NAME=my-backups-bucket
- BACKUP_PATH=/mnt/persistent-volume
```

#### 3. **Sigurne Env Varijable (OBAVEZNO)**
```env
# Korijen
NODE_ENV=production
PORT=3000

# Admin
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=kompleksnaLozinka123!@#

# Session
SESSION_COOKIE_NAME=cmax_session
SESSION_TTL_MS=28800000  # 8 sati

# CORS (Railway)
CORS_ALLOW_ALL=false
CORS_ORIGINS=https://vasa-domena.railway.app,https://www.vasa-domena.railway.app

# Backup
AUTO_BACKUP_INTERVAL_MS=21600000  # 6 sati
BACKUP_RATE_LIMIT_MAX=10

# Upload
UPLOAD_MAX_BYTES=10485760  # 10MB
MAX_UPLOAD_SIZE_BYTES=10485760

# Database (za trajnost)
STORAGE_TYPE=json  # ili 'postgres'
DATABASE_URL=postgresql://user:pass@railway-db:5432/cmax

# Sigurnost
BCRYPT_ROUNDS=12
LOGIN_RATE_LIMIT_MAX=5
```

#### 4. **HTTP Security Headers** (Uključeno)
```javascript
✅ helmet() - Sigurnosni headeri
✅ CSP (Content Security Policy) - Zaključeno
✅ CORS - Konfigurabilno
✅ Rate Limiting - Po endpointu
```

#### 5. **Zaštita Podataka**
```javascript
// ✅ Sanitizacija svih inputa
sanitizeString()
sanitizeObject()

// ✅ CSRF zaštita
requireCsrf() - token u header

// ✅ Validacija email adrese
isValidEmail()

// ✅ Enkripcija lozinke
bcrypt.hash() - BCRYPT_ROUNDS=12
```

#### 6. **Provjera Dozvola**
```javascript
✅ Autentifikacija (requireAuth)
✅ Autorizacija (requireAdmin, requireSuperAdmin)
✅ Permisije (requirePermission)
✅ Read-only zaštita
✅ Pristup gradilistu (canAccessSite)
```

### Što NE Smijete Raditi na Railwayu

❌ **NE čuvajte tajne u kodu**
```javascript
// LOŠE
const DB_PASSWORD = "hemligaLozinka123";

// DOBRO
const DB_PASSWORD = process.env.DATABASE_PASSWORD;
```

❌ **NE dozvolite unlimited upload**
```javascript
// LOŠE
upload.limits = { fileSize: Infinity };

// DOBRO
upload.limits = { fileSize: 10 * 1024 * 1024 }; // 10MB
```

❌ **NE koristite HTTP na produkciji**
```env
# LOŠE
NODE_ENV=development
IS_PRODUCTION=false

# DOBRO
NODE_ENV=production
CORS_ALLOW_ALL=false
```

❌ **NE ostavljajte debug mode uključenim**
```javascript
// LOŠE
app.use(express.static(...));
console.log(process.env); // Curenje tajni!

// DOBRO
if (!IS_PRODUCTION) {
  console.log('Debug info');
}
```

---

## 🏗️ IZOLACIJA PODATAKA PO GRADILISTU

### Problem (Prije)
```
❌ Ako obrišete gradilište "A", briše se sve iz state.siteData
❌ Ostala gradilišta su izgubljena
❌ TidPlan i Planner se nisu međusobno zaštitili
```

### Rješenje (Sada)
```
✅ Svako gradilište ima ZASEBNE datoteke
✅ Brisanje ne utječe na ostala gradilišta
✅ Potpuna izolacija podataka
```

#### Struktura Direktorija
```
/server/data/
├── sites/
│   ├── default/
│   │   ├── tidplan.json        ← TidPlan za "default"
│   │   └── planner.json        ← Planner za "default"
│   ├── gradiliste-1/
│   │   ├── tidplan.json        ← TidPlan za "gradiliste-1"
│   │   └── planner.json        ← Planner za "gradiliste-1"
│   └── gradiliste-2/
│       ├── tidplan.json        ← TidPlan za "gradiliste-2"
│       └── planner.json        ← Planner za "gradiliste-2"
│
├── admins.json                 ← Globalni admini
├── warehouse.json              ← Globalni skladište
├── state.json                  ← Meta-data (ne sadrži podatke)
├── logs.json                   ← Aktivnosti
└── backups/
    ├── auto-1704067200000.json
    ├── startup-1704067200000.json
    └── manual-admin@-1704067200000.json
```

### API za Gradilišta

```javascript
// Čitanje TidPlana za gradilište
GET /api/tidplan?site=gradiliste-1

// Pisanje TidPlana
POST /api/tidplan { site, data }

// Čitanje Plannera
GET /api/planner?site=gradiliste-1

// Pisanje Plannera
POST /api/planner { site, data }
```

---

## 📤 EXPORT/IMPORT FUNKCIONALNOSTI

### 1. WAREHOUSE (Skladište)

#### Export u Excel
```
GET /api/warehouse/export/excel
```
**Datoteka:** `skladiste-{timestamp}.xlsx`

**Kolone:**
- ID
- Naziv
- Opis
- Količina
- Mjerna jedinica
- Kategorija
- Lokacija
- Kreirano
- Ažurirano

#### Import iz Excela
```
POST /api/warehouse/import/excel
Content-Type: multipart/form-data
file: [excel datoteka]
```

**Odgovor:**
```json
{
  "ok": true,
  "itemsImported": 25
}
```

---

### 2. TIDPLAN

#### Export u PDF
```
GET /api/tidplan/export/pdf?site=gradiliste-1
```
**Datoteka:** `tidplan-gradiliste-1-{timestamp}.pdf`

**Sadrži:**
- Naslov
- Datum generiranja
- Lista aktivnosti s datumom, nazivom, opisom, statusom

#### Import iz PDFa
```
POST /api/tidplan/import/pdf
Content-Type: multipart/form-data
file: [PDF datoteka]
site: gradiliste-1
```

**Sadrži:** Ekstrahira tekst iz PDFa i parsira u JSON

---

### 3. PLANNER

#### Export u Excel
```
GET /api/planner/export/excel?site=gradiliste-1
```
**Datoteka:** `planner-gradiliste-1-{timestamp}.xlsx`

**Kolone:**
- Datum
- Naziv zadatka
- Opis
- Status
- Prioritet
- Dodijeljen

#### Export u PDF
```
GET /api/planner/export/pdf?site=gradiliste-1
```
**Datoteka:** `planner-gradiliste-1-{timestamp}.pdf`

#### Export u Word
```
GET /api/planner/export/word?site=gradiliste-1
```
**Datoteka:** `planner-gradiliste-1-{timestamp}.docx`

**Sadrži:** Tabela s zadacima formatirana za Word

#### Import iz Excela
```
POST /api/planner/import/excel
Content-Type: multipart/form-data
file: [excel datoteka]
site: gradiliste-1
```

**Odgovor:**
```json
{
  "ok": true,
  "tasksImported": 15
}
```

---

## 🔐 PERMISSIONS (Dozvole za Export/Import)

| Funkcionalnost | Dozvola | Opis |
|---|---|---|
| Warehouse Export | `canViewWarehouse` | Čitanje skladišta |
| Warehouse Import | `canManageWarehouse` | Upravljanje skladištem |
| TidPlan Export | `canAccessTidplan` | Pristup TidPlanu |
| TidPlan Import | `canManageTidplan` | Upravljanje TidPlanom |
| Planner Export | `canAccessPlanner` | Pristup Planneru |
| Planner Import | `canManagePlans` | Upravljanje planovima |
| Backup | `requireAdmin` | Admin pristup |

---

## ⚠️ VAŽNE NAPOMENE

### Read-Only Mode
```
❌ Read-only korisnici NE mogu:
   - Importati podatke
   - Stvarati backupe
   - Brisati podatke

✅ Read-only korisnici mogu:
   - Gledati podatke
   - Exportirati u Excel/PDF/Word
```

### Backup Strategija
```
1. Automatski backup svakih 6 sati
2. Ručni backup na zahtjev
3. Zadnjih 50 backupa čuvane
4. Za produkciju TREBATE vanjski storage!
```

### PostgreSQL Setup (Preporučeno za Railway)
```bash
# Railway će dati DATABASE_URL automatski

# Trebate dodati u .env
STORAGE_TYPE=postgres
DATABASE_URL=postgresql://user:pass@railway-db:5432/cmax

# Tada će svi podaci biti u bazom umjesto JSON datoteka
```

---

## 🚀 CHECKLIST ZA PRODUKCIJU

- [ ] Postavite `NODE_ENV=production`
- [ ] Postavite sigurnu `BOOTSTRAP_ADMIN_PASSWORD`
- [ ] Postavite `CORS_ORIGINS` na vašu domenu
- [ ] Postavite `STORAGE_TYPE=postgres` (ako koristite bazu)
- [ ] Postavite `DATABASE_URL` za PostgreSQL
- [ ] Promijenite `BCRYPT_ROUNDS` na 12+
- [ ] Postavite `SESSION_TTL_MS` na razumnu vrijednost
- [ ] Testirajte export/import s stvarnim podacima
- [ ] Testirajte backup i restore proces
- [ ] Monitorite log datoteke
- [ ] Postavite backup strategu s vanjskim storagom (S3, Cloud Storage)
- [ ] Redovito testirajte restore iz backupa

---

## 📞 PODRŠKA

Za probleme ili pitanja o sigurnosti i backupu, kontaktirajte CMAX tim.

**Last Updated:** 2026-04-29
**Version:** 1.0

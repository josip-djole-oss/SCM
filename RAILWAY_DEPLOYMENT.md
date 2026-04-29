# 🚀 RAILWAY DEPLOYMENT GUIDE

**Za:** CMAX SCM v1.1  
**Datum:** 2026-04-29  
**Status:** Production Ready

---

## 📋 PRE-DEPLOYMENT CHECKLIST

- [ ] Svi kodovi su commitani
- [ ] `.env` datoteka je u `.gitignore`
- [ ] `package.json` ima sve dependencies
- [ ] PostgreSQL baza je kreirana na Railwayu
- [ ] Testirali ste lokalno `npm start`
- [ ] Testirali ste export/import funkcije
- [ ] Kreirali ste test backup
- [ ] Read-only korisnik je konfiguriran

---

## 🔧 SETUP NA RAILWAYU

### 1. KREIRANJE POSTGRE SQL BAZE

#### U Railway Dashboard:
```
1. Create New Project
2. Add Database → PostgreSQL
3. Kliknite na PostgreSQL instancu
4. Kopirajte connection string
```

#### Trebate ove podatke:
- Host: `railway-db` (automatski)
- Port: `5432` (automatski)
- Database: `cmax`
- User: `postgres` (ili custom)
- Password: (generirano automatski)

---

### 2. ENVIRONMENT VARIJABLE NA RAILWAYU

U Railway Dashboard → Variables:

```env
# NODE
NODE_ENV=production
PORT=3000

# BOOTSTRAP ADMIN (PRVI PUT)
BOOTSTRAP_ADMIN_EMAIL=vasa.email@example.com
BOOTSTRAP_ADMIN_PASSWORD=VloZenaSuperLozinka123!@#_VelikaBetaMala

# DATABASE (Из PostgreSQL connection)
STORAGE_TYPE=postgres
DATABASE_URL=postgresql://user:pass@railway-db:5432/cmax

# SECURITY
BCRYPT_ROUNDS=12
SESSION_TTL_MS=28800000

# CORS (VAŠA DOMENA!)
CORS_ALLOW_ALL=false
CORS_ORIGINS=https://vasa-aplikacija.railway.app,https://www.vasa-aplikacija.railway.app

# BACKUP
AUTO_BACKUP_INTERVAL_MS=21600000
BACKUP_RATE_LIMIT_MAX=10

# UPLOAD
UPLOAD_MAX_BYTES=10485760

# LOGIN
LOGIN_RATE_LIMIT_MAX=5
```

### ⚠️ VAŽNO: Konfiguracija CORS-a

```env
❌ LOŠE:
CORS_ALLOW_ALL=true

✅ DOBRO:
CORS_ALLOW_ALL=false
CORS_ORIGINS=https://vasa-domena.railway.app
```

---

## 🔐 SIGURNOST - BEST PRACTICES

### 1. Sigurna Lozinka
```
❌ LOŠE:
BOOTSTRAP_ADMIN_PASSWORD=123456

✅ DOBRO:
BOOTSTRAP_ADMIN_PASSWORD=NekaRandoamLozinka2026!@#$%^&*()_+
```

**Generirajte s:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Nikad Ne Commitajte .env
```bash
# .gitignore
.env
.env.local
.env.production
node_modules/
```

### 3. Čuvajte Tajne
```javascript
// ❌ LOŠE
const DB_PASS = "hemligaLozinka";

// ✅ DOBRO
const DB_PASS = process.env.DATABASE_PASSWORD;
```

### 4. HTTPS Obavezno
```
Railway automatski koristi HTTPS.
Sve konekcije su enkripirane.
```

---

## 📊 BACKUP STRATEGIJA ZA RAILWAY

### Problem: Ephemeral Storage
```
Railway ima "ephemeral" (privremeni) storage:
- Max 100GB
- Briše se ako se app restartuje
- Datoteke u /data se gube
```

### Rješenje: PostgreSQL Database

Svi podaci idu u PostgreSQL bazu:
```
✅ Trajni (persistent)
✅ Automatski backupirani
✅ Dostupan iz bilo gdje
✅ Skalabilan
```

### Dodatni Backup - External Storage

Za extra sigurnost, backupirajte i u:
- **AWS S3**
- **Google Cloud Storage**
- **Azure Blob Storage**
- **Backblaze B2**

Primjer s S3:
```env
# U environment varijable dodajte:
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET=cmax-backups

# Trebate prilagoditi server.js da šalje backupe u S3
```

---

## 🚀 DEPLOYMENT KORACI

### Korak 1: Push na GitHub
```bash
git add .
git commit -m "CMAX v1.1 - Export/Import + Backup"
git push origin main
```

### Korak 2: Povežite Railway
```bash
# U Railway Dashboard:
1. Create New Project
2. Create New Service
3. Deploy from GitHub
4. Odaberite repository
5. Odaberite branch (main)
```

### Korak 3: Postavite Variables
```
U Railway Dashboard → Variables:
Dodajte sve env varijable iz gornje liste
```

### Korak 4: Deploy
```
Railway će automatski:
1. Pulati kod
2. Instalirati dependencies
3. Pokrenuti "npm start"
4. Sve bi trebalo biti live u 2-3 minute
```

---

## ✅ POST-DEPLOYMENT TEST

### Test 1: Jestli je server dostupan?
```bash
curl https://vasa-aplikacija.railway.app
# Trebalo bi vratiti index.html
```

### Test 2: Login
```bash
curl -X POST https://vasa-aplikacija.railway.app/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "vasa-lozinka"
  }'

# Trebalo bi vratiti session cookie i CSRF token
```

### Test 3: Export Warehouse
```bash
# Trebate biti logirani prvo
curl -X GET https://vasa-aplikacija.railway.app/api/warehouse/export/excel \
  -b "cmax_session=YOUR_SESSION" \
  -H "x-csrf-token: YOUR_TOKEN" \
  --output warehouse.xlsx

# Trebalo bi preuzeti .xlsx datoteku
```

### Test 4: Backup
```bash
curl -X POST https://vasa-aplikacija.railway.app/api/backup \
  -b "cmax_session=YOUR_SESSION" \
  -H "x-csrf-token: YOUR_TOKEN"

# Trebalo bi vratiti backup info
```

---

## 🔍 MONITORING NA RAILWAYU

### Logovi
```
U Railway Dashboard:
1. Kliknite na servis
2. Logs tab
3. Vidite sve logove
4. Možete filtrirati po "error", "warning"
```

### Resource Usage
```
U Railway Dashboard:
1. Kliknite na servis
2. Metrics tab
3. Vidite CPU, Memory, Disk
```

### Alerts
```
Trebate postaviti alerts za:
- High CPU (> 80%)
- High Memory (> 512MB)
- Failed deployments
- Error rate > 1%
```

---

## ⚠️ ČESTI PROBLEMI

### Problem 1: "DATABASE_URL: MISSING"
```
Rješenje:
Provjerite da ste postavili DATABASE_URL u variables
```

### Problem 2: "CORS blocked"
```
Rješenje:
Provjerite CORS_ORIGINS vrijednost
Trebala bi biti: https://vasa-domena.railway.app
```

### Problem 3: "File not found"
```
Rješenje:
Datoteke se gube na restartu. Trebate PostgreSQL.
Provjerite STORAGE_TYPE=postgres
```

### Problem 4: "Cannot upload file"
```
Rješenje:
- Provjerite UPLOAD_MAX_BYTES (10MB default)
- Datoteke se trebale učitati u /uploads
- Na Railwayu se brišu! Trebate vanjski storage.
```

### Problem 5: "Rate limit exceeded"
```
LOGIN_RATE_LIMIT_MAX=5 (pokušaja)
BACKUP_RATE_LIMIT_MAX=10 (pokušaja po 15 min)

Čekajte 15 minuta i pokušajte ponovno.
```

---

## 🔄 DEPLOYMENT UPDATES

### Za nove verzije:
```bash
1. Testirajte lokalno
2. Commitajte kod
3. Push na GitHub
4. Railway će automatski deploy
5. Provjerite logove
```

---

## 📊 PRODUCTION MONITORING CHECKLIST

### Dnevno (Daily):
- [ ] Provjerite logove za greške
- [ ] Provjerite disk prostor
- [ ] Provjerite CPU/Memory korištenje

### Tjedno (Weekly):
- [ ] Pregledate warehouse logs
- [ ] Proverite failed logins
- [ ] Testirate backup restoration

### Mjesečno (Monthly):
- [ ] Update dependencies
- [ ] Audit admin accounts
- [ ] Test disaster recovery
- [ ] Review security logs

---

## 🆘 EMERGENCY - BRZI TROUBLESHOOTING

### Server ne radi?
```bash
1. Idite u Railway Dashboard
2. Kliknite na Logs
3. Pogledajte zadnje 50 logova
4. Traži "Error" ili "Cannot find module"
```

### Database je nedostupna?
```bash
1. Provjerite DATABASE_URL
2. Provjerite da PostgreSQL servis radi
3. U Railway Dashboard → Database tab
```

### Nema backupa?
```bash
1. Provjerite AUTO_BACKUP_INTERVAL_MS
2. Provjerite da je STORAGE_TYPE=postgres
3. Trebate set-up vanjski storage (S3)
```

---

## 📞 KONTAKT & SUPPORT

Trebate li pomoć?
- 📖 Vidi: [BACKUP_AND_SECURITY.md](./BACKUP_AND_SECURITY.md)
- 🧪 Vidi: [TESTING_SECURITY.md](./TESTING_SECURITY.md)
- 🎯 Vidi: [QUICK_START_v1.1.md](./QUICK_START_v1.1.md)

---

## ✨ VAŽNE NAPOMENE

1. **HTTPS je obavezna** - Railway to radi automatski
2. **CORS mora biti konfiguriran** - bez toga frontend neće raditi
3. **PostgreSQL je preporučena** - JSON datoteke se gube
4. **Backupi trebaju vanjski storage** - za produkciju!
5. **Čuvajte .env tajno** - nikad ga ne commitajte

---

**Verzija:** 1.1  
**Status:** ✅ Production Ready  
**Last Updated:** 2026-04-29

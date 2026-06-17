# NDK.VSpecs — Lyric Video Generator

## Deploy ke Railway (Gratis, Tanpa CC)

### 1. Push ke GitHub
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

### 2. Deploy di Railway
1. Buka railway.app → login pakai GitHub
2. Klik New Project → Deploy from GitHub repo
3. Pilih repo ini → Railway otomatis build

### 3. Set Environment Variable
Di Railway dashboard → project → tab Variables:
```
GEMINI_API_KEY = isi_api_key_kamu
NODE_ENV = production
```
Dapatkan Gemini API key gratis: https://aistudio.google.com/apikey

### 4. Done — dapat URL publik otomatis!

---

## Jalankan Lokal
```bash
npm install
cp .env.example .env
npm run dev
```
Buka http://localhost:3000

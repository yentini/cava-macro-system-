# 🛡️ CAVA Macro Decision System

Cuadro de mando táctico macroeconómico y motor de decisiones cruzadas basado en la metodología de inversión de **José Luis Cava** (*Podcast Tengo un Plan*).

Diseñado para ejecutarse y desplegarse en la nube de forma **100% gratuita**, con versión adaptativa automática (**PWA para Móvil** con estética de app nativa y **Dashboard a Pantalla Completa para PC**), además de alertas diarias automáticas a **Telegram**.

---

## 🧭 Metodología de Decisión (Matriz de Confluencia)

El sistema evalúa secuencialmente 3 capas lógicas en lugar de métricas aisladas:

1. **Capa 1: Macro & Liquidez Institucional:**  
   - Bonos Basura (`HYG` vs Media 20W).  
   - Rendimiento del Bono USA 10Y vs PIB nominal estimado (~6.5%).  
   - Balance de la Reserva Federal (`WALCL` en FRED).
2. **Capa 2: Tendencia Estructural (Semanal):**  
   - S&P 500 (`SPY`) frente a su EMA 50 semanal (Línea Azul de Cava).  
   - Oro (`GLD`) frente a su EMA 50 semanal.
3. **Capa 3: Gatillos Tácticos & Opciones:**  
   - RSI(14) semanal en Oro en zona de sobreventa ($\le 40 - 42$).  
   - Ventanas de expiración trimestral masiva de opciones (marzo y septiembre).

### Los 4 Regímenes Consolidados:
* 🟢 **Expansión Plena (Risk-On Total):** Liquidez y tendencia alineadas al alza. Aportación recurrente sistemática. Ignorar ruido.
* 🔥 **Oportunidad Asimétrica (Dip de Pánico):** Macro sana con sobreventa puntual técnica o estacional. Gatillo de compra asimétrica (*Home Run*) con stop ceñido.
* ⚠️ **Divergencia Bajista (Trampa de Mercado):** La bolsa sube pero los bonos basura caen. Prohibido comprar; ceñir stops de protección.
* 🔴 **Régimen Defensivo (Riesgo Sistémico):** Rotura de media semanal y crédito congelado. Fuera de bolsa; refugio exclusivo en activos duros (Oro/liquidez).

---

## 🚀 Puesta en Marcha Local

### 1. Backend (FastAPI + Python)
```bash
# Entrar en la carpeta del backend
cd backend

# Activar el entorno virtual
# En Windows:
.\venv\Scripts\activate
# En Linux/Mac:
source venv/bin/activate

# Instalar dependencias (si no se han instalado)
pip install -r requirements.txt

# Iniciar servidor backend
uvicorn app.main:app --reload --port 8000
```
El backend estará disponible en `http://localhost:8000` con documentación interactiva Swagger en `http://localhost:8000/docs`.

### 2. Frontend (React + Vite + Tailwind PWA)
```bash
# Entrar en la carpeta del frontend
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```
La aplicación web estará disponible en `http://localhost:5173`.

---

## 📱 Configuración de Alertas Gratuitas en Telegram (2 minutos)

1. Abre Telegram y busca el usuario oficial **`@BotFather`**.
2. Escribe `/newbot` y sigue las instrucciones para ponerle nombre (ej: `MiCavaMacroBot`).
3. Te dará un **Token de API** (ej: `7123456789:AAH...`). Cópialo en `backend/.env` como `TELEGRAM_BOT_TOKEN`.
4. Para obtener tu ID de chat, busca en Telegram el bot **`@userinfobot`** y dale a Iniciar. Te devolverá tu número de `Id` (ej: `123456789`). Cópialo en `backend/.env` como `TELEGRAM_CHAT_ID`.
5. Abre un chat con tu propio bot recién creado y pulsa **Iniciar** (`/start`).
6. ¡Listo! Puedes probar el envío haciendo clic en el botón **"Probar Telegram"** del encabezado de la web.

---

## ☁️ Despliegue en la Nube 100% Gratuito

### A. Backend en Render (Gratis) — Despliegue en 2 minutos
1. Crea una cuenta gratuita en [render.com](https://render.com).
2. Haz clic en **New +** y selecciona **Blueprint** (o **Web Service**).
3. Conecta tu repositorio de GitHub `cava-macro-system-`. Render detectará automáticamente el archivo [render.yaml](file:///c:/Users/ccabrerizo/Documents/ANTIGRAVITY/CAVA/render.yaml).
   - *(Si eliges Web Service manual)*:
     - **Root Directory**: `backend`
     - **Environment**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. En **Environment Variables**, añade:
   - `FRED_API_KEY`: Tu clave API de FRED (`d4ceac1ada227730f5686ad09ddbc864`).
   - `TELEGRAM_BOT_TOKEN`: (Opcional) Tu token de BotFather.
   - `TELEGRAM_CHAT_ID`: (Opcional) Tu Chat ID.
5. Pulsa **Deploy**. Una vez completado, Render te proporcionará tu URL pública (ejemplo: `https://cava-macro-backend.onrender.com`).

### B. Frontend en Vercel (Recomendado) — Despliegue en 1 minuto
1. Entra en [vercel.com](https://vercel.com) e inicia sesión con GitHub.
2. Pulsa **Add New...** ➔ **Project** e importa `cava-macro-system-`.
3. En la configuración del proyecto:
   - **Root Directory**: Pulsa *Edit* y selecciona la carpeta `frontend`.
   - **Framework Preset**: Detectará automáticamente `Vite`.
4. Despliega la sección **Environment Variables** y añade:
   - Key: `VITE_API_URL`
   - Value: La URL de tu backend en Render (ej: `https://cava-macro-backend.onrender.com`).
5. Pulsa **Deploy**.
6. ¡Listo! Tendrás tu dashboard en una URL HTTPS con soporte PWA instalable en iOS y Android.

### C. Alerta Automática Diaria (GitHub Actions Cron)
El repositorio ya incluye el flujo `.github/workflows/daily_check.yml`:
* Se ejecuta automáticamente de **lunes a viernes a las 22:30 CET** (tras el cierre de Wall Street).
* Solo necesitas añadir en tu repositorio de GitHub (`Settings > Secrets and variables > Actions > New repository secret`):
  - `FRED_API_KEY`
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`

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

### A. Frontend en Vercel (Recomendado)
1. Sube tu proyecto a un repositorio en **GitHub**.
2. Conecta tu cuenta de GitHub en [vercel.com](https://vercel.com).
3. Importa el repositorio y selecciona como Root Directory: `frontend`.
4. Pulsa **Deploy**. Tendrás tu PWA con HTTPS gratuito en 1 minuto. Puedes añadirla a la pantalla de inicio de tu iPhone o Android como una app nativa.

### B. Backend en Render (Gratis)
1. En [render.com](https://render.com), crea un nuevo **Web Service**.
2. Conecta tu repositorio de GitHub y selecciona como Root Directory: `backend`.
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Añade las variables de entorno (`FRED_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`).

### C. Alerta Automática Diaria (GitHub Actions Cron)
El repositorio ya incluye el flujo `.github/workflows/daily_check.yml`:
* Se ejecuta automáticamente de **lunes a viernes a las 22:30 CET** (tras el cierre de Wall Street).
* Solo necesitas añadir en tu repositorio de GitHub (`Settings > Secrets and variables > Actions > New repository secret`):
  - `FRED_API_KEY`
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`

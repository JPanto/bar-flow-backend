# BarFlow Backend: Servidor API & Real-time WebSockets Hub

Backend centralizado para el sistema de gestión de bares y gastrobartes **BarFlow**. Diseñado bajo **Arquitectura Hexagonal (Ports & Adapters)** con **Fastify 5**, **Drizzle ORM**, **PostgreSQL** y **WebSockets nativos**, preparado para sincronización offline-first idempotente y despliegue **100% gratuito** en la nube.

---

## 🚀 Características Principales

- **Arquitectura Hexagonal (Clean Architecture)**: Aislamiento total de la lógica de negocio (`domain`) respecto a la base de datos y la capa de transporte (`infrastructure`).
- **Sincronización Offline Idempotente (`POST /api/sync`)**: Procesa los lotes de eventos generados en el Outbox (`sync_queue`) del cliente con deduplicación por `client_event_id` y resolución de conflictos por timestamp.
- **Hub de WebSockets Bidireccional (`/ws`)**: Conexiones en tiempo real para meseros (`channel: staff`) y comensales en mesa (`channel: table:<id>`), compatible con el `realtimeService` del frontend.
- **Drizzle ORM + PostgreSQL**: Tipado estricto de esquemas, consultas rápidas y migraciones SQL sin sobrecarga de runtime.
- **Pruebas Automatizadas (Vitest)**: 100% de cobertura en entidades de dominio, casos de uso, repositorios y endpoints HTTP/WS.

---

## 🛠️ Stack Tecnológico

- **Runtime**: Node.js 22 LTS / TypeScript 5
- **Framework Web**: Fastify 5 + `@fastify/cors` + `@fastify/websocket`
- **ORM / Migraciones**: Drizzle ORM + `drizzle-kit`
- **Base de Datos**: PostgreSQL (Compatible con [Neon.tech](https://neon.tech))
- **Validación de Datos**: Zod
- **Testing**: Vitest + Supertest

---

## 📂 Estructura del Proyecto

```text
src/
├── domain/                      # Entidades puras y contratos de repositorios
│   ├── entities/                # Zone, RestaurantTable, TableSession, WaiterCall, Reservation
│   └── repositories/            # ITableRepository, ITableSessionRepository, etc.
├── application/                 # Casos de uso de la aplicación
│   ├── dtos/                    # DTOs validados con Zod (syncDto, callDto)
│   ├── ports/                   # IWebSocketHub (puerto de salida)
│   └── use-cases/               # SyncOutboxBatchUseCase, CreateWaiterCallUseCase, etc.
├── infrastructure/              # Adaptadores tecnológicos externos
│   ├── db/                      # Esquemas Drizzle y cliente Postgres
│   ├── repositories/            # Implementaciones Drizzle de los repositorios
│   ├── http/                    # Servidor Fastify y rutas REST (/health, /api/sync)
│   └── ws/                      # FastifyWebSocketHub (salas y broadcast)
├── config/                      # Validación de variables de entorno con Zod
└── index.ts                     # Arranque y bootstrapping de la aplicación
```

---

## 💻 Desarrollo Local

### 1. Requisitos Previos
- Node.js 20+
- Una base de datos PostgreSQL local o una instancia gratuita en [Neon.tech](https://neon.tech).

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Configuración de Variables de Entorno
Copia el archivo `.env.example` a `.env`:
```bash
cp .env.example .env
```
Edita `.env` con tus credenciales:
```env
PORT=8000
NODE_ENV=development
CORS_ORIGIN=*
DATABASE_URL=postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/barflow?sslmode=require
```

### 4. Generar y Aplicar Esquema en la Base de Datos
```bash
# Empuja los esquemas directamente a PostgreSQL:
npm run db:push
```

### 5. Ejecutar Pruebas
```bash
npm run test
```

### 6. Iniciar Servidor en Modo Desarrollo
```bash
npm run dev
```
El servidor arrancará en `http://localhost:8000` con WebSockets en `ws://localhost:8000/ws`.

---

## ☁️ Guía de Despliegue Gratuito (Koyeb + Neon)

Para mantener el backend activo las 24 horas del día con SSL (HTTPS y WSS) sin costos:

### Paso 1: Crear la Base de Datos en Neon (PostgreSQL Gratuito)
1. Ve a [neon.tech](https://neon.tech) e inicia sesión con GitHub o Google.
2. Crea un nuevo proyecto llamado `bar-flow`.
3. En el panel principal, copia la cadena de conexión con el modo **"Pooled connection"** activado (ej. `postgresql://alex:abc123xyz@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`).

### Paso 2: Crear el Repositorio de GitHub para el Backend
1. Crea un nuevo repositorio en GitHub llamado `bar-flow-backend`:
   ```bash
   git remote add origin https://github.com/<tu-usuario>/bar-flow-backend.git
   git branch -M main
   git push -u origin main
   ```

### Paso 3: Desplegar en Koyeb (Servidor Gratuito Continuo)
1. Regístrate gratis en [koyeb.com](https://www.koyeb.com).
2. Haz clic en **"Create App"** y selecciona **"GitHub"** como fuente.
3. Elige tu repositorio `bar-flow-backend` y la rama `main`.
4. En **Type**, selecciona **"Web Service"** y el tipo de instancia gratuita **"Nano"**.
5. Configura los comandos de build y arranque:
   - **Build command**: `npm run build`
   - **Run command**: `npm start`
6. En la sección **Environment variables**, agrega:
   - `DATABASE_URL`: La cadena de conexión copiada de Neon.
   - `NODE_ENV`: `production`
   - `PORT`: `8000`
   - `CORS_ORIGIN`: `*` (o la URL de tu frontend en Cloudflare Pages).
7. Haz clic en **"Deploy"**. En 1 minuto tendrás tu URL pública HTTPS y WSS (ej. `https://bar-flow-backend-tu-org.koyeb.app`).

### Paso 4: Conectar el Frontend (Cloudflare Pages)
En la configuración de variables de entorno de tu proyecto en Cloudflare Pages, añade:
```env
VITE_API_URL=https://bar-flow-backend-tu-org.koyeb.app/api
VITE_WS_URL=wss://bar-flow-backend-tu-org.koyeb.app/ws
```

---

## 📡 Endpoints de la API

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/health` | Healthcheck de liveness probe del servidor. |
| `GET` | `/api/state/initial` | Descarga el estado inicial de mesas, sesiones y llamadas. |
| `POST` | `/api/sync` | Procesa en bloque e idempotentemente eventos de `sync_queue`. |
| `WS` | `/ws` | Conexión WebSocket bidireccional en tiempo real. |

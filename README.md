# PlataformaFallback — Frontend (Next.js)

Dashboard SaaS profesional y multi-idioma (ES por defecto, EN, PT-BR) para gestionar
canales de WhatsApp, API keys, usuarios y reportes sobre **Evolution API**.

> Especificación: [`../PRD.md`](../PRD.md) · [`../docs/SDD/`](../docs/SDD).

## Stack
Next.js 14 (App Router, standalone) · next-intl · TanStack Query · Tailwind · Socket.io client · Zustand.

## Desarrollo
```bash
cp .env.example .env      # apunta a tu backend
npm install
npm run dev               # http://localhost:3001
```

## Variables de entorno
| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL pública del backend (REST) |
| `NEXT_PUBLIC_WS_URL` | URL del WebSocket (normalmente igual al backend) |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Idioma por defecto (`es`) |

Ver [`.env.example`](.env.example).

## Estructura
```
src/
  app/[locale]/(auth)/        login, register
  app/[locale]/(dashboard)/   overview, channels, api-keys, users, reports,
                              settings, evolution-servers, tenants (super admin)
  components/                 UI primitives, shell, badges
  i18n/                       routing, navigation, request (next-intl)
  lib/                        api client, auth store, socket, providers
messages/                     es.json, en.json, pt-BR.json
```

## Funcionalidades
- Login / registro (activación por admin).
- Canales: alta, **QR en vivo** (Socket.io), conectar/desconectar/reiniciar/eliminar.
- API Keys: creación con secreto mostrado una sola vez, revocación.
- Usuarios: alta, roles, activar/suspender.
- Reportes: filtros, paginación, detalle con línea de tiempo, actualización en tiempo real.
- Super Admin: servidores Evolution (URL/Token) y cuentas (tenants).
- i18n ES/EN/PT-BR con selector y rutas por locale.

## Build de producción
```bash
npm run build && npm start
```

## Despliegue (Coolify)
- App por Dockerfile (output `standalone`).
- Define `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_WS_URL` (build-time + runtime).
- Ver [`../docs/SDD/08-deployment.md`](../docs/SDD/08-deployment.md).

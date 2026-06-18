# CLAUDE.md — ohla-whatsapp-front

Memoria local + reglas operativas del **frontend** de PlataformaFallback (SaaS multi-tenant de
mensajería WhatsApp sobre Evolution API). Este archivo es la fuente de verdad de cómo se trabaja
en este repo. Mantenerlo actualizado: cada decisión nueva se anota en la **Bitácora** al final.

> Repo gemelo: `ohla-whatsapp-back` (NestJS). **Repos independientes, NO monorepo.**

---

## 0. Regla de oro — SDD rígido (SIEMPRE)
Para **toda** tarea, en este orden:
1. **Escribir/actualizar primero la spec** en `docs/SDD/` (regla "aplique a regra de SDD rígido antes").
2. Implementar conforme a la spec.
3. Pasar el **gate de build** (`npm run build`).
4. **Commit + push al final** de la tarea.

- La spec SDD vive en el repo *umbrella* `PlataformaFallback/docs/SDD/` (un nivel **arriba** de este
  repo). **No está versionada dentro de este git** → referencia local; igual debe actualizarse antes
  de programar.
- Índice de specs: `docs/SDD/00-overview.md`. Relevantes para front: 03 (api-contracts), 07 (i18n),
  11 (admin-observability), 12 (data-tables), 14 (theming), 16 (warmup-room).

## 1. Git / commits
- Rama `main`. Remoto `origin` = https://github.com/wmenezes2020/ohla-whatsapp-front.git
- **Commit + push al final de cada tarea.** **Conventional Commits** (`feat:`, `fix:`, `docs:`).
- Trailer obligatorio:
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```
- Gate antes de push: **`npm run build`** (incluye type-check). No pushear si falla.

## 2. Stack
Next.js 14 **App Router** · **next-intl** (routing por locale `/[locale]/...`) · Tailwind (tokens de
diseño + `darkMode: 'class'`) · TanStack Query · Zustand (`auth-store`) · socket.io-client · sonner
(toasts) · recharts · lucide-react.

## 3. i18n (SDD 07)
- Idiomas: **es (default), en, pt-BR**. Diccionarios `messages/{es,en,pt-BR}.json`.
- **Toda cadena visible** debe existir en los **3** idiomas. Prohibido texto hardcodeado → usar
  `useTranslations('namespace')`.
- **El cliente axios (`src/lib/api.ts`) envía el header `x-lang`** con el locale activo (tomado de la
  URL `/[locale]/...`), para que el backend devuelva **errores ya localizados**.
- Errores: mostrar `apiError(e).message` en un `toast.error(...)` — ya viene localizado del backend
  (el `AllExceptionsFilter` traduce `messages.<code>`). No reinventar mapeos de error por pantalla
  salvo necesidad puntual.
- Selector de idioma en topbar; persiste en `user.locale` (API) + cookie `NEXT_LOCALE`.

## 4. Convenciones UI
- Componentes reutilizables en `src/components/ui/*` (Button, Input/Select/Textarea, Switch, Card,
  Dialog, Badge, DataTable, Pagination, Table). Reusar antes de crear nuevos.
- **Tema**: claro por defecto; oscuro **solo** si el usuario lo elige (sin seguir
  `prefers-color-scheme`). Tokens de diseño, no colores hardcodeados.
- **Tablas/listados** (SDD 12): paginación, orden por columnas, filtros y **búsqueda sin recargar**
  (client-side) vía `DataTable`. Inputs de búsqueda con `autoComplete="off"` + `data-1p-ignore`
  `data-lpignore` y `name` propio (evitar autofill de email/password).
- Realtime con `useRealtime({...})` (Socket.io) para estados de canal/mensaje/métricas.

## 5. Auth / API
- `src/lib/api.ts`: axios con baseURL `${NEXT_PUBLIC_API_URL}/v1`, interceptor que adjunta el
  `accessToken` y el header `x-lang`, y refresca en 401 una vez.
- `auth-store` (Zustand) guarda tokens + user (persist `localStorage` `pf-auth`). Roles:
  SUPER_ADMIN / TENANT_ADMIN / OPERATOR / VIEWER.
- **Persistencia de sesión:** el `dashboard-shell` DEBE esperar `useHasHydrated()` antes de redirigir
  a `/login` — si no, en cada reload el primer render (con `accessToken` aún null, pre-rehidratación)
  desloga. NO acceder a `useAuthStore.persist` durante el render (SSR/prerender no tiene localStorage);
  solo dentro de `useEffect`.
- Mostrar/ocultar UI por rol (ej. campos de Configuración y acciones de admin solo TENANT_ADMIN).

## 6. Terminología / producto
- **NO divulgar "Evolution API" a clientes** (término interno solo en panel SuperAdmin).
- Secretos solo por ENV (`NEXT_PUBLIC_*` para lo expuesto). Nunca hardcodear.
- Pantallas clave: Resumen, Canales (con QR poll cada 5s, toggle "Em aquecimento"), **Aquecimento**
  (participantes + progreso x/100 + ejecutar ronda), API Keys (playground de prueba), Usuarios,
  Reportes, Configuración (datos, contraseña, tema, Observación de mensajes).

## 7. Estructura
`src/app/[locale]/(dashboard)/dashboard/*` (páginas) · `src/components/*` (ui, dashboard-shell, nav,
metrics, status-badges) · `src/lib/*` (api, auth-store, socket, theme, types, utils) · `messages/*` ·
`src/i18n/*` (navigation, routing next-intl).

## 8. QR / canales (lección)
- El modal de QR consulta `GET /channels/:id/qr/poll` **cada 5s** (patrón Fonewhats): cada poll trae
  un QR fresco y detecta conexión en una sola request. Webhooks = vía rápida; el polling es el
  mecanismo primario del modal.

---

## Bitácora de decisiones (memoria local — actualizar cada tarea)
- **2026-06** Theming claro/oscuro (default claro), sistema de diseño con tokens (SDD 14).
- **2026-06** Dashboards de métricas/observabilidad (admin + cliente), gestión de usuarios (SDD 11).
- **2026-06** DataTable con paginación/orden/filtros/búsqueda sin recargar (SDD 12); fix autofill.
- **2026-06** Playground de prueba en API Keys (select de keys activas; `POST /messages/test`).
- **2026-06** QR poll cada 5s (patrón Fonewhats).
- **2026-06** Settings: campo "Observación para los mensajes enviados" (solo TENANT_ADMIN).
- **2026-06** Página **Aquecimento** (SDD 16): toggle al crear canal, CRUD de participantes, progreso
  x/100, botón "ejecutar ronda ahora"; componente `Switch`.
- **2026-06** i18n de errores: axios envía `x-lang`; toasts muestran `apiError(e).message` localizado.
- **2026-06** Creado este `CLAUDE.md` como memoria local del repo (pedido del usuario: registrar todas
  las reglas y mantener memoria local en cada repositorio).
- **2026-06-18** Probador (API Keys): el selector de **Canal** ahora **deshabilita y etiqueta** las
  líneas en aquecimiento (`(en aquecimiento — no disponible)`, key `playground.warmupOption`). Antes se
  podían elegir y el envío forzado quedaba atascado "En cola" (back: las líneas en warmup se excluyen del
  tráfico general). Evita la confusión en origen; complementa el fail-fast del backend.
- **2026-06-18** Badge de aquecimento en Canales: el progreso usa `c.warmupTarget` (con fallback 50) en
  vez de `/100` hardcodeado (umbral 100→50). `Channel.warmupTarget` añadido al tipo (lo expone `toPublic`).
- **2026-06-17** Fix 429 (loops): los handlers de `useRealtime` (home/métricas, canales, reports)
  hacían `refetch()`/`invalidateQueries()` en CADA evento → ráfagas. Ahora se **debouncean** con
  `useDebouncedCallback` (`src/lib/use-debounced.ts`, 2–3s) → una sola petición por ráfaga. Además el
  QueryClient **no reintenta** en 429/401/403. (Backend complementa con `@SkipThrottle()` en lecturas.)

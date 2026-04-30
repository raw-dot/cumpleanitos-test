# 📦 Control de Versiones — cumpleanitos.com (Producción)

> **Repo:** `raw-dot/cumpleanitos-prod` → `cumpleanitos.com`
> **Repo de test:** `raw-dot/cumpleanitos-test` → `test.cumpleanitos.com`
> **Flujo:** desarrollar y validar en test → aprobar → copiar a prod y registrar acá

---

## Convenciones

| Campo | Descripción |
|-------|-------------|
| **Versión** | `MAJOR.MINOR.PATCH` — MAJOR: cambio estructural grande · MINOR: feature nueva · PATCH: fix o mejora menor |
| **Fecha** | Fecha de deploy a producción |
| **Basado en test** | Versión de test desde la que se tomó el código |
| **Estado** | ✅ Estable · ⚠️ Con observaciones · ❌ Reverted |

---

## 🚀 Releases

---

### v1.0.5 — Apertura inteligente de Mercado Pago
**Fecha de deploy:** 11-abr-2026
**Commit:** 9183d2a
**Estado:** ✅

#### Cambios
- **[FEATURE]** `ProfilePage.jsx`: reemplazado `window.location.href` por apertura inteligente de MP según dispositivo:
  - **Mobile:** intenta abrir la app nativa de MP via deep link (`mercadopago://`). Si en 2 segundos no se abre (app no instalada), hace fallback al `init_point` web en la misma pestaña.
  - **Desktop:** abre MP en un popup centrado (520×700px). Hace polling cada 3s consultando el estado de la orden en Supabase. Cuando el pago se aprueba (o el usuario cierra el popup), redirige a `/pago/exito` o `/pago/pendiente` sin haber salido de cumpleanitos.

#### Observaciones
- "cuando entre a mercado pago a realizar el pago, salte un modal y no me saque de cumpleanitos. si es mobile que abra la app de mercado pago, y vuelva después a cumpleanitos una vez realizado el pago"

---

 Fix crítico: notification_url en preferencia MP
**Fecha de deploy:** 11-abr-2026
**Commit:** 64073bc
**Estado:** ✅

#### Cambios
- **[FIX CRÍTICO]** `api/mp-create-preference.js`: agregado `notification_url: APP_BASE_URL/api/mp-webhook` a la preferencia de Mercado Pago. Sin este campo MP no tenía destino explícito para enviar webhooks — los mandaba de forma no garantizada (o no los mandaba). Era la causa raíz de que el pago de Pochoclo $1.000 (MP ID: 154256128194) nunca llegara a la DB. De ahora en más todos los pagos tienen webhook garantizado.

#### Observaciones
- "necesito resolver que si hago más pagos, se graben bien, cuando se impacten en mercadopago, recién ahí se graban en la base de cumpleanitos"

---

 Tab Operaciones + fix llamada webhook desde frontend
**Fecha de deploy:** 11-abr-2026
**Commit:** 59b384a
**Estado:** ✅

#### Cambios
- **[FEATURE]** `AdminFinanzasPage.jsx`: nueva tab "🔍 Operaciones" con dos sub-secciones: Webhook Logs (tabla de `mp_webhook_logs` con estado, payment_id, external_ref, errores) y Transacciones MP (tabla de `mp_transactions` con payment_id real, monto, método, fecha de aprobación). KPIs de webhooks: total recibidos, procesados OK, errores, duplicados.
- **[FIX CRÍTICO]** `MPPaymentResultPage.jsx`: eliminada llamada a `/api/mp-webhook` desde el frontend. Era la causa de contributions creadas con datos incorrectos (estado basado en redirect de MP, no en confirmación real). La única fuente de verdad es ahora el webhook real de MP.
- `useFinanzas` hook: agrega fetch de `mp_webhook_logs` y `mp_transactions` (últimos 50 cada uno) en paralelo con las queries existentes.

#### Observaciones
- "quiero que arreglemos el tema de las transacciones y operaciones realizadas y ver qué pasa en webhook que no se pueden ver las operaciones finalizadas OK"
- Se detectó pago de $1.000 (MP ID: 154256128194, 11-abr 00:31) sin registro en DB — webhook no llegó para ese pago. Requiere recuperación manual.

---

### v1.0.2 — Fix crítico webhook MP: 502 + idempotencia
**Fecha de deploy:** 10-abr-2026
**Commit:** 329c19b
**Estado:** ✅

#### Cambios
- **[CRÍTICO]** `api/mp-webhook.js`: `SUPABASE_URL` leía solo `VITE_SUPABASE_URL` que no está disponible en Vercel serverless → todos los webhooks de MP crasheaban con 502, ningún pago era procesado
- Fix idempotencia: query de deduplicación usaba `processing_status=eq.processed` sobre `mp_transactions` pero esa columna no existe en esa tabla (es de `mp_webhook_logs`). Ahora usa `mp_payment_id` con constraint UNIQUE
- Rename `MP_ACCESS_TOKEN_TEST` → `MP_ACCESS_TOKEN` en todo el webhook

#### Observaciones
> "se siguio replicando el bug de contribuciones fantasma, fijate que se graben los regalos cuando se impacte el pago en mercado pago"

#### Limpieza de datos PROD
- Eliminados 4 registros de prueba de `contributions` + `mp_orders` + `mp_transactions` + `mp_commissions` + `mp_webhook_logs`
- Recreada manualmente contribution de "Invitado" (00, 09/04) que era pago real

---

### v1.0.1 — Setup completo de producción
**Fecha de deploy:** 08-abr-2026
**Basado en test:** v0.14.2
**Commit:** 12a3d09

#### Cambios
- Variables de entorno de Vercel actualizadas a Supabase prod (`ibnqenpxtcblhwwnwlho`)
- Corregidas `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` que apuntaban a test
- Schema de DB prod completado: tablas `friends`, `mp_connections`, `mp_orders`, `mp_transactions`, `mp_commissions`, `mp_webhook_logs`
- Columnas `emotional_foto_url`, `emotional_video_url`, `mp_order_id`, `payment_method` agregadas a `contributions`
- Función `get_all_users_with_email()` creada en DB prod
- Storage bucket `cumple-images` creado con policies RLS
- Google OAuth configurado en Supabase prod con Client ID y Secret de prod
- URL Configuration: Site URL `https://www.cumpleanitos.com`, Redirect URLs `https://cumpleanitos.com/**` y `https://www.cumpleanitos.com/**`

---

### v1.0.0 — Release inicial de producción
**Fecha de deploy:** 08-abr-2026
**Basado en test:** v0.14.2
**Commit:** 8e0a4d4

#### Funcionalidades incluidas

**Autenticación**
- Registro en 2 pasos con email y contraseña (paso 1: email + pass · paso 2: nombre, usuario, cumpleaños, teléfono)
- Login con email y contraseña
- Login y registro con Google OAuth (selector de cuenta nativo)
- Onboarding post-Google para completar datos faltantes
- Cierre de sesión y eliminación de cuenta desde Configuración

**Perfiles de usuario**
- Perfil público en `cumpleanitos.com/@username` y `/u/username`
- Upload de avatar y portada con ajuste de posición y escala
- Gradiente de portada por defecto personalizable
- Edición de datos personales desde Configuración
- Estadísticas: monto recaudado, regaladores, amigos, regalos dados

**Campaña de cumpleaños**
- Creación de campaña (título, descripción, monto objetivo, fecha límite)
- Lista de deseos con autocompletado de MercadoLibre (título, precio e imagen vía Microlink)
- Compartir perfil / campaña con link directo

**Flujo de regalo**
- Formulario en 2 pasos: monto + nombre · mensaje emocional + foto/video + alias
- Aportes anónimos opcionales
- Foto con cámara (mobile) o upload (desktop)
- Video adjunto con validación de duración

**MercadoPago**
- Cumpleañero conecta su cuenta MP desde Configuración (OAuth)
- Checkout Pro marketplace: el pago va directo al cumpleañero
- Comisión de plataforma configurable (default 10%)
- Webhooks para confirmación de pagos
- Páginas de resultado: éxito / pendiente / error

**Explorar**
- Listado de campañas públicas activas
- Vista de perfil público de otros usuarios

**Panel de administración** (requiere `is_admin = true`)
- Dashboard con métricas generales
- Gestión de usuarios, campañas, regalos, finanzas
- Moderación de mensajes y contenido multimedia con filtros
- Analytics y alertas
- Configuración global (presets de montos, comisión)
- Responsive mobile con bottom nav + drawer

**Infraestructura**
- Vite + React SPA · Supabase Auth + DB + Storage · Deploy en Vercel
- Rutas con URLs reales: `/perfil`, `/explorar`, `/u/:username`, `/pago/exito`, `/oauth/mp/callback`, etc.
- API Routes en Vercel: `mp-oauth-callback`, `mp-create-preference`, `mp-webhook`, `mp-admin-connect`, `delete-user`
- Vercel Analytics integrado

#### Tablas en base de datos

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Usuarios de la plataforma |
| `gift_campaigns` | Campañas de regalo |
| `gift_items` | Lista de deseos |
| `contributions` | Aportes de regaladores |
| `app_config` | Configuración global |
| `friends` | Relaciones entre usuarios |
| `mp_connections` | Conexiones OAuth con MercadoPago |
| `mp_orders` | Órdenes de pago |
| `mp_transactions` | Transacciones confirmadas por MP |
| `mp_commissions` | Comisiones de la plataforma |
| `mp_webhook_logs` | Log de webhooks de MP |

#### Bugs conocidos al release
- Hard delete de cuenta pendiente (requiere Edge Function con service_role)
- Columnas `emotional_foto_url` / `emotional_video_url` en `contributions` — resuelto en v1.0.1

---

## 📋 Tabla de cambios

| Versión | Fecha | Basado en test | Commit | Descripción | Estado |
|---------|-------|---------------|--------|-------------|--------|
| **1.1.8** | 13-abr-2026 | - | Modal foto en Moderación + bordes redondeados Regalos | Click en foto de Moderación abre FotoModal igual que en Regalos. Miniaturas en tabla Regalos con borderRadius 8. | ✅ Estable | "modal foto moderacion, bordes redondeados regalos" |
| **1.1.7** | 13-abr-2026 | - | Fecha/hora ART en Quiénes regalaron | Cada card de contribución muestra fecha y hora en timezone America/Argentina/Buenos_Aires debajo del nombre del regalador. | ✅ Estable | "no veo dia y hora del regalo" |
| **1.1.6** | 13-abr-2026 | - | Admin Regalos: foto vertical completa + modal zoom | Foto en panel detalle: objectFit contain + maxHeight 320 (se ve completa vertical). Click en foto abre FotoModal centrado con fondo negro, cierra clickeando afuera o en X. | ✅ Estable | "foto vertical completa, click abre modal" |
| **1.1.5** | 13-abr-2026 | - | Fix definitivo centrado resultado pago + botones | Páginas mp-exito/pendiente/error/callback se renderizan FUERA del layout (sin Navbar, main, Footer, BottomNav) — 100vh real sin interferencia. goProfile fallback a /explorar si no hay order. | ✅ Estable | "sigue mal centrado, botones no llevan donde deben" |
| **1.1.4** | 13-abr-2026 | - | Admin: fechas y horas en timezone Argentina | fmtDate y fmtTime en AdminRegalosPage y AdminModeracionPage usan timeZone America/Argentina/Buenos_Aires — los timestamps de DB (UTC) se muestran correctamente en horario argentino. | ✅ Estable | "ajusta para que se muestre utc-3 en admin" |
| **1.1.3** | 13-abr-2026 | - | Fix definitivo pantalla resultado pago | (1) Navbar oculta en mp-exito/pendiente/error/callback — pantalla full height sin interferencia. (2) minHeight vuelve a 100vh. (3) Botón "Volver al perfil" → perfil del cumpleañero siempre. (4) Botón renombrado a "Explorar regalos" → /explorar siempre. | ✅ Estable | "centrado mal, botones incorrectos" |
| **1.1.2** | 13-abr-2026 | - | Fix pantalla resultado pago: centrado, botones y error falso | (1) minHeight calc(100vh - 57px) — card centrado debajo de la Navbar sin overflow. (2) Botón "Volver al perfil" siempre visible, fallback a goHome si no hay order. (3) isError solo se activa si MP manda status negativo explícito — elimina pantalla de error falso por timeout. | ✅ Estable | "pantalla mal centrada, botones incorrectos, error falso tras esperar" |
| **1.1.1** | 13-abr-2026 | - | Fix teclado numérico + pantalla resultado centrada | (1) Campo "otro monto": inputMode=numeric + scrollIntoView al foco — teclado numérico en mobile y campo visible. (2) MPPaymentResultPage: goHome navega a / si logueado o /explorar si no. (3) Páginas mp-exito/pendiente/error/callback agregadas a noNavPages y excluidas del BottomNav — pantalla centrada sin interferencia de nav. | ✅ Estable | "teclado numerico en monto, resultado centrado, botones correctos" |
| **1.1.0** | 13-abr-2026 | - | Admin: foto/video en Regalos y Moderación | AdminRegalosPage y AdminModeracionPage sincroni zados desde test: panel detalle muestra emotional_foto_url y emotional_video_url inline. Moderación tab Mensajes filtra por Con imagen / Con video con preview embebido. Requirió ALTER TABLE contributions ADD COLUMN emotional_foto_url TEXT, emotional_video_url TEXT en prod DB. | ✅ Estable | "pasalos a prod, no los veo funcionando" |
| **1.0.2** | 08-abr-2026 | 4357bd3 | Fix freeze "Cargando tu regalo" | `.single()` → `.maybeSingle()` en `loadStats` — cuando no hay campaña activa `.single()` tiraba error y `Promise.all` dejaba `hasCampaign` en `null` indefinidamente | ✅ Estable |
| **1.0.9** | 09-abr-2026 | 7e6ee78 | MP OAuth conectado ✅ | Fix redirect_uri mismatch: MP_REDIRECT_URI debe ser https://www.cumpleanitos.com/oauth/mp/callback (con www). El frontend genera URL con www y el backend debe coincidir exactamente. | ✅ Estable |
| **1.0.9** | 11-abr-2026 | - | Fix race condition sesión en ProfilePage | Reintentar loadData cuando sesión se restaura y profile quedó null — resuelve Perfil no encontrado al volver de pestaña | ✅ Estable |
| **1.0.8** | 09-abr-2026 | ada32be | Fix MP OAuth state + codeVerifier | state aleatorio (userId:timestamp:random) en lugar de userId fijo. codeVerifier se lee ANTES de eliminarlo del sessionStorage. userId se extrae de la sesión Supabase, no del state. | ✅ Estable |
| **1.0.9** | 11-abr-2026 | - | Fix race condition sesión en ProfilePage | Reintentar loadData cuando sesión se restaura y profile quedó null — resuelve Perfil no encontrado al volver de pestaña | ✅ Estable |
| **1.0.8** | 11-abr-2026 | - | Fix freeze al volver de pestaña | Timeout 6s + mountedRef en CelebrantDashboard.loadData — queries Supabase en background no resolvían, setLoading(false) nunca corría | ✅ Estable |
| **1.0.7** | 09-abr-2026 | 1c9728e | Fix MP_CLIENT_ID hardcodeado | MPConnectButton.jsx usaba client_id hardcodeado '3154697079981275'. Ahora usa import.meta.env.VITE_MP_CLIENT_ID. | ✅ Estable |
| **1.0.6** | 09-abr-2026 | ded11d6 | Credenciales MP producción | Actualización de MP_CLIENT_ID, MP_CLIENT_SECRET y MP_ACCESS_TOKEN a credenciales de producción real. Agregado MP_REDIRECT_URI en Vercel. URL de redirect OAuth en MP Dashboard actualizada a cumpleanitos.com. Webhook configurado en modo productivo. | ✅ Estable |
| **1.0.5** | 09-abr-2026 | ded8b97 | Fix freeze Cargando perfil | .single() → .maybeSingle() en app_config de ProfilePage — causa raíz del freeze al cargar perfil público /u/:username | ✅ Estable |
| **1.0.4** | 09-abr-2026 | 94da727 | Fix app_config platform en prod | INSERT de key 'platform' en app_config prod con gift_amounts, platform_name y config general | ✅ Estable |
| **1.0.3** | 09-abr-2026 | 6275b6a | Fix lock Supabase auth | Agregado lock: async (name, acquireTimeout, fn) => fn() en supabaseClient.js — resuelve freeze por lock cumpleanitos-auth no liberado al cambiar de pestaña | ✅ Estable |
| **1.0.2** | 08-abr-2026 | 4357bd3 | Fix freeze Cargando tu regalo | .single() → .maybeSingle() en loadStats de App.jsx — hasCampaign quedaba en null indefinidamente | ✅ Estable |
| **1.0.1** | 08-abr-2026 | v0.14.2 | 12a3d09 | Setup completo prod: vars Vercel corregidas, schema DB completado, Google OAuth configurado | ✅ Estable |
| **1.0.0** | 08-abr-2026 | v0.14.2 | 8e0a4d4 | Release inicial — auth, perfiles, campañas, lista de deseos, flujo de regalo, MercadoPago, panel admin | ✅ Estable |

---

| **2.3.0** | 30-abr-2026 | c7f661c | feat: split MP acreditación inmediata + marketplace_fee exacto | api/mp-create-preference.js: agrega payment_methods.excluded_payment_types [credit_card, ticket] → solo débito/saldo MP/transferencia (acreditación inmediata). marketplace_fee ya era correcto (monto exacto ARS). Metadata enriquecida. ProfilePage.jsx: resumen UI corregido — label Comisión Cumpleanitos, badge ⚡ acreditación inmediata. | ✅ TEST |

## 📝 Pendientes para próximo release

- Hard delete de cuenta (Edge Function con service_role)
- Validación completa del flujo MP en modo producción
- Notificaciones en tiempo real

| **1.3.4** | 22-abr-2026 | a9936df | feat: Boton "Pagar con Transferencia" (mpago.la) | Nuevo boton secundario en pantalla de confirmación de pago (ProfilePage.jsx paso 2). Usa link nativo mpago.la/{alias}?amount={totalToPay}. Calcula automáticamente: monto bruto + 10% comisión = total a pagar. Abre directamente app Mercado Pago en mobile, nueva pestaña en desktop. No genera preferencia MP. Requiere profile.payment_alias guardado. Botón outline, fondo blanco, borde gris, 12px de margen arriba. Texto auxiliar: "Pago instantáneo, abre directamente Mercado Pago". | ✅ Implementado |
| **1.3.3** | 16-abr-2026 | — | fix: P1+P3+P4 integración flujo completo + localStorage token | P1: CompleteProfilePage pre-llena datos del preregistro (nombre, cumpleaños) desde localStorage. P3: handleGoogleSignup guarda pending_friend_id + pending_invite_token en localStorage antes del OAuth redirect. useEffect detecta Google session y vincula preregistro. P4: handleChooseSurprise → setIsSurpriseMode(true) + validate. handleValidate → approve. handleApproveGift usa isSurpriseMode. handleRequestChange → phone_signup. SignupDonePage tiene 2 modos: isSurprise=true (sin regalo), isSurprise=false (con regalo). Aislamiento teléfono: step inicial = "email" con flujo email+Google directo. PhoneSignupFlow ahora muestra email+password+Google en place del teléfono. | ✅ Listo para testing |

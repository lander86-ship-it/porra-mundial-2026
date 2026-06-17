# Porra Mundial 2026 — Reglas para Claude

## ⛔ REGLA CRÍTICA: NUNCA TOCAR DATOS EN PRODUCCIÓN

**La base de datos en Railway tiene datos reales: jugadores, porras, resultados y goleadores.**

### Prohibido absolutamente en cualquier commit:
- `DROP TABLE`, `DELETE FROM`, `TRUNCATE` en cualquier tabla
- `UPDATE` masivo sobre `players`, `predictions`, `scorer_predictions`
- Modificar `seed.js` para que borre o sobreescriba datos existentes
- Añadir migraciones en `db.js` que alteren datos de usuario (solo `ALTER TABLE ADD COLUMN` con `IF NOT EXISTS` está permitido)
- Cambiar el PIN del admin (actualmente `4228`) salvo solicitud explícita del usuario
- Tocar `restore-data.json` sin actualizar desde el backup real

### El startup del servidor NUNCA debe borrar datos:
- `seed.js` → solo `INSERT OR IGNORE` y `INSERT IF NOT EXISTS`; comprueba si los datos existen ANTES de insertar
- `db.js` → solo migraciones aditivas (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`)
- `autoRestore()` → solo `INSERT OR IGNORE`; sale inmediatamente si hay jugadores (`nonAdminCount > 0`)

### Antes de cualquier cambio en seed.js o db.js: PREGUNTAR AL USUARIO

---

## Stack técnico
- Node.js 24 + `node:sqlite` (DatabaseSync) — SQLite síncrono
- Express.js + express-session (7 días)
- React 18 + Vite 5 + Tailwind CSS 3 + React Router v6
- Railway.app — deploy automático con `git push origin main`
- CEST = UTC+2 (horario de verano español)
- DB en volumen Railway: `DB_PATH=/data/porra.db`

## Estado de la DB en producción
- Admin PIN: `4228`
- 19 jugadores, todos con `predictions_locked=1` y `paid=1`
- 1368 predicciones de fase de grupos
- 19 goleadores elegidos
- El volumen Railway persiste la BD entre deploys

## Endpoints útiles
- `GET /api/admin/backup` — backup completo JSON (requiere sesión admin)
- `POST /api/admin/restore` — restaura jugadores/predicciones/goleadores en batches
- `POST /api/admin/recalc` — recalcula todos los puntos desde cero

## Notas de negocio
- 48 equipos, 12 grupos de 4, los 8 mejores terceros pasan a 1/16
- Fase 1: grupos (porras ya cerradas y bloqueadas)
- Fase 2: eliminatorias — cuando se abra, hay que DESBLOQUEAR a los jugadores primero
- Al desbloquear para Fase 2: poner `predictions_locked=0` a todos los no-admin

# Porra Mundial 2026 — Reglas para Claude

## ⛔ REGLA CRÍTICA: NO MODIFICAR ESTRUCTURA DE BASE DE DATOS

**La base de datos en producción (Railway) contiene porras, predicciones y resultados reales de jugadores.**

**Está PROHIBIDO:**
- Añadir o eliminar columnas en tablas existentes (`ALTER TABLE ... ADD/DROP COLUMN`)
- Eliminar o recrear tablas (`DROP TABLE`)
- Cambiar tipos de datos de columnas existentes
- Añadir nuevas tablas que requieran migrar datos existentes
- Ejecutar `DELETE` o `UPDATE` masivos sobre datos de usuarios (`players`, `predictions`, `scorer_predictions`)
- Modificar registros del admin salvo cambio explícito de contraseña

**Está PERMITIDO:**
- Añadir nuevas tablas vacías (CREATE TABLE IF NOT EXISTS) que no afecten las existentes
- INSERT OR IGNORE para añadir datos de referencia (equipos, goleadores, partidos)
- UPDATE de campos de configuración (scoring, settings, match dates)
- Migraciones con guarda (`IF NOT EXISTS`, `SELECT` previo) que sean 100% aditivas y no destructivas

**Si una feature nueva necesita un cambio de esquema:** consultar al usuario primero y describir exactamente qué cambiaría y por qué.

## Stack técnico
- Node.js 24 + `node:sqlite` (DatabaseSync)
- Express.js + express-session (7 días)
- React 18 + Vite 5 + Tailwind CSS 3 + React Router v6
- Railway.app — deploy automático con `git push origin main`
- CEST = UTC+2 (horario de verano español)

## Notas de negocio
- 48 equipos, 12 grupos de 4, los 8 mejores terceros pasan a 1/16
- Hay dos fases: Fase 1 (grupos) y Fase 2 (eliminatorias)
- El endpoint de backup está en `GET /api/admin/backup` (requiere sesión admin)

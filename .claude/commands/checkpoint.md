---
description: Revisión de estado vs. hitos. Decide qué recortar.
---

Haz un checkpoint de manager senior. Sin rodeos.

1. Mira la hora actual (`date`) y los hitos de `SPEC.md`. ¿Vamos adelantados, en hora o tarde? ¿Cuánto?
2. Revisa el estado real: `git log --oneline -15`, `git status`, y ejecuta `cd app && npm run build`.
   Si el build falla, eso es lo primero y lo único.
3. Contrasta con el guion de la demo de 60 s de `SPEC.md`: marca cada paso como ✅ funciona,
   🟡 a medias, ❌ falta.
4. Si vamos tarde: propón **recortes concretos** (qué quitar o falsear) para llegar al siguiente hito.
   Recortar features siempre gana a llegar con algo roto.
   Si vamos bien: propón la mejora con más impacto en "¿es bueno?" por hora invertida.
5. Da el plan de las próximas 60–90 min por persona (según "Dueños" en `SPEC.md`).
6. Añade una entrada breve en `AGENT_LOG.md`.

Reglas de hora: después de las 12:00 del sábado no hay features nuevas. Después de las 15:00 solo bugs.

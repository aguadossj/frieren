---
description: Tema → 15 ideas → puntuación por el jurado → recomendación → SPEC.md
argument-hint: <tema anunciado en el kickoff> [track preferido opcional]
---

El tema de la hackathon acaba de anunciarse: **$ARGUMENTS**

Tenemos ~45 minutos para decidir. Sé rápido y decisivo. Sigue estos pasos:

## 1. Ideación (amplia)
Genera **15 ideas**: 5 por track (Game / Tool / Habit). Cada idea en una tabla con:
- Nombre + pitch de una línea (en inglés)
- **Los primeros 60 s** de un desconocido: qué ve, qué toca, qué siente
- El momento "wow" (lo que hace que alguien le pase el móvil a otro)
- El giro original respecto a la idea obvia para este tema
- Riesgo técnico principal

Reglas: nada que requiera login, hardware raro, datos que no tenemos o más de 3 pantallas.
Al menos 3 ideas tienen que ser raras/arriesgadas a propósito. Evita lo que harían otros 10 equipos.

## 2. Jurado
Lanza en paralelo **3 subagentes `idea-critic`**, cada uno con las 15 ideas, para puntuarlas de forma
independiente. Promedia las puntuaciones y señala dónde discrepan.

## 3. Recomendación
Muestra el **top 3** con puntuación, y para cada una: qué recortaríamos para terminarla, y qué la haría
ganar. Da **una recomendación clara** y por qué. Luego **para y pregunta al equipo** cuál elegimos
(pueden mezclar ideas). No escribas código todavía.

## 4. Cuando el equipo elija → escribe `SPEC.md`
```
# <Nombre> — <pitch en una línea>
Track: ...
## La demo de 60 segundos (guion exacto, paso a paso, lo que hará un desconocido)
## Core loop (una frase)
## Pantallas (máx. 3) y qué hay en cada una
## Fuera de alcance (lista explícita de lo que NO hacemos)
## Riesgos y plan B para cada uno
## Arquitectura mínima (ficheros/componentes, estado, si hay /api y por qué)
## Dueños (persona → área/ficheros, para trabajar en paralelo sin conflictos)
## Hitos
- M0 vie 20:00 — esqueleto desplegado en URL pública, abre en móvil
- M1 vie 23:00 — core loop jugable/usable de principio a fin (feo vale)
- M2 sáb 12:00 — FEATURE FREEZE: todo lo del guion de 60 s funciona
- M3 sáb 15:00 — pulido, onboarding, sonido/haptics, estados vacíos, probado por 5 desconocidos
- M4 sáb 15:45 — deploy final, QR impreso, SETUP.md listo
## Lista de "definition of done" verificable
```
Después crea `AGENT_LOG.md` con la primera entrada (hora, idea elegida, por qué) y propón el reparto
de las primeras 2 horas entre las 4 personas.

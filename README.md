# Garmin Laps · by AlejandrLucena

Visualizador de entrenamientos de Garmin Connect. Carga un `.fit`/`.zip`, conéctate al servidor MCP o pega JSON — obtén una tabla desglosada por vueltas, zonas de FC y grupos de intervalos, lista para compartir como imagen.

**Demo:** https://Alejandrlucena.github.io/garmin-laps

> **About del repositorio (GitHub):**  
> *Visor y editor interactivo de entrenamientos Garmin. Carga archivos .fit, conéctate al servidor MCP o pega JSON. Tabla con vueltas, zonas de FC, grupos personalizables por arrastre, edición en tiempo real, filtros y exportación a imagen.*

---

## Deportes soportados

| Deporte | Columnas especiales |
|---------|-------------------|
| 🏃 Running (asfalto, cinta, trail) | Cadencia · Ritmo · Zonas FC |
| 🚴 Ciclismo (road, MTB, indoor, ebike…) | Vel. Máx · Potencia (W) · Zonas FC |
| 🚴 Ciclismo indoor sin GPS | Cadencia · Potencia (W) · Zonas FC *(sin Vel. Med / Vel. Máx / Ritmo)* |
| 🏍️ Motorsport (moto, coche, kart) | Vel. Máx · Zonas FC |

Todas las disciplinas incluyen **Tiempo**, **Tiempo acumulado** y **deltas** entre vueltas.

---

## Cómo funciona

### Opción 1 — Archivo local
Arrastra un `.fit` o `.zip` al recuadro del editor, o usa el botón **📁 Garmin**.

### Opción 2 — Conector directo
Pulsa **🔌 Conector → ⚙ Configurar** para introducir la URL de tu servidor, luego pulsa **🔌 Conector** → elige actividad → se carga automáticamente, sin subir ningún archivo.

- Funciona desde **móvil y escritorio**
- Requiere tener [garmin-coach-mcp](https://github.com/Alejandrlucena/garmin-coach-mcp) desplegado en Railway o corriendo en local
- Filtros de tipo: 🗂️ Todo · 🏃 Running · 🚴 Ciclismo · 🏍️ Motorsport 🏎️
- Solo muestra actividades con datos de splits; fuerza, yoga, etc. se ocultan automáticamente
- Usa los campos **Desde / Hasta** para filtrar por rango de fechas y acceder a cualquier actividad histórica
- El buscador de texto filtra al instante; con 3+ letras amplía la búsqueda a las últimas ~500 actividades
- Al cargar la página descarga en background las 30 actividades recientes y, tras recibirlas, el historial amplio (~500); ambas listas se guardan en localStorage para que las siguientes aperturas sean instantáneas
- Si el panel está abierto cuando llegan los datos frescos, la lista se actualiza automáticamente sin cerrar ni volver a pulsar

### Opción 3 — JSON manual
Pega el JSON de una actividad que te haya dado Claude o ChatGPT y pulsa **▶ Renderizar**.

### Opción 4 — HTML de Garmin Connect
Pega el HTML de la página de splits de una actividad de Garmin Connect y pulsa **▶ Renderizar**. Útil para ver actividades de otros usuarios sin tener el `.fit`.

### Opción 5 — JSON de Claude / ChatGPT
Pega el JSON de una actividad que te haya dado un asistente y pulsa **▶ Renderizar**. Acepta tanto el formato plano como el estructurado de Garmin.

No requiere instalación, login ni backend. Todo corre en el navegador.

---

## Qué muestra

Cada actividad se desglosa en tres bloques:

- **Calentamiento** — vueltas iniciales antes de la serie principal
- **Intervalos** — grupos de carrera + recuperación con cabecera de resumen por serie
- **Enfriamiento** — vueltas finales tras el último intervalo

Por cada vuelta:

| Columna | Running | Ciclismo | Ciclismo indoor | Motorsport |
|---------|---------|----------|-----------------|------------|
| Paso / Km | ✓ | ✓ | ✓ | ✓ |
| Vuelta | ✓ | ✓ | ✓ | ✓ |
| Tiempo | ✓ | ✓ | ✓ | ✓ |
| Tiempo acum. | ✓ | ✓ | ✓ | ✓ |
| Distancia | ✓ | ✓ | — | ✓ |
| Vel. Med | ✓ | ✓ | — | ✓ |
| Cadencia | ✓ | — | ✓ | — |
| Ritmo min/km | ✓ | — | — | — |
| Vel. Máx | — | ✓ | — | ✓ |
| Potencia (W) | — | ✓ | ✓ | — |
| FC med / FC máx | ✓ | ✓ | ✓ | ✓ |
| Zona FC | ✓ | ✓ | ✓ | ✓ |

Los grupos de intervalos incluyen una fila de resumen con totales de tiempo, distancia y FC.

Todas las columnas numéricas muestran **delta** respecto a la vuelta de referencia anterior (verde = mejora, rojo = empeora).

**Píldoras** especiales en la tabla:

| Píldora | Color | Significado |
|---------|-------|-------------|
| FC máx | 🔴 Rojo | Vuelta con la FC máxima de la sesión |
| FC med | 🟠 Naranja | FC media más alta en filas de resumen |
| Vel. Med | 🩵 Teal | Vuelta con la velocidad media más alta (todos los deportes) |
| Tiempo / Ritmo | 🟣 Morado | Vuelta con el ritmo más rápido / lap más rápida (running, ciclismo outdoor y motorsport) |
| Vel. Máx | 🟡 Lima | Vuelta con la velocidad punta más alta (ciclismo y motorsport) |
| Cadencia | 🟢 Verde | Vuelta con la cadencia más alta (running y ciclismo indoor) |
| Potencia (W) | 🔵 Azul | Vuelta con la potencia más alta (ciclismo) |

La **fila más rápida** (ritmo más rápido en running · mayor Vel. Med en ciclismo y motorsport) se resalta con fondo morado en toda la fila, incluyendo la cabecera de grupo si el km más rápido pertenece a ese grupo. En running continua la columna muestra **Tiempo** (no Ritmo), pero la detección de la vuelta más rápida sigue siendo por pace.

---

## Agrupación de intervalos

La agrupación replica fielmente lo que muestra Garmin Connect:

- Vueltas activas separadas por una vuelta de descanso → grupos distintos
- Vueltas activas consecutivas sin descanso pero con distinto paso de workout (`wktStepIndex`) → grupos distintos
- Vueltas finales de descanso con duración mayor que la media de las activas, o 2+ descansos consecutivos al final → se reclaman automáticamente como **Enfriamiento**

---

## Agrupar por km

El selector **Agrupar por km** permite reagrupar las vueltas en bloques del tamaño que elijas (0.5, 1, 2, 5 km o valor personalizado). Cada bloque muestra una fila resumen colapsable con los stats agregados y las vueltas originales debajo. Funciona en todos los deportes.

---

## Grupos personalizados

Además de la agrupación automática por intervalos, puedes **crear grupos a medida** arrastrando vueltas:

- Activa el modo edición (**✏️**) y usa el icono `☰` para arrastrar una vuelta sobre otra — se agrupan automáticamente.
- Los grupos personalizados son colapsables y muestran una fila resumen con los mismos stats (distancia, tiempo, ritmo, FC, zonas) que los grupos automáticos.
- Puedes **renombrarlos** con doble clic en el título.
- Los botones `↥` / `↧` en cada fila permiten meterla en el grupo anterior o siguiente sin arrastrar.
- El botón **⊟** deshace el grupo y devuelve las vueltas a su estado individual.
- Todas las acciones tienen **deshacer/rehacer** (`Cmd/Ctrl+Z`).

---

## Filtro por duración

Junto al botón **✏️** hay un campo de texto que permite **filtrar vueltas por cualquier valor** de la tabla (tiempo, distancia, ritmo, velocidad, FC…):

- Escribe, por ejemplo, `2:00.0` o `4:00.0` para mostrar/ocultar vueltas cuyo tiempo contenga ese valor.
- Las vueltas que coinciden se **ocultan** automáticamente; la tabla y los totales se recalculan.
- Un contador `↩ N ocultas ▾` muestra las vueltas filtradas y permite restaurarlas individualmente.
- El filtro persiste mientras no se cierre la actividad y forma parte del historial de deshacer.
- Útil para limpiar la vista eliminando vueltas de transición o descansos cortos sin perderlos del historial.

---

## Editar la tabla

Una vez renderizada, la tabla es **editable** en escritorio (ratón) y en móvil/tablet (touch). Toda la maquinaria de edición está escondida por defecto detrás del botón **✏️** (esquina superior derecha de cada actividad). Al pulsarlo aparece una columna de iconos a la izquierda de cada fila y una franja con un `✕` encima de cada cabecera; al pulsarlo de nuevo se oculta todo y la tabla vuelve a verse limpia.

Con el modo edición activo:

- **Arrastrar y soltar vueltas** — con el icono `☰` puedes mover vueltas para reordenarlas o crear grupos personalizados soltando una fila debajo de otra. Todos los stats (tiempos acumulados, medias, zonas, deltas, pills) se recalculan en tiempo real.
- **Botones por fila** (carril izquierdo, columna `Icono`):
  - **✕** oculta la fila (lap individual o grupo entero si pulsas en la cabecera).
  - **↤** saca la vuelta del grupo en el que está.
  - **↥** mete la vuelta en el grupo anterior (o crea un grupo nuevo con la fila standalone de arriba).
  - **↧** mete la vuelta en el grupo siguiente (o crea un grupo nuevo con la fila standalone de abajo).
- **Ocultar columnas** — encima de cada cabecera aparece una **✕** dedicada. Al pulsarla, la columna entera (col + th + td) se oculta. Una barra `📐 N columnas ocultas ▾` aparece debajo de la tabla con un panel para restaurar columnas individualmente o todas a la vez. La preferencia se persiste en localStorage por tipo de deporte.
- **Ocultar resúmenes** — la `✕` también funciona en las cabeceras `▼ Calentamiento`, `▼ Carrera`, `▼ Enfriamiento`, grupos personalizados y en las filas `Media sesión` / `Media trabajo efectivo`.
- **Renombrar grupos** — doble clic sobre el título de un grupo personalizado para editarlo.
- **Deshacer / rehacer** — `Cmd/Ctrl + Z` deshace cualquier acción (ocultar fila, ocultar columna, arrastrar, agrupar, etc.). `Cmd/Ctrl + Shift + Z` rehace. En móvil hay un botón flotante `↶ ↷` abajo a la derecha.
- **Panel de restauración de filas** — junto a cada actividad aparece `↩ N acciones ocultas ▾` con la lista completa de filas ocultas para restaurar puntualmente.

Lo único que no se persiste entre actividades son las acciones de la tabla (ordenación/grupos/filas ocultas): el historial se reinicia al cargar un JSON nuevo. Las columnas ocultas sí se mantienen por tipo de deporte.

---

## Barra de acciones

| Botón | Acción |
|-------|--------|
| 🌐 Garmin Connect | Abre Garmin Connect en el navegador |
| ⚡ Zonas FC | Activa o desactiva las zonas de FC (toggle on/off) |
| ⚙ Configurar (Zonas FC) | Abre/cierra el panel de configuración de zonas |
| 📤 Drive | Sube la vista actual a Drive y copia el link |
| 🔌 Conector | Carga actividades desde el servidor Garmin MCP |
| ⚙ Configurar (Drive/Conector) | Abre el panel de configuración unificado |

---

## Zonas de frecuencia cardíaca

La web admite cuatro métodos de cálculo:

- **% Umbral de lactato** — introduce tu FC en umbral de lactato (recomendado)
- **% FC máxima** — introduce tu FC máxima
- **Karvonen (% FCR)** — introduce FC máxima y FC en reposo
- **Manual** — define los rangos Z1–Z5 directamente

Los ajustes se guardan en el navegador (localStorage) y se aplican automáticamente en cada carga.

---

## Guardar y compartir

Tres botones estándar:

- **Generar imagen** — captura la tabla y la descarga como PNG. Funciona en todos los navegadores, incluyendo iOS Safari.
- **Copiar imagen** — copia la imagen al portapapeles (Safari y Chrome).
- **Obtener link** (Drive) — sube la imagen a Google Drive y copia el link.

Además, el botón **Compartir** abre un overlay con una **tarjeta visual tipo Instagram** que incluye:

| Control | Descripción |
|---------|-------------|
| Datos | Elige qué stats mostrar (distancia, duración, ritmo, FC, cadencia, potencia, desnivel, etc.) |
| Zonas | Muestra una barra de zonas de FC en la tarjeta |
| Nombre | Título personalizado para la actividad |
| Modo | **Sesión completa** o **Trabajo efectivo** |
| Formato | Relación de aspecto 1:1 (cuadrada) o 9:16 (vertical para Stories) |
| Color fondo | 12 colores predefinidos + selector espectral personalizado + opacidad ajustable + transparente |
| Color texto | 12 colores + selector espectral + modo **Auto** (blanco/negro según luminosidad del fondo) |
| Fuente | 12 tipografías (Moderno, Arial, Verdana, Trebuchet, Optima, Century, Rounded, Serif, Palatino, Times, Garamond, Baskerville, Bookman) |

Desde la tarjeta puedes **Copiar** al portapapeles o **Generar** y descargar PNG. Los ajustes se guardan automáticamente al copiar/generar o con el botón **Guardar**.

Un **FAB 📸** flotante (abajo a la derecha) replica las acciones de imagen y el botón Compartir para acceso rápido sin desplazarse.

Todas las imágenes incluyen la firma `by AlejandrLucena` en el pie.

---

## Configuración unificada (⚙ Configurar)

El panel único gestiona:

- **Usuario** — alias local para recuperar tu configuración en otros dispositivos
- **URL del servidor Garmin MCP** — dónde está corriendo [garmin-coach-mcp](https://github.com/Alejandrlucena/garmin-coach-mcp)
- **URL de Drive (Apps Script)** — URL `/exec` de tu Google Apps Script para subir imágenes

Al guardar el servidor, la URL de Drive se sincroniza automáticamente desde el volumen de Railway.

### Crear el Apps Script para Drive

1. Ve a [script.google.com](https://script.google.com) con tu cuenta Google
2. Crea un nuevo proyecto y copia el contenido de [`GarminDriveUpload_AppScript.js`](GarminDriveUpload_AppScript.js)
3. Reemplaza `PON_AQUI_EL_ID_DE_TU_CARPETA_DE_DRIVE` con el ID de tu carpeta de Drive
4. Despliega como **Aplicación web** (ejecutar como: Yo · acceso: Cualquier usuario)
5. Copia la URL `/exec` y pégala en ⚙ Configurar

---

## Tecnología

Sin dependencias de servidor. Todo corre en el navegador. Usa:

- [html2canvas](https://html2canvas.hertzen.com) para la captura de imagen
- [fit-file-parser](https://github.com/jimmykane/fit-file-parser) (inlined) para leer `.fit`
- [JSZip](https://stuk.github.io/jszip/) (inlined) para extraer `.zip`
- LocalStorage para guardar configuración de zonas, Drive, Conector y caché de actividades
- Google Apps Script (externo, opcional) para el upload a Drive

### Estructura del proyecto

| Archivo | Propósito |
|---------|-----------|
| `index.html` | Shell de la SPA (228 líneas) |
| `style.css` | Todos los estilos (dark theme, responsive) |
| `app.js` | Toda la lógica de la aplicación (~9900 líneas) |
| `fit-parser.js` | Parser de archivos `.fit` (minified) |
| `GarminDriveUpload_AppScript.js` | Código para el Google Apps Script de Drive |

---

## Proyectos relacionados

- [garmin-coach-mcp](https://github.com/Alejandrlucena/garmin-coach-mcp) — Servidor MCP que conecta Garmin Connect con Claude y ChatGPT. Alimenta el botón 🔌 Conector de esta web.

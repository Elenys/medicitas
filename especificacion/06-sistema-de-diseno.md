# 06 — Sistema de diseño

Base: la paleta y las medidas definidas en `docs/Diagramas del mapa de navegación.pdf` y
`docs/diagramas y documentos..pdf`, completadas donde la documentación tenía huecos.

---

## 1. Color

### 1.1 Paleta

| Token | Valor | Uso |
|---|---|---|
| `primary` | `#1E88E5` | Bordes, iconos, enlaces sobre fondo claro, anillo de foco |
| `primary-dark` | `#1565C0` | **Fondo de los botones primarios** y pestaña activa |
| `primary-darker` | `#0D47A1` | Hover y pulsado del botón primario |
| `primary-light` | `#E3F2FD` | Fondos de realce, selección |
| `success` | `#2E7D32` | Cita confirmada, días con cupo, confirmaciones |
| `success-light` | `#E8F5E9` | Fondo de la etiqueta de éxito |
| `danger` | `#E53935` | Bordes, iconos y textos de error sobre fondo claro |
| `danger-dark` | `#C62828` | **Fondo de los botones de peligro** — el único que pasa AA con texto blanco normal |
| `danger-light` | `#FFEBEE` | Fondo de la etiqueta de error |
| `warning` | `#F9A825` | Advertencias |
| `warning-light` | `#FFF8E1` | Fondo de la advertencia |
| `surface` | `#FFFFFF` | Tarjetas, barras, modales |
| `background` | `#F5F5F5` | Fondo de la aplicación |
| `border` | `#E0E0E0` | Bordes y separadores |
| `text` | `#333333` | Texto principal |
| `text-muted` | `#757575` | Texto secundario, ayudas |
| `text-disabled` | `#BDBDBD` | Deshabilitado |

**Sobre el verde.** La paleta de `docs/` define solo azul, gris y rojo, pero el manual de usuario
describe la opción activa del menú y los días con cupo "en verde". Se añade `#2E7D32`, que tiene
contraste 5.13:1 sobre blanco y cumple WCAG AA para texto normal. Es una adición, no un cambio:
el azul sigue siendo el color de acción.

### 1.2 Color por estado de cita

Este mapeo es **único en todo el sistema**. Lo implementa `StatusBadge` y ningún otro componente
lo repite.

| Estado | Etiqueta | Texto | Fondo | Borde |
|---|---|---|---|---|
| `BOOKED` | Reservada | `#1565C0` | `#E3F2FD` | `#1E88E5` |
| `CONFIRMED` | Confirmada | `#1B5E20` | `#E8F5E9` | `#2E7D32` |
| `COMPLETED` | Completada | `#424242` | `#F5F5F5` | `#9E9E9E` |
| `CANCELLED` | Cancelada | `#B71C1C` | `#FFEBEE` | `#E53935` |

El estado **nunca se comunica solo por color**: la etiqueta siempre lleva su texto, para
usuarios con daltonismo y lectores de pantalla.

### 1.3 Contraste verificado

Calculados con la fórmula de luminancia relativa de WCAG 2.1. El mínimo AA es **4.5:1** para
texto normal y **3:1** para texto grande (≥ 24 px, o ≥ 18.66 px en negrita).

| Combinación | Ratio | WCAG AA |
|---|---|---|
| `#333333` sobre `#FFFFFF` | 12.63:1 | ✅ |
| `#333333` sobre `#F5F5F5` | 11.59:1 | ✅ |
| `#757575` sobre `#FFFFFF` | 4.61:1 | ✅ texto normal |
| `#FFFFFF` sobre `#1E88E5` | 3.68:1 | ⚠️ solo texto grande |
| `#FFFFFF` sobre `#1565C0` | 5.75:1 | ✅ |
| `#FFFFFF` sobre `#2E7D32` | 5.13:1 | ✅ |
| `#FFFFFF` sobre `#E53935` | 4.23:1 | ⚠️ solo texto grande |

**Dos consecuencias prácticas.** Ninguna de las dos es cosmética: sin ellas el sistema no cumple
AA.

1. **Los botones primarios usan `#1565C0` de fondo, no `#1E88E5`.** El azul de la paleta original
   se queda en 3.68:1 con texto blanco, por debajo del mínimo. `#1E88E5` se reserva para bordes,
   iconos, enlaces sobre fondo claro y anillos de foco, donde el umbral es 3:1.

2. **Los botones de peligro usan `#C62828` de fondo, no `#E53935`.** `#E53935` da 4.23:1, que
   solo sirve para texto grande — y un botón de 16 px en negrita **no** es texto grande: WCAG
   exige 24 px, o 18.66 px en negrita. `#C62828` da 5.62:1 y pasa con texto normal. `#E53935`
   sigue siendo el color de los bordes, iconos y textos de error sobre fondo claro.

| Token | Fondo de botón | Borde, icono, texto sobre fondo claro |
|---|---|---|
| Primario | `#1565C0` | `#1E88E5` |
| Peligro | `#C62828` | `#E53935` |
| Éxito | `#2E7D32` | `#2E7D32` |

---

## 2. Tipografía

Fuente: **Inter**, cargada con `next/font/google`, con `system-ui` de respaldo.

| Token | Tamaño | Interlineado | Peso | Uso |
|---|---|---|---|---|
| `display` | 30 px | 36 px | 700 | Título de la pantalla de inicio de sesión |
| `h1` | 24 px | 32 px | 700 | Título de página |
| `h2` | 20 px | 28 px | 600 | Título de sección y de tarjeta |
| `h3` | 16 px | 24 px | 600 | Subtítulo |
| `body` | 16 px | 24 px | 400 | Texto general |
| `body-sm` | 14 px | 20 px | 400 | Texto secundario, celdas de tabla |
| `caption` | 12 px | 16 px | 400 | Ayudas, marcas de tiempo |
| `label` | 14 px | 20 px | 500 | Etiquetas de formulario |

**Mínimo absoluto: 12 px.** Ningún texto por debajo, ni siquiera en tablas densas.

---

## 3. Espaciado y medidas

Escala de 4 px: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`.

| Elemento | Valor |
|---|---|
| Margen lateral en móvil | 16 px |
| Margen lateral en escritorio | 32 px |
| Ancho máximo del contenido | 1280 px |
| Separación entre tarjetas | 16 px |
| Relleno interno de tarjeta | 16 px móvil / 24 px escritorio |
| Altura de la barra superior | 64 px |
| Ancho del menú lateral | 256 px |
| Radio de borde | 8 px general, 12 px tarjetas, 9999 px etiquetas |
| Sombra de tarjeta | `0 1px 3px rgba(0,0,0,0.08)` |
| Sombra de modal | `0 10px 25px rgba(0,0,0,0.15)` |

### Áreas táctiles

**Mínimo 48 × 48 px** para todo elemento pulsable, como exige la documentación de diseño móvil.

| Elemento | Altura |
|---|---|
| Botón | 48 px |
| Botón pequeño | 40 px (solo en escritorio, nunca como única acción) |
| Campo de formulario | 48 px |
| Celda de día en el calendario | 44 × 44 px con 4 px de separación = 48 px de objetivo |
| Franja horaria | 48 px |
| Opción del menú | 48 px |

---

## 4. Puntos de interrupción

| Nombre | Ancho | Referencia |
|---|---|---|
| `sm` | 360 px | Android común — **ancho mínimo soportado** |
| `md` | 768 px | Tableta |
| `lg` | 1024 px | Portátil |
| `xl` | 1280 px | Escritorio |

Se diseña primero para 360 px. Ninguna pantalla puede producir desplazamiento horizontal a ese
ancho.

---

## 5. Componentes: especificación visual

### Botón

| Variante | Fondo | Texto | Borde | Hover |
|---|---|---|---|---|
| `primary` | `#1565C0` | Blanco | — | `#0D47A1` |
| `secondary` | Blanco | `#1565C0` | `#1E88E5` | `#E3F2FD` |
| `danger` | `#C62828` | Blanco | — | `#B71C1C` |
| `ghost` | Transparente | `#333333` | — | `#F5F5F5` |

Deshabilitado: fondo `#E0E0E0`, texto `#BDBDBD`, `cursor: not-allowed`.
Cargando: `Spinner` a la izquierda del texto, botón deshabilitado, el texto no cambia para
evitar que el botón salte de tamaño.

### Campo de formulario

Reposo: borde `#E0E0E0`, fondo blanco.
Foco: borde `#1E88E5` + anillo `0 0 0 3px rgba(30,136,229,0.2)`.
Error: borde `#E53935`, mensaje debajo en `#E53935` a 14 px, con `aria-describedby`.
Deshabilitado: fondo `#F5F5F5`, texto `#757575`.

La etiqueta va **siempre arriba y visible**, nunca solo como *placeholder*: un *placeholder*
desaparece al escribir y deja al usuario sin referencia.

### Franja horaria (`TimeSlotPicker`)

| Estado | Apariencia |
|---|---|
| Disponible | Borde `#E0E0E0`, fondo blanco, texto `#333333` |
| Disponible con foco/hover | Borde `#1E88E5`, fondo `#E3F2FD` |
| Seleccionada | Fondo `#1565C0`, texto blanco |
| Ocupada | Fondo `#F5F5F5`, texto `#BDBDBD`, tachado, `disabled`, `aria-disabled="true"` |

### Día del calendario (`AvailabilityCalendar`)

| Estado | Apariencia |
|---|---|
| Con cupo | Texto `#1B5E20`, punto `#2E7D32` bajo el número |
| Sin cupo | Texto `#BDBDBD`, no pulsable |
| Seleccionado | Círculo `#1565C0`, texto blanco |
| Hoy | Borde `#1E88E5` |
| Fuera de la ventana de 60 días | Texto `#E0E0E0`, no pulsable |

El punto verde acompaña siempre al número; la disponibilidad no depende solo del color del
texto.

---

## 6. Accesibilidad — WCAG 2.1 AA

| Requisito | Cómo se cumple |
|---|---|
| Contraste | Verificado en la tabla 1.3. Ninguna combinación por debajo del mínimo |
| Etiquetas | Todo campo con `<label htmlFor>`; todo icono pulsable con `aria-label` |
| Errores | `role="alert"` y `aria-describedby` vinculando el campo con su mensaje |
| Foco | Anillo visible de 3 px en todo elemento interactivo. **`outline: none` está prohibido** sin reemplazo |
| Teclado | Toda la aplicación se opera sin ratón. `Tab` sigue el orden visual |
| Modales | Trampa de foco, cierre con `Esc`, foco devuelto al elemento que lo abrió |
| Encabezados | Un solo `<h1>` por página; jerarquía sin saltos |
| Puntos de referencia | `<header>`, `<nav>`, `<main>`, `<footer>` |
| Salto de contenido | Enlace "Saltar al contenido" como primer elemento enfocable |
| Idioma | `<html lang="es">` |
| Color | Ningún dato se comunica solo por color: siempre hay texto o icono |
| Movimiento | Se respeta `prefers-reduced-motion` |
| Zoom | Usable al 200 % sin pérdida de contenido |
| Tablas | `<th scope>` en encabezados, `<caption>` descriptiva |
| Gráficos | Acompañados siempre de la tabla con los mismos datos |

---

## 7. Textos de la interfaz

| Situación | Texto |
|---|---|
| Credenciales incorrectas **o cuenta desactivada**, al iniciar sesión | Correo o contraseña incorrectos. |
| Cuenta desactivada mientras la sesión estaba abierta | Su cuenta se encuentra inactiva. Comuníquese con el administrador. |
| Correo ya registrado | Ya existe una cuenta con ese correo. |
| Documento ya registrado | Ya existe una cuenta con ese número de documento. |
| Cupo tomado | Ese horario acaba de ser reservado por otra persona. Elija otra franja. |
| Sin médicos | No hay médicos con horarios configurados en esta especialidad. |
| Sin cupos ese día | Este médico no tiene cupos disponibles el día seleccionado. |
| Fuera de la ventana de cancelación | Esta cita no se puede cancelar porque faltan menos de 24 horas. Comuníquese con la institución. |
| Cita aún no iniciada | Podrá registrar la atención cuando llegue la hora de la cita. |
| Sesión expirada | Su sesión ha expirado. Inicie sesión nuevamente. |
| Error de red | No fue posible conectar con el servidor. Reintente en unos minutos. |
| Sin citas próximas | No tiene citas próximas. |
| Sin citas en el día | No tiene citas para este día. |
| Sin avisos | No tiene avisos. |
| Reserva exitosa | Su cita quedó reservada. |
| Confirmación exitosa | Su asistencia fue confirmada. |
| Cancelación exitosa | La cita fue cancelada. |
| Atención registrada | La atención fue registrada. |

**Reglas de redacción.** Tercera persona, trato de usted, sin jerga técnica y sin culpar al
usuario. Un mensaje de error dice qué pasó y qué hacer; nunca expone rutas, consultas ni trazas.

> **Sobre "Su cuenta se encuentra inactiva".** El manual de usuario de `docs/` presenta este
> mensaje como respuesta al inicio de sesión. Aquí no puede serlo: al distinguir una cuenta
> desactivada de una contraseña incorrecta, el sistema confirmaría a un atacante que ese correo
> existe. El inicio de sesión responde siempre lo mismo (RN-08.2 + [04, §1.3](04-api.md)), y el
> mensaje de cuenta inactiva solo aparece cuando a un usuario con sesión abierta se le desactiva
> la cuenta y su siguiente petición recibe `401`. Es una desviación deliberada del manual, a
> favor de no filtrar quién está registrado.

---

## 8. Formato de fechas y horas

Todo formato pasa por `src/lib/datetime.ts`. **Ningún componente formatea fechas por su cuenta.**

| Contexto | Formato | Ejemplo |
|---|---|---|
| Fecha completa | `d 'de' MMMM 'de' yyyy` | 22 de septiembre de 2026 |
| Fecha corta | `dd/MM/yyyy` | 22/09/2026 |
| Fecha con día | `EEEE, d 'de' MMMM` | martes, 22 de septiembre |
| Hora | `h:mm a` | 8:00 a. m. |
| Fecha y hora | `d 'de' MMMM, h:mm a` | 22 de septiembre, 8:00 a. m. |
| Relativa | — | hace 5 minutos · en 2 días |
| Rango horario | `h:mm a – h:mm a` | 8:00 a. m. – 8:30 a. m. |

Locale `es` de date-fns, zona `America/Bogota` con date-fns-tz.

---

## 9. Configuración de Tailwind

```js
// tailwind.config.ts
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: '#1E88E5', dark: '#1565C0', darker: '#0D47A1', light: '#E3F2FD' },
        success:   { DEFAULT: '#2E7D32', dark: '#1B5E20', light: '#E8F5E9' },
        danger:    { DEFAULT: '#E53935', dark: '#C62828', darker: '#B71C1C', light: '#FFEBEE' },
        warning:   { DEFAULT: '#F9A825', light: '#FFF8E1' },
        surface:   '#FFFFFF',
        background:'#F5F5F5',
        border:    '#E0E0E0',
        content:   { DEFAULT: '#333333', muted: '#757575', disabled: '#BDBDBD' },
      },
      screens: { sm: '360px', md: '768px', lg: '1024px', xl: '1280px' },
      borderRadius: { card: '12px' },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.08)',
        modal: '0 10px 25px rgba(0,0,0,0.15)',
      },
      minHeight: { touch: '48px' },
      minWidth:  { touch: '48px' },
    },
  },
};
```

Los colores se usan **siempre por su token** (`bg-primary-dark`), nunca con un valor arbitrario
(`bg-[#1565C0]`). Una regla de ESLint lo verifica.

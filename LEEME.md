# Monitoreo Chingaza — cómo publicarla sin usar la Terminal

Este proyecto ya está listo para desplegarse. No necesitas escribir ningún
comando: todo se hace desde las páginas web de GitHub y Vercel.

## Paso 1 — Sube el proyecto a GitHub

1. Descomprime el archivo `chingaza-app.zip` en tu computador.
2. Entra a https://github.com y crea una cuenta gratuita si no tienes una.
3. Haz clic en el botón verde **"New"** (o el símbolo **+** arriba a la derecha
   → "New repository").
4. Ponle un nombre, por ejemplo `monitoreo-chingaza`, y déjalo en **Public**.
   No marques ninguna otra casilla. Clic en **"Create repository"**.
5. En la página que aparece, busca el enlace que dice
   **"uploading an existing file"** y haz clic ahí.
6. Abre la carpeta descomprimida en tu computador y arrastra **todos los
   archivos y carpetas** (menos `node_modules` y `dist`, que no deberían
   estar ahí) a la zona de arrastre de GitHub.
7. Baja hasta el final de la página y haz clic en **"Commit changes"**.

Con esto tu proyecto ya está en GitHub, sin haber usado la Terminal.

## Paso 2 — Conéctalo con Vercel

1. Entra a https://vercel.com y crea una cuenta gratuita usando el mismo
   inicio de sesión de GitHub (botón "Continue with GitHub").
2. Haz clic en **"Add New..." → "Project"**.
3. Busca el repositorio `monitoreo-chingaza` que acabas de subir y haz clic
   en **"Import"**.
4. Vercel va a detectar automáticamente que es un proyecto Vite. No cambies
   nada en la configuración.
5. Haz clic en **"Deploy"** y espera uno o dos minutos.

Al terminar, Vercel te da un enlace como `https://monitoreo-chingaza.vercel.app`,
ya con HTTPS activado — eso es indispensable para que la app se pueda instalar
como PWA.

## Paso 3 — Genera el código QR

1. Copia el enlace que te dio Vercel.
2. Entra a cualquier generador de QR gratuito (por ejemplo qr-code-generator.com)
   y pega el enlace.
3. Descarga el QR e imprímelo o inclúyelo en la presentación y en el material
   de las jornadas.

## Paso 4 — Prueba la instalación

- **Android/Chrome**: abre el enlace, espera el aviso "Instalar app" o
  búscalo en el menú ⋮.
- **iPhone/Safari**: abre el enlace, toca el ícono de Compartir (cuadrado con
  flecha) → "Añadir a pantalla de inicio". Este paso no aparece solo, así que
  vale la pena explicarlo junto al QR.

## Si más adelante quieres hacer cambios

Puedes editar los archivos directamente desde la web de GitHub (ícono de
lápiz al abrir cualquier archivo del repositorio) y cada vez que guardes un
cambio ("Commit changes"), Vercel vuelve a publicar la app automáticamente
en un par de minutos — tampoco necesitas Terminal para eso.

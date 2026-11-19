# Ejecución y despliegue

## Local

1. En la raíz del proyecto, ejecuta `npm.cmd run start:realtime:local` para iniciar el servidor de avisos y push con las claves de `.env`.
2. En otra terminal, ejecuta `npm.cmd run build` y después `npx.cmd http-server .\dist\pwa\browser -p 8080`.
3. Abre `http://localhost:8080`. Para avisos entre sesiones, abre la dirección en dos pestañas. Para push, usa el botón de suscripción y acepta el permiso del navegador.

Las claves privadas VAPID están en `.env`, que está excluido de Git. No publiques ese archivo.

## Publicación en Render

El archivo `render.yaml` define el servicio Node `mi-pwa-api` y el sitio estático `mi-pwa-angular`. Al crear el Blueprint, configura en el servicio API las variables `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` con los valores de `.env`. El valor público debe coincidir con `VAPID_PUBLIC_KEY` en `src/app/services/push-config.ts`.

El frontend está preparado para conectarse a `https://mi-pwa-api.onrender.com`. Si Render asigna otro dominio, actualiza el host en `src/app/services/push-config.ts` y vuelve a desplegar el frontend.

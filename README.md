# WhatsApp Sender Pro

Extensión de Chrome para abrir chats de WhatsApp sin agendar el número, con agenda de contactos, notas y plantillas de texto.

- Un solo campo de teléfono con selector de país, para todos los países (detecta el país al pegar, con o sin `+`).
- Sugiere pegar el número que tengas copiado.
- Contactos, plantillas y recientes en pestañas con buscador.
- Copia de seguridad (exportar/importar) de contactos y plantillas.
- Se actualiza sola desde los Releases de este repositorio.

El mensaje queda escrito en el chat y lo envía el usuario: no hay envío automático ni masivo.

## Instalación

1. Descargá el ZIP del [último release](https://github.com/EXECRISTIAN/whatsapp-sender-pro/releases/latest) y descomprimilo en una carpeta que no vayas a borrar.
2. En `chrome://extensions` activá **Modo de desarrollador** y tocá **Cargar descomprimida**. Elegí la carpeta que contiene `manifest.json`.
3. (Una sola vez, en Windows) doble clic en `instalar-actualizador.cmd` dentro de esa carpeta para que las actualizaciones se instalen solas.

## Actualizaciones automáticas

La extensión consulta el último release de este repositorio una vez por día y cada vez que se abre. Si hay una versión más nueva:

- con el actualizador instalado, la instala cuando la extensión no está en uso (popup, ventana y página de redactar cerrados), sobre la misma carpeta que está cargada en Chrome, y se recarga sola;
- sin el actualizador, muestra un aviso.

Chrome no permite que una extensión descomprimida reescriba sus propios archivos. Por eso la copia la hace un pequeño script de Windows (`WhatsApp_Sender_Pro/updater/`), registrado como *native messaging host* solo para el usuario actual y solo para el ID de esta extensión. Solo descarga desde `github.com/EXECRISTIAN/whatsapp-sender-pro/releases/download/`, comprueba que el ZIP contenga esta extensión con una versión mayor, hace una copia de respaldo y la restaura si algo falla. El registro queda en `%LOCALAPPDATA%\WhatsAppSenderPro\updater.log`. Para quitarlo: `desinstalar-actualizador.cmd`.

## Publicar una versión nueva

No se usan GitHub Actions: el ZIP se arma en la PC y a GitHub solo se suben los archivos.

1. Subí `version` en `WhatsApp_Sender_Pro/manifest.json` (por ejemplo `1.9.2`).
2. Comprimí el **contenido** de `WhatsApp_Sender_Pro` (con `manifest.json` en la raíz del ZIP, sin `updater/config.json`) como `WhatsApp_Sender_Pro_v1.9.2.zip`.
3. Commit y push a `main`, y creá el release con el ZIP:

   ```bash
   gh release create v1.9.2 WhatsApp_Sender_Pro_v1.9.2.zip --title "WhatsApp Sender Pro v1.9.2"
   ```

Las extensiones instaladas lo toman en menos de un día, o al abrirlas.

## Desarrollo

```bash
node --test tests/shared.test.mjs
```

Licencias de terceros: `WhatsApp_Sender_Pro/vendor/LICENSES.txt`.

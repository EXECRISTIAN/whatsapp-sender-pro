WhatsApp Sender Pro 1.9.0
=========================

Abre chats de WhatsApp desde Chrome sin agendar el número. El mensaje queda
escrito en el chat y lo enviás vos con Enter.

Uso rápido
1. Copiá un número en cualquier lado y abrí la extensión: aparece
   "📋 Pegar +54 9 11 ..." debajo del teléfono. Enter o un clic lo pega.
2. Escribí el mensaje (o tocá una plantilla para insertarla).
3. Enter en el teléfono o "Abrir chat".

Funciones
- App o Web: el selector de arriba elige dónde abrir el chat. En Web
  reutiliza la pestaña abierta.
- Un solo campo de teléfono con selector de país (bandera + código), para
  todos los países. Pegá un número con el código de país (con o sin +) y el
  país cambia solo. Debajo se muestra el número exacto que se va a abrir.
  La ✕ dentro del campo lo borra.
- En Argentina agrega el 9 de los celulares, y acepta 0 y 15 (ej. 011 15 ...).
- Mensaje: contador abajo a la izquierda; ☆ guarda el texto como plantilla y
  😊 abre los emojis, abajo a la derecha. La ⓘ explica que no se pueden
  enviar adjuntos por enlace.
- Contactos, Plantillas y Recientes en pestañas, con un solo buscador
  (sin importar tildes; también por número). Enter usa el primer resultado,
  las flechas recorren la lista. Lápiz y tacho al pasar el mouse.
- Menú contextual: seleccioná un número en cualquier página y clic derecho.

Tamaño
- Arrastrá la esquina inferior derecha del popup para cambiar el tamaño
  (hasta 800 × 600, el máximo que permite Chrome). Se guarda solo.
  Doble clic en la esquina lo vuelve al tamaño original.
- La ventana (botón ⧉) recuerda su tamaño y posición. Con ancho suficiente,
  el mensaje queda a la izquierda y los contactos a la derecha.

Configuración (⚙)
- País predefinido: la extensión abre siempre con ese país.
- Código de área por defecto (opcional) para escribir números locales cortos.
- Copia de seguridad: marcá Contactos, Plantillas o ambos, y Exportar o
  Importar. Importar agrega lo nuevo y actualiza los contactos existentes;
  acepta también las listas de contactos exportadas por versiones anteriores.
  Desde el popup, Importar abre la ventana para elegir el archivo (Chrome
  cierra el popup al abrir el selector de archivos).
- Idioma, tema, color, imagen de fondo y zoom.

Actualizaciones automáticas
- La extensión busca la última versión en
  https://github.com/EXECRISTIAN/whatsapp-sender-pro/releases
  una vez por día y cada vez que la abrís.
- Para que se instalen solas, ejecutá UNA VEZ "instalar-actualizador.cmd"
  (doble clic) desde esta carpeta. Si Windows avisa, "Más información" >
  "Ejecutar de todas formas". No pide permisos de administrador.
- La actualización se instala sobre esta misma carpeta y solo cuando la
  extensión no está abierta (popup, ventana ni página de redactar). Después
  Chrome la recarga sola y conserva tus datos.
- Estado y "Buscar ahora": Configuración > Actualizaciones.
- Para quitar el actualizador: "desinstalar-actualizador.cmd".

Instalación
1. Descomprimí el ZIP en una carpeta que no vayas a borrar.
2. Abrí chrome://extensions
3. Activá "Modo de desarrollador" (arriba a la derecha).
4. Clic en "Cargar descomprimida" y elegí la carpeta que contiene manifest.json.
5. Fijá la extensión con el ícono del rompecabezas de la barra de Chrome.
Para actualizar: reemplazá los archivos en la misma carpeta y tocá ↻ en
chrome://extensions. Así se conservan contactos y plantillas.

Atajos
- Enter en Teléfono vacío: pegar el número sugerido. Con número: abrir chat.
- Ctrl+Enter: copiar enlace.
- En el buscador de países o de contactos, Enter elige el primero.
- Esc: cerrar ventanas de diálogo.

Limitaciones de WhatsApp
- Por enlace solo se puede cargar texto y emojis. Los adjuntos se agregan
  dentro de WhatsApp, con el clip.
- El envío siempre lo confirma el usuario: no hay envío automático ni masivo.
- Si abrís más de 8 chats en un minuto la extensión te avisa, porque WhatsApp
  puede restringir las cuentas con actividad masiva.

Datos
Los contactos, plantillas e historial se guardan solo en este navegador
(no se sincronizan). Exportá una copia de seguridad de vez en cuando.

Licencias de terceros: vendor/LICENSES.txt

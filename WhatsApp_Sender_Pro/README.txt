WhatsApp Sender Pro 1.12.0
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
- Arrastrá cualquiera de las dos esquinas inferiores del popup para cambiar el tamaño
  (hasta 800 × 600, el máximo que permite Chrome). Se guarda solo.
  Doble clic en la esquina lo vuelve al tamaño original.
- La ventana (botón ⧉) recuerda su tamaño y posición. Con ancho suficiente,
  el mensaje queda a la izquierda y los contactos a la derecha.

Configuración (⚙)
- País predefinido: la extensión abre siempre con ese país. Se escribe y se
  busca en cualquier idioma ("spain", "espagne", "スペイン" encuentran España);
  los nombres se muestran como los escribe un nativo. La primera vez que
  elegís otro país en el teléfono, te pregunta si querés dejarlo como
  predefinido (deja de preguntar después de 3 "No").
- Ubicación del programa: muestra la carpeta actual y permite elegir el disco
  o una carpeta y "Mover aquí". Después se carga la carpeta nueva en
  chrome://extensions (la ruta queda copiada); los datos se conservan.
- Código de área por defecto (opcional) para escribir números locales cortos.
- Copia de seguridad: marcá Contactos, Plantillas o ambos, y Exportar o
  Importar. Importar agrega lo nuevo y actualiza los contactos existentes;
  acepta también las listas de contactos exportadas por versiones anteriores.
  Desde el popup, Importar abre la ventana para elegir el archivo (Chrome
  cierra el popup al abrir el selector de archivos).
- Idioma (51 idiomas, o Automático según Chrome), tema, color, imagen de
  fondo y zoom. Árabe, hebreo, persa y urdu se muestran de derecha a izquierda.

Actualizaciones automáticas
- La extensión busca la última versión en
  https://github.com/EXECRISTIAN/whatsapp-sender-pro/releases
  una vez por día y cada vez que la abrís.
- Interruptor "Actualizaciones automáticas" en Configuración > Actualizaciones.
  Apagado: te avisa cuando hay versión nueva y la instalás con "Instalar".
- Para que se instalen solas hace falta un paso, UNA SOLA VEZ: en
  Configuración > Actualizaciones tocá "Abrir carpeta de la extensión", hacé
  clic en la ruta de "Cargada desde" y doble clic en
  "instalar-actualizador.cmd". Si Windows avisa, "Más información" >
  "Ejecutar de todas formas". No pide permisos de administrador. La sección
  cambia sola a "✓ Activas".
- Con las automáticas activas no aparece ningún cartel: la actualización se
  instala sola. Si no están activas, el cartel dice "Ir a actualizaciones".
- La actualización se instala sobre esta misma carpeta y solo cuando la
  extensión no está abierta (popup, ventana ni página de redactar). Después
  Chrome la recarga sola y conserva tus datos.
- La versión instalada se ve junto al título de Configuración (⚙).
- Estado, "Buscar ahora" e "Instalar": Configuración > Actualizaciones.
  Sin el actualizador, "Descargar versión" baja el ZIP para instalarlo a mano.
- Para quitar el actualizador: "desinstalar-actualizador.cmd".

Instalación (una sola vez)
1. Descomprimí el ZIP en una carpeta que no vayas a borrar.
2. Doble clic en "INSTALAR.cmd" (si Windows avisa: "Más información" >
   "Ejecutar de todas formas"). Copia el programa a su propia carpeta
   (C:\WhatsApp Sender Pro), activa las actualizaciones automáticas, copia
   la ruta de esa carpeta y abre chrome://extensions. Después podés borrar
   la carpeta que descargaste.
3. En esa página: activá "Modo de desarrollador" (arriba a la derecha), clic
   en "Cargar descomprimida", pegá la ruta (Ctrl+V) en la barra de dirección
   de la ventana y elegí "Seleccionar carpeta".
4. Fijá la extensión con el ícono del rompecabezas de la barra de Chrome.
Desde ahí todas las versiones nuevas se instalan solas.
Para actualizar a mano: reemplazá los archivos (en esta carpeta o en otra) y
tocá ↻ en chrome://extensions. No hace falta "Quitar" la extensión.

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
- Los contactos, plantillas e historial se guardan en este navegador y se
  conservan en cada actualización. Desde la 1.10.0 la extensión tiene un ID
  fijo (gemleaglcoamjgkmckdhnbanhccogpjb), así que también se conservan si
  cargás la versión nueva desde otra carpeta.
- Ojo: "Quitar" la extensión en chrome://extensions borra sus datos. Con el
  actualizador instalado hay además una copia automática en
  %LOCALAPPDATA%\WhatsAppSenderPro\data y, si la quitás y la volvés a
  cargar, los contactos y plantillas vuelven solos.
- Sin el actualizador, exportá una copia de seguridad de vez en cuando. Si la
  extensión arranca vacía, el cartel "¿Tenías contactos o plantillas
  guardados?" te lleva a Importar.

Licencias de terceros: vendor/LICENSES.txt

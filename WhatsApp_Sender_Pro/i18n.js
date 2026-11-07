// Interface strings (es/en)
const STRINGS = {
  es: {
    windowTitle: 'Abrir en ventana', settingsTitle: 'Configuración', moreInfo: 'Más información',
    platformHint: 'Dónde abrir el chat: App de escritorio o WhatsApp Web. Se recuerda tu elección.',
    save: 'Guardar', cancel: 'Cancelar', exit: 'Salir',
    phone: 'Teléfono', phonePlaceholder: 'Número con código de área',
    phoneHint: 'Elegí el país en la bandera o pegá el número con su código (con o sin +): el país se detecta solo.',
    searchCountry: 'Buscar país o código…', noCountries: 'No se encontró el país.',
    phoneDoubtful: 'Revisá el número:', phoneBad: 'Número incompleto o inválido.',
    pasteSuggestion: 'Pegar {phone}', pasteSuggestionTitle: 'Número copiado en el portapapeles (Enter para pegarlo)',
    clear: 'Borrar', saveContact: '+ Agendar',
    message: 'Mensaje', messagePlaceholder: 'Escribe tu mensaje…', emojis: 'Emojis',
    attachmentsHint: 'WhatsApp no permite enviar adjuntos por enlace. Solo texto/emoji.',
    saveAsTemplate: 'Guardar como plantilla', openChat: 'Abrir chat', copyLink: 'Copiar enlace (Ctrl+Enter)',
    contacts: 'Contactos', templates: 'Plantillas', recents: 'Recientes',
    searchContacts: 'Buscar contacto…', searchTemplates: 'Buscar plantilla…', searchRecents: 'Buscar en recientes…',
    newContact: 'Nuevo contacto', newTemplate: 'Nueva plantilla',
    noContacts: 'Todavía no hay contactos. Escribí un número y tocá «+ Agendar», o usá ＋.',
    noTemplates: 'Todavía no hay plantillas. Escribí un mensaje y tocá ☆, o usá ＋.',
    noRecents: 'Los chats que abras aparecen acá.', noMatches: 'Sin resultados.',
    useContact: 'Usar este número', useTemplate: 'Insertar en el mensaje', useRecent: 'Repetir número y mensaje',
    edit: 'Editar', delete: 'Eliminar', untitled: 'Sin título',
    templateName: 'Nombre', templateText: 'Texto', templateNew: 'Nueva plantilla', templateEdit: 'Editar plantilla',
    templateSaved: 'Plantilla guardada.', confirmDeleteTemplate: '¿Eliminar la plantilla «{name}»?',
    addContactFromHistory: 'Agendar este número',
    language: 'Idioma', langAuto: 'Automático',
    theme: 'Tema', themeAuto: 'Automático', themeLight: 'Claro', themeDark: 'Oscuro',
    accent: 'Color principal', outline: 'Contorno del texto sobre imagen de fondo',
    background: 'Fondo (imagen)', backgroundHint: 'Se guarda localmente en este equipo.',
    backgroundWindowHint: 'Para elegir una imagen, abrí la extensión en ventana.',
    uiSection: 'Apariencia y tamaño', uiScale: 'Zoom / escala (50%–200%)',
    resizeHint: 'Arrastrá una esquina inferior (izquierda o derecha) para cambiar el tamaño. Doble clic: tamaño original. Se guarda solo.',
    resetSize: 'Restablecer tamaño', clearBg: 'Quitar imagen',
    contactNew: 'Nuevo contacto', contactEdit: 'Editar contacto', name: 'Nombre', notes: 'Notas', tags: 'Etiquetas (separadas por coma)',
    countryLabel: 'País predefinido', countryHint: 'Es el país con el que abre siempre la extensión. Elegir otro en el campo del teléfono vale solo para ese momento.',
    areaLabel: 'Código de área por defecto (opcional)', areaHint: 'Para escribir números locales sin el código de área. Ej.: 11',
    dataSection: 'Copia de seguridad', export: '⬇ Exportar', import: '⬆ Importar',
    dataHint: 'Marcá qué incluir. Importar agrega lo nuevo y actualiza los contactos que ya tenés.',
    dataHintPopup: 'Al tocar Importar se abre la ventana de la extensión para elegir el archivo.',
    dataNothing: 'Marcá contactos, plantillas o ambos.',
    importContacts: 'Contactos: {added} nuevos, {updated} actualizados.', importTemplates: 'Plantillas: {added} nuevas.',
    importNothing: 'El archivo no tenía nada nuevo.', importInvalid: 'El archivo no es una copia válida.',
    importWindow: 'Tocá Importar para elegir el archivo.',
    reviewNumber: 'Revisá el número.', linkCopied: 'Enlace copiado.', copyFailed: 'No se pudo copiar.',
    contactSaved: 'Contacto guardado.', confirmDeleteContact: '¿Eliminar a {name}?',
    bgTooLarge: 'La imagen es demasiado grande (máx. 4 MB).', settingsSaved: 'Configuración guardada.',
    rateWarning: 'Abriste muchos chats en el último minuto. WhatsApp puede restringir las cuentas con actividad masiva. ¿Abrir igual?',
    updatesSection: 'Actualizaciones',
    installNow: 'Instalar versión {latest}', installNowHint: 'Cierra la extensión e instala la nueva versión. Tus datos se conservan.',
    installDownload: 'Descargar versión {latest}', installDownloadHint: 'Sin el actualizador, Chrome no deja que la extensión reemplace sus archivos: se descarga el ZIP para instalarlo a mano.',
    installManualSteps: 'Se está descargando el ZIP de la versión {latest}. Descomprimilo encima de la carpeta de la extensión (reemplazando los archivos) y tocá ↻ en chrome://extensions. Tus datos se conservan.', versionTitle: 'Versión instalada', checkNow: 'Buscar ahora', seeReleases: 'Ver en GitHub', extensionId: 'ID de la extensión:',
    updateInfo: 'Versión instalada: {current}. Última publicada: {latest}. Revisado: {when}.', updateNever: 'nunca', updateChecking: 'Buscando actualizaciones…',
    updateNetwork: 'No se pudo consultar GitHub (sin conexión).',
    helperOn: '✓ Actualizador activo: busca una vez por día y cada vez que abrís la extensión, e instala cuando no la estás usando.',
    helperOff: 'Actualizador no instalado: se avisa cuando hay versión nueva pero hay que instalarla a mano. Para que sea automático (una sola vez):',
    helperStep1: 'Abrí la carpeta donde está la extensión (la que cargaste en chrome://extensions).',
    helperStep2: 'Doble clic en «instalar-actualizador.cmd». Si Windows pregunta, elegí «Más información» › «Ejecutar de todas formas».',
    helperStep3: 'Volvé a abrir la extensión: acá tiene que decir «Actualizador activo».',
    bannerAvailable: '⬇ Versión {latest} disponible. Se instala sola cuando cierres la extensión.', bannerInstallNow: 'Cerrar e instalar',
    bannerManual: '⬇ Versión {latest} disponible.', bannerHowTo: 'Activar actualización automática',
    bannerUpdated: '✓ Se actualizó a la versión {version}.', bannerFailed: 'No se pudo actualizar a {latest}: {error}', bannerRetry: 'Reintentar',
    bannerNoAsset: 'La versión {latest} en GitHub no tiene el ZIP adjunto.',
    composeTitle: 'Redactar mensaje', menuCompose: 'WhatsApp: escribir mensaje para enviar', menuDirect: 'WhatsApp: enviar mensaje directo'
  },
  en: {
    windowTitle: 'Open in a window', settingsTitle: 'Settings', moreInfo: 'More information',
    platformHint: 'Where to open the chat: desktop App or WhatsApp Web. Your choice is remembered.',
    save: 'Save', cancel: 'Cancel', exit: 'Exit',
    phone: 'Phone', phonePlaceholder: 'Number with area code',
    phoneHint: 'Pick the country on the flag or paste the number with its code (with or without +): the country is detected.',
    searchCountry: 'Search country or code…', noCountries: 'Country not found.',
    phoneDoubtful: 'Check the number:', phoneBad: 'Incomplete or invalid number.',
    pasteSuggestion: 'Paste {phone}', pasteSuggestionTitle: 'Number on the clipboard (Enter to paste it)',
    clear: 'Clear', saveContact: '+ Add contact',
    message: 'Message', messagePlaceholder: 'Type your message…', emojis: 'Emojis',
    attachmentsHint: 'WhatsApp does not allow attachments through links. Text and emoji only.',
    saveAsTemplate: 'Save as template', openChat: 'Open chat', copyLink: 'Copy link (Ctrl+Enter)',
    contacts: 'Contacts', templates: 'Templates', recents: 'Recent',
    searchContacts: 'Search contacts…', searchTemplates: 'Search templates…', searchRecents: 'Search recent…',
    newContact: 'New contact', newTemplate: 'New template',
    noContacts: 'No contacts yet. Type a number and click “+ Add contact”, or use ＋.',
    noTemplates: 'No templates yet. Write a message and click ☆, or use ＋.',
    noRecents: 'The chats you open show up here.', noMatches: 'No matches.',
    useContact: 'Use this number', useTemplate: 'Insert into the message', useRecent: 'Repeat number and message',
    edit: 'Edit', delete: 'Delete', untitled: 'Untitled',
    templateName: 'Name', templateText: 'Text', templateNew: 'New template', templateEdit: 'Edit template',
    templateSaved: 'Template saved.', confirmDeleteTemplate: 'Delete the template “{name}”?',
    addContactFromHistory: 'Save this number',
    language: 'Language', langAuto: 'Automatic',
    theme: 'Theme', themeAuto: 'Automatic', themeLight: 'Light', themeDark: 'Dark',
    accent: 'Main color', outline: 'Text outline over background image',
    background: 'Background (image)', backgroundHint: 'Saved locally on this computer.',
    backgroundWindowHint: 'To choose an image, open the extension in a window.',
    uiSection: 'Appearance and size', uiScale: 'Zoom / scale (50%–200%)',
    resizeHint: 'Drag a bottom corner (left or right) to resize. Double-click: original size. It is saved automatically.',
    resetSize: 'Reset size', clearBg: 'Remove image',
    contactNew: 'New contact', contactEdit: 'Edit contact', name: 'Name', notes: 'Notes', tags: 'Tags (comma separated)',
    countryLabel: 'Default country', countryHint: 'The extension always opens with this country. Picking another one in the phone field only lasts for that moment.',
    areaLabel: 'Default area code (optional)', areaHint: 'To type local numbers without the area code. E.g.: 11',
    dataSection: 'Backup', export: '⬇ Export', import: '⬆ Import',
    dataHint: 'Tick what to include. Import adds what is new and updates the contacts you already have.',
    dataHintPopup: 'Import opens the extension window to choose the file.',
    dataNothing: 'Tick contacts, templates or both.',
    importContacts: 'Contacts: {added} new, {updated} updated.', importTemplates: 'Templates: {added} new.',
    importNothing: 'The file had nothing new.', importInvalid: 'The file is not a valid backup.',
    importWindow: 'Click Import to choose the file.',
    reviewNumber: 'Check the number.', linkCopied: 'Link copied.', copyFailed: 'Could not copy.',
    contactSaved: 'Contact saved.', confirmDeleteContact: 'Delete {name}?',
    bgTooLarge: 'The image is too large (max 4 MB).', settingsSaved: 'Settings saved.',
    rateWarning: 'You opened many chats in the last minute. WhatsApp may restrict accounts with bulk activity. Open anyway?',
    updatesSection: 'Updates',
    installNow: 'Install version {latest}', installNowHint: 'Closes the extension and installs the new version. Your data is kept.',
    installDownload: 'Download version {latest}', installDownloadHint: 'Without the updater, Chrome does not let the extension replace its own files: the ZIP is downloaded to install by hand.',
    installManualSteps: 'The ZIP for version {latest} is downloading. Extract it over the extension folder (replacing the files) and press ↻ in chrome://extensions. Your data is kept.', versionTitle: 'Installed version', checkNow: 'Check now', seeReleases: 'See on GitHub', extensionId: 'Extension ID:',
    updateInfo: 'Installed version: {current}. Latest published: {latest}. Checked: {when}.', updateNever: 'never', updateChecking: 'Checking for updates…',
    updateNetwork: 'Could not reach GitHub (offline).',
    helperOn: '✓ Updater active: checks once a day and every time you open the extension, and installs when you are not using it.',
    helperOff: 'Updater not installed: you are told about new versions but must install them by hand. To make it automatic (only once):',
    helperStep1: 'Open the folder that holds the extension (the one you loaded in chrome://extensions).',
    helperStep2: 'Double-click “instalar-actualizador.cmd”. If Windows asks, choose “More info” › “Run anyway”.',
    helperStep3: 'Open the extension again: this should now say “Updater active”.',
    bannerAvailable: '⬇ Version {latest} is available. It installs itself when you close the extension.', bannerInstallNow: 'Close and install',
    bannerManual: '⬇ Version {latest} is available.', bannerHowTo: 'Turn on automatic updates',
    bannerUpdated: '✓ Updated to version {version}.', bannerFailed: 'Could not update to {latest}: {error}', bannerRetry: 'Retry',
    bannerNoAsset: 'Version {latest} on GitHub has no ZIP attached.',
    composeTitle: 'Compose message', menuCompose: 'WhatsApp: write a message to send', menuDirect: 'WhatsApp: send direct message'
  }
};

let current = 'es';

export const getLang = () => current;

export function setLang(lang){
  const wanted = lang === 'auto' || !lang ? chrome.i18n.getUILanguage() : lang;
  current = wanted.toLowerCase().startsWith('es') ? 'es' : 'en';
  return current;
}

export function t(key, vars = {}){
  const text = STRINGS[current][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

export function translatePage(){
  document.documentElement.lang = current;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
}

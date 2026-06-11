// Google Apps Script — Garmin Entreno: subir imagen a Google Drive
//
// CONFIGURACIÓN:
//   1. Abre Google Drive y crea una carpeta donde quieras guardar las imágenes
//   2. Abre la carpeta, copia el ID de la URL:
//      https://drive.google.com/drive/folders/ESTE_ES_EL_ID
//   3. Pega ese ID en la variable FOLDER_ID de abajo
//
// DESPLIEGUE (hazlo cada vez que cambies el código):
//   Implementar → Nueva implementación
//   Tipo: Aplicación web
//   Ejecutar como: Yo (tu cuenta Google)
//   Quién puede acceder: Cualquier usuario
//   → Copia la URL /exec y pégala en la web cuando te la pida.
//
// Para actualizar: Implementar → Administrar implementaciones → editar → Nueva versión

var FOLDER_ID = 'PON_AQUI_EL_ID_DE_TU_CARPETA_DE_DRIVE';

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var base64   = payload.data || payload.image || '';
    var filename  = (payload.fileName || payload.filename || 'entreno_' + new Date().getTime() + '.jpg')
                      .replace(/[\/\\:*?"<>|]/g, '_');

    if (!base64) throw new Error('No se recibió imagen (campo "data" vacío).');

    var folder = DriveApp.getFolderById(FOLDER_ID);

    // Si ya existe un archivo con ese nombre, añade sufijo corto
    var existing = folder.getFilesByName(filename);
    if (existing.hasNext()) {
      var suffix = new Date().getTime().toString().slice(-5);
      filename = filename.replace(/\.jpg$/i, '_' + suffix + '.jpg');
    }

    var decoded = Utilities.base64Decode(base64);
    var blob    = Utilities.newBlob(decoded, 'image/jpeg', filename);
    var file    = folder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, url: file.getUrl(), filename: filename }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Prueba rápida: abre la URL /exec en el navegador → debe devolver {"status":"ok"}
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', folder: FOLDER_ID }))
    .setMimeType(ContentService.MimeType.JSON);
}

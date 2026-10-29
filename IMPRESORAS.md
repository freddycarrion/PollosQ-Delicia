# Impresión térmica: Windows y Android

En la barra del cajero hay un botón con una impresora para configurar y probar.
El ajuste es local a cada equipo/navegador. No requiere migraciones de Supabase.

## Papel y tickets

- Papel de 58 mm: contenido de 48 mm / 384 puntos.
- Papel de 80 mm: contenido de 72 mm / 576 puntos.
- Selección de cocina, cliente o ambos; prueba sin registrar ventas.
- Los modelos con otro ancho de cabezal necesitan un perfil específico.

Al terminar una venta se abre el panel de impresión. La venta ya está guardada;
los botones de impresión y reimpresión no vuelven a insertarla. Cancelar o perder
la conexión conserva el registro en Pedidos. No hay reintentos automáticos.

## Impresora del sistema / PDF

En Windows, instalar el controlador y emparejar/conectar la impresora. En el
panel, seleccionar este modo y pulsar **Abrir para imprimir**. Se abre el diálogo
del navegador directamente: elegir la impresora o **Guardar como PDF**, el papel
correcto, escala 100 %, sin encabezados ni pies. Cocina y cliente salen en una
sola tira dimensionada al contenido; el corte entre copias depende del controlador.
Algunos controladores pueden ignorar el tamaño de página que solicita la web:
configurarlo también allí.

Android necesita un servicio de impresión compatible con el modelo. Una
impresora Bluetooth no aparece necesariamente en el diálogo de Android solo
por estar emparejada. Si el navegador bloquea la vista, permitir esa ventana.

## Bluetooth BLE directo · ESC/POS

Requiere HTTPS, navegador con `navigator.bluetooth` y una impresora ESC/POS que
exponga el servicio GATT `18f0` y la característica de impresión `2af1`.
Se selecciona con el diálogo del navegador al pulsar **Conectar impresora**.
Este perfil se encuentra en algunas POS-5805, MPT-II y Xprinter; no representa
todos los modelos de esas marcas. No funciona con Bluetooth clásico solamente,
impresoras de etiquetas TSPL/CPCL ni impresoras que usen protocolos propietarios.

Se rasteriza el texto para conservar tildes y ñ sin depender de páginas de códigos.
Las escrituras BLE usan bloques de 20 bytes; el envío puede tardar en tickets
largos. El porcentaje indica datos transmitidos, no confirma la salida del papel.

## Bluetooth clásico / puerto · ESC/POS

Requiere navegador con `navigator.serial`. USB en XP-80C: instalar el controlador
Virtual COM de Xprinter y seleccionar el puerto COM. Bluetooth clásico: emparejar
primero en el sistema y seleccionar el puerto y velocidad indicados por el fabricante.
El acceso RFCOMM/SPP depende de la versión del navegador y del sistema; la opción
solo se habilita cuando la API está disponible. No selecciona puertos sin permiso.

En el modo directo, cocina y cliente se envían como imágenes ESC/POS separadas.
Activa **Cortar cada ticket al terminar** solo en modelos con cuchilla (por ejemplo,
XP-80C). En la impresora del sistema, el corte entre copias depende del controlador.

## Aplicación del fabricante

**Descargar imagen** genera un PNG de alta resolución con el ancho elegido.
**Compartir imagen** usa el selector del sistema si admite archivos; permite
enviarlo a una aplicación de impresión que acepte imágenes. Si esa aplicación
no aparece, descargar el archivo y abrirlo desde ella. Esto tampoco garantiza
compatibilidad con todas las aplicaciones/modelos.

## Verificación

- `node --test tests/impresion.test.cjs`: perfiles, raster ESC/POS, bandas de
  impresión, transporte BLE/serie simulado, fallos parciales y HTML de 58/80 mm.
- `npm run build`: compilación y TypeScript.
- `tests/impresion-browser.test.cjs`: prueba opcional con `playwright-core` en un
  directorio temporal, `PLAYWRIGHT_MODULE_PATH` apuntando al módulo y
  `PRINT_BROWSER_PATH` al ejecutable instalado de Chrome/Edge. Comprueba la vista
  móvil de los dos anchos, la ventana de impresión y la imagen de alta resolución.
- Antes de usar en caja, realizar una prueba física desde cada equipo. No se
  ha verificado aquí una impresora física; una conexión aceptada y un envío
  terminado no certifican que la impresora haya producido papel correctamente.

Fuentes técnicas:
- [Bluetooth en Chrome](https://developer.chrome.com/docs/capabilities/bluetooth)
- [Bluetooth clásico por Web Serial](https://developer.chrome.com/blog/bluetooth-rfcomm-updates-web-serial)
- [Perfiles BLE documentados por WebBluetoothReceiptPrinter](https://github.com/at-point-of-sale/WebBluetoothReceiptPrinter/blob/main/src/main.js)
- [Imprimir desde Chrome en Android](https://support.google.com/chrome/answer/1069693?co=GENIE.Platform%3DAndroid)

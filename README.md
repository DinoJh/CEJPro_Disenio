# CEJ PRO — Diseño final

Esta carpeta contiene el prototipo navegable aprobado. Abre `index.html` en Chrome. La pantalla inicial es el login y «Continuar con Google» permite entrar a la demostración. También puedes ejecutar `python -m http.server 8077` y abrir `http://localhost:8077`.

## Para comprender el producto

Lee `LEER_PRIMERO_Prompt_Claude.md`, que describe cada módulo y sus relaciones. La interfaz y los módulos cargados por `index.html` corresponden al diseño vigente.

## Módulos activos

| Carpeta                                                   | Responsabilidad                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| `assets/js/app.js` y `modules/navigation.js`              | Navegación, rutas y encabezado                                           |
| `modules/login` | Pantalla de acceso y Google simulado |
| `modules/home`                                            | Agenda, expedientes recientes, escritos y notificaciones en Inicio       |
| `modules/calendar`                                        | Calendario general y eventos                                             |
| `modules/cases`                                           | Expedientes, carpetas, resumen, involucrados, documentos, notas y agenda |
| `modules/identities`                                      | Identidades de consulta CEJ reutilizables                                |
| `modules/clients/clients.js` y `data.js`                  | Directorio y ficha de clientes                                           |
| `modules/clients/collections.js` y `received-payments.js` | Registro, consulta, edición y eliminación de pagos recibidos             |
| `modules/sinoe`                                           | Vinculación visual, bandeja, carpetas y documentos de notificaciones     |
| `modules/writings`                                        | Plantillas, borradores, editor y exportación PDF/DOCX                    |
| `modules/workspaces`                                      | Espacios, invitaciones, miembros y permisos locales                      |
| `modules/account`                                         | Perfil y preferencias                                                    |
| `modules/support`                                         | Preguntas frecuentes, búsqueda y paginación                              |
| `assets/css`                                              | Estilos compartidos y temas Elegante, Claro y Oscuro                     |
| `assets/vendor`                                           | Quill y DOMPurify con sus licencias                                      |

## Persistencia de la demostración

Los datos se guardan localmente en el navegador. Los espacios adicionales tienen almacenamiento separado y comienzan vacíos. Los ejemplos iniciales pertenecen al espacio personal.

El perfil representa una cuenta Google vinculada. CEJ, SINOE, Google, invitaciones remotas y R2 requieren integración en la futura aplicación. Los documentos de expedientes se representan mediante metadatos. SINOE incorpora PDFs de demostración en `assets/documents/sinoe-demo` y almacenamiento local de archivos.

## Compatibilidad de datos

`modules/clients/billing-data.js` conserva la lectura, edición y eliminación de pagos guardados con el formato anterior. También contiene las utilidades de importes y fechas que utiliza el prototipo. Los pagos nuevos se registran mediante `received-payments.js`. El formato anterior se conserva para recuperar los datos ya guardados.

Algunas rutas anteriores redirigen a las actuales para que los enlaces existentes sigan abriendo su destino. Los nombres internos `case` y `caso` representan expedientes en la interfaz.

## Comprobación

Ejecuta `node tests/workspaces.test.cjs`. Requiere `jsdom` instalado fuera de esta carpeta. Puedes indicar la ruta con la variable `CEJPRO_JSDOM`. La suite comprueba navegación, formularios, aislamiento de espacios, permisos locales, persistencia y conservación de datos anteriores.

El desarrollo real está previsto con React, TypeScript, Tailwind, Laravel, MySQL en Docker y Cloudflare R2. Esta carpeta se entrega como referencia visual y funcional.

## Actualización visual del 9 de noviembre de 2026

Se tomó como referencia la interfaz de `SoftwareCejPro/web/frontend`, conservando esta maqueta en HTML, CSS y JavaScript.

- Login con el diseño del software y Google simulado. Cerrar sesión vuelve a esta pantalla.
- Inicio muestra «Buenos días, Deyvis».
- Los expedientes se abren en Documentos. Sus archivos se muestran en tabla con selección, movimiento, copia y eliminación. Partes e involucrados aparecen junto a Organización en el Resumen.
- SINOE incorpora actualización simulada, estado de revisión, copia entre carpetas y ventana de anexos con PDF individuales y un consolidado de muestra. Abrir anexos conserva el estado de lectura.
- Las invitaciones pendientes incluyen Reenviar como interacción local.

Google, la actualización SINOE y el envío de invitaciones son simulaciones locales. Los archivos de expedientes conservan sus referencias en el navegador y permiten descargar el contenido seleccionado durante la visita actual. Los PDF de muestra de SINOE se incluyen en `assets/documents/sinoe-demo`.

Abrir `index.html#login` permite revisar el acceso directamente. Los enlaces directos a módulos siguen disponibles para presentar el diseño.

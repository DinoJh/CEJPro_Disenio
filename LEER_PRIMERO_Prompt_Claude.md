> Actualización del 9 de noviembre de 2026. La maqueta refleja los pequeños cambios visuales del software implementado. Incluye login en `#login`, Google simulado, saludo fijo «Buenos días, Deyvis», tabla de documentos y anexos SINOE en ventana. Consulta el README para las limitaciones locales.

Actúa como analista funcional y desarrollador que recibe un diseño aprobado antes de comenzar su implementación.

Te comparto la carpeta **CejPRO_Diseño**, un prototipo navegable de CEJ PRO hecho en HTML, CSS y JavaScript.Osea es un diseño por ahora no es un sistema real solo diseño. Primero necesito que entiendas a fondo sus pantallas, módulos, relaciones, formularios y decisiones de diseño. **En esta primera etapa no implementes, no migres tecnologías, no instales dependencias y no modifiques los archivos.** Solo quiero que entiendas el diseño que tenemos.

## 1. Contexto del producto y alcance de esta revisión

CEJ PRO es un espacio de trabajo que tiene como usuarios principales a abogados y estudios jurídicos. Busca reunir la organización de expedientes, documentos, notificaciones judiciales, calendario, clientes, pagos recibidos y preparación de escritos.

El producto contempla trabajar con SINOE (Sistema de Notificaciones Electrónicas) y poder organizar los archivos que tiene en cej (el sistema no se enlazara con cej solo es para organizar sus archivos), ambos del Poder Judicial del Perú. Son servicios externos: CEJ PRO no es el Poder Judicial ni debe presentarse como su sistema oficial.

El diseño ya pasó por varias revisiones. Debes respetar sus decisiones y estudiar primero lo que existe, sin proponer un rediseño general ni incorporar módulos nuevos.

Para una etapa posterior se acordó React + TypeScript + Tailwind en frontend, Laravel en backend, MySQL en Docker y Cloudflare R2 para archivos. Es únicamente contexto: **por ahora no diseñes la arquitectura ni implementes integraciones**. Tampoco investigues todavía la imagen o servicio local para simular R2; eso se decidirá cuando pasemos a infraestructura.

## 2. Cómo inspeccionar el material

- Comienza por `index.html` y revisa los scripts y estilos que realmente carga.
- Revisa `modules/navigation.js`, `assets/` y los módulos activos. Si tienes navegador disponible, recorre también los flujos visualmente con datos de prueba aislados.
- Lee el README para ubicar los módulos y contrasta los flujos con las pantallas del prototipo.
- La carpeta fue depurada para entregar el diseño final. `modules/clients/billing-data.js` conserva la compatibilidad necesaria para leer y corregir pagos guardados con el formato anterior.
- En particular, Equipo fue reemplazado por espacios de trabajo; los estados de expedientes y el registro de deudas/cobros pendientes fueron retirados del flujo vigente; las partes se integraron al Resumen.
- Usa esta explicación para interpretar la intención del diseño, y contrástala con la interfaz y el código. Si encuentras una contradicción, repórtala sin modificarla ni resolverla silenciosamente.
- No confundas datos ficticios o persistencia local con una conexión real a servicios externos.

## 3. Conceptos que debes distinguir

**Expediente:** registro con un número que identifica un procedimiento judicial. Dentro de CEJ PRO se organiza una ficha de trabajo asociada a ese número, sus documentos, notas, involucrados y eventos. El prototipo utiliza internamente nombres como case/caso; eso no implica que exista otro módulo separado de casos dentro de los expedientes.

**Notificación:** comunicación recibida en SINOE sobre una actuación. Tiene sus propios datos y puede contener uno o varios documentos. Varias notificaciones pueden corresponder al mismo expediente.

**Cliente:** persona o empresa atendida por el abogado. Puede tener varios expedientes, o ninguno. No es necesariamente lo mismo que todos los involucrados en un proceso.

**Parte o involucrado:** persona u organización que participa en un expediente, identificada por nombre y rol. Registrar un involucrado no debe confundirse con crear automáticamente un cliente.

**Identidad CEJ:** conjunto de datos de identificación utilizado para consultar CEJ. No es el perfil de acceso a CEJ PRO, ni la cuenta Google, ni la cuenta SINOE, ni necesariamente el cliente del expediente.

**Espacio de trabajo:** ámbito de colaboración con sus propios registros y miembros. No significa compartir una contraseña ni crear una nueva cuenta Google.

## 4. Estructura visual y navegación

La aplicación utiliza una barra lateral principal a la izquierda y un contenido centrado con ancho limitado. No debe extenderse innecesariamente a todo el ancho de una pantalla grande.

Navegación principal:

- Inicio.
- Calendario.
- Expedientes, desplegable con Mis expedientes e Identidades.
- Casilla SINOE.
- Clientes, desplegable con Clientes y Cobros.
- Redactar escritos.
- Soporte, como acceso inferior.

En la zona inferior izquierda se muestra el espacio actual y el menú de cuenta: Espacios de trabajo, Invitar a un amigo, separador, Mi perfil, Personalizar, Configuración y Cerrar sesión.

El header contiene la ruta de navegación y el acceso Descargar extensión. La ruta debe reflejar el contexto, incluyendo el nombre del expediente, cliente o borrador cuando corresponda. Evita confundir el título de una pantalla con un botón para volver.

Solo el subapartado seleccionado debe destacar: por ejemplo, al abrir Mis expedientes, el botón padre Expedientes no debe mostrar simultáneamente el mismo fondo activo.

Principios visuales ya definidos:

- Tipografía sans serif de interfaz web; títulos moderados y contenido legible sin obligar a hacer zoom.
- Tarjetas y superficies ordenadas, sin acumular tarjetas pequeñas flotantes.
- Tablas dentro de su propio contenedor, alineadas con las herramientas superiores; cabeceras grises y títulos de columnas a la izquierda.
- Filas compactas, sin grandes espacios verticales vacíos.
- Filtros ocultos inicialmente tras un botón Filtros; al abrirse, controles próximos con separación consistente y Limpiar filtros a la derecha.
- Formularios simples, predominantemente de una columna. Algunas parejas breves comparten fila, como teléfono/correo e importe/moneda.
- Adicionales permite ocultar información secundaria.
- Los campos obligatorios llevan asterisco; los demás no deben repetir “opcional”.
- Los estados vacíos usan un icono y un único mensaje corto, de tamaño discreto y sin negrita excesiva.
- No agregues explicaciones técnicas, avisos de prototipo o textos de relleno a las pantallas del producto.
- Mantén adaptación a móvil y los tres temas: Elegante, Claro y Oscuro. Elegante utiliza vino; Claro corresponde al tono malva aprobado. No recuperes temas descartados.

## 5. Inicio

Es un resumen para retomar el trabajo. Utiliza cuatro tarjetas:

1. **Tu agenda:** calendario pequeño, día seleccionado y compromisos. La fecha va dentro de esta tarjeta. Permite abrir el calendario y agregar eventos desde su contexto.
2. **Continuar con expedientes:** accesos a expedientes recientes con sus datos identificadores.
3. **Retomar escritos:** borradores para seguir editando.
4. **Notificaciones SINOE:** novedades y acceso a la bandeja, o a la vinculación si no hay casilla conectada.

Los colores diferencian tarjetas: agenda morado, expedientes amarillo, escritos azul y SINOE rojo. Las tarjetas de una misma fila deben estar alineadas y conservar un equilibrio de altura, evitando anchura y espacio vacío innecesarios. Inicio debe reflejar el espacio de trabajo activo.

## 6. Calendario

Organiza audiencias, plazos, reuniones y diligencias. Un plazo es un vencimiento que el abogado registra para atender una obligación; no supongas que el sistema calcula automáticamente plazos legales a partir de resoluciones.

Tiene vista mensual y vista de agenda, navegación entre meses, Hoy, filtros por tipo y tarjetas laterales para la agenda del día y próximos compromisos. Las flechas de navegación mantienen su posición al cambiar la longitud del nombre del mes.

Nuevo evento muestra título, tipo, fecha, hora y enlace. En Adicionales aparecen expediente, cliente, notas y las opciones que correspondan al contexto de edición. Expediente y cliente se eligen de los registros existentes; no son simples textos libres en ese formulario. Verifica cuáles campos son realmente obligatorios.

Permite crear, editar, completar y eliminar eventos. Un evento creado desde la agenda de un expediente pertenece a ese expediente y también se ve en el calendario general; no son dos eventos independientes.

El diseño actual no implementa sincronización con Google Calendar, avisos externos ni cálculo automático de vencimientos. No presentes esas posibilidades como ya existentes.

## 7. Expedientes: Mis expedientes

Es el archivo organizado del abogado. Combina un panel lateral de carpetas con búsqueda, filtros, tabla y paginación. Las carpetas del listado agrupan expedientes, por ejemplo por materia o criterio propio del usuario.

Permite crear carpetas y crear/editar expedientes. Los filtros incluyen cliente e identidad, además de los que encuentres activos. No vuelvas a introducir el estado del expediente: fue retirado.

**Nuevo expediente:** formulario de una columna. Número de expediente obligatorio; título no obligatorio. Incluye selección de identidad y carpeta. El cliente queda en Adicionales. En la creación no se agregan notas ni archivos; se incorporan después. No lleva el encabezado secundario “Mi archivo”.

La identidad puede quedar sin asignar, porque organizar un expediente manualmente no exige consultar CEJ. Nueva identidad permite crearla y regresar al expediente con esa identidad seleccionada, conservando lo ya escrito.

Al abrir un expediente aparece su ficha, con navegación interna izquierda:

- **Resumen:** información general e identidad asignada, organización, nota de trabajo y partes/involucrados. Partes no tiene un apartado propio en la navegación final. Agregar involucrado es una acción discreta; solicita nombre y rol, y permite escribir un rol personalizado al elegir Otro.
- **Documentos:** referencias a archivos del expediente y carpetas internas. Estas carpetas contienen documentos y no deben confundirse con las carpetas del listado, que contienen expedientes. Se pueden agregar archivos después de crear el expediente y organizarlos.
- **Notas:** apuntes de trabajo editables del expediente.
- **Agenda:** eventos relacionados con este expediente, conectados al calendario general.

Las notas de CEJ PRO son internas: no modifican el expediente oficial del Poder Judicial.

No consideres completado el traslado/copiado masivo entre carpetas o espacios solo porque aparece mencionado en documentación histórica: ese trabajo fue interrumpido. Verifica lo que realmente funciona.

## 8. Expedientes: Identidades

Gestor reutilizable de identidades para consultas CEJ. Presenta tabla con Alias, Documento, Expedientes vinculados y Acciones, búsqueda y filtros.

Permite crear, editar y eliminar, con estas reglas:

- Alias opcional.
- Tipo y número de documento.
- DNI: número de DNI, código de verificación de uno a tres dígitos, fecha de nacimiento y fecha de emisión.
- Carné de extranjería: número del carné, fecha de nacimiento y fecha de emisión; no se solicita además un DNI.
- Evitar duplicados por tipo y número de documento.
- Un expediente puede tener una identidad; una identidad puede utilizarse en varios expedientes.
- La ficha muestra la identidad asignada y permite cambiarla.
- Una identidad vinculada no se elimina hasta reasignar sus expedientes; el gestor permite identificar y abrir esos vínculos.

No debe guardar al cliente/parte como si fuera un campo de la identidad. Tampoco mostrar un último uso inventado: la cantidad de expedientes vinculados es una relación del prototipo, no evidencia de consultas al CEJ.

## 9. Casilla SINOE

Tiene dos estados principales:

**Sin vincular:** tarjeta centrada con usuario/número de casilla y contraseña. La contraseña se muestra u oculta con icono de ojo. El diseño representa la futura conexión; no significa que el prototipo autentique contra SINOE.

**Vinculada:** bandeja con carpetas, buscador, filtros, tabla de notificaciones y acceso a sus documentos. El botón superior es Desvincular casilla. Volver a vincular la misma cuenta debe conservar su organización, no reiniciarla.

La tabla toma como referencia las columnas de SINOE: número de notificación, número de expediente, sumilla, órgano jurisdiccional (O.J.) y fecha, además de los controles de selección, lectura y documentos que existan en la interfaz.

Las notificaciones del mismo expediente se agrupan automáticamente en una misma carpeta. El ejemplo 00705-2025-0-2101-JR-CI-02 muestra varias notificaciones del mismo expediente. No debe confundirse una notificación con una carpeta ni con el documento adjunto.

El usuario también puede crear carpetas, editar sus nombres, eliminarlas y organizar notificaciones manualmente según las acciones disponibles. Comprueba el comportamiento exacto al eliminar una carpeta con contenido: no presupongas que también borra notificaciones. El acceso Sin carpeta se retiró de la navegación y se añadió Buscar carpeta.

Los filtros incluyen estado de lectura, O.J., mes y año. Cada notificación puede contener varios documentos; revisa los ejemplos PDF incluidos y cómo se abren o descargan. Distingue las demostraciones de una descarga real desde el Poder Judicial.

aqui al parecer si tendremos que trabajar con sinoe para obtener las notificaciones que tiene la cuenta con la que vincule el usuario.

## 10. Clientes

Directorio de personas o empresas atendidas por el abogado. Tiene búsqueda, filtros, tabla, paginación y ficha individual con información y expedientes asociados.

Nuevo cliente solicita inicialmente solo nombre completo o razón social como obligatorio. Adicionales contiene documento, teléfono y correo en una fila, tipo de cliente y un desplegable separado para Vincular casos. El usuario debe abrir ese desplegable para ver los expedientes seleccionables.

Las notas se agregan al editar, no en el alta inicial. Editar cliente incluye Eliminar cliente con confirmación. En el prototipo, eliminarlo también elimina sus registros financieros, pero conserva los expedientes; revisa ese efecto y señálalo como una regla a ratificar antes de producción.

Para distinguir clientes con el mismo nombre se muestra su documento o, si no lo tienen, un código estable como Cliente 001. El código no cambia al crear otros clientes ni depende de la posición de la fila.

Un cliente puede existir sin expedientes y puede registrar pagos por servicios generales.

## 11. Cobros: flujo final de pagos recibidos

Aunque el módulo se llama Cobros, el flujo final se simplificó para **anotar dinero que el abogado ya recibió**. No es una pasarela de pago ni una emisión de comprobantes tributarios.

Flujo:

1. Elegir un cliente, identificado por nombre y documento/código.
2. Elegir en el panel lateral un expediente asociado o Sin expediente para servicios generales.
3. Ver el historial de pagos de ese contexto.
4. Usar Registrar pago, con botón verde.

Desde el panel se pueden agregar expedientes disponibles al cliente o crear uno según los accesos existentes. El vínculo a un expediente no es requisito para registrar un pago.

**Registrar pago:**

- Primera fila: Importe recibido obligatorio y Moneda en un control pequeño; Soles por defecto y opción Dólares.
- Debajo: Medio de pago, Efectivo por defecto; otras opciones incluyen Yape/Plin y transferencia.
- Después: tarjeta que agrupa Concepto y Motivo del pago. Concepto tiene opciones habituales como honorarios o asesoría, y Otro por defecto. Otro muestra el motivo libre, que **no es obligatorio**. Se puede guardar sin escribirlo.
- Adicionales contiene Fecha, precargada con hoy, y Notas no obligatorias.

El historial presenta fecha, concepto, medio e importe. Los pagos recibidos se muestran en verde. Desde la tabla se edita o elimina; registrar se hace con el botón fuera de la tabla. Hay buscador y filtros, como concepto y moneda, según los controles vigentes.

No debe reaparecer Registrar cobro, Por cobrar, saldo de deuda, movimientos de cobros pendientes o el requisito de crear una deuda antes de anotar un pago. El adaptador de compatibilidad de pagos anteriores permite conservar los registros existentes. Soles y dólares deben entenderse por separado; no sumar monedas sin conversión.

## 12. Redactar escritos

Permite crear documentos a partir de plantillas, editar su contenido, guardarlos como borradores y retomarlos. No contempla generación con IA.

La pantalla inicial tiene búsqueda, tabla de borradores y Nuevo borrador. No tiene filtros ni un botón Plantillas independiente. Nuevo borrador abre el selector de plantillas.

El selector muestra plantillas distintas, como Demanda, Contestación de demanda, Escrito general y Solicitud simple, junto con una vista previa del documento. No repite innecesariamente el nombre o tipo encima de la vista previa. El flujo aprobado parte de una plantilla; no se ofrece crear un documento en blanco.

El usuario puede guardar sus propias plantillas y reutilizarlas. Las plantillas son estructuras editables: no implican garantía de corrección jurídica para cualquier caso.

El editor muestra una hoja blanca sobre un fondo diferenciado, herramientas de formato y un panel derecho sencillo con título, Guardar como plantilla, Guardar borrador debajo de ese botón y Eliminar borrador visible. El contenido se edita directamente en la hoja: no hay Completar campos, estado, vinculación con expedientes ni Más opciones.

Exportar es un desplegable con PDF y Word. PDF pasa directamente al diálogo de impresión del navegador, sin una ventana intermedia propia de vista previa. Word descarga un DOCX. No confundas imprimir/guardar como PDF con enviar a una impresora automáticamente.

Los borradores nuevos evitan títulos repetidos mediante sufijos, por ejemplo Solicitud simple, Solicitud simple 2 y Solicitud simple 3. Se pueden reabrir, editar, guardar y eliminar.

## 13. Espacios de trabajo y colaboración

Reemplazaron al módulo Equipo. Se accede desde la cuenta inferior izquierda.

El selector muestra espacios con avatar/iniciales, nombre y marca del actual. Abajo aparecen Añadir espacio de trabajo y un icono general de configuración a su lado. No hay un engranaje por espacio dentro de este selector rápido.

Crear un espacio produce un ámbito vacío: no copia los expedientes, clientes, identidades, eventos, pagos, borradores, documentos o vinculación SINOE del espacio anterior. Las plantillas predeterminadas pueden seguir disponibles como herramientas comunes.

El gestor de espacios tiene pestañas Espacios primero y Miembros después. En este gestor sí hay configuración por espacio para editar su nombre o eliminarlo, sin volver a pedir que el usuario escoja el espacio que ya seleccionó. Cambiar de espacio desde este gestor mantiene al usuario en el gestor para poder consultar sus miembros.

El espacio personal se conserva y el prototipo impide eliminarlo. Eliminar otro espacio requiere confirmación explícita y afecta sus propios datos, no los de los demás.

Invitar a un amigo abre una ventana modal sobre la pantalla actual. Su título se separa con una línea del contexto “Invitar al espacio de trabajo: [nombre]”. Incluye correo, rol y acción Invitar, más la lista de miembros/invitaciones.

Roles:

- Propietario: administra el espacio y sus miembros.
- Editor: crea y modifica el contenido compartido; no administra miembros.
- Lector: consulta sin modificar el contenido.

Se puede cambiar Lector/Editor, cancelar una invitación pendiente o eliminar a un miembro. La acción Cancelar invitación se sitúa a la izquierda del selector de rol. No se puede eliminar ni degradar al propietario mediante estos controles.

La colaboración verdadera todavía no existe en este HTML: no se envían invitaciones, no hay aceptación remota ni sincronización entre personas. El aislamiento local y las vistas de permisos son una simulación. Que la pantalla parezca un producto terminado no convierte sus controles en seguridad de servidor.

## 14. Perfil, apariencia, configuración y soporte

**Mi perfil:** representa al usuario ya vinculado con Google. Muestra esa cuenta, nombre y apellidos separados y teléfono. No incluye colegiatura ni otro correo de contacto separado. El correo mostrado corresponde a la cuenta Google representada. La autenticación Google real todavía no está implementada.

**Personalizar:** permite elegir Elegante, Claro u Oscuro, manteniendo coherencia de componentes y legibilidad.

**Configuración:** preferencias sencillas, acceso a apariencia y gestión del espacio, y selección de pantalla inicial según lo que muestre el prototipo. No inventes configuraciones adicionales.

**Soporte:** contacto y preguntas frecuentes por módulo. Tiene buscador, selección por módulo y paginación, para evitar una lista interminable. Incluye preguntas sobre espacios, expedientes, identidades, calendario, clientes, cobros, SINOE y escritos. El contacto actual usa un número ficticio; no lo consideres un canal real de atención.

## 15. Relación entre módulos

- El espacio de trabajo contiene los registros compartidos de sus módulos.
- Un cliente puede relacionarse con varios expedientes y tener pagos sin expediente.
- Un expediente tiene como máximo una identidad seleccionada; la identidad puede reutilizarse en varios expedientes.
- Un expediente reúne documentos, carpetas internas, involucrados, notas y eventos.
- Los eventos vinculados al expediente se reflejan en el calendario general.
- Varias notificaciones SINOE pueden corresponder al mismo número de expediente y agruparse en una carpeta.
- Una notificación puede tener varios documentos.
- Los borradores y las plantillas personales pertenecen al espacio; no supongas que el editor final exige vincular un expediente.
- El perfil y la apariencia corresponden a la cuenta, no a una identidad de consulta CEJ.

No presentes el flujo como “CEJ envía expedientes a SINOE”. El diseño reúne consulta y notificación, pero no demuestra una integración técnica directa entre esos sistemas.

## 16. Qué es demostración y qué debe preservarse

El prototipo usa rutas con hash, almacenamiento del navegador y módulos JavaScript. No tiene backend, base de datos compartida, autenticación real, autorización de servidor, integración con Google/CEJ/SINOE ni almacenamiento R2.

Revisa especialmente los documentos: algunos adjuntos son referencias visuales/metadatos, mientras que hay PDFs de ejemplo u otros mecanismos locales. Describe cada caso como realmente está implementado; no supongas que todos los archivos se suben o recuperan de un servidor.

No uses credenciales ni identidades reales de extensiones o servicios para este análisis. No contactes personas ni envíes invitaciones. Si necesitas probar modificaciones de datos, utiliza una sesión de prueba aislada que no altere los registros de la demostración del usuario.

## 17. Entrega que espero de ti antes de programar

Cuando termines de revisar, si quieres puedes decirme:

1. Tu comprensión del producto y su objetivo.
2. Una tabla con tres columnas: funcionalidad observada, comportamiento local actual y dependencia externa todavía no implementada.
3. Las contradicciones o decisiones pendientes que realmente afecten la futura implementación. Separa lo que viste de lo que estás infiriendo.

No me entregues código todavía. No propongas una migración automática ni replantees el diseño. Primero confirma tu entendimiento y espera mis instrucciones para la etapa de implementación. ahora solo quiero que confirmes que ya entendiste el diseño

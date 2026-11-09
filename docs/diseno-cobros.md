# Cobros — Registro de pagos recibidos

## Flujo final

1. Seleccionar un cliente por nombre y documento, o por su código estable Cliente 001.
2. Elegir un expediente asociado o Sin expediente para servicios generales.
3. Consultar el historial o pulsar Registrar pago.

El formulario comienza con Importe recibido y Moneda en la misma fila. El importe es obligatorio y la moneda predeterminada es Soles. Medio de pago aparece debajo, con Efectivo seleccionado.

Una tarjeta agrupa Concepto y Motivo del pago. Concepto ofrece honorarios, consulta, asesoría, escritos, audiencia y Otro. Otro es la selección inicial y muestra un motivo libre. El motivo puede dejarse vacío y el pago se registra con el concepto Otro.

Adicionales contiene Fecha, precargada con el día actual, y Notas. Los pagos pueden registrarse para clientes sin expedientes asociados.

## Historial

La tabla muestra fecha, concepto, medio e importe. Los ingresos aparecen en verde. Las acciones de fila permiten editar o eliminar con confirmación. El buscador y los filtros por concepto y moneda ayudan a consultar el historial.

Los totales de soles y dólares se muestran por separado. Los registros se aíslan por espacio de trabajo y el rol Lector permite consultarlos.

## Archivos

- `collections.js` implementa las pantallas y formularios.
- `received-payments.js` guarda los pagos nuevos.
- `billing-data.js` permite recuperar y corregir pagos guardados en el formato anterior, además de proporcionar utilidades de importes y fechas.
- `collections.css` define el diseño de la bandeja de pagos.
- `payment-table.css` conserva los estilos compartidos de las pestañas del cliente y la tabla.

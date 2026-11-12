# CEJ PRO — Diseño de interfaces

Prototipo navegable actualizado a partir de la interfaz de SoftwareCejPro del 12 de noviembre de 2026.

## Abrir el diseño

Abre `index.html` directamente en Chrome o Edge. Todos los archivos necesarios están incluidos en el repositorio. También puede publicarse como sitio estático en GitHub Pages.

## Organización

- `index.html` es el punto de entrada.
- `assets/css/estilos.css` contiene los estilos y temas.
- `assets/js/app.js` contiene el JavaScript empaquetado del prototipo.
- `assets/images/` contiene el logo.
- `assets/documents/` contiene un PDF ficticio de demostración.

## Alcance

El acceso con Google es simulado y abre Inicio con «Buenos días, Deyvis». Los módulos incluyen calendario, expedientes, identidades, clientes, pagos, SINOE, escritos, espacios de trabajo, perfil, configuración, soporte e historial.

Los registros son ficticios. Los cambios de la demostración se guardan en el navegador mediante localStorage. SINOE, invitaciones y anexos son simulaciones locales. Para reiniciar los ejemplos, elimina la clave `cejpro.design.snapshot.20261112` del almacenamiento del navegador. Los datos del prototipo anterior utilizan claves distintas y se conservan.

El JavaScript está empaquetado desde la interfaz React actual para distribuirlo como archivos estáticos. Esta entrega se ejecuta abriendo el HTML y no requiere instalar dependencias ni iniciar un servidor.

## Versiones

Esta sigue siendo la carpeta fija de trabajo. Los respaldos están fuera del repositorio, en `../respaldos-cejpro/`. Los commits y la publicación en GitHub los gestiona el usuario.

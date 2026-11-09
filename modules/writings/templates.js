/* Estructuras visuales editables; los argumentos y referencias se completan por caso. */
window.CejProWritingTemplates = (() => {
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const field = (text) =>
    `<span style="background-color: #f9e1e7">[${esc(text)}]</span>`;
  function header(c, subject) {
    return `<p class="ql-indent-4"><strong>EXPEDIENTE N.º:</strong> ${c?.number ? esc(c.number) : field("N.º de expediente")}</p><p class="ql-indent-4"><strong>ESPECIALISTA LEGAL:</strong> ${field("Nombre")}</p><p class="ql-indent-4"><strong>CUADERNO:</strong> ${field("Principal / otro")}</p><p class="ql-indent-4"><strong>ESCRITO N.º:</strong> ${field("Número")}</p><p class="ql-indent-4"><strong>SUMILLA:</strong> ${field(subject)}</p><p><br></p><p><strong>SEÑOR/A JUEZ/A DEL ${field("Juzgado u órgano jurisdiccional")}:</strong></p><p><br></p><p class="ql-align-justify">${c?.client ? esc(c.client) : field("Nombre completo o razón social")}, identificado/a con ${field("Documento de identidad")}, con domicilio real en ${field("Domicilio real")} y domicilio procesal en ${field("Domicilio procesal")}, casilla electrónica SINOE N.º ${field("Casilla SINOE")}; ante usted me presento y expongo:</p>`;
  }
  const section = (heading, placeholder) =>
    `<h2>${heading}</h2><p class="ql-align-justify">${field(placeholder)}</p>`;
  const footer = () =>
    `<h2>POR TANTO:</h2><p class="ql-align-justify">${field("Complete la petición final del escrito")}</p><p><br></p><p class="ql-align-right">${field("Ciudad")}, ${field("Fecha")}.</p><p><br></p><p>${field("Firma de la parte o representante")}</p><p>${field("Firma del abogado")}</p><p>${field("Nombre y registro profesional")}</p>`;
  return [
    {
      id: "claim",
      name: "Demanda",
      kind: "Demanda",
      description:
        "Encabezado judicial, petitorio, fundamentos, medios probatorios y anexos.",
      html: (c) =>
        header(c, "Pedido en pocas palabras") +
        section(
          "I. NOMBRE Y DOMICILIO DE LA PARTE DEMANDADA",
          "Identifique a la parte demandada y su domicilio",
        ) +
        section("II. PETITORIO", "Describa las pretensiones de la demanda") +
        section(
          "III. FUNDAMENTOS DE HECHO",
          "Exponga los hechos relevantes en orden",
        ) +
        section(
          "IV. FUNDAMENTOS DE DERECHO",
          "Complete el sustento jurídico aplicable y las referencias verificadas del caso",
        ) +
        section(
          "V. VÍA PROCEDIMENTAL",
          "Complete la vía que corresponda al caso",
        ) +
        section(
          "VI. MEDIOS PROBATORIOS",
          "Enumere los medios probatorios e indique su finalidad",
        ) +
        section(
          "VII. ANEXOS",
          "Relacione los anexos que acompañan el escrito",
        ) +
        section(
          "PRIMER OTROSÍ DIGO:",
          "Complete este apartado si corresponde",
        ) +
        section(
          "SEGUNDO OTROSÍ DIGO:",
          "Complete este apartado si corresponde",
        ) +
        footer(),
    },
    {
      id: "answer",
      name: "Contestación de demanda",
      kind: "Contestación",
      description:
        "Modelo breve como la captura: petitorio, hechos numerados, pruebas y firma.",
      html: (c) =>
        `<p class="ql-indent-3"><strong>Expediente N.º</strong> ${c?.number ? esc(c.number) : field("N.º de expediente")}</p><p class="ql-indent-3"><strong>Escrito N.º</strong> ${field("Número")}</p><p class="ql-indent-3"><strong>Sumilla:</strong> CONTESTACIÓN DE DEMANDA</p><p><br></p><p><strong>SEÑOR/A JUEZ/A DEL ${field("Juzgado")}:</strong></p><p class="ql-align-justify">${c?.client ? esc(c.client) : field("Nombre de la parte")}, en el proceso sobre ${field("Materia")} que sigue ${field("Parte demandante")}, a usted expongo:</p><h2>I. PETITORIO</h2><p class="ql-align-justify">Contesto la demanda y solicito ${field("Petición concreta de la contestación")}.</p><h2>II. FUNDAMENTOS DE HECHO</h2><ol><li>${field("Primer hecho que sustenta la contestación")}</li><li>${field("Segundo hecho que sustenta la contestación")}</li><li>${field("Información adicional pertinente")}</li></ol><h2>III. MEDIOS PROBATORIOS</h2><ol><li>${field("Primer documento o medio probatorio")}</li><li>${field("Segundo documento o medio probatorio")}</li></ol><p><br></p><p>${field("Ciudad")}, ${field("Fecha")}.</p><p><br></p><p>${field("Firma del abogado")}</p>`,
    },
    {
      id: "general",
      name: "Escrito general",
      kind: "Escrito",
      description:
        "Formato abierto: sumilla, exposición libre y petición final.",
      html: (c) =>
        `<p class="ql-align-right"><strong>Expediente:</strong> ${c?.number ? esc(c.number) : field("N.º de expediente")}</p><p class="ql-align-right"><strong>Sumilla:</strong> ${field("Asunto")}</p><p><br></p><h2>A ${field("Órgano destinatario")}:</h2><p>${c?.client ? esc(c.client) : field("Nombre de la parte o representante")}, en el proceso sobre ${field("Materia")}, expongo:</p><p><br></p><p class="ql-align-justify">${field("Desarrolle aquí el contenido del escrito")}</p><p><br></p><p class="ql-align-justify">${field("Agregue los argumentos o información necesarios")}</p><h2>POR LO EXPUESTO:</h2><p>${field("Indique la petición final")}</p><p class="ql-align-right">${field("Ciudad y fecha")}</p><p>${field("Firma y datos del profesional")}</p>`,
    },
    {
      id: "request",
      name: "Solicitud simple",
      kind: "Solicitud",
      description:
        "Una carta breve con destinatario, asunto, pedido y firma; sin capítulos extensos.",
      html: (c) =>
        `<p class="ql-align-right">${field("Ciudad")}, ${field("Fecha")}</p><p><br></p><p><strong>Señor/a ${field("Nombre o cargo del destinatario")}</strong></p><p>${field("Entidad u órgano")}</p><p><br></p><p><strong>ASUNTO:</strong> ${field("Objeto de la solicitud")}</p>${c?.number ? `<p><strong>Referencia:</strong> ${esc(c.number)}</p>` : ""}<p><br></p><p>De mi consideración:</p><p class="ql-align-justify">Yo, ${c?.client ? esc(c.client) : field("Nombre completo")}, identificado/a con ${field("Documento de identidad")}, solicito ${field("Describa el pedido")}.</p><p class="ql-align-justify">El motivo de esta solicitud es ${field("Explique el motivo y la información de apoyo")}.</p><p>${field("Indique documentación adjunta, si corresponde")}</p><p><br></p><p>Atentamente,</p><p><br></p><p>${field("Firma")}</p><p>${field("Nombre y contacto")}</p>`,
    },
    {
      id: "documents",
      name: "Presentación de documentos",
      kind: "Escrito",
      description:
        "Carátula y relación numerada de anexos, con descripción y cantidad de folios.",
      html: (c) =>
        `<h1 class="ql-align-center">PRESENTACIÓN DE DOCUMENTOS</h1><p><br></p><p><strong>Expediente:</strong> ${c?.number ? esc(c.number) : field("N.º de expediente")}</p><p><strong>Presentado por:</strong> ${c?.client ? esc(c.client) : field("Nombre completo o razón social")}</p><p><strong>Dirigido a:</strong> ${field("Órgano destinatario")}</p><p><strong>Fecha:</strong> ${field("Fecha de presentación")}</p><h2>DOCUMENTOS QUE SE ACOMPAÑAN</h2><ol><li><strong>Anexo 1.</strong> ${field("Nombre del documento 1")} — ${field("Descripción y folios del documento 1")}</li><li><strong>Anexo 2.</strong> ${field("Nombre del documento 2")} — ${field("Descripción y folios del documento 2")}</li><li><strong>Anexo 3.</strong> ${field("Nombre del documento 3")} — ${field("Descripción y folios del documento 3")}</li></ol><h2>FINALIDAD DE LA PRESENTACIÓN</h2><p class="ql-align-justify">${field("Indique la finalidad y petición relacionada con estos documentos")}</p><p><br></p><p>${field("Firma y datos del profesional")}</p>`,
    },
  ];
})();

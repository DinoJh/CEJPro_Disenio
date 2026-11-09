/* Exportación DOCX local: paquete OOXML sin servicios externos. */
(() => {
  const xml = (s) =>
    String(s)
      .replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&apos;",
          })[c],
      )
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
  function zip(files) {
    const bytes = (s) =>
        Uint8Array.from(unescape(encodeURIComponent(s)), (c) =>
          c.charCodeAt(0),
        ),
      parts = [],
      entries = [];
    let offset = 0;
    const header = (n) => new Uint8Array(n),
      put = (a, i, v, n = 4) => {
        for (let k = 0; k < n; k++) a[i + k] = (v >>> (k * 8)) & 255;
      };
    for (const [name, text] of Object.entries(files)) {
      const data = bytes(text),
        filename = bytes(name);
      let crc = 0xffffffff;
      for (const b of data) {
        crc ^= b;
        for (let k = 0; k < 8; k++)
          crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
      crc = (crc ^ 0xffffffff) >>> 0;
      const h = header(30);
      put(h, 0, 0x04034b50);
      put(h, 4, 20, 2);
      put(h, 14, crc);
      put(h, 18, data.length);
      put(h, 22, data.length);
      put(h, 26, filename.length, 2);
      parts.push(h, filename, data);
      const c = header(46);
      put(c, 0, 0x02014b50);
      put(c, 4, 20, 2);
      put(c, 6, 20, 2);
      put(c, 16, crc);
      put(c, 20, data.length);
      put(c, 24, data.length);
      put(c, 28, filename.length, 2);
      put(c, 42, offset);
      entries.push(c, filename);
      offset += h.length + filename.length + data.length;
    }
    const end = header(22),
      length = entries.reduce((n, p) => n + p.length, 0);
    put(end, 0, 0x06054b50);
    put(end, 8, Object.keys(files).length, 2);
    put(end, 10, Object.keys(files).length, 2);
    put(end, 12, length);
    put(end, 16, offset);
    return new Blob([...parts, ...entries, end], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  }
  function build(html) {
    const box = document.createElement("div");
    box.innerHTML = html;
    const blocks = [...box.querySelectorAll("p,h1,h2,h3,li,blockquote")].filter(
      (e) => !e.querySelector("p,h1,h2,h3,li,blockquote"),
    );
    if (!blocks.length) blocks.push(box);
    const run = (node, marks = {}) => {
      if (node.nodeType === 3)
        return (
          '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/>' +
          Object.entries(marks)
            .filter(([, v]) => v)
            .map(([k]) => "<w:" + k + "/>")
            .join("") +
          '</w:rPr><w:t xml:space="preserve">' +
          xml(node.textContent) +
          "</w:t></w:r>"
        );
      if (node.nodeType !== 1) return "";
      if (node.tagName === "BR") return "<w:r><w:br/></w:r>";
      const m = { ...marks };
      if (/^(B|STRONG|H[123])$/.test(node.tagName)) m.b = true;
      if (/^(I|EM)$/.test(node.tagName)) m.i = true;
      if (node.tagName === "S") m.strike = true;
      let result = [...node.childNodes].map((n) => run(n, m)).join("");
      if (node.tagName === "U")
        result = result.replace(/<\/w:rPr>/g, '<w:u w:val="single"/></w:rPr>');
      return result;
    };
    const paragraphs = blocks
      .map((el) => {
        const align =
            el.style.textAlign ||
            [...el.classList].find((c) => c.startsWith("ql-align-"))?.slice(9),
          indent = Number(el.className.match(/ql-indent-([1-8])/)?.[1] || 0),
          li = el.tagName === "LI",
          number = li
            ? '<w:numPr><w:ilvl w:val="' +
              indent +
              '"/><w:numId w:val="' +
              (el.parentElement.tagName === "UL" ? "2" : "1") +
              '"/></w:numPr>'
            : "";
        return (
          '<w:p><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/>' +
          (["left", "right", "center", "justify"].includes(align)
            ? '<w:jc w:val="' + (align === "justify" ? "both" : align) + '"/>'
            : "") +
          number +
          (!li && indent ? '<w:ind w:left="' + indent * 720 + '"/>' : "") +
          "</w:pPr>" +
          run(el) +
          "</w:p>"
        );
      })
      .join("");
    const prefix = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const numbering = [
      ["0", "decimal", "%" + 1 + "."],
      ["1", "bullet", "•"],
    ]
      .map(
        ([id, fmt, text]) =>
          '<w:abstractNum w:abstractNumId="' +
          id +
          '">' +
          Array.from(
            { length: 9 },
            (_, i) =>
              '<w:lvl w:ilvl="' +
              i +
              '"><w:start w:val="1"/><w:numFmt w:val="' +
              fmt +
              '"/><w:lvlText w:val="' +
              (fmt === "decimal" ? "%" + (i + 1) + "." : text) +
              '"/><w:pPr><w:ind w:left="' +
              (i + 1) * 720 +
              '" w:hanging="360"/></w:pPr></w:lvl>',
          ).join("") +
          "</w:abstractNum>",
      )
      .join("");
    return zip({
      "[Content_Types].xml":
        prefix +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>',
      "_rels/.rels":
        prefix +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      "word/document.xml":
        prefix +
        '<w:document xmlns:w="' +
        ns +
        '"><w:body>' +
        paragraphs +
        '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>',
      "word/_rels/document.xml.rels":
        prefix +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>',
      "word/numbering.xml":
        prefix +
        '<w:numbering xmlns:w="' +
        ns +
        '">' +
        numbering +
        '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>',
    });
  }
  window.CejProWritingExport = {
    build,
    download(html, title) {
      const url = URL.createObjectURL(build(html)),
        a = document.createElement("a");
      a.href = url;
      a.download =
        (title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").slice(0, 120) ||
          "Escrito") + ".docx";
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    },
  };
})();

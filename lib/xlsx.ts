// ============================================================================
// Generador mínimo de archivos .xlsx (Excel) con TABLAS reales de Excel
// (encabezado con filtros, filas alternadas, "Dar formato como tabla").
// Solo depende de JSZip: un .xlsx es un zip con XML adentro.
// Corre en el navegador (no usa APIs de Node).
// ============================================================================

export type ColType = "text" | "int" | "pct" | "date";

export type SheetSpec = {
  /** Nombre de la hoja (máx. 31 caracteres). También se usa para nombrar la tabla. */
  name: string;
  columns: { header: string; width?: number; type?: ColType }[];
  /**
   * Una fila por arreglo. Tipos: text → string; int → número; pct → número 0–100 (se guarda como %);
   * date → "YYYY-MM-DD". `null`/vacío deja la celda en blanco.
   */
  rows: (string | number | null | undefined)[][];
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
   // caracteres de control que XML 1.0 no admite
   .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

/** Letra(s) de columna de Excel: 0 → A, 25 → Z, 26 → AA */
export function colLetter(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Días desde 1899-12-30 (sistema de fechas de Excel) para un "YYYY-MM-DD". */
function excelDate(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000);
}

// Índices de estilo (cellXfs) definidos en styles.xml
const STYLE: Record<ColType, number> = { text: 0, int: 0, pct: 1, date: 2 };

const safeSheetName = (n: string) => n.replace(/[\\/?*\[\]:]/g, " ").slice(0, 31) || "Hoja";
const tableName = (n: string, i: number) => "tbl" + (n.normalize("NFD").replace(/[^A-Za-z0-9]/g, "") || "Datos") + (i + 1);

export async function buildXlsx(sheets: SheetSpec[]): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  // Cadenas compartidas (todas las celdas de texto, incluidos los encabezados)
  const strings: string[] = [];
  const strIndex = new Map<string, number>();
  const sst = (s: string) => {
    let i = strIndex.get(s);
    if (i === undefined) { i = strings.length; strings.push(s); strIndex.set(s, i); }
    return i;
  };
  let sstRefs = 0;

  const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  const NS_R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

  const names = new Set<string>();
  const sheetFiles = sheets.map((sh, idx) => {
    let name = safeSheetName(sh.name);
    while (names.has(name.toLowerCase())) name = name.slice(0, 28) + "_" + (idx + 1);
    names.add(name.toLowerCase());
    return { sh, name, n: idx + 1 };
  });

  for (const { sh, n } of sheetFiles) {
    const nCols = sh.columns.length;
    const lastRow = sh.rows.length + 1;
    const ref = `A1:${colLetter(nCols - 1)}${lastRow}`;
    const tName = tableName(sh.name, n - 1);

    // Nombres de columna únicos (Excel exige que no se repitan)
    const seen = new Set<string>();
    const headers = sh.columns.map((c, i) => {
      let h = c.header || `Columna ${i + 1}`;
      while (seen.has(h.toLowerCase())) h += " ";
      seen.add(h.toLowerCase());
      return h;
    });

    let rowsXml = "<row r=\"1\">" + headers.map((h, c) => { sstRefs++; return `<c r="${colLetter(c)}1" t="s"><v>${sst(h)}</v></c>`; }).join("") + "</row>";
    sh.rows.forEach((row, r) => {
      const rn = r + 2;
      let cells = "";
      sh.columns.forEach((col, c) => {
        const v = row[c];
        const type = col.type ?? "text";
        const addr = `${colLetter(c)}${rn}`;
        if (v === null || v === undefined || v === "") return;
        if (type === "text") {
          sstRefs++;
          cells += `<c r="${addr}" t="s"><v>${sst(String(v))}</v></c>`;
        } else if (type === "date") {
          const d = excelDate(String(v));
          if (d !== null) cells += `<c r="${addr}" s="${STYLE.date}"><v>${d}</v></c>`;
        } else {
          const num = Number(v);
          if (!Number.isFinite(num)) return;
          // pct: se guarda como fracción (82 → 0,82) y la celda muestra "82,0 %"
          const val = type === "pct" ? num / 100 : num;
          cells += `<c r="${addr}" s="${STYLE[type]}"><v>${val}</v></c>`;
        }
      });
      rowsXml += `<row r="${rn}">${cells}</row>`;
    });

    const cols = sh.columns.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width ?? 16}" customWidth="1"/>`).join("");

    zip.file(
      `xl/worksheets/sheet${n}.xml`,
      HEAD +
        `<worksheet ${NS} ${NS_R}>` +
        `<sheetViews><sheetView workbookViewId="0"${n === 1 ? ' tabSelected="1"' : ""}><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
        `<sheetFormatPr defaultRowHeight="15"/>` +
        `<cols>${cols}</cols>` +
        `<sheetData>${rowsXml}</sheetData>` +
        `<tableParts count="1"><tablePart r:id="rId1"/></tableParts>` +
        `</worksheet>`
    );
    zip.file(
      `xl/worksheets/_rels/sheet${n}.xml.rels`,
      HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table${n}.xml"/></Relationships>`
    );
    zip.file(
      `xl/tables/table${n}.xml`,
      HEAD +
        `<table ${NS} id="${n}" name="${esc(tName)}" displayName="${esc(tName)}" ref="${ref}" totalsRowShown="0">` +
        `<autoFilter ref="${ref}"/>` +
        `<tableColumns count="${nCols}">${headers.map((h, i) => `<tableColumn id="${i + 1}" name="${esc(h)}"/>`).join("")}</tableColumns>` +
        `<tableStyleInfo name="TableStyleMedium1" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>` +
        `</table>`
    );
  }

  zip.file(
    "xl/sharedStrings.xml",
    HEAD + `<sst ${NS} count="${sstRefs}" uniqueCount="${strings.length}">${strings.map((s) => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join("")}</sst>`
  );

  zip.file(
    "xl/styles.xml",
    HEAD +
      `<styleSheet ${NS}>` +
      `<numFmts count="2"><numFmt numFmtId="164" formatCode="0.0%"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>` +
      `<fonts count="1"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>` +
      `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
      `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="3">` +
      `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
      `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
      `<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
      `</cellXfs>` +
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
      `</styleSheet>`
  );

  zip.file(
    "xl/workbook.xml",
    HEAD +
      `<workbook ${NS} ${NS_R}><bookViews><workbookView/></bookViews><sheets>` +
      sheetFiles.map((s) => `<sheet name="${esc(s.name)}" sheetId="${s.n}" r:id="rId${s.n}"/>`).join("") +
      `</sheets></workbook>`
  );
  const k = sheetFiles.length;
  zip.file(
    "xl/_rels/workbook.xml.rels",
    HEAD +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      sheetFiles.map((s) => `<Relationship Id="rId${s.n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${s.n}.xml"/>`).join("") +
      `<Relationship Id="rId${k + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      `<Relationship Id="rId${k + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>` +
      `</Relationships>`
  );
  zip.file(
    "_rels/.rels",
    HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  );
  zip.file(
    "[Content_Types].xml",
    HEAD +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      sheetFiles.map((s) => `<Override PartName="/xl/worksheets/sheet${s.n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
      sheetFiles.map((s) => `<Override PartName="/xl/tables/table${s.n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>`).join("") +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>` +
      `</Types>`
  );

  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", compression: "DEFLATE" });
}

export type CsvRow = Record<string, string>;

function splitCsv(content: string, sourceName: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let fieldStarted = false;

  const finishField = () => {
    row.push(field.trim());
    field = '';
    fieldStarted = false;
  };
  const finishRow = () => {
    finishField();
    if (row.some((value) => value !== '')) rows.push(row);
    row = [];
  };

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]!;

    if (inQuotes) {
      if (character === '"' && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (fieldStarted || field.length > 0) {
        throw new Error(`${sourceName}: кавычка внутри незаключённого в кавычки поля`);
      }
      inQuotes = true;
      fieldStarted = true;
    } else if (character === ',') {
      finishField();
    } else if (character === '\n') {
      finishRow();
    } else if (character === '\r') {
      if (content[index + 1] === '\n') index += 1;
      finishRow();
    } else {
      field += character;
      if (!/\s/.test(character)) fieldStarted = true;
    }
  }

  if (inQuotes) throw new Error(`${sourceName}: незакрытая кавычка в CSV`);
  if (field.length > 0 || row.length > 0 || fieldStarted) finishRow();
  if (rows.length === 0) throw new Error(`${sourceName}: файл пуст`);

  return rows;
}

export function parseCsv(content: string, sourceName: string, requiredColumns: string[]): CsvRow[] {
  const rows = splitCsv(content.replace(/^\uFEFF/, ''), sourceName);
  const headers = rows[0]!.map((header) => header.trim());

  if (new Set(headers).size !== headers.length) {
    throw new Error(`${sourceName}: заголовки колонок повторяются`);
  }

  const missing = requiredColumns.filter((column) => !headers.includes(column));
  if (missing.length > 0) {
    throw new Error(`${sourceName}: отсутствуют колонки: ${missing.join(', ')}`);
  }

  return rows.slice(1).map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`${sourceName}: строка ${index + 2} содержит неверное число колонок`);
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column]!]));
  });
}

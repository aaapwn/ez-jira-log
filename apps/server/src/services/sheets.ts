const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

export function columnLetterToIndex(col: string): number {
  let index = 0;
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - "A".charCodeAt(0) + 1);
  }
  return index - 1;
}

export function indexToColumnLetter(index: number): string {
  let result = "";
  let n = index + 1;
  while (n > 0) {
    n--;
    result = String.fromCharCode((n % 26) + "A".charCodeAt(0)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

export function getColumnForDay(startColumn: string, dayOfMonth: number): string {
  const startIndex = columnLetterToIndex(startColumn);
  const targetIndex = startIndex + (dayOfMonth - 1) * 2;
  return indexToColumnLetter(targetIndex);
}

export async function tickCheckbox(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  column: string,
  row: number,
): Promise<void> {
  const range = `${sheetName}!${column}${row}`;
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      range,
      majorDimension: "ROWS",
      values: [[true]],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Sheets API error: ${res.status} - ${body}`);
  }
}


import ExcelJS from 'exceljs';
import * as path from 'path';

async function countMatches() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, '../../analyse-comparative-finale.xlsx'));
    const worksheet = workbook.getWorksheet(1);

    let swishMatches = 0;
    let totalRows = 0;

    worksheet?.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            totalRows++;
            // Check if Swish URL is present (Column 10)
            if (row.getCell(10).text && row.getCell(10).text.length > 5) {
                swishMatches++;
            }
        }
    });

    console.log(`Total Rows: ${totalRows}`);
    console.log(`Swish Matches: ${swishMatches}`);
}

countMatches();

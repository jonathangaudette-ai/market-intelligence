
import ExcelJS from 'exceljs';
import * as path from 'path';

async function readReport() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, '../../analyse-comparative-a1.xlsx'));
    const worksheet = workbook.getWorksheet(1);

    console.log('Row | Dissan Name | A1 Name | Price | Score | Type | Reason');
    console.log('--- | --- | --- | --- | --- | --- | ---');

    let count = 0;
    worksheet?.eachRow((row, rowNumber) => {
        if (rowNumber > 1 && count < 10) {
            console.log(`${rowNumber} | ${row.getCell(1).text.substring(0, 20)}... | ${row.getCell(4).text.substring(0, 20)}... | ${row.getCell(5).text} | ${row.getCell(7).text} | ${row.getCell(8).text} | ${row.getCell(9).text}`);
            count++;
        }
    });
}

readReport();

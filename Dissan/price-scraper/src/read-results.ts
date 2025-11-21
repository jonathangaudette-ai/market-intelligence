
import ExcelJS from 'exceljs';
import * as path from 'path';

async function readExcel() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, '../../comparatif-prix.xlsx'));
    const worksheet = workbook.getWorksheet(1);

    console.log('Row | Source | SKU | Competitor | Match | Price | Score | URL');
    console.log('--- | --- | --- | --- | --- | --- | --- | ---');

    worksheet?.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            console.log(`${rowNumber} | ${row.getCell(1).text} | ${row.getCell(2).text} | ${row.getCell(3).text} | ${row.getCell(4).text} | ${row.getCell(5).text} | ${row.getCell(6).text} | ${row.getCell(7).text}`);
        }
    });
}

readExcel();

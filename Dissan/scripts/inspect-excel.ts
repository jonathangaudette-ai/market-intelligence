import ExcelJS from 'exceljs';
import path from 'path';

async function inspectExcel() {
  const inputFile = '/Users/jonathangaudette/market-intelligence/Dissan/produits-sanidepot.xlsx';

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputFile);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error('No worksheet found');
  }

  console.log('First 5 rows:\n');

  for (let rowNumber = 1; rowNumber <= Math.min(5, worksheet.rowCount); rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    console.log(`Row ${rowNumber}:`);

    row.eachCell((cell, colNumber) => {
      const value = cell.value?.toString() || '';
      console.log(`  Col ${colNumber}: ${value.substring(0, 100)}`);
    });
    console.log('');
  }
}

inspectExcel().catch(console.error);

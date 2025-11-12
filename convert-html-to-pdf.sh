#!/bin/bash

# Script de conversion HTML vers PDF
cd dissan-synthetic-data

find . -name "*.html" -type f | while read file; do
  pdf_file="${file%.html}.pdf"
  echo "Converting: $file → $pdf_file"

  /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
    --headless \
    --disable-gpu \
    --print-to-pdf="$pdf_file" \
    --no-pdf-header-footer \
    "file://$(pwd)/$file" 2>/dev/null

  if [ -f "$pdf_file" ]; then
    echo "  ✓ Created: $pdf_file"
  else
    echo "  ✗ Failed"
  fi
done

echo ""
echo "Conversion terminée! Les PDFs sont maintenant disponibles."

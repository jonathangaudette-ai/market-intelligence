#!/usr/bin/env python3
"""
Script de conversion Markdown vers PDF pour données synthétiques Dissan
"""

import markdown
from weasyprint import HTML, CSS
import sys
import os

def markdown_to_pdf(md_file, pdf_file):
    """Convertit un fichier Markdown en PDF avec styling"""

    # Lire le Markdown
    with open(md_file, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # Convertir en HTML
    html_content = markdown.markdown(md_content, extensions=['tables', 'fenced_code'])

    # CSS pour styling professionnel
    css_style = """
        @page {
            size: letter;
            margin: 2cm;
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 9pt;
                color: #666;
            }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #333;
        }
        h1 {
            color: #0066cc;
            font-size: 24pt;
            margin-top: 20pt;
            margin-bottom: 12pt;
            border-bottom: 2px solid #0066cc;
            padding-bottom: 8pt;
        }
        h2 {
            color: #0066cc;
            font-size: 18pt;
            margin-top: 16pt;
            margin-bottom: 10pt;
            border-bottom: 1px solid #ccc;
            padding-bottom: 4pt;
        }
        h3 {
            color: #333;
            font-size: 14pt;
            margin-top: 12pt;
            margin-bottom: 8pt;
        }
        h4 {
            color: #666;
            font-size: 12pt;
            margin-top: 10pt;
            margin-bottom: 6pt;
        }
        p {
            margin: 8pt 0;
            text-align: justify;
        }
        ul, ol {
            margin: 8pt 0;
            padding-left: 20pt;
        }
        li {
            margin: 4pt 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 12pt 0;
            font-size: 10pt;
        }
        table th {
            background-color: #0066cc;
            color: white;
            padding: 8pt;
            text-align: left;
            font-weight: bold;
        }
        table td {
            padding: 6pt;
            border: 1px solid #ddd;
        }
        table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        code {
            background-color: #f4f4f4;
            padding: 2pt 4pt;
            font-family: 'Courier New', monospace;
            font-size: 10pt;
            border-radius: 3px;
        }
        pre {
            background-color: #f4f4f4;
            padding: 12pt;
            border-left: 4px solid #0066cc;
            overflow-x: auto;
            font-size: 9pt;
        }
        blockquote {
            border-left: 4px solid #0066cc;
            padding-left: 12pt;
            margin: 12pt 0;
            color: #666;
            font-style: italic;
        }
        hr {
            border: none;
            border-top: 2px solid #0066cc;
            margin: 20pt 0;
        }
        strong {
            color: #0066cc;
            font-weight: 600;
        }
        .page-break {
            page-break-after: always;
        }
    """

    # HTML complet avec styles
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Groupe Dissan - Document</title>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """

    # Générer le PDF
    HTML(string=full_html).write_pdf(pdf_file, stylesheets=[CSS(string=css_style)])

    print(f"✓ Converti: {md_file} → {pdf_file}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Fichier spécifique
        md_file = sys.argv[1]
        pdf_file = md_file.replace('.md', '.pdf')
        markdown_to_pdf(md_file, pdf_file)
    else:
        # Convertir tous les fichiers .md dans le répertoire courant
        for root, dirs, files in os.walk('.'):
            for file in files:
                if file.endswith('.md') and not file.startswith('.'):
                    md_path = os.path.join(root, file)
                    pdf_path = md_path.replace('.md', '.pdf')
                    try:
                        markdown_to_pdf(md_path, pdf_path)
                    except Exception as e:
                        print(f"✗ Erreur: {md_path} - {e}")

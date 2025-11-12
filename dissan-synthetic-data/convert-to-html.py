#!/usr/bin/env python3
"""
Convertit Markdown en HTML professionnel prêt pour impression PDF
"""

import markdown
import sys
import os

def markdown_to_html(md_file, html_file):
    """Convertit un fichier Markdown en HTML avec styling"""

    with open(md_file, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # Convertir en HTML
    html_body = markdown.markdown(md_content, extensions=['tables', 'fenced_code', 'nl2br'])

    # HTML complet avec styles d'impression optimisés
    full_html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Groupe Dissan - Document</title>
    <style>
        @page {{
            size: letter;
            margin: 2cm;
        }}

        @media print {{
            body {{ margin: 0; padding: 0; }}
            h1 {{ page-break-before: auto; }}
            h2, h3 {{ page-break-after: avoid; }}
            table {{ page-break-inside: avoid; }}
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #333;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 1in;
            background: white;
        }}

        h1 {{
            color: #0066cc;
            font-size: 24pt;
            font-weight: 700;
            margin-top: 24pt;
            margin-bottom: 12pt;
            border-bottom: 3px solid #0066cc;
            padding-bottom: 8pt;
        }}

        h2 {{
            color: #0066cc;
            font-size: 18pt;
            font-weight: 600;
            margin-top: 20pt;
            margin-bottom: 10pt;
            border-bottom: 2px solid #ddd;
            padding-bottom: 6pt;
        }}

        h3 {{
            color: #333;
            font-size: 14pt;
            font-weight: 600;
            margin-top: 16pt;
            margin-bottom: 8pt;
        }}

        h4 {{
            color: #666;
            font-size: 12pt;
            font-weight: 600;
            margin-top: 12pt;
            margin-bottom: 6pt;
        }}

        p {{
            margin: 8pt 0;
            text-align: justify;
        }}

        ul, ol {{
            margin: 10pt 0;
            padding-left: 24pt;
        }}

        li {{
            margin: 4pt 0;
        }}

        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 16pt 0;
            font-size: 10pt;
        }}

        table th {{
            background-color: #0066cc;
            color: white;
            padding: 8pt;
            text-align: left;
            font-weight: 600;
        }}

        table td {{
            padding: 8pt;
            border: 1px solid #ddd;
        }}

        table tr:nth-child(even) {{
            background-color: #f9f9f9;
        }}

        code {{
            background-color: #f5f5f5;
            padding: 2pt 4pt;
            font-family: 'Courier New', 'Consolas', monospace;
            font-size: 10pt;
            border-radius: 3px;
            border: 1px solid #e0e0e0;
        }}

        pre {{
            background-color: #f5f5f5;
            padding: 12pt;
            border-left: 4px solid #0066cc;
            overflow-x: auto;
            font-size: 9pt;
            border-radius: 4px;
        }}

        pre code {{
            background: none;
            padding: 0;
            border: none;
        }}

        blockquote {{
            border-left: 4px solid #0066cc;
            padding-left: 16pt;
            margin: 16pt 0;
            color: #666;
            font-style: italic;
        }}

        hr {{
            border: none;
            border-top: 2px solid #0066cc;
            margin: 24pt 0;
        }}

        strong {{
            color: #0066cc;
            font-weight: 600;
        }}

        a {{
            color: #0066cc;
            text-decoration: none;
        }}

        a:hover {{
            text-decoration: underline;
        }}

        .print-button {{
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background-color: #0066cc;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 14pt;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }}

        .print-button:hover {{
            background-color: #0052a3;
        }}

        @media print {{
            .print-button {{
                display: none;
            }}
        }}
    </style>
</head>
<body>
    <button class="print-button" onclick="window.print()">🖨️ Imprimer / Sauvegarder en PDF</button>
    {html_body}
</body>
</html>"""

    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(full_html)

    print(f"✓ Converti: {md_file} → {html_file}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        md_file = sys.argv[1]
        html_file = md_file.replace('.md', '.html')
        markdown_to_html(md_file, html_file)
    else:
        # Convertir tous les .md
        for root, dirs, files in os.walk('.'):
            for file in files:
                if file.endswith('.md') and not file.startswith('.'):
                    md_path = os.path.join(root, file)
                    html_path = md_path.replace('.md', '.html')
                    try:
                        markdown_to_html(md_path, html_path)
                    except Exception as e:
                        print(f"✗ Erreur: {md_path} - {e}")

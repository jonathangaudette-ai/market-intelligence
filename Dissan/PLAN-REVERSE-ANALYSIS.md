# Plan: Reverse Competitive Analysis (A1 -> Dissan)

## Goal
Instead of searching for specific Dissan products on A1, we will:
1.  **Scrape the entire "Janitorial" catalog** from A1 Cash & Carry.
2.  **Build a database** of competitor products with rich details (Description, Specs).
3.  **Analyze matches** against the Dissan product list using descriptions and titles, not just SKUs.

## 1. Scrape A1 "Janitorial" Catalog
**Target URL**: `https://www.a1cashandcarry.com/collections/wholesale-janitorial-cleaning-supplies`

**Script**: `scrape-a1-catalog.ts`
*   **Pagination**: Iterate through all pages of the collection.
*   **Data Extraction**:
    *   Title
    *   Price
    *   SKU (if available on listing or detail page)
    *   Product URL
    *   Image URL
    *   **Description** (Important for matching)
    *   Specifications (if available)

**Output**: `a1-janitorial-catalog.json` (Intermediate storage)

## 2. Intelligent Product Matching
**Script**: `analyze-matches.ts`
*   **Input**: 
    *   `produits-sanidepot.xlsx` (Dissan Source)
    *   `a1-janitorial-catalog.json` (A1 Source)
*   **Matching Logic**:
    *   **SKU Match**: Exact match (High Confidence).
    *   **Text Similarity**: Compare Dissan `Name` vs A1 `Title` + `Description`.
    *   **Token Overlap**: Check for shared keywords (e.g., "Bleach", "5L", "Rubbermaid").
    *   **Algorithm**: Use `string-similarity` (Dice Coefficient) or a weighted scoring system.
*   **Filtering**:
    *   Identify potential "Private Label" equivalents (different brand, same specs).

## 3. Reporting
**Output**: `analyse-comparative-a1.xlsx`
*   Columns:
    *   A1 Product Name
    *   A1 Price
    *   A1 SKU
    *   Potential Dissan Match (Best Guess)
    *   Match Confidence Score
    *   Match Reason (SKU, Name Similarity, Description Overlap)
    *   Links to both

## User Review Required
*   **Volume**: This might involve scraping hundreds of products.
*   **Time**: Will take longer than the targeted search.

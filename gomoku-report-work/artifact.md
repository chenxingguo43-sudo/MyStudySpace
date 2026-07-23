# Template execution contract

## Reference

- Source: `D:\MyStudySpace\gomoku-report-work\reference.docx`
- SHA-256: `7B2FBAD3310BF2B7E90D3F3F20A0031E66332B81B6D9E1681AF0AC4414D83E9A`
- Size: 63,817 bytes
- Recorded page count: 22; LibreOffice render count: 23 (one extra blank page after contents)
- Sections: 2
- Evidence: `template-inventory.json`, `template-style-evidence.json`, `template-reference-render/`, `manual-render/reference.pdf`

## Page system

- A4 portrait, 8.27 x 11.69 inches.
- Margins in both sections: left 1.18 in, right 0.59 in, top 0.79 in, bottom 0.79 in.
- Each section starts on a new page and uses a distinct first-page header/footer setting.
- Section 1 contains the institutional cover and contents. Section 2 contains the report body with centered page numbers in the footer.
- Final report may remove the source's accidental blank page while preserving A4 geometry and section separation.

## Typography and paragraph roles

- Main font: Times New Roman, 14 pt, black.
- Cover institution lines: centered, 14 pt, single spacing.
- Cover report title and student/assessment labels: centered, 14 pt, bold.
- Body major headings: centered, 14 pt, bold, uppercase, 6 pt after; major sections begin on a new page.
- Numbered chapter headings: left or justified, 14 pt, bold, first-line indent 0.49 in, 6 pt after.
- Subheadings: left, 14 pt, bold, first-line indent 0.49 in, 6 pt after.
- Body paragraphs: justified, 14 pt, first-line indent 0.49 in, 6 pt after, approximately 1.0 line spacing in the reference.
- Contents: Times New Roman 14 pt with TOC 1/TOC 2/TOC 3 styles, dot leaders, right-aligned page numbers.

## Tables and recurring components

- Cover metadata is stored in six border-light tables and must be preserved.
- Data tables use `Table Grid`, thin black borders, gray bold header rows, centered short values, and natural row height.
- Body footer contains a centered page number; cover and contents do not display body numbering.
- No inline pictures are present in the reference; document package contains no `word/media` directory.

## Content flow

1. Institutional cover page.
2. Static contents page.
3. Annotation and keywords.
4. Introduction with relevance, purpose, object, subject, tasks, and methods.
5. Four numbered chapters: requirements; architecture/design; implementation; testing/results.
6. Conclusion.
7. Sources.
8. Appendix with selected Kotlin code excerpts.

## Slot map

- Cover institution, institute, department, degree direction, practice name, student name, group, assessors, city, and year: preserve from the reference unless the user supplies replacements.
- Contents paragraphs at body elements 39-72: rewrite for the Gomoku report; keep TOC styles and dot-leader behavior.
- Section-break paragraph at body element 73: preserve.
- All body elements after body element 73: replace with the Gomoku report.
- Header/footer parts and page-number fields: preserve.
- Existing analytical tables and old code appendix: remove with the rewritten body.

## Package preservation

- Preserve unchanged: `[Content_Types].xml`, package relationships, theme, font table, numbering definitions, custom XML, header/footer parts, footnotes/endnotes, cover tables, and section geometry.
- Editable: `word/document.xml`, styles only if required for new semantic roles, and document properties for title/subject.
- Do not change the retained reference file.

## Fidelity gates

- Cover must remain visually recognizable and retain the source student/group data.
- A4 margins, Times New Roman 14 pt body text, justified paragraphs, heading hierarchy, table treatment, and centered footer page numbers must match the reference.
- No clipped tables, orphaned headings, broken code lines, empty accidental pages, or unexplained pagination changes.
- Render every final page and inspect before delivery.

const PAGE_STATES = new Set([
  'unmapped',
  'mapped',
  'reconstructed-media',
  'excluded-with-reason'
]);

function expectedPdfPages() {
  return Array.from({ length: 190 }, (_, index) => index + 1);
}

function validatePageLedger(ledger, { strict = false } = {}) {
  const errors = [];
  const pages = Array.isArray(ledger?.pages) ? ledger.pages : [];
  const actual = pages.map(page => page?.pdfPage);

  if (JSON.stringify(actual) !== JSON.stringify(expectedPdfPages())) {
    errors.push('ledger must cover PDF pages 1-190 exactly once');
  }

  pages.forEach(page => {
    const label = Number.isInteger(page?.pdfPage) ? `PDF-${page.pdfPage}` : 'unknown PDF page';
    if (!PAGE_STATES.has(page?.status)) errors.push(`${label}: invalid status`);
    if (strict && page?.status === 'unmapped') errors.push(`${label}: remains unmapped`);
    if (page?.status === 'excluded-with-reason' && !String(page?.reason || '').trim()) {
      errors.push(`${label}: exclusion reason required`);
    }
  });

  return errors;
}

function validateFullBookManifest(manifest) {
  const errors = [];
  const expectedModules = ['grammar', 'reading', 'writing', 'listening', 'speaking', 'exam', 'review'];
  const modules = Array.isArray(manifest?.modules) ? manifest.modules : [];
  const actualModules = modules.map(module => module?.id);

  if (manifest?.pdfPageCount !== 190) errors.push('manifest must declare pdfPageCount 190');
  if (JSON.stringify(actualModules) !== JSON.stringify(expectedModules)) {
    errors.push('manifest modules must be grammar, reading, writing, listening, speaking, exam, review');
  }
  modules.forEach(module => {
    if (!String(module?.title || '').trim()) errors.push(`${module?.id || 'unknown'}: title is required`);
  });

  return errors;
}

module.exports = {
  PAGE_STATES,
  expectedPdfPages,
  validateFullBookManifest,
  validatePageLedger
};

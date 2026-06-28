# Agent A Morphology Expansion — Report

## Summary

- Method: hybrid (exact + stem-based)
- Corpus: 472 sentences from 10 chapter files (excluded: приложение-лексика.md, pages 167-186)
- Vocabulary considered: 2273 entries → filtered to single Russian words with source=vocab
- Unique stems in corpus: 2609

## Counts

| Category | Count |
|---|---|
| Exact matches (candidate_high) | 34 |
| Stem matches (needs_review) | 96 |
| **Total new matches** | **130** |
| Exact examples | 49 |
| Stem examples | 130 |

## Confidence Labels

- `candidate_high`: exact normalized token match in corpus (lemma form found directly in text)
- `needs_review`: stem match only — inflected form matched via suffix stripping; requires human verification

## Matching Method

Russian suffix-stripping stemmer applied to both vocabulary lemmas and corpus tokens:
- Verbal: ать/ять/еть/ить/уть + past tense (ал/ила/ели) + present (ает/яет/ует/ит/ят/ут)
- Nominal: case endings (ами/ого/ему/ыми/ах/ов/ей/ам/ый/ая/ое/ую etc.)
- Derivational: ость/ность/ение/ание/тельство/тель/чик/щик

Matches with identical stems but different surface forms → `needs_review`.

## Key Finding

The 130 new matches extend Agent A's coverage from 97 to **227 total matched vocabulary entries**. The 96 stem matches are conservative `needs_review` — they represent likely valid inflected forms but should be spot-checked before promoting to candidate_high.

## Output Files

- `morphology_matches.json` — structured JSON with all 130 matches
- `morphology_report.md` — this report

## Recommended Next Step

Agent D should review a sample of stem matches. High-confidence stem matches can be promoted to candidate_high after spot-checking. These 130 entries can then feed into Agent C vocabulary card generation.

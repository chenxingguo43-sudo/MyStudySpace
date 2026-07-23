#!/usr/bin/env node
/**
 * Parse Zlatoust transcription files and build chapter JSONs.
 * Handles two formats:
 *   1. Multi-line: each field on its own line
 *   2. Single-line: Номер: N / Тип: type / Вопрос: text / А) opt1 / Б) opt2 ...
 */
const fs = require('fs');
const path = require('path');

const TRANSCRIPT_DIR = 'D:/MyStudySpace/_zlatoust_transcriptions';
const OUTPUT_DIR = 'data/textbook/zlatoust_grammar';

function parseText(text) {
    const exercises = [];
    let currentEx = null;

    const lines = text.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('--- PAGE')) continue;

        // Format 2: single-line with / separators
        const singleMatch = trimmed.match(/^Номер:\s*(\d+)\s*\/\s*Тип:\s*(.+?)\s*\/\s*Вопрос:\s*(.+)/);
        if (singleMatch) {
            if (currentEx && currentEx.options.length >= 2) {
                exercises.push(currentEx);
            }
            currentEx = {
                printedNumber: parseInt(singleMatch[1]),
                type: singleMatch[2].trim().toLowerCase().includes('dual') ? 'dual-choice' : 'single-choice',
                question: singleMatch[3].trim(),
                options: []
            };
            continue;
        }

        // Format 1: multi-line
        if (trimmed.startsWith('Номер:')) {
            if (currentEx && currentEx.options.length >= 2) {
                exercises.push(currentEx);
            }
            const num = parseInt(trimmed.match(/Номер:\s*(\d+)/)[1]);
            currentEx = { printedNumber: num, type: 'single-choice', question: '', options: [] };
        } else if (currentEx && trimmed.startsWith('Тип:')) {
            const t = trimmed.replace('Тип:', '').replace('Тип:', '').trim().toLowerCase();
            currentEx.type = t.includes('dual') ? 'dual-choice' : 'single-choice';
        } else if (currentEx && trimmed.startsWith('Вопрос:')) {
            currentEx.question = trimmed.replace('Вопрос:', '').replace('Вопрос:', '').trim();
        } else if (currentEx) {
            // Try option line: А) text, or / А) text
            const optMatch = trimmed.match(/^\/?\s*([АБВГ])\)\s*(.+?)(?:\s*\/?\s*$)?$/);
            if (optMatch) {
                currentEx.options.push({ key: optMatch[1], text: optMatch[2].trim() });
            }
        }
    }
    if (currentEx && currentEx.options.length >= 2) {
        exercises.push(currentEx);
    }

    return exercises;
}

function buildChapterExercises(exercises, chapterId, startNum) {
    return exercises
        .filter(e => e.question && e.options.length >= 2)
        .map((e, i) => ({
            id: chapterId + '-Q' + String(startNum + i).padStart(3, '0'),
            printedNumber: e.printedNumber || (startNum + i),
            type: e.type || 'single-choice',
            question: e.question.replace(/\s+\/\s*$/, '').trim(),
            options: e.options.map(o => ({ key: o.key, text: o.text.replace(/\/\s*$/, '').trim() })),
            answer: '',
            sourceAnswer: '',
            sourceEvidence: '',
            sourceExplanation: '',
            referenceExplanation: '',
            pitfalls: [],
            questionPages: [],
            answerPages: [123, 124],
            reviewStatus: { mastery: 0, reviews: 0 }
        }));
}

function main() {
    // Load all text from transcription files
    let allText = '';
    const files = fs.readdirSync(TRANSCRIPT_DIR).filter(f => f.endsWith('.txt') && f.startsWith('batch'));
    for (const f of files) {
        allText += fs.readFileSync(path.join(TRANSCRIPT_DIR, f), 'utf8') + '\n';
    }

    const allEx = parseText(allText);
    console.log(`Parsed ${allEx.length} exercises from ${files.length} files`);

    // Load existing chapters
    const ch0 = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'ch0000.json'), 'utf8'));
    const ch1 = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'ch0001.json'), 'utf8'));

    // Merge into ch0001 (Глава 2)
    const existingNums = new Set(ch1.exercises.map(e => e.printedNumber));
    let added = 0;
    for (const ex of allEx) {
        if (!existingNums.has(ex.printedNumber)) {
            const formatted = buildChapterExercises([ex], 'GL2', ex.printedNumber)[0];
            if (formatted) {
                ch1.exercises.push(formatted);
                existingNums.add(ex.printedNumber);
                added++;
            }
        }
    }

    ch1.exercises.sort((a, b) => a.printedNumber - b.printedNumber);
    delete ch1._status;
    delete ch1._note;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'ch0001.json'), JSON.stringify(ch1, null, 2), 'utf8');

    console.log(`Added ${added} exercises to ch0001.json (total: ${ch1.exercises.length})`);
    console.log('ch0001 exercise range: ' +
        Math.min(...ch1.exercises.map(e => e.printedNumber)) + ' - ' +
        Math.max(...ch1.exercises.map(e => e.printedNumber)));
}

main();

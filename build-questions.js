const fs = require('fs');
const path = require('path');

const csvDir = './csv';
const outputFile = './js/builtin-questions.js';

function parseYear(yearStr) {
    // Handle H28, R2, etc.
    let match = yearStr.match(/^([HR])(\d+)$/i);
    if (match) {
        const era = match[1].toUpperCase();
        const num = parseInt(match[2]);
        if (era === 'H') return 1988 + num;
        if (era === 'R') return 2018 + num;
    }
    // Handle 令和2年, 平成28年, etc.
    match = yearStr.match(/令和(\d+)/);
    if (match) return 2018 + parseInt(match[1]);
    match = yearStr.match(/平成(\d+)/);
    if (match) return 1988 + parseInt(match[1]);
    return null;
}

function parseSubject(s) {
    if (s.includes('計画')) return 1;
    if (s.includes('環境') || s.includes('設備')) return 2;
    if (s.includes('法規')) return 3;
    if (s.includes('構造')) return 4;
    if (s.includes('施工')) return 5;
    return null;
}

function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
        else current += char;
    }
    result.push(current.trim());
    return result;
}

const allQuestions = [];

// Read UTF-8 converted files (utf8_*.csv)
const csvFiles = fs.readdirSync(csvDir).filter(f => f.startsWith('utf8_') && f.endsWith('.csv'));

console.log(`Found ${csvFiles.length} CSV files`);

for (const csvFile of csvFiles) {
    const filePath = path.join(csvDir, csvFile);
    console.log(`Processing: ${csvFile}`);

    let content;
    try {
        content = fs.readFileSync(filePath, 'utf-8');
        // Remove BOM if present
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }
    } catch (e) {
        console.error(`Error reading ${csvFile}: ${e.message}`);
        continue;
    }

    const lines = content.trim().split('\n');
    let added = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length < 9) { skipped++; continue; }

        const [yearStr, subjectStr, numStr, hasImage, questionText, choice1, choice2, choice3, choice4, correctStr] = cols;
        const year = parseYear(yearStr);
        const subject = parseSubject(subjectStr);
        const questionNumber = parseInt(numStr);
        const correctAnswer = parseInt(correctStr);

        if (!year) { console.log(`  Skipped line ${i}: invalid year "${yearStr}"`); skipped++; continue; }
        if (!subject) { console.log(`  Skipped line ${i}: invalid subject "${subjectStr}"`); skipped++; continue; }
        if (!questionNumber || !correctAnswer) { skipped++; continue; }

        const id = `${year}-${subject}-${questionNumber}`;

        allQuestions.push({
            id,
            year,
            subject,
            questionNumber,
            questionText: questionText || '',
            questionImages: [],
            choices: [choice1 || '', choice2 || '', choice3 || '', choice4 || ''],
            correctAnswer,
            explanation: '',
            explanationImages: [],
            hasImageNote: hasImage === '図あり'
        });
        added++;
    }

    console.log(`  Added ${added} questions (skipped ${skipped})`);
}

// Sort by year desc, subject asc, questionNumber asc
allQuestions.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.subject !== b.subject) return a.subject - b.subject;
    return a.questionNumber - b.questionNumber;
});

const output = 'const BUILTIN_QUESTIONS = ' + JSON.stringify(allQuestions, null, 2) + ';';
fs.writeFileSync(outputFile, output);

console.log(`\nTotal: ${allQuestions.length} questions saved to ${outputFile}`);

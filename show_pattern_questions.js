import fs from 'fs';

// Read the JSON file
const data = JSON.parse(fs.readFileSync('pattern_questions.json', 'utf8'));
const content = data.gameContent?.content || {};
const patternRecognition = content.patternRecognition || {};
const questions = patternRecognition.questions || [];

console.log(`Pattern Recognition Game: ${questions.length} Total Questions`);
console.log(`Time Limit: ${patternRecognition.gameRules?.timeLimit || 0} seconds (5 minutes)`);
console.log(`Max Score: ${patternRecognition.gameRules?.maxScore || 0}`);
console.log('\n' + '='.repeat(80));

questions.forEach((q, i) => {
    console.log(`\nQuestion ${i + 1} (${(q.difficulty || 'unknown').toUpperCase()}) - ${(q.bodyPart || 'general').charAt(0).toUpperCase() + (q.bodyPart || 'general').slice(1)}:`);
    console.log(`Q: ${q.question || ''}`);
    console.log(`Options: ${(q.options || []).join(', ')}`);
    console.log(`Answer: ${q.correctAnswer || ''}`);
    console.log(`Explanation: ${q.explanation || ''}`);
    
    if ((i + 1) % 10 === 0) {
        console.log('\n' + '-'.repeat(80));
    }
});

console.log(`\n\nSummary by Difficulty:`);
const byDifficulty = questions.reduce((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
}, {});

Object.entries(byDifficulty).forEach(([difficulty, count]) => {
    console.log(`${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}: ${count} questions`);
});

console.log(`\nSummary by Body Part:`);
const byBodyPart = questions.reduce((acc, q) => {
    acc[q.bodyPart] = (acc[q.bodyPart] || 0) + 1;
    return acc;
}, {});

Object.entries(byBodyPart).forEach(([bodyPart, count]) => {
    console.log(`${bodyPart.charAt(0).toUpperCase() + bodyPart.slice(1)}: ${count} questions`);
});
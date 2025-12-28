const wordsJson = require('./words_response-5.2.json');
const fs = require('fs');

const result = wordsJson.data.map(item => item.words.map(wordItem => ({
  wordId: wordItem.id,
  word: wordItem.wordValue,
  translations: wordItem.combinedTranslation?.split(';').map(value => value.trim().toLowerCase()) || [],
  status: wordItem.learningStatus
}))).flat(Number.POSITIVE_INFINITY);
// console.log(result);
fs.writeFileSync('words-data-set-5.2.ts', `export default ${JSON.stringify(result)}`, 'utf8');

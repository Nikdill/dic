const wordsStart=  require( './words-data-set-start.ts');
const words1=  require( './words-data-set-1.ts');
const words2=  require( './words-data-set-2.ts');
const words3=  require( './words-data-set-3.ts');
const words3_2=  require( './words-data-set-3.1.ts');
const words4=  require( './words-data-set-4.ts');
const words4_2=  require( './words-data-set-4.1.ts');
const words5=  require( './words-data-set-5.ts');
const words5_2=  require( './words-data-set-5.1.ts');
//
const fs = require( 'fs');
const result = wordsStart.default
  .concat(words1.default)
  .concat(words2.default)
  .concat(words3.default)
  .concat(words3_2.default)
  .concat(words4.default)
  .concat(words4_2.default)
  .concat(words5.default)
  .concat(words5_2.default)
  .map(item => ({ ...item, createdAt: Date.now() }))

fs.writeFileSync('./words-data-set.ts', `export default ${JSON.stringify(result)}`, 'utf8');

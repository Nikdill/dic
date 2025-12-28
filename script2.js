const words1=  require( './words-data-set-1.ts');
const words2=  require( './words-data-set-2.ts');
const words3=  require( './words-data-set-3.ts');
const words3_2=  require( './words-data-set-3.2.ts');
const words4=  require( './words-data-set-4.ts');
const words4_2=  require( './words-data-set-4.2.ts');
const words5=  require( './words-data-set-5.ts');
const words5_2=  require( './words-data-set-3.2.ts');
//
const fs = require( 'fs');
console.log(words1.default)
const result = words1.default
  .concat(words2.default)
  .concat(words3.default)
  .concat(words3_2.default)
  .concat(words4.default)
  .concat(words4_2.default)
  .concat(words5.default)
  .concat(words5_2.default)

fs.writeFileSync('./words-data-set.ts', `export default ${JSON.stringify(result)}`, 'utf8');

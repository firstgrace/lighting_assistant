import { mkdir, writeFile } from 'node:fs/promises';
import { createBalancedConditionRecords60, conditionDesignCsv } from '../src/datasetConditions.js';

const outputDirectory = new URL('../dataset/config/', import.meta.url);
const records = createBalancedConditionRecords60();
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  new URL('conditions_60.json', outputDirectory),
  `${JSON.stringify({ conditions: records }, null, 2)}\n`,
  'utf8',
);
await writeFile(
  new URL('conditions_60.csv', outputDirectory),
  conditionDesignCsv(records),
  'utf8',
);
console.log(`generate-condition-design: wrote ${records.length} conditions including 15 dark replacements`);

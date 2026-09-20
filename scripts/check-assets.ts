import { checkAssets } from './asset-inventory';
try { console.log(`${await checkAssets()} arquivos de assets verificados.`); }
catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }

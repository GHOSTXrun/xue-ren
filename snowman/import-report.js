const snapshotInput = document.getElementById('snapshot');
const importStatus = document.getElementById('import-status');
const importResult = document.getElementById('import-result');
const base58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

function calculateRetention(data) {
  if (!data || !isMintAddress(data.mint || '')) throw Error('A valid token mint is required.');
  if (!Array.isArray(data.wallets) || !data.wallets.length) throw Error('Add at least one wallet.');
  const signatures = data.transactions ?? [];
  if (!Array.isArray(signatures) || signatures.some(value => typeof value !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{85,88}$/.test(value))) {
    throw Error('Transaction signatures must be in base58 format.');
  }
  let fresh = 0;
  let retained = 0;
  const seen = new Set();
  for (const wallet of data.wallets) {
    if (!wallet || typeof wallet.address !== 'string' || !base58.test(wallet.address) || !isMintAddress(wallet.address)) throw Error('Each row needs a valid wallet address.');
    if (seen.has(wallet.address)) throw Error('Each wallet must appear only once.');
    seen.add(wallet.address);
    if (typeof wallet.heldBefore !== 'boolean' || typeof wallet.day7Balance !== 'string' || !/^\d+(?:\.\d+)?$/.test(wallet.day7Balance)) {
      throw Error('Each row needs heldBefore (true or false) and day7Balance (a nonnegative decimal string).');
    }
    if (!wallet.heldBefore) {
      fresh++;
      if (/[1-9]/.test(wallet.day7Balance)) retained++;
    }
  }
  return { fresh, retained, total: seen.size, signatures };
}

function renderSnapshot(data, result) {
  const label = document.createElement('strong');
  label.textContent = data.example === true ? 'Example snapshot' : 'Imported snapshot · supplied by you';
  const summary = document.createElement('p');
  const rate = result.fresh ? Math.round(result.retained / result.fresh * 100) + '%' : '—';
  summary.textContent = result.total + ' recipients · ' + result.fresh + ' new wallets · ' + result.retained + ' retained at day 7 · ' + rate + ' retention';
  const sources = document.createElement('p');
  for (const [index, signature] of result.signatures.entries()) {
    const anchor = document.createElement('a');
    anchor.href = 'https://solscan.io/tx/' + signature;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = 'Transaction ' + (index + 1) + ' ↗';
    sources.append(anchor, ' ');
  }
  importResult.replaceChildren(label, summary, sources);
  importResult.hidden = false;
}

let selected = 0;
snapshotInput.addEventListener('change', async () => {
  const current = ++selected;
  const file = snapshotInput.files[0];
  importStatus.textContent = '';
  importResult.hidden = true;
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw Error('Choose a JSON file smaller than 5 MB.');
    const data = JSON.parse(await file.text());
    if (current !== selected) return;
    renderSnapshot(data, calculateRetention(data));
  } catch (error) {
    if (current === selected) importStatus.textContent = error.message;
  }
});

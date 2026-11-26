const root = new URL('../', document.currentScript.src);
const route = location.pathname.slice(root.pathname.length).replace(/(?:^|\/)index\.html$/, '').replace(/\/$/, '');
const reportUrl = new URL('snowman/index.html', root);

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function link(label, target, className) {
  const anchor = node('a', label, className);
  anchor.href = new URL(target, root);
  return anchor;
}

const status = node('div', '', 'site-toast');
status.setAttribute('role', 'status');
document.body.append(status);
let toastTimer;
function announce(message) {
  status.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { status.textContent = ''; }, 2500);
}

for (const button of document.querySelectorAll('button[title]')) {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(button.title)) continue;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.title);
      announce('Contract address copied');
    } catch {
      const address = node('input', '', 'site-copy-input');
      address.value = button.title;
      address.readOnly = true;
      status.replaceChildren(address);
      address.select();
    }
  });
}

const navItems = [
  ['Home', 'index.html'], ['Launch', 'launch/index.html'], ['Explore', 'explore/index.html'],
  ['Holder Network', 'network/index.html'], ['Leaderboard', 'leaderboard/index.html'],
  ['How it works', 'how-it-works/index.html'], ['Register coin', 'register/index.html'],
  ['Retention report', 'snowman/index.html']
];
const menu = document.querySelector('button[aria-label="Menu"]');
if (menu) {
  const mobileNav = node('nav', '', 'site-mobile-nav');
  mobileNav.id = 'site-mobile-nav';
  mobileNav.setAttribute('aria-label', 'Mobile navigation');
  mobileNav.hidden = true;
  for (const [label, target] of navItems) mobileNav.append(link(label, target));
  menu.setAttribute('aria-controls', mobileNav.id);
  menu.after(mobileNav);
  function toggle(open) {
    mobileNav.hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
  }
  menu.addEventListener('click', () => toggle(mobileNav.hidden));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileNav.hidden) {
      toggle(false);
      menu.focus();
    }
  });
}

const ribbon = node('div', '', 'site-ribbon');
ribbon.append(node('span', 'Archived snapshot'), link('Retention report →', reportUrl, 'site-report-link'));
if (!document.body.classList.contains('portal-shell')) document.body.prepend(ribbon);

const health = document.querySelector('a[href="/api/health"]');
if (health) {
  health.href = new URL('status/index.html', root);
  health.removeAttribute('target');
}
const firstHeading = document.querySelector('main h1, main h2');
const notices = {
  register: 'Coin registration and fee-wallet creation require a connected service. You can still look up an existing coin below.',
  launch: 'This preview cannot create tokens or submit transactions. You can open the original launch platform to continue.',
  'opt-out': 'Wallet opt-out requires the distribution operator to confirm and record the preference. This snapshot cannot submit the request.',
  admin: 'Administration requires the project server and an authorized account.',
};
if (notices[route]) {
  const notice = node('aside', notices[route], 'site-notice');
  (firstHeading || document.querySelector('main') || ribbon).after(notice);
  if (route === 'launch') notice.append(' ', link('Open pump.fun ↗', 'https://pump.fun/'));
  if (route === 'opt-out' || route === 'admin') {
    for (const button of document.querySelectorAll('main button')) button.disabled = true;
  }
}

if (route === 'register') {
  const input = document.querySelector('input[placeholder="pump.fun token contract address"]');
  const button = input?.parentElement.querySelector('button');
  if (input && button) {
    button.textContent = 'Look up coin';
    const valid = () => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input.value.trim());
    input.addEventListener('input', () => { button.disabled = !valid(); });
    function lookup(event) {
      event.preventDefault();
      if (!valid()) return;
      const target = new URL(reportUrl);
      target.searchParams.set('mint', input.value.trim());
      location.assign(target);
    }
    button.addEventListener('click', lookup);
    input.addEventListener('keydown', event => { if (event.key === 'Enter') lookup(event); });
  }
}
if (route === 'explore') {
  const input = document.querySelector('input[placeholder^="Search name"]');
  const tabs = [...document.querySelectorAll('button.tab')];
  const links = [...document.querySelectorAll('main a[href*="coin/"]')];
  const cards = links.filter(anchor => anchor.classList.contains('card'));
  if (input && cards.length) {
    const empty = node('p', 'No matching coins in this snapshot.', 'site-notice');
    empty.hidden = true;
    tabs.at(-1)?.parentElement.after(empty);
    function filter() {
      const term = input.value.trim().toLowerCase();
      const selected = tabs.find(tab => tab.dataset.on === 'true')?.textContent.trim().toLowerCase();
      for (const card of cards) {
        const text = (card.textContent + ' ' + (card.getAttribute('href') || card.querySelector('a')?.getAttribute('href') || '')).toLowerCase();
        card.hidden = !text.includes(term) || Boolean(selected && selected !== 'all' && !text.includes(selected));
      }
      empty.hidden = cards.some(card => !card.hidden);
    }
    for (const tab of tabs) tab.addEventListener('click', () => {
      for (const item of tabs) item.dataset.on = String(item === tab);
      filter();
    });
    input.addEventListener('input', filter);
    const sort = document.querySelector('select[aria-label=Sort]');
    if (sort) {
      sort.querySelector('option[value=recent]').disabled = true;
      const patterns = { reached: /Wallets reached([^A-Za-z]*[KMB]?)/i, holders: /Holders([^A-Za-z]*[KMB]?)/i, volume: /Distributed([^A-Za-z]*[KMB]?)/i, growth: /([\d,.]+)\s*wallets in 24h/i };
      sort.addEventListener('change', () => {
        const pattern = patterns[sort.value];
        if (!pattern) return;
        const sorted = [...cards].sort((a, b) => readNumber(b.textContent.match(pattern)?.[1]) - readNumber(a.textContent.match(pattern)?.[1]));
        cards[0].parentElement.append(...sorted);
      });
    }
  }
}

if (route === 'launch') {
  const form = document.querySelector('main form');
  const file = form?.querySelector('input[type="file"]');
  const upload = form?.querySelector('button[aria-label="Upload image"]');
  const submit = form?.querySelector('button:not([type])');
  const amount = form?.querySelector('input[type="number"]');
  let imageUrl;
  if (form && file && upload && submit && amount) {
    submit.disabled = false;
    submit.textContent = 'Download launch draft';
    const message = node('p', 'Drafts save your inputs locally. No wallet connection is needed.', 'site-notice');
    submit.before(message);
    const originalUploadContent = [...upload.childNodes];
    upload.addEventListener('click', () => file.click());
    file.addEventListener('change', () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = undefined;
      upload.replaceChildren(...originalUploadContent);
      const image = file.files[0];
      if (!image) return;
      if (!/^image\/(png|jpeg|gif|webp)$/.test(image.type) || image.size > 5 * 1024 * 1024) {
        file.value = '';
        message.textContent = 'Choose a PNG, JPEG, GIF or WebP image under 5 MB.';
        return;
      }
      imageUrl = URL.createObjectURL(image);
      const preview = node('img', '', 'site-upload-preview');
      preview.alt = 'Selected logo preview';
      preview.src = imageUrl;
      upload.replaceChildren(preview);
      message.textContent = 'Logo selected.';
    });
    const presets = [...form.querySelectorAll('button.tab')];
    for (const preset of presets) preset.addEventListener('click', () => {
      amount.value = Number.parseFloat(preset.textContent) || 0;
      for (const button of presets) button.dataset.on = String(button === preset);
    });
    amount.addEventListener('input', () => {
      for (const button of presets) button.dataset.on = String((Number.parseFloat(button.textContent) || 0) === Number(amount.value));
    });
    const addLink = [...form.querySelectorAll('button')].find(button => button.textContent.trim() === '+ Add');
    const draftLinks = [];
    addLink?.addEventListener('click', () => {
      if (draftLinks.length >= 4) return;
      const url = node('input', '', 'input h-11');
      url.type = 'url';
      url.placeholder = 'https://example.com';
      url.setAttribute('aria-label', 'Project link ' + (draftLinks.length + 1));
      const row = node('div', '', 'site-draft-link');
      row.append(url);
      addLink.parentElement.after(row);
      draftLinks.push(url);
      addLink.disabled = draftLinks.length >= 4;
      url.focus();
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const [name, symbol] = [...form.querySelectorAll('input[required]')];
      const logo = file.files[0];
      const draft = {
        name: name.value.trim(), symbol: symbol.value.trim().toUpperCase(),
        description: form.querySelector('textarea').value.trim(), initialBuySol: Number(amount.value),
        links: draftLinks.map(field => field.value.trim()).filter(Boolean)
      };
      if (!draft.name || !draft.symbol) {
        message.textContent = 'Enter a name and ticker.';
        return;
      }
      submit.disabled = true;
      try {
        if (logo) {
          draft.logo = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ name: logo.name, dataUrl: reader.result });
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(logo);
          });
        }
        const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], {type:'application/json'}));
        const download = node('a');
        download.href = url;
        download.download = 'launch-draft.json';
        download.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        message.textContent = 'Draft downloaded. You can use it when preparing your launch.';
      } catch {
        message.textContent = 'The draft could not be downloaded. Try selecting the image again.';
      } finally {
        submit.disabled = false;
      }
    });
  }
}

if (route === 'leaderboard') {
  const tabs = [...document.querySelectorAll('main button.tab')];
  const periods = new Set(['24h', '7d', 'All time']);
  const columns = ['Wallets reached', 'Retained', 'Distributed', 'Holders', '24h growth'];
  const table = document.querySelector('main table tbody');
  const metrics = [...document.querySelectorAll('main thead button')].filter(tab => columns.includes(tab.textContent.trim()));
  for (const tab of tabs.filter(tab => periods.has(tab.textContent.trim()))) {
    if (tab.dataset.on === 'false') {
      tab.disabled = true;
      tab.title = 'This time range is not included in the archive.';
    }
  }
  if (table) {
    for (const metric of metrics) metric.addEventListener('click', () => {
      const column = columns.indexOf(metric.textContent.trim()) + 2;
      const rows = [...table.rows].sort((a,b) => readNumber(b.cells[column]?.textContent || '') - readNumber(a.cells[column]?.textContent || ''));
      rows.forEach((row,index) => { row.cells[0].textContent = String(index + 1); });
      table.append(...rows);
      for (const tab of metrics) {
        tab.classList.toggle('text-accent', tab === metric);
        tab.classList.toggle('hover:text-fg', tab !== metric);
        tab.setAttribute('aria-pressed', String(tab === metric));
      }
    });
  }
}

function readNumber(text = "") {
  const match = text.replaceAll(",", "").match(/-?[\d.]+\s*([KMB])?/i);
  if (!match) return 0;
  return Number(match[0].replace(/[KMB]/i, "")) * ({ K: 1e3, M: 1e6, B: 1e9 }[match[1]?.toUpperCase()] || 1);
}

if (!route) {
  const walletInput = document.querySelector('input[placeholder="Wallet address"]');
  const walletForm = walletInput?.closest('form') || walletInput?.parentElement;
  const walletButton = walletForm?.querySelector('button');
  if (walletInput && walletButton) {
    walletButton.textContent = 'Check archive';
    const result = node('p', '', 'site-notice');
    result.hidden = true;
    result.setAttribute('role', 'status');
    walletForm.after(result);
    const valid = () => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletInput.value.trim());
    let lookupId = 0;
    walletInput.addEventListener('input', () => {
      lookupId++;
      walletButton.disabled = !valid();
      result.hidden = true;
    });
    async function lookupWallet(event) {
      event.preventDefault();
      if (!valid()) return;
      const id = ++lookupId;
      const address = walletInput.value.trim();
      result.hidden = false;
      result.textContent = 'Looking for this wallet in the archived holder network…';
      try {
        const response = await fetch(new URL('network/index.html', root));
        if (!response.ok) throw Error();
        const page = new DOMParser().parseFromString(await response.text(), 'text/html');
        if (id !== lookupId) return;
        const found = [...page.querySelectorAll('a[href^="https://solscan.io/account/"]')].some(anchor => anchor.href === 'https://solscan.io/account/' + address);
        result.textContent = found ? 'This wallet appears in the archived holder network.' : 'This wallet does not appear in the archived holder network.';
        result.append(' The archive cannot establish current airdrop eligibility.');
      } catch {
        if (id === lookupId) result.textContent = 'The archived holder network could not be loaded.';
      }
    }
    walletForm.addEventListener('submit', lookupWallet);
    walletButton.addEventListener('click', lookupWallet);
    walletInput.addEventListener('keydown', event => { if (event.key === 'Enter') lookupWallet(event); });
  }
}

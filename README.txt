Static website package

Serve this directory as the site root. For GitHub Pages, use the main branch and /(root), including .nojekyll. These pages also support hosting under a repository subpath.

Entry points
- index.html opens the site.
- snowman/index.html opens retention reports and JSON snapshot import.
- status/index.html lists what the static website supports.
- assets/snowman-mark.png is the provisional symbol. It contains no project name.

The archived coin and network figures are captured data. Launch drafts and snapshot imports run locally. The site does not sign transactions or collect private keys. Live data, wallet opt-out, project administration, fee-wallet creation and automatic airdrop distribution require authenticated project services.

Snapshot format
See snowman/snapshot-example.json. Supply the token mint, an optional array of Solana transaction signatures and one row per recipient. heldBefore records whether the wallet held the mint before distribution. day7Balance is a nonnegative decimal string taken at the day-seven settlement point. New recipients with positive day-seven balance count toward retention. Import calculates results from the supplied rows and does not independently verify them.

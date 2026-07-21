export async function startGame(page, a = 'Mira', b = 'Theo') {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByPlaceholder('Type a name…').nth(0).fill(a);
  await page.getByPlaceholder('Type a name…').nth(1).fill(b);
  await page.getByRole('button', { name: 'Deal the Cards' }).click();
}

// OutcomeCard renders ornament+label+blurb+chevron as one accessible name
// (e.g. "♣ Knock Laid down with deadwood... ›"), same lesson as smoke.spec.js.
// An exact outcome name never matches; disambiguate with ornament+label since
// "Knock" and "Long Gin" share the ♣ ornament and "Gin" is a substring of
// "Long Gin" (and appears inside its blurb "Ginned...").
const OUTCOME_ORNAMENT = { Knock: '♣', Gin: '♠', 'Long Gin': '♣', Undercut: '♦' };

// outcome: 'Knock' | 'Gin' | 'Long Gin' | 'Undercut'; digits: ['9','8']
export async function recordHand(page, { winner, outcome, digits }) {
  await page.getByRole('button', { name: 'Score this Hand' }).click();
  await page.getByRole('button', { name: winner }).click();
  const marker = OUTCOME_ORNAMENT[outcome];
  await page.getByRole('button', { name: new RegExp(`${marker} ${outcome}`) }).click();
  for (const d of digits) await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: 'Record Hand' }).click();
}

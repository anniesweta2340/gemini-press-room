import fs from 'fs';

// ─── Visible assumptions ───────────────────────────────────────────────────────
// Change these to match your funnel. Each is documented so stakeholders can
// challenge or override a single number without touching the logic.

// % of searchers who encounter a top-3 LLM recommendation and actively investigate
// that product. Anchored to AI-search CTR research (analogous to organic pos-1
// click-through intent, discounted for multi-answer result sets).
const CONSIDERATION_RATE = 0.15;

// % of those who investigate that ultimately convert to a paying account.
// Conservative SaaS trial-to-paid benchmark; swap in your actual blended rate.
const CONVERSION_RATE = 0.03;

// Annual customer value (USD) of one converted user.
// Default: Gemini Advanced at ~$20/mo × 12. Replace with your real ACV.
const VALUE_PER_CONVERSION = 240;

// Profound mentions are a sampled metric. If you know the sample represents ~X%
// of true query volume, set this to 1/X (e.g. 20 for a 5% sample). Leave at 1
// to report conservatively on the sampled set only.
const VOLUME_MULTIPLIER = 1;

// Normalization ceiling: a prompt ranked (3 + GAP_CAP) positions or worse gets
// inclusion_gap = 1.0. Caps outliers so one extreme prompt doesn't dominate.
const GAP_CAP = 10;

// ─── Load pressroom data ───────────────────────────────────────────────────────
const pressroom = JSON.parse(fs.readFileSync('pressroom.json', 'utf8'));
const prompts = pressroom.gemini_worst_prompts ?? [];

// ─── Per-prompt revenue-at-risk ───────────────────────────────────────────────
const by_prompt = prompts
  // Only prompts where Gemini sits outside the "recommended" top-3 band.
  .filter(p => p.avg_position > 3)
  .map(p => {
    // Demand weight: how many times LLMs answered this prompt in the window.
    // More mentions → higher real-world query volume → larger opportunity.
    const demand_weight = p.mentions;

    // How far Gemini sits below the top-3 threshold, normalized to [0, 1].
    // pos 3.1 → gap ≈ 0.01 (barely outside); pos 13 → gap = 1.0 (hard floor).
    const inclusion_gap = Math.min(p.avg_position - 3, GAP_CAP) / GAP_CAP;

    // Estimated users per window who would seriously consider Gemini if it
    // reached the top-3. VOLUME_MULTIPLIER scales the demand pool when mentions
    // are known to be a sampled subset; it never touches the per-seat price.
    const capturable = demand_weight * VOLUME_MULTIPLIER * inclusion_gap * CONSIDERATION_RATE;

    // Dollar value of that unconverted consideration pool.
    const revenue_at_risk = capturable * CONVERSION_RATE * VALUE_PER_CONVERSION;

    return {
      prompt: p.prompt,
      avg_position: +p.avg_position.toFixed(2),
      mentions: p.mentions,
      inclusion_gap: +inclusion_gap.toFixed(3),
      capturable: +capturable.toFixed(2),
      revenue_at_risk: +revenue_at_risk.toFixed(2),
    };
  })
  .sort((a, b) => b.revenue_at_risk - a.revenue_at_risk); // highest risk first

// ─── Roll-up total ─────────────────────────────────────────────────────────────
const total_at_risk = +by_prompt
  .reduce((sum, p) => sum + p.revenue_at_risk, 0)
  .toFixed(2);

// ─── Write back into pressroom.json ───────────────────────────────────────────
pressroom.revenue = {
  generated: new Date().toISOString(),
  total_at_risk,
  assumptions: {
    consideration_rate: CONSIDERATION_RATE,
    conversion_rate: CONVERSION_RATE,
    value_per_conversion: VALUE_PER_CONVERSION,
    volume_multiplier: VOLUME_MULTIPLIER,
    gap_cap: GAP_CAP,
  },
  by_prompt,
};

fs.writeFileSync('pressroom.json', JSON.stringify(pressroom, null, 2));

// ─── Console summary ───────────────────────────────────────────────────────────
const fmt = n => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

console.log('✅  revenue_ladder written to pressroom.json');
console.log(`\nTotal monthly revenue at risk: ${fmt(total_at_risk)}`);
console.log(`Prompts analyzed: ${by_prompt.length} (avg_position > 3)\n`);

console.log('Top riskiest prompts:');
by_prompt.slice(0, 5).forEach((p, i) => {
  const rank = String(i + 1).padStart(2);
  const risk = fmt(p.revenue_at_risk).padStart(9);
  const pos  = String(p.avg_position).padStart(5);
  const gap  = p.inclusion_gap.toFixed(2);
  console.log(`  ${rank}. ${risk} | pos ${pos} | gap ${gap} | ${p.prompt}`);
});

console.log('\nAssumptions used:');
console.log(`  CONSIDERATION_RATE   = ${CONSIDERATION_RATE}  (${CONSIDERATION_RATE * 100}% of impressions consider)`);
console.log(`  CONVERSION_RATE      = ${CONVERSION_RATE}  (${CONVERSION_RATE * 100}% of considers convert)`);
console.log(`  VALUE_PER_CONVERSION = ${fmt(VALUE_PER_CONVERSION)} annual customer value (per-seat, never scaled)`);
console.log(`  VOLUME_MULTIPLIER    = ${VOLUME_MULTIPLIER}  (scales demand pool; set to 1/sampleFraction if mentions are sampled)`);
console.log(`  GAP_CAP              = ${GAP_CAP} positions  (normalization ceiling)`);

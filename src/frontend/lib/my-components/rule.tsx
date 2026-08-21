import { formatDozenal } from '../game/rules';

const ruleSections = [
  {
    title: 'Goal',
    content: <p>Create Sets and Runs while keeping your Deadwood score as low as possible.</p>,
  },
  {
    title: 'Your turn',
    content: (
      <ol className="list-decimal space-y-1 pl-5">
        <li>Draw from the Stock or Discard pile.</li>
        <li>You now have 13 cards.</li>
        <li>Discard one card.</li>
        <li>Your turn ends with 12 cards.</li>
      </ol>
    ),
  },
  {
    title: 'Sets',
    content: <p>3 or 4 cards of the same rank in different suits. <RuleExample>7♠ 7♥ 7♦</RuleExample></p>,
  },
  {
    title: 'Runs',
    content: <p>3 or more consecutive cards of one suit. <RuleExample>9♠ ↊♠ ↋♠ 10♠</RuleExample></p>,
  },
  {
    title: 'Deadwood',
    content: <p>Cards outside your best combination of Sets and Runs. Lower Deadwood is better.</p>,
  },
  {
    title: 'Knock',
    content: <p>After discarding, you may Knock with <RuleExample>{formatDozenal(12)} or less</RuleExample> in Deadwood.</p>,
  },
  {
    title: 'Gin',
    content: <p>If all 12 cards form melds after your discard, you have Gin. Bonus: <RuleExample>{formatDozenal(36)}</RuleExample>.</p>,
  },
  {
    title: 'Big Gin',
    content: <p>If all 13 cards form melds immediately after drawing, declare Big Gin without discarding. Bonus: <RuleExample>{formatDozenal(45)}</RuleExample>.</p>,
  },
  {
    title: 'Lay Off',
    content: <p>After a normal Knock, the opponent may attach eligible Deadwood to the Knocker&apos;s melds. Lay Off is not allowed against Gin or Big Gin.</p>,
  },
  {
    title: 'Undercut',
    content: <p>If the opponent&apos;s Deadwood after Lay Off is equal to or lower than the Knocker&apos;s, the opponent wins with a <RuleExample>{formatDozenal(36)}</RuleExample> bonus.</p>,
  },
  {
    title: 'Scoring',
    content: <p>A normal Knock scores the Deadwood difference. Gin, Big Gin, and Undercut add their listed bonus.</p>,
  },
];

function RuleExample({ children }: { children: React.ReactNode }) {
  return <span className="mt-2 block rounded border border-[#a7894a]/25 bg-[#163426]/[0.06] px-3 py-2 font-mono font-semibold text-[#173728]">{children}</span>;
}

export default function DozenalGinRummyRules() {
  return (
    <div className="space-y-5 px-5 py-5 text-sm leading-6 text-[#30473b]">
      <div className="rounded-md border border-[#a7894a]/25 bg-[#fffaf0]/70 p-4">
        <h3 className="font-serif text-lg font-semibold text-[#102b1d]">Base-12 Gin Rummy</h3>
        <p className="mt-1">A two-player Gin Rummy game using a 64-card deck with 16 ranks per suit.</p>
      </div>

      {ruleSections.map((section) => (
        <section key={section.title} className="border-b border-[#173728]/10 pb-4 last:border-0">
          <h3 className="mb-1 font-serif text-base font-semibold text-[#173728]">{section.title}</h3>
          {section.content}
        </section>
      ))}

      <section className="rounded-md border border-[#a7894a]/30 bg-[#173728] p-4 text-[#f6eedb]">
        <h3 className="font-serif text-base font-semibold text-white">Base-12 numbers</h3>
        <p className="mt-2">↊ = decimal 10 · ↋ = decimal 11 · 10₁₂ = decimal 12</p>
        <p className="mt-3 font-mono text-[13px] tracking-wide text-[#e6cd8d]">… 8 · 9 · ↊ · ↋ · 10 · J · C · Q · K</p>
      </section>
    </div>
  );
}

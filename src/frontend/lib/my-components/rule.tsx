import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const DozenalGinRummyRules = () => {
  return (
    // <div className="overflow-y-auto overflow-x-hidden w-full p-6 space-y-6 max-w-4xl mx-auto">
    <div className="h-full w-full overflow-y-auto p-4 space-y-4 text-sm">
      {/* <h1 className="text-3xl font-bold">Dozenal Gin Rummy Rules</h1> */}

      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="text-xl font-semibold">1. Objective</h2>
          <p>Arrange your cards into melds (sets or runs), reduce deadwood, and score effectively in the dozenal number base.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="text-xl font-semibold">2. Number of Players</h2>
          <p>2 players.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="text-xl font-semibold">3. Deck</h2>
          <ul className="list-disc list-inside">
            <li>16d/14z cards per suit, total 64d/54z cards (4 suits × 16d/14z)</li>
            <li>Suits: Spades (♠), Hearts (♥), Diamonds (♦), Clubs (♣)</li>
            <li>Ranks: 1, 2, 3, 4, 5, 6, 7, 8, 9, ↊, ↋, 10, J, C, Q, K</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="text-xl font-semibold">4. Card Values</h2>
          <ul className="list-disc list-inside">
            <li>1–9, ↊, ↋ have point values equal to their face values</li>
            <li>10z, J, C, Q, K are all worth 10z points</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="text-xl font-semibold">5. Dealing</h2>
          <p>Each player receives 10z cards.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="text-xl font-semibold">6. Turn Sequence</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong>Start of Round:</strong> Starting player clicks &quotDeal&quot, may take or pass the first face-up card.
            </li>
            <li>
              <strong>Draw:</strong> Draw one card from stock pile (face-down) or discard pile (face-up).
            </li>
            <li>
              <strong>Meld:</strong> Form valid combinations:
              <ul className="list-disc list-inside ml-4">
                <li>Runs: 3+ consecutive cards of the same suit</li>
                <li>Sets: 3 or 4 cards of same rank, different suits</li>
              </ul>
            </li>
            <li>
              <strong>Discard:</strong> Discard one card (not the same drawn from discard pile).
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="text-xl font-semibold">7. End of Round and Scoring</h2>
          <ul className="list-disc list-inside">
            <li><strong>Gin:</strong> All cards melded, no deadwood. +30z bonus added to opponent&quots deadwood.</li>
            <li><strong>Big Gin:</strong> 11thz card also melded. +39z bonus added to opponent&quots deadwood.</li>
            <li><strong>Knock:</strong> Deadwood ≤ 10z; if knocker has less deadwood, score difference.</li>
            <li><strong>Undercut:</strong> If opponent has ≤ deadwood, gets +30z + difference; knocker gets 0.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="text-xl font-semibold">8. Scoring Table of Bonuses</h2>
          <table className="w-full table-auto border border-black border-collapse">
          <thead>
            <tr className="border-b border-black">
                <th className="p-2 text-left border border-black">Scenario</th>
                <th className="p-2 text-left border border-black">Dozenal Points</th>
                <th className="p-2 text-left border border-black">Decimal Equivalent</th>
            </tr>
        </thead>
        <tbody>
        <tr>
            <td className="p-2 border border-black">Gin Bonus</td>
            <td className="p-2 border border-black">30</td>
            <td className="p-2 border border-black">36</td>
        </tr>
        <tr>
            <td className="p-2 border border-black">Big Gin Bonus</td>
            <td className="p-2 border border-black">39</td>
            <td className="p-2 border border-black">45</td>
        </tr>
        <tr>
            <td className="p-2 border border-black">Undercut Bonus</td>
            <td className="p-2 border border-black">30 + diff</td>
            <td className="p-2 border border-black">36 + diff</td>
        </tr>
        <tr>
            <td className="p-2 border border-black">Game Bonus</td>
            <td className="p-2 border border-black">100</td>
            <td className="p-2 border border-black">144</td>
        </tr>
        <tr>
            <td className="p-2 border border-black">Line Bonus per hand</td>
            <td className="p-2 border border-black">30</td>
            <td className="p-2 border border-black">36</td>
        </tr>
        </tbody>

          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="text-xl font-semibold">9. Game End</h2>
          <p>The game continues over several rounds until a player reaches 100z points. Then line bonuses per hand won are added at the end.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DozenalGinRummyRules;

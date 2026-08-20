'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ScoreRound {
  round: number;
  p1Score?: number;
  p1Bonus?: number;
  p1Total?: number;
  p2Score?: number;
  p2Bonus?: number;
  p2Total?: number;
  result?: string;
}

interface ScoreSummary {
  rounds: ScoreRound[];
  p1TotalScore: number;
  p2TotalScore: number;
}

interface GameOverOverlayProps {
  isWin: boolean;
  p1TotalScore: number;
  p2TotalScore: number;
  onReturn?: () => void;
  scoreSummary: ScoreSummary;
  host: string;
  whosTurn: string;
  roomId: string;
  decimalToDozenal: (num: number) => string;
}

export default function GameOverOverlay({
  isWin,
  p1TotalScore,
  p2TotalScore,
  onReturn,
  scoreSummary,
  host,
  whosTurn,
  roomId,
  decimalToDozenal,
}: GameOverOverlayProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-80 flex flex-col items-center justify-center text-white text-center px-4 pointer-events-auto overflow-y-auto">
      <h1 className="text-5xl font-extrabold mb-6 animate-bounce">
        {isWin ? "🎉 You Win the Game!" : "😢 You Lose the Game!"}
      </h1>

      {/* 结算表格卡片 */}
      <div className="shadow-2xl border border-gray-300 rounded-2xl overflow-x-auto bg-white text-black p-6 w-full max-w-4xl">
        <table className="w-full table-auto text-base text-center border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-3 py-2"></th>
              <th colSpan={3} className="px-3 py-2">
                {roomId === 'tutorial' ? 'Robot' : 'Opponent'}
              </th>
              <th colSpan={3} className="px-3 py-2">You</th>
              <th className="px-3 py-2"></th>
            </tr>
            <tr>
              <th className="px-3 py-2">Round</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Bonus</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Bonus</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Result</th>
            </tr>
          </thead>
          <tbody>
            {scoreSummary?.rounds.map((round, index) => (
              <tr key={index} className="hover:bg-gray-100 transition">
                <td className="px-3 py-2">{round.round}</td>
                <td className="px-3 py-2">{decimalToDozenal(round.p1Score || 0)}</td>
                <td className="px-3 py-2">{decimalToDozenal(round.p1Bonus || 0)}</td>
                <td className="px-3 py-2">{decimalToDozenal(round.p1Total || 0)}</td>
                <td className="px-3 py-2">{decimalToDozenal(round.p2Score || 0)}</td>
                <td className="px-3 py-2">{decimalToDozenal(round.p2Bonus || 0)}</td>
                <td className="px-3 py-2">{decimalToDozenal(round.p2Total || 0)}</td>
                <td className="px-3 py-2">{round.result}</td>
              </tr>
            ))}
            <tr className="font-bold bg-gray-100 border-t border-gray-300">
              <td className="px-3 py-2">Total Score</td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2">{decimalToDozenal(scoreSummary?.p1TotalScore || 0)}</td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2">{decimalToDozenal(scoreSummary?.p2TotalScore || 0)}</td>
              <td className="px-3 py-2"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 返回按钮 */}
      <div className="mt-6">
        {onReturn ? (
          <Button className="w-[300px]" onClick={onReturn}>
            Return to Home
          </Button>
        ) : (
          <Link href="/home" passHref legacyBehavior>
            <a className="block w-[300px]">
              <Button className="w-full">Return to Home</Button>
            </a>
          </Link>
        )}
      </div>
    </div>
  );
}

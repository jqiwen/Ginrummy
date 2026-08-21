import { useState,useEffect, useRef } from 'react';
import { motion } from 'framer-motion'; 
import Image from 'next/image'; 

import { useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { Button } from "@/components/ui/button"

import { Card,PlayerSummary } from '../models/card-animation.model';
import GinRummyScore from './logics/calc-score';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { ScoreSummary,playingStatus,passingStatus,sendingNewCardPlace } from '../models/card-animation.model';
import { DraggableCard} from './drag-card'
import { CARDS_PER_HAND, KNOCK_THRESHOLD, MATCH_TARGET, formatDozenal } from '../game/rules';
import { AvatarDisplay,ChatBubble  } from '@my-components/avatar'
import GameOverOverlay from './game-end-overlay'
import { publicAssetPath } from '../publicAsset';
import {
  connectGameSocket,
  type DealState,
  type GameOperationEvent,
  type PassStatusEvent,
  type PlayerId,
  type RoundResultEvent,
} from '../socket';

export default function DealCards({ roomId, host, userName}: { roomId: string; host: string; userName: string}) {
  const [dealing, setDealing] = useState(false);
  const [currentPass, setCurrentPass] = useState<passingStatus>(null)

  const [p1Playing, setP1Playing] = useState<playingStatus>(null);
  const [p2Playing, setP2Playing] = useState<playingStatus>(null);
  const [player1Cards, setPlayer1Cards] = useState<PlayerSummary>({cards:[]});
  const [player2Cards, setPlayer2Cards] = useState<PlayerSummary>({cards:[]});

  const [p1DroppingCard, setP1DroppingCard] = useState<Card | null>(null); // p1 dropping card
  const [sendingNewCard, setSendingNewCard] = useState<sendingNewCardPlace>(null); // sending card from stack or dropzone
  const [remainingCards, setRemainingCards] = useState(0);
  const [dropZoneCards, setDropZoneCards] = useState<Card[]>([]); // drop zone cards

  const [scoreSummary, setScoreSummary] = useState<ScoreSummary>()

  const [matchID, setMatchID] = useState<string>(roomId)

  const [whosTurn, setWhosTurn] = useState<string>("1")

  const [lastPickedCard, setLastPickedCard] = useState<Card | null>(null)
  const [currentRound, setCurrentRound] = useState<number>(1)

  
  const [passResult, setPassResult] = useState<number | null>(null)
   
  const dropZoneRef = useRef<Card[]>([]);
  const [open, setOpen] = useState(false); 

  const [waitingNextRound, setWaitingNextRound] = useState<boolean>(false)

  const [isKnocked, setIsKnocked] = useState<boolean>(false)
  const [showDeadwoods, setShowDeadwoods] = useState<boolean>(false)
  const [canKnockAfterDiscard, setCanKnockAfterDiscard] = useState(false)

  const hasHandledP1Play = useRef(false);

  const myDeadwood = player2Cards.DeadwoodsPoint;
  const canDeclareBigGin = p2Playing === 'toDrop'
    && player2Cards.cards.length === CARDS_PER_HAND + 1
    && myDeadwood === 0;
  const canDeclareNormalKnock = canKnockAfterDiscard
    && player2Cards.cards.length === CARDS_PER_HAND
    && myDeadwood !== undefined
    && myDeadwood <= KNOCK_THRESHOLD;
  const canDeclare = canDeclareBigGin || canDeclareNormalKnock;
  const declarationLabel = canDeclareBigGin ? 'BIG GIN' : myDeadwood === 0 ? 'GIN' : 'KNOCK';
  const latestRound = scoreSummary?.rounds[scoreSummary.rounds.length - 1];
  const latestWinnerTotal = latestRound
    ? (whosTurn === host ? latestRound.p2Total : latestRound.p1Total)
    : 0;

  // const [actualPlayer, setActualPlayer] = useState("")


  // set which player deal
  useEffect(() => {
    if (whosTurn === "1" && !hasHandledP1Play.current) {
      hasHandledP1Play.current = true;
      host === "1" ? (setP2Playing("toDeal")) : setP1Playing("toDeal");

      // const thisActualPlayer = host === whosTurn ? "1" : "0"
      // console.log(" thisActualPlayer thisActualPlayer thisActualPlayer thisActualPlayer: ", thisActualPlayer);
      
      // setActualPlayer(thisActualPlayer)
    }


  }, [whosTurn, host]);
  
  async function startGame(){
    const socket = connectGameSocket();
    let thisGameID = matchID;

    if (roomId === 'tutorial') {
      const created = await new Promise<{ success: boolean; data?: { matchId: string } }>((resolve) => {
        socket.emit("room:create", { bot: true }, resolve);
      });
      if (!created.success || !created.data) {
        alert("Unable to create the tutorial match.");
        return;
      }
      thisGameID = created.data.matchId;
      setMatchID(thisGameID);
    }

    socket.emit("round:start", {
      matchId: thisGameID,
      playerId: host as PlayerId,
      round: currentRound,
      startWith: whosTurn as PlayerId,
    }, (response) => {
      if (!response.success) alert(response.message);
    });
  }

  function applyDeal(state: DealState) {
    setMatchID(state.matchId);
    setDropZoneCards([state.dropCard]);
    setPlayer1Cards(GinRummyScore(state.opponentCards));
    setPlayer2Cards(GinRummyScore(state.ownCards));
    setRemainingCards(state.remainingCards);
    setCanKnockAfterDiscard(false);
    setDealing(true);
    setTimeout(() => {
      setShowDeadwoods(true);
      if (state.firstPlayer === host) {
        setCurrentPass(2);
        setP2Playing("passOrPick");
        setP1Playing(null);
      } else {
        setCurrentPass(1);
        setP1Playing("passOrPick");
        setP2Playing(null);
      }
    }, 7400);
  }

useEffect(() => {
  dropZoneRef.current = dropZoneCards;
}, [dropZoneCards]);

  
  function resetAll(){
    setDealing(false)
    setDropZoneCards([])
    dropZoneRef.current = [];
    setOpen(false)
    setWaitingNextRound(false); 
    hasHandledP1Play.current = false
    setCurrentPass(null)
    setIsKnocked(false)
    setShowDeadwoods(false);
    setPassResult(null)
    setCanKnockAfterDiscard(false)

    const nextRound = currentRound + 1
    setCurrentRound(nextRound)
    
    if (whosTurn == host) {
      setP2Playing('toDeal')
      setP1Playing(null)
    } else {
      setP1Playing('toDeal')
      setP2Playing(null)
    }

  }


  async function get_card_from_stack(is_P2: boolean){
    setCanKnockAfterDiscard(false);
    const socket = connectGameSocket();
    socket.emit("game:draw-stack", {
      matchId: matchID,
      playerId: host as PlayerId,
      round: currentRound,
    }, (response) => {
      if (!response.success || !response.data) {
        alert(response.message);
        return;
      }
      setRemainingCards(response.data.remainingCards);
      setSendingNewCard('stack');
      if (is_P2) {
        setP2Playing('toDrop');
        setPlayer2Cards(GinRummyScore([...player2Cards.cards, response.data.card]));
      }
    });
  }

  useEffect(() => {
    if (!dealing) {
      setPlayer1Cards({cards:[]})
      setPlayer2Cards({cards:[]})
      setRemainingCards(0)
      setSendingNewCard(null)
    }
}, [dealing]);

    function handlePass() {
      setCanKnockAfterDiscard(false);
      setP2Playing(null);
      setP1Playing('toTake')
      const socket = connectGameSocket();
      socket.emit("game:pass", {
        matchId: matchID,
        playerId: host as PlayerId,
        round: currentRound,
      }, (response) => {
        if (!response.success) alert(response.message);
      });
      setCurrentPass(null)
    }

    // p2 拖动时move card
    function moveCard(fromIndex: number, toIndex: number, wholeCardList: Card[]) {
      const [movedCard] = wholeCardList.splice(fromIndex, 1);
      wholeCardList.splice(toIndex, 0, movedCard);
      setPlayer2Cards({
        ...player2Cards, 
        cards: wholeCardList, 
      });
    }

    // P2从stack拿 下一张牌
    async function handleNext(){
      setPassResult(null)
      switch (p2Playing) {
        case 'toDrop':
          alert('You need to discard.');
          break;
        case 'toTake':
          if (remainingCards > 0) {
            await get_card_from_stack(true)
            
          } else {
            if (dealing) {
              alert('No card to play!');
            } else {
              alert('Please deal the cards first!');
            }
          }
      }
    };

    // P2从dropzone拿 下一张牌
    // dropzone拿牌规则：LIFO，新牌添加在最后，pop取出，显示是从后往前显示
    async function handleDropZone(){
      setCanKnockAfterDiscard(false);
      setPassResult(null)
      if (p2Playing == 'toTake' || currentPass == 2){
        if (currentPass == 2) {
          setCurrentPass(null)
        }
        if (dropZoneCards && dropZoneCards.length > 0) {
          const socket = connectGameSocket();
          socket.emit("game:draw-discard", {
            matchId: matchID,
            playerId: host as PlayerId,
            round: currentRound,
          }, (response) => {
            if (!response.success || !response.data) {
              alert(response.message);
              return;
            }
            const newDropZoneCards = [...dropZoneCards];
            newDropZoneCards.pop();
            const pickedCard = response.data.card;
            setLastPickedCard(pickedCard)
            setSendingNewCard('dropzone');
            setP2Playing('toDrop');
            setTimeout(() => {
              const updatedCards = [...player2Cards.cards, pickedCard]
              setPlayer2Cards(GinRummyScore(updatedCards));
              setDropZoneCards(newDropZoneCards);
            }, 100);
          });
        } else {
          alert('No card in Drop Zone!');
        }
      }
    }

    // P2出牌到dropzone，添加在最后一张
    async function handleDrop(item: { card: Card; index: number }){
      switch (p2Playing) {
        case 'toTake':
          alert('You need to pick a card first.');
          break;
        case 'toDrop':

          if (lastPickedCard && item.card.name === lastPickedCard.name) {
            alert("⚠️ This card was just picked! Please choose a different card.");
            return;
          }
          const socket = connectGameSocket();
          socket.emit("game:discard", {
            matchId: matchID,
            playerId: host as PlayerId,
            round: currentRound,
            cardName: item.card.name,
          }, (response) => {
            if (!response.success) {
              alert(response.message);
              return;
            }
            setDropZoneCards([...dropZoneCards, item.card]);
            setLastPickedCard(null)
            const updatedCards = [...player2Cards.cards];
            updatedCards.splice(item.index, 1);
            const updatedSummary = GinRummyScore(updatedCards);
            setPlayer2Cards(updatedSummary);
            setCanKnockAfterDiscard(
              updatedSummary.cards.length === CARDS_PER_HAND
              && updatedSummary.DeadwoodsPoint !== undefined
              && updatedSummary.DeadwoodsPoint <= KNOCK_THRESHOLD,
            );
            setP1Playing("toTake")
            setP2Playing(null)
          });
      }
    };

    function handleP1PickAndDrop(dropCard: Card, newCard: Card) {
    
      const newHand = [...player1Cards.cards, newCard];
      setPlayer1Cards(GinRummyScore(newHand));
      setP1Playing('toDrop'); 
    
      setTimeout(() => {
        const dropIndex = newHand.findIndex((card) => card.name === dropCard.name);
        if (dropIndex === -1) {
          // console.warn("⚠️ Drop card not found after adding newCard:", dropCard.name);
          return;
        }
    
        const droppedCard = newHand[dropIndex];
        newHand.splice(dropIndex, 1);
    
        setPlayer1Cards(GinRummyScore(newHand));
        setP1DroppingCard({ ...droppedCard, index: dropIndex });
    
        setTimeout(() => {
          setDropZoneCards((prev) => [...prev, droppedCard]);
          setP1Playing(null);
          setP1DroppingCard(null);
          setP2Playing('toTake');
        }, 500);
      }, 800); 
    }
    
    function applyRoundResult(event: RoundResultEvent) {
      const myRounds = event.scoreSummary.rounds.map((round) => ({
        ...round,
        p1Score: round.p2Score,
        p1Bonus: round.p2Bonus,
        p1Total: round.p2Total,
        p2Score: round.p1Score,
        p2Bonus: round.p1Bonus,
        p2Total: round.p1Total,
      }));
      
      const mirroredScoreSummary: ScoreSummary = {
        p1TotalScore: event.scoreSummary.p2TotalScore,
        p2TotalScore: event.scoreSummary.p1TotalScore,
        rounds : myRounds
      }

      setIsKnocked(true);
      setScoreSummary(host === '1' ? event.scoreSummary : mirroredScoreSummary);
      setWhosTurn(event.winner);
      setOpen(true);
    }

    async function handleKnockFromMe() {
      if (!canDeclare) return;
      const socket = connectGameSocket();
      const knockResponse = await new Promise<{ success: boolean; message: string }>((resolve) => {
        socket.emit("game:knock", {
          matchId: matchID,
          playerId: host as PlayerId,
          round: currentRound,
        }, resolve);
      });
      if (!knockResponse.success) {
        alert(knockResponse.message);
        return;
      }
      setIsKnocked(true)
      setCanKnockAfterDiscard(false)
      setOpen(true)

    }
    
    
    async function handlePlayNextRound(){
      if (roomId == 'tutorial') {
        resetAll()
      } else {
        setWaitingNextRound(true)
        const socket = connectGameSocket();
        socket.emit("round:ready-next", {
          matchId: matchID,
          playerId: host as PlayerId,
          round: currentRound,
        }, (response) => {
          if (!response.success) alert(response.message);
        });
      }

    }

    useEffect(() => {
      if (roomId === 'tutorial') return;
      const socket = connectGameSocket();
      const resumeRoom = () => {
        socket.emit("room:resume", {
          matchId: roomId,
          playerId: host as PlayerId,
        }, (response) => {
          if (!response.success) alert(response.message);
        });
      };
      if (socket.connected) resumeRoom();
      socket.on("connect", resumeRoom);
      return () => {
        socket.off("connect", resumeRoom);
      };
    }, [roomId, host]);

    useEffect(() => {
      const socket = connectGameSocket();

      const onDeal = (state: DealState) => {
        if (state.playerId === host && (state.matchId === matchID || roomId === 'tutorial')) {
          applyDeal(state);
        }
      };
      const onOpponentAction = (event: GameOperationEvent) => {
        if (event.matchId !== matchID || event.playerId === host) return;
        setCanKnockAfterDiscard(false);
        setRemainingCards(event.remainingCards);
        if (event.operation === 'dropzone') {
          const newDropZone = [...dropZoneRef.current];
          newDropZone.pop();
          setDropZoneCards(newDropZone);
          setSendingNewCard('dropzone');
        } else {
          setSendingNewCard('stack');
        }
        setP1Playing('toDrop');
        handleP1PickAndDrop(event.droppedCard, event.pickedCard);
      };
      const onOpponentDrew = (event: { matchId: string; playerId: PlayerId }) => {
        if (event.matchId === matchID && event.playerId !== host) {
          setCanKnockAfterDiscard(false);
        }
      };
      const onPassStatus = (event: PassStatusEvent) => {
        if (event.matchId !== matchID || event.round !== currentRound) return;
        setPassResult(event.status === 'both-passed' ? 0 : 3);
        setCurrentPass(event.nextPlayerId === host ? 2 : 1);
        if (event.status === 'both-passed') {
          setCurrentPass(null);
          setP2Playing(event.nextPlayerId === host ? 'toTake' : null);
          setP1Playing(event.nextPlayerId === host ? null : 'toTake');
        } else {
          setP2Playing(event.nextPlayerId === host ? 'passOrPick' : null);
          setP1Playing(event.nextPlayerId === host ? null : 'passOrPick');
        }
      };
      const onKnocked = (event: { matchId: string; round: number; playerId: PlayerId }) => {
        if (event.matchId === matchID && event.round === currentRound && event.playerId !== host) {
          setIsKnocked(true);
        }
      };
      const onRoundResult = (event: RoundResultEvent) => {
        if (event.matchId === matchID && event.round === currentRound) {
          applyRoundResult(event);
        }
      };
      const onBothReady = (event: { matchId: string; round: number }) => {
        if (event.matchId === matchID && event.round === currentRound) resetAll();
      };
      const onPlayerLeft = (event: { matchId: string; playerId: PlayerId }) => {
        if (event.matchId === matchID && event.playerId !== host) {
          alert("Your opponent disconnected.");
        }
      };

      socket.on("game:dealing-started", onDeal);
      socket.on("game:opponent-action", onOpponentAction);
      socket.on("game:opponent-drew", onOpponentDrew);
      socket.on("game:pass-status", onPassStatus);
      socket.on("game:knocked", onKnocked);
      socket.on("round:result", onRoundResult);
      socket.on("round:both-ready", onBothReady);
      socket.on("room:player-left", onPlayerLeft);
      return () => {
        socket.off("game:dealing-started", onDeal);
        socket.off("game:opponent-action", onOpponentAction);
        socket.off("game:opponent-drew", onOpponentDrew);
        socket.off("game:pass-status", onPassStatus);
        socket.off("game:knocked", onKnocked);
        socket.off("round:result", onRoundResult);
        socket.off("round:both-ready", onBothReady);
        socket.off("room:player-left", onPlayerLeft);
      };
    }, [matchID, roomId, host, currentRound, player1Cards, whosTurn]);
    
    function DropZone(){
      const [{ isOver }, drop] = useDrop({
        accept: 'CARD',
        drop: (item: { card: Card; index: number }) => handleDrop(item),
        collect: (monitor) => ({
          isOver: !!monitor.isOver(),
        }),
      });

      const ref = useRef<HTMLDivElement | null>(null);
      useEffect(() => {
        if (ref.current) {
          drop(ref.current);
        }
      }, [drop]);

      const canPickFromDropZone = (p2Playing === 'toTake' && passResult !== 0) || currentPass === 2;


      return (
        <div
          ref={ref}
          // onClick={handleDropZone}
          onClick={() => {
            if (!canPickFromDropZone) return;
            handleDropZone();
          }}
          className={`w-[100px] h-[136.72px] ${
            isOver ? 'bg-blue-200' : 'bg-white'
          } flex items-center justify-center relative`}
        >
          {dropZoneCards.map((card, idx) => (
            card && card.image ? (
              <Image
                key={`dropzone-card-${idx}`}
                src={publicAssetPath(card.image)}
                alt={card.name}
                width={100}
                height={150}
                draggable="false"
                className="object-contain absolute cursor-pointer"
                style={{
                  top: `0px`,
                  left: `0px`,
                  zIndex: idx,
                  cursor: (p2Playing === 'toTake' && passResult != 0) || currentPass == 2 ? 'pointer' : 'not-allowed', 
                  // pointerEvents: (p2Playing === 'toTake' && passResult != 0) || currentPass == 2 ? 'auto' : 'none', 
                }}
              />
            ) : (
              <p key={`dropzone-card-${idx}`} >Card image missing</p>
            )
          ))}
        </div>
      );
    };

  return (
    <DndProvider backend={HTML5Backend}>

      <div className="h-full w-full flex flex-col items-center justify-center select-none">

        {/* Player1 avatar*/}
        <AvatarDisplay image={publicAssetPath('/main-image/avatar-robot.jpg')} player={1} name={roomId == 'tutorial' ? 'Robot' : host == '1' ? 'Player 2' : 'Player 1'} p2Playing={p2Playing} p1Playing={p1Playing} currentPass={currentPass}/>

        <div className="relative flex items-center justify-center w-full h-[500px] gap-4">
            {/* Player1 */}
            {dealing &&
                player1Cards.cards.map((card, index) => (
                  <motion.div
                  key={`player1-${index}`}
                  initial={sendingNewCard == 'dropzone'?  {x: 60,opacity:0.8}:{ x: -75, y: 0, opacity: 1}}
                  animate={{ 
                      x: -100 * (index - 6), 
                      y: -150, 
                      opacity: 1,}}
                      transition={{
                        delay:
                          sendingNewCard
                            ? 0
                            : whosTurn === host
                            ? index * 0.6 // ✅ host先发对手，对手延迟
                            : index * 0.6 + 0.3,      // ✅ 非host，先发自己
                        duration: 0.8,
                        type: 'spring',
                      }}
                  className="absolute"
                  style={{zIndex: 6,boxShadow: '0 4px 8px rgba(255, 255, 255, 0.5)'}}
                  >
                        {/* <Image
                            src="/cards-image/back.svg.png"
                            alt={`Card ${index + 1}`}
                            width={100}
                            height={150}
                            draggable="false"
                            className="object-contain cursor-not-allowed"
                        /> */}
                        {/* <Image
                            src={card.image}
                            alt={`Card ${index + 1}`}
                            width={100}
                            height={150}
                            draggable="false"
                            className="object-contain cursor-not-allowed"
                        /> */}
                        <Image
                          src={publicAssetPath(isKnocked ? card.image : "/cards-image/back.svg.png")}
                          alt={`Card ${index + 1}`}
                          width={100}
                          height={150}
                          draggable="false"
                          className="object-contain cursor-not-allowed"
                        />

                    </motion.div>
            ))}

            {/* middle card stack */}
            <div className="flex relative flex-row gap-6 items-center justify-center text-center">
                <Image
                    src={publicAssetPath("/cards-image/back.svg.png")}
                    alt="Deck"
                    width={100}
                    height={150}
                    draggable="false"
                    className="object-contain"
                    style={{
                      cursor: p2Playing === 'toTake' ? 'pointer' : 'not-allowed', 
                      zIndex:1,
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
                    }}
                    onClick={handleNext}
                />

                <DropZone />

                {p1DroppingCard && (
                  <motion.div
                    initial={{ x: p1DroppingCard.index? -100 * (p1DroppingCard.index-5) : -100, y: -150, opacity: 1, zIndex:100 }} 
                    animate={{ x: 60, y: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    className="absolute"
                  >
                    {p1DroppingCard && p1DroppingCard.image ? (
                      <Image
                        src={publicAssetPath(p1DroppingCard.image)}
                        alt={p1DroppingCard.name}
                        width={100}
                        height={150}
                        draggable="false"
                        className="object-contain"
                        style={{
                          zIndex:7
                        }}
                      />
                    ) : (
                      <p>Card image missing</p>
                    )}
                  </motion.div>
                )}

                {/* {!dealing && whosTurn == host ? (
                    <Button
                    className="absolute left-full ml-4 px-4 py-2 w-[100px] bg-blue-500 text-white rounded"
                    onClick={startGame}
                    >
                    Deal
                    </Button>
                ) :  (
                  <div style={{ width: "0px", height: "40px" }} />
                )}

                {dealing && whosTurn != host && currentPass && room ? (
                    <Button
                    className="absolute left-full ml-4 px-4 py-2 w-[100px] bg-blue-500 text-white rounded"
                    onClick={handlePass}
                    >
                    Pass
                    </Button>
                ) : (
                  <div style={{ width: "0px", height: "40px" }} />
                )} 
                  */}

                 {!dealing && whosTurn == host ? (
                    <Button
                    className="absolute left-full ml-4 px-4 py-2 w-[100px] bg-blue-500 text-white rounded"
                    onClick={startGame}
                    >
                    Deal
                    </Button>
                ) : ( (dealing && whosTurn == host && currentPass && roomId == 'tutorial') ||  ((dealing && p2Playing == 'passOrPick')) ? (
                    <Button
                    className="absolute left-full ml-4 px-4 py-2 w-[100px] bg-blue-500 text-white rounded"
                    onClick={handlePass}
                    >
                    Pass
                    </Button>
                ) : (
                  <div style={{ width: "0px", height: "40px" }} />
                ))}

                {dealing && whosTurn === host && currentPass && roomId === 'tutorial' && (
                  <div className="absolute left-[calc(100%+120px)] top-1/2 ml-4 w-[400px] -translate-y-1/2 text-left text-sm leading-5 text-red-500">
                    <div className="font-semibold">Tutorial only</div>
                    <div>In a real game, the non-dealer is the first to decide to pass or pick the first card.</div>
                  </div>
                )}


            </div>

            {/* Player2 */}
            {dealing && 
                player2Cards.cards.map((card, index) => (
                <motion.div
                    key={`player2-${index}`}
                    initial={sendingNewCard == 'dropzone'?  {x: 60,opacity:0.5}:{ x: -75, y: 0, opacity: 0}}
                    animate={{ 
                        x: 100 * (index - 6), 
                        y: 150, 
                        opacity: 1,}}
                        transition={{
                          delay:
                            sendingNewCard
                              ? 0
                              : whosTurn === host
                              ? index * 0.6 + 0.3 // ✅ host先发对手
                              : index * 0.6, // ✅ 非host先发自己
                          duration: 0.8,
                          type: 'spring',
                        }}
                    className="absolute"
                    style={{zIndex: 50,
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'}}
                    >
                      <DraggableCard
                          key={index}
                          index={index??10}
                          card={card}
                          moveCard={(from, to,wholeCardList) => moveCard(from, to,wholeCardList)}
                          p2Playing ={p2Playing}
                          wholeCardList = {player2Cards.cards}
                      />
                </motion.div>
                ))}
        </div>

        {/* Player2 avatar*/}
        <div className="relative flex items-center justify-center w-full">

        {dealing && showDeadwoods && (
          <div  className="absolute flex flex-col items-center justify-center gap-2"
                style={{
                  top: '50%',
                  transform: 'translateY(-50%)',
                  whiteSpace: 'nowrap',
                  left: 'calc(50% - 500px)',
                }}>

            <div className="px-2 py-1 flex flex-row items-center rounded-lg bg-gray-300 text-gray-700 shadow-xl bg-opacity-60 mt-4">
              <div className="flex items-center space-x-2">
                <span>Sets:</span>
                <div className="flex flex-row space-x-2">
                  {player2Cards.Sets?.map((card, index) => (
                    <div key={index} className={`font-black ${card.color}`}>
                      {card.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-2 py-1 flex flex-row items-center rounded-lg bg-gray-300 text-gray-700 shadow-xl bg-opacity-60 mt-4">
              <div className="flex items-center space-x-2">
                <span>Runs:</span>
                <div className="flex flex-row space-x-2">
                  {player2Cards.Runs?.map((card, index) => (
                    <div key={index} className={`font-black ${card.color}`}>
                      {card.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-2 py-1 flex flex-row items-center rounded-lg bg-gray-300 text-gray-700 shadow-xl bg-opacity-60 mt-4">
              <div className="flex items-center space-x-2">
                <span>Deadwood ({formatDozenal(player2Cards.DeadwoodsPoint ?? 0)}):</span>
                <div className="flex flex-row space-x-2">
                  {player2Cards.Deadwoods?.map((card, index) => (
                    <div key={index} className={`font-black ${card.color}`}>
                      {card.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}


          <AvatarDisplay image={publicAssetPath('/main-image/avatar-user.jpg')} player={2} name={roomId == 'tutorial' ? userName : host == '1' ? 'Player 1' : 'Player 2'}  p2Playing={p2Playing} p1Playing={p1Playing} currentPass={currentPass}/>

          {p2Playing == 'passOrPick' && (
            <div
              className="absolute ml-4 p-4"
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                left: 'calc(50% + 60px)',
              }}
            >
                <ChatBubble content={'PICK OR PASS'}  bgColor={'bg-yellow-200'} />
              
            </div>
          )}
           {p2Playing == 'pickTop' && (
            <div
              className="absolute ml-4 p-4"
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                left: 'calc(50% + 60px)',
              }}
            >
                <ChatBubble content={'PICK TOP'}  bgColor={'bg-yellow-200'} />
              
            </div>
          )}
          {p2Playing == 'toTake' && (
            <div
              className="absolute ml-4 p-4"
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                left: 'calc(50% + 60px)',
              }}
            >
                <ChatBubble content={'PICK A CARD'}  bgColor={'bg-yellow-200'} />
              
            </div>
          )}
          {p2Playing == 'toDrop' && (
            <div
              className="absolute ml-4 p-4"
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                left: 'calc(50% + 60px)',
              }}
            >
                <ChatBubble content={ 'DRAG TO DISCARD'}  bgColor={'bg-yellow-200'} />
            </div>
          )}
          {p2Playing == 'toDeal' && (
            <div
              className="absolute ml-4 p-4"
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                left: 'calc(50% + 60px)',
              }}
            >
                <ChatBubble content={ 'CLICK DEAL'}  bgColor={'bg-yellow-200'} />
            </div>
          )}

          {dealing &&(
            <Dialog open={open} onOpenChange={setOpen}>
              {canDeclare && (
                 <button
                      type="button"
                      className="absolute flex h-[84px] w-[84px] cursor-pointer items-center justify-center rounded-full border-2 border-[#f8df9a] bg-[#a91d1d] text-center text-sm font-bold text-white shadow-xl transition hover:scale-105 hover:bg-[#c32626] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f8df9a]/60"
                      style={{
                        top: '50%',
                        transform: 'translateY(-50%)',
                        whiteSpace: 'nowrap',
                        left: 'calc(50% + 500px)',
                      }}
                      onClick={() => {handleKnockFromMe();}}
                      aria-label={`Declare ${declarationLabel}`}
                    >
                      {declarationLabel}
                  </button>
              )}
            {!waitingNextRound ? (
              <DialogContent className="[&>button]:hidden">
                <DialogHeader>
                  <DialogTitle className="flex flex-col items-center justify-center gap-1">
                    {latestRound && (
                      <span className="font-serif text-3xl font-extrabold uppercase text-[#173728]">
                        {latestRound.result}!
                      </span>
                    )}
                    {latestRound && latestWinnerTotal > 0 && (
                      <span className="text-lg font-semibold text-[#8b1f1f]">+{formatDozenal(latestWinnerTotal)}</span>
                    )}
                    <span className="text-sm font-medium text-muted-foreground">
                      {whosTurn == host ? "You win this round 😊" : "You lose this round 😢"}
                    </span>
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Table>
                    <TableHeader className="bg-gray-200">
                      <TableRow>
                        <TableCell className="font-bold text-center"></TableCell>
                        <TableCell colSpan={3} className="font-bold text-center">
                          {roomId === 'tutorial' ? 'Robot' : 'Opponent'}
                        </TableCell>
                        <TableCell colSpan={3} className="font-bold text-center"> You</TableCell>
                        <TableCell  className="font-bold text-center"></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-bold text-center">Round</TableCell>
                        {/* Player 1 Headers */}
                        <TableCell className="font-bold text-center">Score</TableCell>
                        <TableCell className="font-bold text-center">Bonus</TableCell>
                        <TableCell className="font-bold text-center">Total</TableCell>
                        {/* Player 2 Headers */}
                        <TableCell className="font-bold text-center">Score</TableCell>
                        <TableCell className="font-bold text-center">Bonus</TableCell>
                        <TableCell className="font-bold text-center">Total</TableCell>
                        <TableCell className="font-bold text-center">Result</TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>

                      {scoreSummary && scoreSummary.rounds.map((round, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-center">{round.round }</TableCell>
                                <TableCell className="text-center">{formatDozenal(round.p1Score || 0)}</TableCell>
                                <TableCell className="text-center">{formatDozenal(round.p1Bonus || 0)}</TableCell>
                                <TableCell className="text-center">{formatDozenal(round.p1Total || 0)}</TableCell>
                                <TableCell className="text-center">{formatDozenal(round.p2Score || 0)}</TableCell>
                                <TableCell className="text-center">{formatDozenal(round.p2Bonus || 0)}</TableCell>
                                <TableCell className="text-center">{formatDozenal(round.p2Total || 0)}</TableCell>
                                <TableCell className="text-center">{round.result}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow>
                              <TableCell className="font-semibold text-center">Total Score</TableCell>
                              {/* <TableCell className="text-center">{decimalToDozenal(scoreSummary?.p1TotalScore || 0) }</TableCell> */}
                              <TableCell className="text-center"></TableCell>
                              <TableCell className="text-center"></TableCell>
                              <TableCell className="text-center">{formatDozenal(scoreSummary?.p1TotalScore || 0)}</TableCell>
                              {/* <TableCell className="text-center">{decimalToDozenal(scoreSummary?.p2TotalScore || 0)}</TableCell> */}
                              <TableCell className="text-center"></TableCell>
                              <TableCell className="text-center"></TableCell>
                              <TableCell className="text-center">{formatDozenal(scoreSummary?.p2TotalScore || 0)}</TableCell>
                              <TableCell className="text-center"></TableCell>
                            </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handlePlayNextRound}>Play next round</Button>
               
                </DialogFooter>
                </DialogContent>
          ) : (
            <DialogContent className="text-center p-6 space-y-4 rounded-2xl shadow-xl [&>button]:hidden">
              <style jsx>{`
                .close-button, [data-dialog-close] {
                  display: none !important;
                }
              `}</style>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-gray-800 mb-2">
                  ⏳ Waiting...
                </DialogTitle>
              </DialogHeader>

              <div className="flex justify-center items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce delay-150" />
                <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce delay-300" />
              </div>

              <p className="text-muted-foreground text-m">
                Please wait while your opponent gets ready.
              </p>
              <DialogFooter>
              </DialogFooter>
            </DialogContent>
          )}
            </Dialog>
          )}
        </div>
      </div>


      {scoreSummary && (scoreSummary.p1TotalScore >= MATCH_TARGET || scoreSummary.p2TotalScore >= MATCH_TARGET) && (
        <GameOverOverlay
          isWin={scoreSummary.p2TotalScore >= MATCH_TARGET}
          scoreSummary={scoreSummary}
          roomId={roomId}
        />
      )}
    </DndProvider>
    

  )
}

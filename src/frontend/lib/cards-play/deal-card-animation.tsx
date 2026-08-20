import { useState,useEffect, useRef } from 'react';
import { motion } from 'framer-motion'; 
import Image from 'next/image'; 

import { useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { Button } from "@/components/ui/button"

import { CARDS } from '../data/cards.data';
import { Card,PlayerSummary } from '../models/card-animation.model';
import GinRummyScore from './logics/calc-score';

import { calculateLayingOff } from './logics/laying-off';
import { calculateRoundScore } from './logics/calc-knock';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { ScoreSummary,playingStatus,passingStatus,sendingNewCardPlace } from '../models/card-animation.model';
import { DraggableCard} from './drag-card'
import { decimalToDozenal } from './logics/count-dozenal';
import { AvatarDisplay,ChatBubble  } from '@my-components/avatar'
import GameOverOverlay from './game-end-overlay'

// const backend_url = "http://127.0.0.1:8080"
// const backend_url = "http://localhost:8080";
const backend_url = process.env.BACKEND_URL || "https://backend.ginrummys.ca";


function getRandomCards(cards: Card[]): Card[] {
  return [...cards].sort(() => 0.5 - Math.random()); // set random rards
  
}

export default function DealCards({ roomId, host, userName}: { roomId: string; host: string; userName: string}) {
  const [dealing, setDealing] = useState(false);
  const [currentPass, setCurrentPass] = useState<passingStatus>(null)

  const [p1Playing, setP1Playing] = useState<playingStatus>(null);
  const [p2Playing, setP2Playing] = useState<playingStatus>(null);
  const [player1Cards, setPlayer1Cards] = useState<PlayerSummary>({cards:[]});
  const [player2Cards, setPlayer2Cards] = useState<PlayerSummary>({cards:[]});

  const [p1DroppingCard, setP1DroppingCard] = useState<Card | null>(null); // p1 dropping card
  const [sendingNewCard, setSendingNewCard] = useState<sendingNewCardPlace>(null); // sending card from stack or dropzone
  const [remainingCards, setRemainingCards] = useState<Card[]>([]); // remaining cards in main stack, 
  const [dropZoneCards, setDropZoneCards] = useState<Card[]>([]); // drop zone cards

  const [scoreSummary, setScoreSummary] = useState<ScoreSummary>()

  const [matchID, setMatchID] = useState<string>(roomId)

  const [whosTurn, setWhosTurn] = useState<string>("1")

  const [lastPickedCard, setLastPickedCard] = useState<Card | null>(null)
  const [currentRound, setCurrentRound] = useState<number>(1)

  
  const [passResult, setPassResult] = useState(null)
   
  const dropZoneRef = useRef<Card[]>([]);
  const hasHandlePass = useRef(false)

  const [open, setOpen] = useState(false); 

  const [waitingNextRound, setWaitingNextRound] = useState<boolean>(false)

  const [isKnocked, setIsKnocked] = useState<boolean>(false)
  const [showDeadwoods, setShowDeadwoods] = useState<boolean>(false)

  const [restart, setRestart] = useState<boolean>(false)

  const shuffledCards = getRandomCards(CARDS); 
  const initialCardsNumber = 24


  const hasHandledP1Play = useRef(false);

  const hasHandledPass = useRef(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentPassRef = useRef(currentPass);

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
  
  // click deal，host start game
  async function startGame(){ 
    const initialCards: Card[] = [];
    const p1Cards: Card[] = [];
    const p2Cards: Card[] = [];

    let thisGameID = ''
    if (roomId != 'tutorial'){
      thisGameID = roomId
    }

    if (roomId == 'tutorial'){
      await fetch(`${backend_url}/api/match_create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bot: 'True'
        })
      })
      .then((response) => response.json())
      .then((data) => {
        thisGameID = data['match_id']
        setMatchID(thisGameID)
      })
    }
    setMatchID(thisGameID)

    await fetch(`${backend_url}/api/match_start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        host: host,
        current_host: whosTurn,
        matchid: thisGameID,
        round:currentRound
      })
    })
    .then((response) => response.json()).then((data) => {
      setDropZoneCards([{ order:data["order0"], point: data["point0"], name: data["name0"], image: data["image0"], color: data["color0"], text: data["text0"] }])
        p1Cards.push({ order:data["order1"], point: data["point1"], name: data["name1"], image: data["image1"], color: data["color1"], text: data["text1"] })
        p2Cards.push({ order:data["order2"], point: data["point2"], name: data["name2"], image: data["image2"], color: data["color2"], text: data["text2"] })
        p1Cards.push({ order:data["order3"], point: data["point3"], name: data["name3"], image: data["image3"], color: data["color3"], text: data["text3"] })
        p2Cards.push({ order:data["order4"], point: data["point4"], name: data["name4"], image: data["image4"], color: data["color4"], text: data["text4"] })
        p1Cards.push({ order:data["order5"], point: data["point5"], name: data["name5"], image: data["image5"], color: data["color5"], text: data["text5"] })
        p2Cards.push({ order:data["order6"], point: data["point6"], name: data["name6"], image: data["image6"], color: data["color6"], text: data["text6"] })
        p1Cards.push({ order:data["order7"], point: data["point7"], name: data["name7"], image: data["image7"], color: data["color7"], text: data["text7"] })
        p2Cards.push({ order:data["order8"], point: data["point8"], name: data["name8"], image: data["image8"], color: data["color8"], text: data["text8"] })
        p1Cards.push({ order:data["order9"], point: data["point9"], name: data["name9"], image: data["image9"], color: data["color9"], text: data["text9"] })
        p2Cards.push({ order:data["order10"], point: data["point10"], name: data["name10"], image: data["image10"], color: data["color10"], text: data["text10"] })
        p1Cards.push({ order:data["order11"], point: data["point11"], name: data["name11"], image: data["image11"], color: data["color11"], text: data["text11"] })
        p2Cards.push({ order:data["order12"], point: data["point12"], name: data["name12"], image: data["image12"], color: data["color12"], text: data["text12"] })
        p1Cards.push({ order:data["order13"], point: data["point13"], name: data["name13"], image: data["image13"], color: data["color13"], text: data["text13"] })
        p2Cards.push({ order:data["order14"], point: data["point14"], name: data["name14"], image: data["image14"], color: data["color14"], text: data["text14"] })
        p1Cards.push({ order:data["order15"], point: data["point15"], name: data["name15"], image: data["image15"], color: data["color15"], text: data["text15"] })
        p2Cards.push({ order:data["order16"], point: data["point16"], name: data["name16"], image: data["image16"], color: data["color16"], text: data["text16"] })
        p1Cards.push({ order:data["order17"], point: data["point17"], name: data["name17"], image: data["image17"], color: data["color17"], text: data["text17"] })
        p2Cards.push({ order:data["order18"], point: data["point18"], name: data["name18"], image: data["image18"], color: data["color18"], text: data["text18"] })
        p1Cards.push({ order:data["order19"], point: data["point19"], name: data["name19"], image: data["image19"], color: data["color19"], text: data["text19"] })
        p2Cards.push({ order:data["order20"], point: data["point20"], name: data["name20"], image: data["image20"], color: data["color20"], text: data["text20"] })
        p1Cards.push({ order:data["order21"], point: data["point21"], name: data["name21"], image: data["image21"], color: data["color21"], text: data["text21"] })
        p2Cards.push({ order:data["order22"], point: data["point22"], name: data["name22"], image: data["image22"], color: data["color22"], text: data["text22"] })
        p1Cards.push({ order:data["order23"], point: data["point23"], name: data["name23"], image: data["image23"], color: data["color23"], text: data["text23"] })
        p2Cards.push({ order:data["order24"], point: data["point24"], name: data["name24"], image: data["image24"], color: data["color24"], text: data["text24"] })
    })

    await fetch(`${backend_url}/api/set_game_dealing_started`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchid: matchID })
    });

    setPlayer1Cards(GinRummyScore(p1Cards));
    setPlayer2Cards(GinRummyScore(p2Cards));
    setDealing(true);
    setTimeout(() => {
      setCurrentPass(2);
      setShowDeadwoods(true);

    }, 7400);
    

    // 自己点击了deal，对方pick or pass
    if (roomId == 'tutorial') {
      // setP2Playing("passOrPick");
      // setP1Playing(null)
      setTimeout(() => {
        setCurrentPass(2); 
        setP2Playing("passOrPick");
        setP1Playing(null)
      }, 7400);
    } else {
      // setP1Playing("passOrPick");
      // setP2Playing(null)
      setTimeout(() => {
        setCurrentPass(1); 
        setP1Playing("passOrPick");
        setP2Playing(null)
      }, 7400);
  
    }

    setRemainingCards(shuffledCards.slice(initialCardsNumber));
  }

  // non-host check if host click deal
  useEffect(() => {
    if (host !== whosTurn && !dealing) {
      
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`${backend_url}/api/is_game_dealing_started`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchid: matchID }),
          });
          const data = await res.json();
          if (data.result === 0) {
            clearInterval(interval);
            fetchInitialCardsForGuest();
            await fetch(`${backend_url}/api/reset_game_dealing_started`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ matchid: matchID }),
            });

          }
        } catch (err) {
          // console.error("Polling failed:", err);
        }
      }, 2000);

      return () => clearInterval(interval); 
    }
  }, [host, dealing, whosTurn]);

  // non-host player get cards from dealing
  async function fetchInitialCardsForGuest() {
    try {
      const response = await fetch(`${backend_url}/api/match_start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: host,
          matchid: matchID,
          round: currentRound
        })
      });
  
      const data = await response.json();
  
      const p1Cards: Card[] = [];
      const p2Cards: Card[] = [];
  
      const dropCard = {
        order: data["order0"],
        point: data["point0"],
        name: data["name0"],
        image: data["image0"],
        color: data["color0"],
        text: data["text0"]
      };
      
      setDropZoneCards([dropCard]);
      for (let i = 1; i <= 23; i += 2) {
        p2Cards.push({
          order: data[`order${i}`],
          point: data[`point${i}`],
          name: data[`name${i}`],
          image: data[`image${i}`],
          color: data[`color${i}`],
          text: data[`text${i}`]
        });
      }
  
      for (let i = 2; i <= 24; i += 2) {
        p1Cards.push({
          order: data[`order${i}`],
          point: data[`point${i}`],
          name: data[`name${i}`],
          image: data[`image${i}`],
          color: data[`color${i}`],
          text: data[`text${i}`]
        });
      }

      setPlayer1Cards(GinRummyScore(p1Cards));
      setPlayer2Cards(GinRummyScore(p2Cards));
      setDealing(true);
      setTimeout(() => {
        setShowDeadwoods(true)
        setP2Playing("passOrPick");
        setP1Playing(null)
      }, 7400);
      // setP2Playing("passOrPick");
      // setP1Playing(null)
  
    } catch (err) {
      // console.error("fetchInitialCardsForGuest failed:", err);
    }
  }

  useEffect(() => {
    currentPassRef.current = currentPass;
  }, [currentPass]);


  // host check if non-host clicked pass (except tutorial)
  useEffect(() => {
  
    console.log('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz:',dealing);
    console.log('yyyyyyyyyyyyyyyyyyyyyyyyyyy: ', host == whosTurn && dealing && currentPassRef.current === null && !hasHandledPass.current && roomId !== 'tutorial');
    
    
    if (host == whosTurn && dealing && currentPassRef.current === null && !hasHandledPass.current && roomId !== 'tutorial') {

      let count = 0;
      const MAX_ATTEMPTS = 2000;

      const interval = setInterval(async () => {
        if (hasHandledPass.current) {
          clearInterval(interval);
          return;
        }

        if (count++ >= MAX_ATTEMPTS) {
          // console.warn("⚠️ Polling timeout: No pass detected after max attempts.");
          clearInterval(interval);
          return;
        }

        try {
          console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@:', matchID,currentRound,  host );
          
          const res = await fetch(`${backend_url}/api/is_passed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchid: matchID,round: currentRound, player: host })
          });

          const data = await res.json();

          if (data.result === 0) {
            hasHandledPass.current = true;
            setP1Playing(null);
            setP2Playing("pickTop");
            setCurrentPass(2)
            clearInterval(interval);
          } else if (data.result === 2) {
            hasHandledPass.current = true;
            console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
            
            handleP1Play(); 
            setP2Playing(null);
            setCurrentPass(null)
            clearInterval(interval);
          } else if (data.result === 3) {
            hasHandledPass.current = true;
            setP2Playing("passOrPick");
            setP1Playing(null);
            clearInterval(interval);
            setCurrentPass(2)
            // hasHandledPass.current = true;
            // handleP1Play(); 
            // clearInterval(interval);
          } 
        } catch (err) {
          // console.error("❌ Polling is_passed failed:", err);
        }
      }, 2000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [dealing]);

  // }, [dealing, host, matchID,whosTurn,restart]);

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
    currentPassRef.current = null
    hasHandledPass.current = false
    setCurrentPass(null)
    setIsKnocked(false)
    setShowDeadwoods(false);
    setPassResult(null)

    const newRestart = !restart
    setRestart(newRestart)

    const thisActualPlayer = host === whosTurn ? "1" : "0"
    console.log("77777777777777777777777777777777777777777777: ", thisActualPlayer);
    
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

    console.log('11111111111111111111111111111111111111111111111111');
    
    await fetch(`${backend_url}/api/match_move`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        host: host,
        matchid: matchID,
        current_host: whosTurn,
        round: currentRound,
        move: 'stack'})
    })
    .then((response) => response.json())
    .then((data) => {
      const newCard = { order:data["order"], point: data["point"], name: data["name"], image: data["image"], color: data["color"], text: data["text"] };
      setSendingNewCard('stack'); 
      if (is_P2){
        setP2Playing('toDrop');
        const updatedCards = [...player2Cards.cards, newCard]
        setPlayer2Cards(GinRummyScore(updatedCards));
      }
    }
  )
  }

  useEffect(() => {
    if (dealing) {
      setTimeout(() => {
        if (host === whosTurn) {
          setCurrentPass(1);
        } else {
          setCurrentPass(2); 
        }
      }, 7400);    
     
      // update the remaining card
      setRemainingCards(shuffledCards.slice(initialCardsNumber));
     } else {
      setPlayer1Cards({cards:[]})
      setPlayer2Cards({cards:[]})
      setRemainingCards([])
      // setDropZoneCards([])
      setSendingNewCard(null)
     }
}, [dealing]);

    // 点击Pass按钮，P1拿最开始的牌 只有点击的时候会触发，两边都会点击
    function handlePass(){
      setP2Playing(null);
      setP1Playing('toTake')
      
      if (roomId == 'tutorial'){
        //bug：hanldePass， robot从stack拿牌
        console.log('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
        
        handleP1Play()
      } else {
        fetch(`${backend_url}/api/set_passed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchid: matchID,round: currentRound, player: host  })
        });

       
          let count = 0;
          const MAX_ATTEMPTS = 2000;
      
          const interval = setInterval(async () => {
            if (count++ >= MAX_ATTEMPTS) {
              clearInterval(interval);
              return;
            }
      
            try {
              const res = await fetch(`${backend_url}/api/is_passed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ matchid: matchID, round: currentRound, player: host })
              });
      
              const data = await res.json();

              setPassResult(data.result)
      
              if (data.result === 0) {
                // 双方都 pass，自己出牌
                setP1Playing(null);
                setP2Playing("toTake");
                setCurrentPass(null);
                clearInterval(interval);
              } else if (data.result === 2) {
                // 对方已经出牌，触发 handleP1Play
                setP2Playing(null);
                setP1Playing("toTake");
                setCurrentPass(1);
                console.log('cccccccccccccccccccccccccccccc');
                
                handleP1Play();
                clearInterval(interval);
              } else if (data.result === 3) {
                // 对方只点了 pass，不处理，继续轮询
                // handleP1Play()
              }
              // else if (data.result === 4) {
              //   // 对方已经出牌（没有pass），立即触发 handleP1Play
              //   setP2Playing(null);
              //   setP1Playing("toTake");
              //   setCurrentPass(1);
              //   handleP1Play();
              //   clearInterval(interval);
              // }
            } catch (err) {
              console.error("Polling is_passed failed:", err);
            }
          }, 2000);
        //   if (host !== whosTurn) {
        //     handleP1Play()
        // }
      

    }
      
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
          if (remainingCards.length > 0) {
            //const [newCard, ...rest] = remainingCards;
            //setRemainingCards(rest);
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
      setPassResult(null)
      if (p2Playing == 'toTake' || currentPass == 2){
        if (currentPass == 2) {
          setCurrentPass(null)
        }
        if (dropZoneCards && dropZoneCards.length > 0) {
          console.log('2222222222222222222222222222222222222222');
          
          await fetch(`${backend_url}/api/match_move`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              host: host,
              matchid: matchID,
              current_host: whosTurn,
              round: currentRound,
              move: 'dropzone'})
          })
          const newDropZoneCards = [...dropZoneCards];
          const lastCard = newDropZoneCards.pop();
          // setDropZoneCards(newDropZoneCards);

          
          if (lastCard) {
            setLastPickedCard(lastCard)
            setSendingNewCard('dropzone');
            setP2Playing('toDrop');
            setTimeout(() => {
              const updatedCards = [...player2Cards.cards, lastCard]
              setPlayer2Cards(GinRummyScore(updatedCards));
              // setDropZoneCards(dropZoneCards);
              setDropZoneCards(newDropZoneCards);

            }, 100);
          } 
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
          setDropZoneCards([...dropZoneCards, item.card]);
          setLastPickedCard(null)

          const updatedCards = [...player2Cards.cards];
          updatedCards.splice(item.index, 1);
          setPlayer2Cards(GinRummyScore(updatedCards));
          console.log('333333333333333333333333333333333333333333333333');
          
          await fetch(`${backend_url}/api/match_move`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              host: host,
              current_host: whosTurn,
              matchid: matchID,
              move: 'drop',
              player: host,
              round: currentRound,
              dropped_card_name: item.card.name})
          })
          setP1Playing("toTake")
          setP2Playing(null)

          console.log('dddddddddddddddddddddddddddddddddddddddddddddddd');
          
          handleP1Play()
      }
    };
  
    // P1自动出牌
    async function handleP1Play() {
      let ready = false;
      while (ready == false){
        console.log('4444444444444444444444444444444444444444444444444');
        
        await fetch(`${backend_url}/api/match_move`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            host: host,
            matchid: matchID,
            current_host: whosTurn,
            round: currentRound,
            move: 'opponent_status'})
        }).then((response) => response.json())
        .then((data) => {
          ready = data["result"] == 0
        })
      }
      setP2Playing(null)

      let alreadyHandled = false;
      const interval = setInterval(async () => {
        if (alreadyHandled){
          clearInterval(interval);
        }
        
        try {
          console.log('55555555555555555555555555555555555555555555555555');
          
          const res = await fetch(`${backend_url}/api/match_move`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              host: host,
              matchid: matchID,
              current_host: whosTurn,
              round: currentRound,
              move: 'wait_opponent'})
          })
          const data = await res.json();

          if (data['remaining_cards'] <2){
            alert('no cards in stack!')
          } else{

            const place = data["operation"]
            // player dropped cards
            const dropped_card_str = data['dropped_card']
            const dropped_card_obj = JSON.parse(dropped_card_str);
            const dropped_card = { order:dropped_card_obj.order, point:dropped_card_obj.point, name:dropped_card_obj.name, image: dropped_card_obj.image, color: dropped_card_obj.color, text: dropped_card_obj.text }
            // card player get
            const new_card_str = data['new_card']
            const new_card_obj = JSON.parse(new_card_str);
            const new_card = { order:new_card_obj.order, point:new_card_obj.point, name:new_card_obj.name, image: new_card_obj.image, color: new_card_obj.color, text: new_card_obj.text }

            if (!place || !dropped_card.name || !new_card.name) {
              return
            }

            if (place && dropped_card.name && new_card.name) {
              alreadyHandled = true
              clearInterval(interval)
            }

            if (place == 'knock') {
              handleKnockFromOpp()
            }
            else if (place == 'dropzone') {
              // if (dropZoneRef.current.length > 0) {
                const newDropZone = [...dropZoneRef.current];
                const lastCard = newDropZone.pop();
                // const lastCard = new_card;
                
                if (lastCard) {
                  setDropZoneCards(newDropZone); 
                  setSendingNewCard('dropzone');
                  setP1Playing('toDrop');
                  handleP1PickAndDrop(dropped_card, lastCard);
              }

            }
            
            else if (place == 'stack'){
                if (remainingCards.length > 0) {
                  setSendingNewCard('stack');
                  setP1Playing('toDrop');
                  handleP1PickAndDrop(dropped_card, new_card)
                }
            }

          }
        }catch (err) {
          alert(err);
        }
      }, 2000);
    }

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
    
    async function handleKnockFromOpp() {

      setIsKnocked(true)
    
      const res = await fetch(`${backend_url}/api/get_latest_move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchid: matchID,
          round: currentRound
        }),
      });
    
      const data = await res.json();

      const myRounds = data.scoreSymmary.rounds.map((round:any) => ({
        ...round,
        p1Score: round.p2Score,
        p1Bonus: round.p2Bonus,
        p1Total: round.p2Total,
        p2Score: round.p1Score,
        p2Bonus: round.p1Bonus,
        p2Total: round.p1Total,
      }));
      
      const myScoreSummary = {
        p1TotalScore: data.scoreSymmary.p2TotalScore,
        p2TotalScore: data.scoreSymmary.p1TotalScore,
        rounds : myRounds
      }

      setScoreSummary(myScoreSummary);
      setWhosTurn(data.winner);
      setOpen(true);

    }

    async function handleKnockFromMe() {

      setIsKnocked(true)

      console.log('66666666666666666666666666666666666666666666666666666666666666666666');
      
      await fetch(`${backend_url}/api/match_move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host: host,
          matchid: matchID,
          current_host: whosTurn,
          round: currentRound,
          move: 'knock'})
      })
      
      const { newScoreSummary, result, isBigGin } = calculateRoundScore({
        host,
        player1Cards,
        player2Cards,
        scoreSummary:scoreSummary ?? null,
      });

      setScoreSummary(newScoreSummary);

      if (roomId !== 'tutorial') {
        let whosNext = ''
        if (result === "Undercut") {
          if (host == '0') {
            whosNext = '1'
          } else {
            whosNext = '0'
          }
        } else {
          if (host == '0') {
            whosNext ='0'
          } else {
            whosNext = '1'
          }
        }
        setWhosTurn(whosNext)

        const roundSummaryData = {
          matchid: matchID,
          scoreSymmary: newScoreSummary,
          winner: whosNext,
          round: currentRound
        };
        
        await fetch(`${backend_url}/api/submit_move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(roundSummaryData),
        });
      }
    }
    
    
    async function handlePlayNextRound(){
      if (roomId == 'tutorial') {
        resetAll()
      } else {
        setWaitingNextRound(true)
        await fetch(`${backend_url}/api/set_waiting_next_round`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchid: matchID, host, round: currentRound }),
        });

        const intervalId = setInterval(async () => {
          const res = await fetch(`${backend_url}/api/is_both_waiting_next_round`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchid: matchID, round: currentRound }),
          });
          const data = await res.json();
          if (data.both_ready) {
            clearInterval(intervalId);
            resetAll();               
          }
        }, 1000);
      }

    }
    
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
                src={card.image}
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
        <AvatarDisplay image={'/main-image/avatar-robot.jpg'} player={1} name={roomId == 'tutorial' ? 'Robot' : host == '1' ? 'Player 2' : 'Player 1'} p2Playing={p2Playing} p1Playing={p1Playing} currentPass={currentPass}/>

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
                          src={isKnocked ? card.image : "/cards-image/back.svg.png"}
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
                    src="/cards-image/back.svg.png"
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
                        src={p1DroppingCard.image}
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
                  <div className="absolute left-full ml-4 mt-12 text-sm text-red-500">
                    <div className="whitespace-nowrap font-semibold"> Tutorial only</div>
                    <div className="whitespace-nowrap">In a real game, the non-dealer is the first to decide to pass or pick the first card.</div>
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
                <span>Deadwood ({player2Cards.DeadwoodsDozenalPoint}):</span>
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


          <AvatarDisplay image={'/main-image/avatar-user.jpg'} player={2} name={roomId == 'tutorial' ? userName : host == '1' ? 'Player 1' : 'Player 2'}  p2Playing={p2Playing} p1Playing={p1Playing} currentPass={currentPass}/>

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
            <Dialog open={open} onOpenChange={(v) => setOpen(true)}>
              <DialogTrigger asChild>
                 <div className="absolute w-[80px] h-[80px] flex items-center justify-center bg-red-500 text-white font-semibold shadow-xl cursor-pointer hover:bg-red-600"
                      style={{
                        top: '50%',
                        transform: 'translateY(-50%)',
                        whiteSpace: 'nowrap',
                        left: 'calc(50% + 500px)',
                        borderRadius:'50%',
                        backgroundColor: player2Cards.DeadwoodsPoint !== undefined && player2Cards.DeadwoodsPoint <= 12 ? 'red' : 'gray',
                        pointerEvents: player2Cards.DeadwoodsPoint !== undefined && player2Cards.DeadwoodsPoint <= 12 ? 'auto' : 'none',
                      }}
                      onClick={() => {handleKnockFromMe();}}
                    >
                      KNOCK
                  </div>
              </DialogTrigger>
            {!waitingNextRound ? (
              <DialogContent className="[&>button]:hidden">
                <DialogHeader>
                  <DialogTitle className="flex flex-col items-center justify-center">
                    {whosTurn == host ? "You win this round 😊 " : "You lose this round 😢"}
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
                                <TableCell className="text-center">{decimalToDozenal(round.p1Score || 0)}</TableCell>
                                <TableCell className="text-center">{decimalToDozenal(round.p1Bonus || 0)}</TableCell>
                                <TableCell className="text-center">{decimalToDozenal(round.p1Total || 0)}</TableCell>
                                <TableCell className="text-center">{decimalToDozenal(round.p2Score || 0)}</TableCell>
                                <TableCell className="text-center">{decimalToDozenal(round.p2Bonus || 0)}</TableCell>
                                <TableCell className="text-center">{decimalToDozenal(round.p2Total || 0)}</TableCell>
                                <TableCell className="text-center">{round.result}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow>
                              <TableCell className="font-semibold text-center">Total Score</TableCell>
                              {/* <TableCell className="text-center">{decimalToDozenal(scoreSummary?.p1TotalScore || 0) }</TableCell> */}
                              <TableCell className="text-center"></TableCell>
                              <TableCell className="text-center"></TableCell>
                              <TableCell className="text-center">{decimalToDozenal(scoreSummary?.p1TotalScore || 0)}</TableCell>
                              {/* <TableCell className="text-center">{decimalToDozenal(scoreSummary?.p2TotalScore || 0)}</TableCell> */}
                              <TableCell className="text-center"></TableCell>
                              <TableCell className="text-center"></TableCell>
                              <TableCell className="text-center">{decimalToDozenal(scoreSummary?.p2TotalScore || 0)}</TableCell>
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


      {scoreSummary && (scoreSummary.p1TotalScore >= 144 || scoreSummary.p2TotalScore >= 144) && (
        <GameOverOverlay
          isWin={(() => {
            let winner
            if (scoreSummary.p1TotalScore >= 144) {
              winner = '1'
            } else {
              winner = '0'
            }
            const isHost = host === winner;
            return (isHost && scoreSummary.p1TotalScore >= 144) || (!isHost && scoreSummary.p2TotalScore >= 144);
          })()}
          p1TotalScore={scoreSummary.p1TotalScore}
          p2TotalScore={scoreSummary.p2TotalScore}
          scoreSummary={scoreSummary}
          host={host}
          whosTurn={whosTurn}
          roomId={roomId}
          decimalToDozenal={decimalToDozenal}
        />
      )}
    </DndProvider>
    

  )
}

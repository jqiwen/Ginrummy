// 


import Image from 'next/image';
import { playingStatus, passingStatus,DraggableCardProps,Card,ChatBubbleProps } from '../models/card-animation.model';

import { motion } from 'framer-motion'; 
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { useState,useEffect, useRef } from 'react';


// 卡片的拖拽
export function DraggableCard({ card, index, moveCard, p2Playing, wholeCardList }: DraggableCardProps) {
  
    const [{ isDragging }, drag] = useDrag({
      type: 'CARD',
      item: { card, index },
      collect: (monitor) => {
        if (monitor.isDragging()) {
          const draggedItem = monitor.getItem();
        }
        return {
          isDragging: !!monitor.isDragging(),
        };
      },
    });
  
    const [, drop] = useDrop({
      accept: 'CARD',
      hover: (item: { card: Card; index: number;wholeCardList:Card[] }) => {
        setTimeout(() => {
          if (item.index !== index) {
            moveCard(item.index, index, wholeCardList);
            item.index = index;
          }
        }, 0);
      }, 
    });
  
    const ref = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      if (ref.current) {
        drag(drop(ref.current));
      }
    }, [drag, drop]);
  
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          opacity: isDragging ? 0 : 1,
          backgroundColor: '#fff',
          // cursor: 'pointer',
          cursor:  p2Playing ? 'pointer' : 'not-allowed',
          textAlign: 'center',
        }}
      >
        {card && card.image ? (
          <Image
            src={card.image}
            alt={card.name}
            width={100}
            height={150}
            draggable="false"
            className="object-contain"
          />
        ) : (
          <p>Card image missing</p>
        )}
      </motion.div>
    );
  };


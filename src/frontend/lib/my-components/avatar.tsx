
import Image from 'next/image';
import { AvatarDisplayProps,ChatBubbleProps } from '../models/card-animation.model';

// 头像展示
export function AvatarDisplay({
    image,
    player,
    name,
    p2Playing,
    p1Playing,
    currentPass,
  }: AvatarDisplayProps) {
    return (
      <div className="relative flex flex-col gap-2 items-center">
        {/* <Image
          src={image}
          alt={`Player ${player} Avatar`}
          width={100}
          height={100}
          className="object-contain"
          draggable="false"
          style={{
            borderRadius: '50%',
            boxShadow:
              (p2Playing !== null && player === 2) ||
              (p1Playing !== null && player === 1)
                ? '0 0 20px rgba(250,225, 0, 1)'
                : 'none',
          }}
        /> */}
        <div
          className={`w-[100px] h-[100px] rounded-full flex items-center justify-center text-white text-5xl font-bold bg-gray-400`}
          style={{
            borderRadius: '50%',
            boxShadow:
              (p2Playing !== null && player === 2) ||
              (p1Playing !== null && player === 1)
                ? '0 0 20px rgba(250,225, 0, 1)'
                : 'none',
          }}
        >
          {name == 'Player 1' ? 'P1' : name == 'Player 2' ? 'P2' : name?.slice(0, 1).toUpperCase()}
        </div>

        <div className="text-lg font-medium text-gray-500 tracking-widest">{name}</div>
      </div>
    );
  }
  
  // || (currentPass === player)

  
  // 头像旁边的气泡提示框
  export  const ChatBubble: React.FC<ChatBubbleProps> = ({ content, bgColor}) => {
      return (
        <div
          className={`relative ml-4 px-4 py-2 text-black font-semibold shadow-lg rounded-3xl max-w-xs ${bgColor} bg-opacity-60`}
          style={{
            transform: 'translateY(-80%)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {content}
          
          <div
            className={`absolute w-[20px] h-[20px] shadow-lg rounded-full ${bgColor} bg-opacity-60`}
            style={{
              left: '-25px',
              bottom: '-20px',
              transform: 'translateY(-50%)',
            }}
          />
          <div
            className={`absolute w-[10px] h-[10px] shadow-lg rounded-full ${bgColor} bg-opacity-60`}
            style={{
              left: '-40px',
              bottom: '-25px',
              transform: 'translateY(-50%)',
            }}
          />
        </div>
      );
    };
    
################################################
# Contact: Qixuan Zhong (zhongq7@mcmaster.ca)
#
################################################
debug = 1
unit_testing = 0
import random
if unit_testing:
    from bot import Bot
else:
    from lib.bot import Bot
import json

order = 'order'
point = 'point'
name = 'name'
image = 'image'
color = 'color'
text = 'text'
host = "1"
guest = "0"


DECK = [
  { order:1, point: 1, name: 'clubs-01', image: '/cards-image/clubs/clubs-01.svg.png', color: 'text-green-700', text: '1' },
  { order:2, point: 2, name: 'clubs-02', image: '/cards-image/clubs/clubs-02.svg.png', color: 'text-green-700', text: '2' },
  { order:3, point: 3, name: 'clubs-03', image: '/cards-image/clubs/clubs-03.svg.png', color: 'text-green-700', text: '3'  },
  { order:4, point: 4, name: 'clubs-04', image: '/cards-image/clubs/clubs-04.svg.png', color: 'text-green-700', text: '4'  },
  { order:5, point: 5, name: 'clubs-05', image: '/cards-image/clubs/clubs-05.svg.png', color: 'text-green-700', text: '5'  },
  { order:6, point: 6, name: 'clubs-06', image: '/cards-image/clubs/clubs-06.svg.png', color: 'text-green-700', text: '6'  },
  { order:7, point: 7, name: 'clubs-07', image: '/cards-image/clubs/clubs-07.svg.png', color: 'text-green-700', text: '7'  },
  { order:8, point: 8, name: 'clubs-08', image: '/cards-image/clubs/clubs-08.svg.png', color: 'text-green-700', text: '8'  },
  { order:9, point: 9, name: 'clubs-09', image: '/cards-image/clubs/clubs-09.svg.png', color: 'text-green-700', text: '9'  },
  { order:10, point: 10, name: 'clubs-0A', image: '/cards-image/clubs/clubs-0A.svg.png', color: 'text-green-700', text: '\u218A'},
  { order:11, point: 11, name: 'clubs-0B', image: '/cards-image/clubs/clubs-0B.svg.png', color: 'text-green-700', text: '\u218B'},
  { order:12, point: 12, name: 'clubs-10', image: '/cards-image/clubs/clubs-10.svg.png', color: 'text-green-700', text: '10'  },
  { order:13, point: 12, name: 'clubs-J', image: '/cards-image/clubs/Clubs-J.svg.png', color: 'text-green-700', text: 'J'  },
  { order:14, point: 12, name: 'clubs-C', image: '/cards-image/clubs/Clubs-C.svg.png', color: 'text-green-700', text: 'C'  },
  { order:15, point: 12, name: 'clubs-Q', image: '/cards-image/clubs/Clubs-Q.svg.png', color: 'text-green-700', text: 'Q'  },
  { order:16, point: 12, name: 'clubs-K', image: '/cards-image/clubs/Clubs-K.svg.png', color: 'text-green-700', text: 'K'  },

  { order:1, point: 1, name: 'diamonds-01', image: '/cards-image/diamonds/diamonds-01.svg.png', color: 'text-yellow-600', text: '1'  },
  { order:2, point: 2, name: 'diamonds-02', image: '/cards-image/diamonds/diamonds-02.svg.png', color: 'text-yellow-600', text: '2'  },
  { order:3, point: 3, name: 'diamonds-03', image: '/cards-image/diamonds/diamonds-03.svg.png', color: 'text-yellow-600', text: '3'  },
  { order:4, point: 4, name: 'diamonds-04', image: '/cards-image/diamonds/diamonds-04.svg.png', color: 'text-yellow-600', text: '4'  },
  { order:5, point: 5, name: 'diamonds-05', image: '/cards-image/diamonds/diamonds-05.svg.png', color: 'text-yellow-600', text: '5'  },
  { order:6, point: 6, name: 'diamonds-06', image: '/cards-image/diamonds/diamonds-06.svg.png', color: 'text-yellow-600', text: '6'  },
  { order:7, point: 7, name: 'diamonds-07', image: '/cards-image/diamonds/diamonds-07.svg.png', color: 'text-yellow-600', text: '7'  },
  { order:8, point: 8, name: 'diamonds-08', image: '/cards-image/diamonds/diamonds-08.svg.png', color: 'text-yellow-600', text: '8'  },
  { order:9, point: 9, name: 'diamonds-09', image: '/cards-image/diamonds/diamonds-09.svg.png', color: 'text-yellow-600', text: '9'  },
  { order:10, point: 10, name: 'diamonds-0A', image: '/cards-image/diamonds/diamonds-0A.svg.png', color: 'text-yellow-600', text: '\u218A' },
  { order:11, point: 11, name: 'diamonds-0B', image: '/cards-image/diamonds/diamonds-0B.svg.png', color: 'text-yellow-600', text: '\u218B'  },
  { order:12, point: 12, name: 'diamonds-10', image: '/cards-image/diamonds/diamonds-10.svg.png', color: 'text-yellow-600', text: '10'  },
  { order:13, point: 12, name: 'diamonds-J', image: '/cards-image/diamonds/Diamonds-J.svg.png', color: 'text-yellow-600', text: 'J'  },
  { order:14, point: 12, name: 'diamonds-C', image: '/cards-image/diamonds/Diamonds-C.svg.png', color: 'text-yellow-600', text: 'C'  },
  { order:15, point: 12, name: 'diamonds-Q', image: '/cards-image/diamonds/Diamonds-Q.svg.png', color: 'text-yellow-600', text: 'Q'  },
  { order:16, point: 12, name: 'diamonds-K', image: '/cards-image/diamonds/Diamonds-K.svg.png', color: 'text-yellow-600', text: 'K'  },

  { order:1, point: 1, name: 'hearts-01', image: '/cards-image/Hearts/hearts-01.svg.png', color: 'text-red-600', text: '1' },
  { order:2, point: 2, name: 'hearts-02', image: '/cards-image/Hearts/hearts-02.svg.png', color: 'text-red-600', text: '2' },
  { order:3, point: 3, name: 'hearts-03', image: '/cards-image/Hearts/hearts-03.svg.png', color: 'text-red-600', text: '3' },
  { order:4, point: 4, name: 'hearts-04', image: '/cards-image/Hearts/hearts-04.svg.png', color: 'text-red-600', text: '4' },
  { order:5, point: 5, name: 'hearts-05', image: '/cards-image/Hearts/hearts-05.svg.png', color: 'text-red-600', text: '5' },
  { order:6, point: 6, name: 'hearts-06', image: '/cards-image/Hearts/hearts-06.svg.png', color: 'text-red-600', text: '6' },
  { order:7, point: 7, name: 'hearts-07', image: '/cards-image/Hearts/hearts-07.svg.png', color: 'text-red-600', text: '7' },
  { order:8, point: 8, name: 'hearts-08', image: '/cards-image/Hearts/hearts-08.svg.png', color: 'text-red-600', text: '8' },
  { order:9, point: 9, name: 'hearts-09', image: '/cards-image/Hearts/hearts-09.svg.png', color: 'text-red-600', text: '9' },
  { order:10, point: 10, name: 'hearts-0A', image: '/cards-image/Hearts/hearts-0A.svg.png', color: 'text-red-600', text: '\u218A' },
  { order:11, point: 11, name: 'hearts-0B', image: '/cards-image/Hearts/hearts-0B.svg.png', color: 'text-red-600', text: '\u218B' },
  { order:12, point: 12, name: 'hearts-10', image: '/cards-image/Hearts/hearts-10.svg.png', color: 'text-red-600', text: '10' },
  { order:13, point: 12, name: 'hearts-J', image: '/cards-image/Hearts/Hearts-J.svg.png', color: 'text-red-600', text: 'J' },
  { order:14, point: 12, name: 'hearts-C', image: '/cards-image/Hearts/Hearts-C.svg.png', color: 'text-red-600', text: 'C' },
  { order:15, point: 12, name: 'hearts-Q', image: '/cards-image/Hearts/Hearts-Q.svg.png', color: 'text-red-600', text: 'Q' },
  { order:16, point: 12, name: 'hearts-K', image: '/cards-image/Hearts/Hearts-K.svg.png', color: 'text-red-600', text: 'K' },

  { order:1, point: 1, name: 'spades-01', image: '/cards-image/spades/spades-01.svg.png', color: 'text-black', text: '1' },
  { order:2, point: 2, name: 'spades-02', image: '/cards-image/spades/spades-02.svg.png', color: 'text-black', text: '2' },
  { order:3, point: 3, name: 'spades-03', image: '/cards-image/spades/spades-03.svg.png', color: 'text-black', text: '3' },
  { order:4, point: 4, name: 'spades-04', image: '/cards-image/spades/spades-04.svg.png', color: 'text-black', text: '4' },
  { order:5, point: 5, name: 'spades-05', image: '/cards-image/spades/spades-05.svg.png', color: 'text-black', text: '5' },
  { order:6, point: 6, name: 'spades-06', image: '/cards-image/spades/spades-06.svg.png', color: 'text-black', text: '6' },
  { order:7, point: 7, name: 'spades-07', image: '/cards-image/spades/spades-07.svg.png', color: 'text-black', text: '7' },
  { order:8, point: 8, name: 'spades-08', image: '/cards-image/spades/spades-08.svg.png', color: 'text-black', text: '8' },
  { order:9, point: 9, name: 'spades-09', image: '/cards-image/spades/spades-09.svg.png', color: 'text-black', text: '9' },
  { order:10, point: 10, name: 'spades-0A', image: '/cards-image/spades/spades-0A.svg.png', color: 'text-black', text: '\u218A' },
  { order:11, point: 11, name: 'spades-0B', image: '/cards-image/spades/spades-0B.svg.png', color: 'text-black', text: '\u218B' },
  { order:12, point: 12, name: 'spades-10', image: '/cards-image/spades/spades-10.svg.png', color: 'text-black', text: '10' },
  { order:13, point: 12, name: 'spades-J', image: '/cards-image/spades/Spades-J.svg.png', color: 'text-black', text: 'J' },
  { order:14, point: 12, name: 'spades-C', image: '/cards-image/spades/Spades-C.svg.png', color: 'text-black', text: 'C' },
  { order:15, point: 12, name: 'spades-Q', image: '/cards-image/spades/Spades-Q.svg.png', color: 'text-black', text: 'Q' },
  { order:16, point: 12, name: 'spades-K', image: '/cards-image/spades/Spades-K.svg.png', color: 'text-black', text: 'K' },
]

class Match():
    def __init__(self, match_id: str, bot: bool = False):
        print("Match created!") if debug else None
        self.match_id = match_id
        self.current_round = -2
        
        if bot:
            self.Bot = Bot()
        else:
            self.Bot = None
        self.initialize_match()

    

    def initialize_match(self, cur_round = -1, start_with = host):
        print("initialize match,", cur_round, self.current_round) if debug else None
        if cur_round <= self.current_round:
            return
        self.current_round = cur_round
        print("initialize match, done", cur_round, self.current_round) if debug else None
        self.deck = DECK.copy()
        self.drop_zone = []
        self.host_cards = []
        self.guest_cards = []
        self.initial_cards = []
        self.latest_operation = None
        self.latest_player = start_with

        random.shuffle(self.deck)
        # Initialize drop zone with one card from deck.
        self.drop_zone.append(self.deck.pop())
        self.initial_cards.append(self.drop_zone[-1])
        for _ in range(12):
            self.host_cards.append(self.deck.pop())
            self.guest_cards.append(self.deck.pop())
            self.initial_cards.append(self.guest_cards[-1])
            self.initial_cards.append(self.host_cards[-1])
        for card in self.deck:
            print('deck:', card["name"]) if debug else None
        for card in self.host_cards:
            print('host initial:', card["name"]) if debug else None
        for card in self.guest_cards:
            print('guest initial:', card["name"]) if debug else None
        print(len(self.guest_cards), len(self.host_cards), len(self.deck), len(self.drop_zone)) if debug else None
        print(self.guest_cards, self.host_cards) if debug else None
        self.new_card = self.host_cards[-1]
        if start_with == guest:
            cards = self.host_cards
            self.host_cards = self.guest_cards
            self.guest_cards = cards


    def get_matchid(self) -> str:
        return self.match_id
    
    def get_remaining_cards(self) -> int:
        return len(self.deck)
    
    def get_initial_cards(self) -> list:
        return self.initial_cards

    def choose_stack(self, is_host: str) -> dict:
        self.latest_operation = 'stack'
        self.new_card = self.deck.pop()
        if is_host == "1":
            print("host get stack, ", self.new_card["name"]) if debug else None
            self.host_cards.append(self.new_card)
        else:
            print("guest get stack, ", self.new_card["name"]) if debug else None
            self.guest_cards.append(self.new_card)
        return self.new_card
    
    def choose_drop_zone(self, is_host: str) -> dict:
        self.latest_operation = 'dropzone'
        print("host:", self.host_cards) if debug else None
        self.new_card = self.drop_zone.pop()
        if is_host == "1":
            print("host get drop zone, ", self.new_card["name"]) if debug else None
            self.host_cards.append(self.new_card)
        else:
            print("guest get drop zone, ", self.new_card["name"]) if debug else None
            self.guest_cards.append(self.new_card)
        return self.new_card

    def drop_card(self, is_host: str, card_name: str) -> dict:
        dropped = None
        if is_host == "1":
            for i in range(len(self.host_cards)):
                print("??????????????",self.host_cards[i]["name"], card_name) if debug else None
                if self.host_cards[i]["name"] == card_name:
                    dropped = self.host_cards.pop(i)
                    self.drop_zone.append(dropped)
                    break
            self.latest_player = host
            if debug:
                if self.drop_zone:
                    print("host drop, ", self.drop_zone[-1]["name"])
                else:
                    print("host drop attempted but drop_zone is empty!")
        else:
            for i in range(len(self.guest_cards)):
                if self.guest_cards[i]["name"] == card_name:
                    dropped = self.guest_cards.pop(i)
                    self.drop_zone.append(dropped)
                    break
            self.latest_player = guest
            if debug:
                if self.drop_zone:
                    print("guest drop, ", self.drop_zone[-1]["name"])
                else:
                    print("guest drop attempted but drop_zone is empty!")
        if self.drop_zone:
            return self.drop_zone[-1]
        else:
            # Return an empty dict or raise an error as appropriate.
            return {}
        
    def knock_card(self, is_host: str):
        if is_host == "1":
            self.latest_player = host
            self.latest_operation = "knock"
            print("host performs knock") if debug else None
        else:
            self.latest_player = guest
            self.latest_operation = "knock"
            print("guest performs knock") if debug else None

    def get_latest_operation(self) -> tuple:
        if self.Bot is not None:
            # Ensure the drop_zone is not empty before accessing its last element.
            print(guest, self.guest_cards) if debug else None
            if not self.drop_zone:
                print("drop_zone is empty!????????????????????????") if debug else None
                if self.deck:
                    # If drop_zone is empty but the deck still has cards, add one to drop_zone.
                    self.drop_zone.append(self.deck.pop())
                else:
                    # No cards available in both deck and drop_zone.
                    raise Exception("No cards available to replenish drop_zone!")
                    
            # Call the bot_draw method using the last card in drop_zone.
            self.latest_operation = self.Bot.bot_draw(self.guest_cards, self.drop_zone[-1], self.deck)
            if self.latest_operation == "stack":
                self.choose_stack(guest)
            elif self.latest_operation == "dropzone":
                self.choose_drop_zone(guest)
            
            dropIndex = self.Bot.bot_drop(self.guest_cards)
            # Make sure guest_cards is not empty before accessing index dropIndex.
            if self.guest_cards and 0 <= dropIndex < len(self.guest_cards):
                self.drop_card(guest, self.guest_cards[dropIndex]["name"])
            else:
                raise Exception("Invalid drop index from bot_drop or guest_cards empty!")
        
        
        #if self.latest_player == guest:
        #    new_card = self.guest_cards[-1] if self.guest_cards else {}
        #else:
        #    new_card = self.host_cards[-1] if self.host_cards else {}
        last_drop = self.drop_zone[-1] if self.drop_zone else {}
        return self.latest_player, self.latest_operation, last_drop, self.new_card


def unit_test():
    my_match = Match("aisdugf")
    my_match.get_latest_operation()
    my_match.choose_stack("1")
    my_match.drop_card("1", my_match.host_cards[0]["name"])
    my_match.get_latest_operation()
    my_match.choose_stack("1")
    my_match.drop_card("1", my_match.host_cards[0]["name"])
    my_match.get_latest_operation()
    my_match.choose_stack("1")
    my_match.drop_card("1", my_match.host_cards[0]["name"])
    my_match.get_latest_operation()
    my_match.choose_stack("1")
    my_match.drop_card("1", my_match.host_cards[0]["name"])
    my_match.get_latest_operation()
    my_match.choose_stack("1")
    my_match.drop_card("1", my_match.host_cards[0]["name"])
    my_match.get_latest_operation()

    for i in range(10):
        my_match.choose_stack("1")
        my_match.drop_card("1", my_match.host_cards[0]["name"])
        my_match.get_latest_operation()

    print(my_match.guest_cards)

if unit_testing:
    unit_test()
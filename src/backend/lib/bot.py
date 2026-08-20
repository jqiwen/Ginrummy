import random
unit_testing = 0
class Bot():
    def __init__(self):
        pass

    def bot_draw(self, my_cards: list, drop_zone: dict, stack: list) -> str:
        choose_dropzone_val = self.bot_evaluate(my_cards + [drop_zone])
        # cheating by getting the last card in the stack
        # TODO: need to change it to expected value
        # implementing through evaluate functions, the implementation should not be here
        choose_stack_val = self.bot_evaluate(my_cards + [stack[-1]])
        if choose_stack_val < choose_dropzone_val:
            return "dropzone"
        return "stack"
    
    def bot_drop(self, my_cards: list) -> int:
        max_drop_index = 0
        max_drop_value = 100
        for i in range(len(my_cards)):
            cur_drop_value = self.bot_evaluate(my_cards[:i] + my_cards[i+1:])
            if cur_drop_value > max_drop_value:
                max_drop_index = i
                max_drop_value = cur_drop_value

        return max_drop_index
    
    def bot_evaluate(self, my_cards: list) -> int:
        my_cards = my_cards.copy() # make sure we are not modifying the original list
        potential = 0
        set_potential = 0
        run_potential = 0
        completed_sets = []
        completed_runs = []
        
        converted_cards = {"text-red-600": [], 
                           "text-black": [], 
                           "text-green-700": [], 
                           "text-yellow-600": []}
        
        for card in my_cards:
            converted_cards[card["color"]].append(card["order"])
        for key in converted_cards:
            converted_cards[key].sort()
            if len(converted_cards[key]) > 1 and converted_cards[key][1] - converted_cards[key][0] == 1:
                run_potential += 1
            for i in range(2, len(converted_cards[key])):
                if converted_cards[key][i] - converted_cards[key][i - 1] == 1:
                    run_potential += 1
                    cur_run_length = 2
                    while (i - cur_run_length) > -1:
                        if converted_cards[key][i - cur_run_length + 1] - converted_cards[key][i - cur_run_length] > 1:
                            break
                        run_potential += 1
                        cur_run_length += 1
                    # check if the previous 3 cards has been registered as a run
                    # if so, we need to update it.
                    # otherwise, we register the run
                    if len(completed_sets) and completed_sets[-1][0] == converted_cards[key][i - 1]:
                        completed_sets.pop()
                    completed_sets.append([converted_cards[key][i], cur_run_length, key])
        #print("completed_sets", completed_sets)
        #print("run_potential: ", run_potential)
        return run_potential + set_potential
    #Note: if we have set of 4, competing with a run of 3, we can split the set into 
    # a set of 3 and complete the run
    # if we have a set of 3, competing with a run of 3, they are basically equivalent
    # runs are more valuable than sets because they can be extended in both directions 
    # (2 valid extendable cards) while a set can be extended with only the last remaining card.
    # It's considerable that a set can block the opponent, but that's a different topic.
    #
    # Later on, we can factor in the remaining card in the stack to optimize the decision.
    # In word, change the potential calculation to be more dynamic.
    # For now, we will prefer runs than sets.
    #
    # No, if we have 333456, we can split the set into 333 and 456, which is better than 3456
    # it will give a [6, 4] which stands for 6543
    #Ignoring orders for now!!! 
    """
        for order in range(1, 17):
            set_count = 0
            for card in my_cards:
                #print("evaluating:", card["name"])
                if card["order"] == order:
                    set_count += 1
            if set_count > 2:
                completed_sets.append([order, set_count])
            order_potential += max(0, set_count - 1)
            print("order: ", order, "set_count: ", set_count)
            """
        
def unit_test():
    bot = Bot()
    order = 'order'
    point = 'point'
    name = 'name'
    image = 'image'
    color = 'color'
    text = 'text'
    hand = [  { order:12, point: 12, name: 'hearts-10', image: '/cards-image/Hearts/hearts-10.svg.png',color: 'text-red-600' , text: '10'   },
            { order:9, point: 9, name: 'hearts-09', image: '/cards-image/Hearts/hearts-09.svg.png',color: 'text-red-600' , text: '9'   },
        { order:1, point: 1, name: 'hearts-01', image: '/cards-image/Hearts/hearts-01.svg.png',color: 'text-red-600' , text: '1'   },
    { order:2, point: 2, name: 'hearts-02', image: '/cards-image/Hearts/hearts-02.svg.png',color: 'text-red-600' , text: '2'   },
    { order:3, point: 3, name: 'hearts-03', image: '/cards-image/Hearts/hearts-03.svg.png',color: 'text-red-600' , text: '3'   },
    { order:4, point: 4, name: 'hearts-04', image: '/cards-image/Hearts/hearts-04.svg.png',color: 'text-red-600' , text: '4'   },
    { order:5, point: 5, name: 'hearts-05', image: '/cards-image/Hearts/hearts-05.svg.png',color: 'text-red-600' , text: '5'   },
    { order:6, point: 6, name: 'hearts-06', image: '/cards-image/Hearts/hearts-06.svg.png',color: 'text-red-600' , text: '6'   },
    { order:7, point: 7, name: 'hearts-07', image: '/cards-image/Hearts/hearts-07.svg.png',color: 'text-red-600' , text: '7'   },
    { order:16, point: 12, name: 'hearts-K', image: '/cards-image/Hearts/Hearts-K.svg.png',color: 'text-red-600' , text: 'K'   },
    
    { order:10, point: 10, name: 'hearts-0A', image: '/cards-image/Hearts/hearts-0A.svg.png',color: 'text-red-600' , text: '\u218A'   },
    { order:11, point: 11, name: 'hearts-0B', image: '/cards-image/Hearts/hearts-0B.svg.png',color: 'text-red-600' , text: '\u218B'   },
    
    ]
    new_card1 =   { order:13, point: 12, name: 'hearts-J', image: '/cards-image/Hearts/Hearts-J.svg.png',color: 'text-red-600' , text: 'J'   }
    new_card2 =  { order:8, point: 12, name: 'hearts-K', image: '/cards-image/Hearts/Hearts-K.svg.png',color: 'text-red-600' , text: 'K'   }

    #bot.bot_evaluate(hand)
    #bot.bot_draw(hand, new_card1, [new_card2])
    #print(bot.bot_drop(hand + [new_card1]))

if unit_testing:
    unit_test()
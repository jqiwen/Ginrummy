from time import sleep
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from lib.authentication import Authentication
from lib.match import Match
import random
import datetime
import json

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', "https://ginrummys.ca"])



auth = Authentication()
ongoing_matches = {}
rooms = {}

server_start_time = datetime.datetime.now()

@app.route("/")
def index():
    return render_template("status.html", 
                           version = "0.0.1-rc2",
                           start_time = server_start_time.timestamp())

@app.route('/api/signup', methods=['POST'])
def signup_request():
    if auth.create_account(request.json['username'], request.json['password']):
        return jsonify({
            'result': 0, 
            "message": "OK"
        })
    return jsonify({
        'result': 1, 
        "message": "Account already exists"
    })

@app.route('/api/login', methods=['POST'])
def login_request():
    code, message = auth.verify_account(request.json['username'], request.json['password'])
    return jsonify({
        'result': code, 
        "message": message
    })

@app.route('/api/join', methods=['POST'])
def join_request():
    match_id = request.json['matchid']
    code, message = 0, "OK"
    if not match_id in rooms.keys():
        code, message = 420, "Room Not Found"
    if rooms[match_id]:
        code, message = 421, "Room Already Full"
    else:
        code, message = 200, "Joined"
        rooms[match_id] = True
    return jsonify({
        'result': code, 
        "message": message
    })

@app.route('/api/match_create', methods=['POST'])
def match_create_request():
    match_id = "test"
    need_bot = False
    k_val = 4
    print(request.json, "isBot?", request.json['bot'])
    if request.json['bot'] == "True":
        need_bot = True
        k_val = 5
        print("Bot needed")
    if match_id in rooms:
        match_id = ''.join(random.choices("abcdefghijklmnopqrstuvwxyz", k=k_val))
        print(match_id)
    rooms[match_id] = False
    
    ongoing_matches[match_id] = Match(match_id, bot=need_bot)

    return jsonify({
        'result': 0, 
        'message': "OK",
        'match_id': match_id,})

@app.route('/api/room_status', methods=['POST'])
def check_room_status():
    match_id = request.json['matchid']
    if not match_id in rooms:
        code, message = 1, "Room Not Found"
    if rooms[match_id]:
        code, message = 0, "Second Player Joined"
    else:
        code, message = 2, "Second Player not yet joined"
    return jsonify({
        'result': code, 
        "message": message
    })

@app.route('/api/match_start', methods=['POST'])
def match_start_request():
    match_id = request.json['matchid']
    print(request.json)

    # ✅ 只有第一次调用时才创建 Match
    #if match_id not in ongoing_matches:
        #ongoing_matches[match_id] = Match(match_id)

    print("************************************************************************")
    print("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n")
    print("************************************************************************")
    print(str(request.json['host']))
    print("************************************************************************")
    print("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n")
    print("************************************************************************")
    ongoing_matches[match_id].initialize_match(int(request.json['round']), str(request.json['host']))

    match_obj = ongoing_matches[match_id]
    init_cards = match_obj.get_initial_cards()

    # ongoing_matches[match_id] = Match(match_id)
    # init_cards = ongoing_matches[match_id].get_initial_cards()
    code, message = 0, "OK"
    return jsonify({
        'result': code, 
        'message': message,
        'match_id': match_id,
        
        'order0':init_cards[0]["order"], 'point0':init_cards[0]["point"], 'name0':init_cards[0]["name"], 'image0':init_cards[0]["image"], 'color0':init_cards[0]["color"], 'text0':init_cards[0]["text"],
        'order1':init_cards[1]["order"], 'point1':init_cards[1]["point"], 'name1':init_cards[1]["name"], 'image1':init_cards[1]["image"], 'color1':init_cards[1]["color"], 'text1':init_cards[1]["text"],
        'order2':init_cards[2]["order"], 'point2':init_cards[2]["point"], 'name2':init_cards[2]["name"], 'image2':init_cards[2]["image"], 'color2':init_cards[2]["color"], 'text2':init_cards[2]["text"],
        'order3':init_cards[3]["order"], 'point3':init_cards[3]["point"], 'name3':init_cards[3]["name"], 'image3':init_cards[3]["image"], 'color3':init_cards[3]["color"], 'text3':init_cards[3]["text"],
        'order4':init_cards[4]["order"], 'point4':init_cards[4]["point"], 'name4':init_cards[4]["name"], 'image4':init_cards[4]["image"], 'color4':init_cards[4]["color"], 'text4':init_cards[4]["text"],
        'order5':init_cards[5]["order"], 'point5':init_cards[5]["point"], 'name5':init_cards[5]["name"], 'image5':init_cards[5]["image"], 'color5':init_cards[5]["color"], 'text5':init_cards[5]["text"],
        'order6':init_cards[6]["order"], 'point6':init_cards[6]["point"], 'name6':init_cards[6]["name"], 'image6':init_cards[6]["image"], 'color6':init_cards[6]["color"], 'text6':init_cards[6]["text"],
        'order7':init_cards[7]["order"], 'point7':init_cards[7]["point"], 'name7':init_cards[7]["name"], 'image7':init_cards[7]["image"], 'color7':init_cards[7]["color"], 'text7':init_cards[7]["text"],
        'order8':init_cards[8]["order"], 'point8':init_cards[8]["point"], 'name8':init_cards[8]["name"], 'image8':init_cards[8]["image"], 'color8':init_cards[8]["color"], 'text8':init_cards[8]["text"],
        'order9':init_cards[9]["order"], 'point9':init_cards[9]["point"], 'name9':init_cards[9]["name"], 'image9':init_cards[9]["image"], 'color9':init_cards[9]["color"], 'text9':init_cards[9]["text"],
        'order10':init_cards[10]["order"], 'point10':init_cards[10]["point"], 'name10':init_cards[10]["name"], 'image10':init_cards[10]["image"], 'color10':init_cards[10]["color"], 'text10':init_cards[10]["text"],
        'order11':init_cards[11]["order"], 'point11':init_cards[11]["point"], 'name11':init_cards[11]["name"], 'image11':init_cards[11]["image"], 'color11':init_cards[11]["color"], 'text11':init_cards[11]["text"],
        'order12':init_cards[12]["order"], 'point12':init_cards[12]["point"], 'name12':init_cards[12]["name"], 'image12':init_cards[12]["image"], 'color12':init_cards[12]["color"], 'text12':init_cards[12]["text"],
        'order13':init_cards[13]["order"], 'point13':init_cards[13]["point"], 'name13':init_cards[13]["name"], 'image13':init_cards[13]["image"], 'color13':init_cards[13]["color"], 'text13':init_cards[13]["text"],
        'order14':init_cards[14]["order"], 'point14':init_cards[14]["point"], 'name14':init_cards[14]["name"], 'image14':init_cards[14]["image"], 'color14':init_cards[14]["color"], 'text14':init_cards[14]["text"],
        'order15':init_cards[15]["order"], 'point15':init_cards[15]["point"], 'name15':init_cards[15]["name"], 'image15':init_cards[15]["image"], 'color15':init_cards[15]["color"], 'text15':init_cards[15]["text"],
        'order16':init_cards[16]["order"], 'point16':init_cards[16]["point"], 'name16':init_cards[16]["name"], 'image16':init_cards[16]["image"], 'color16':init_cards[16]["color"], 'text16':init_cards[16]["text"],
        'order17':init_cards[17]["order"], 'point17':init_cards[17]["point"], 'name17':init_cards[17]["name"], 'image17':init_cards[17]["image"], 'color17':init_cards[17]["color"], 'text17':init_cards[17]["text"],
        'order18':init_cards[18]["order"], 'point18':init_cards[18]["point"], 'name18':init_cards[18]["name"], 'image18':init_cards[18]["image"], 'color18':init_cards[18]["color"], 'text18':init_cards[18]["text"],
        'order19':init_cards[19]["order"], 'point19':init_cards[19]["point"], 'name19':init_cards[19]["name"], 'image19':init_cards[19]["image"], 'color19':init_cards[19]["color"], 'text19':init_cards[19]["text"],
        'order20':init_cards[20]["order"], 'point20':init_cards[20]["point"], 'name20':init_cards[20]["name"], 'image20':init_cards[20]["image"], 'color20':init_cards[20]["color"], 'text20':init_cards[20]["text"],
        'order21':init_cards[21]["order"], 'point21':init_cards[21]["point"], 'name21':init_cards[21]["name"], 'image21':init_cards[21]["image"], 'color21':init_cards[21]["color"], 'text21':init_cards[21]["text"],
        'order22':init_cards[22]["order"], 'point22':init_cards[22]["point"], 'name22':init_cards[22]["name"], 'image22':init_cards[22]["image"], 'color22':init_cards[22]["color"], 'text22':init_cards[22]["text"],
        'order23':init_cards[23]["order"], 'point23':init_cards[23]["point"], 'name23':init_cards[23]["name"], 'image23':init_cards[23]["image"], 'color23':init_cards[23]["color"], 'text23':init_cards[23]["text"],
        'order24':init_cards[24]["order"], 'point24':init_cards[24]["point"], 'name24':init_cards[24]["name"], 'image24':init_cards[24]["image"], 'color24':init_cards[24]["color"], 'text24':init_cards[24]["text"],                                                                                                                                                                                                    
    })


# @app.route('/api/add_bot', methods=['POST'])
# def add_bot_request():
#     code, message = 0, "OK"
#     return jsonify({
#         'result': code, 
#         "message": message
#     })


# missing operation
@app.route('/api/match_move', methods=['POST', 'GET'])
def move_request():
    print("info", request.json)
    target_match = ongoing_matches.get(request.json['matchid'])
    
    if target_match == None:
        return jsonify({
            'result': 1, 
            "message": "Match not found"
        })
    
    if request.json['move'] == "stack":
        new_card = target_match.choose_stack(request.json['host'])
        return jsonify({
            'result': 0, 
            "message": "OK",
            'order':new_card["order"], 
            'point':new_card["point"], 
            'name':new_card["name"], 
            'image':new_card["image"], 
            'color':new_card["color"], 
            'text':new_card["text"]
        })
    
    # if request.json['move'] == "dropzone":
    #     target_match.choose_drop_zone(request.json['host'])
    #     return jsonify({
    #         'result': 0, 
    #         "message": "OK"
    #     })

    if request.json['move'] == "dropzone":
        if len(target_match.drop_zone) == 0:
            return jsonify({'result': 1, 'message': 'Drop zone is empty'})
        
        new_card = target_match.choose_drop_zone(request.json['host'])
        return jsonify({
            'result': 0,
            'message': 'OK',
            'order': new_card["order"],
            'point': new_card["point"],
            'name': new_card["name"],
            'image': new_card["image"],
            'color': new_card["color"],
            'text': new_card["text"]
        })

    
    if request.json['move'] == "drop": 
        match_id = request.json['matchid']
        round_num = str(request.json.get('round'))  # ✅ 获取 round
        player = str(request.json.get('host'))      # ✅ 当前 player

        target_match.drop_card(request.json['host'], request.json['dropped_card_name'])

        if match_id not in pass_status:
            pass_status[match_id] = {}
        if round_num not in pass_status[match_id]:
            pass_status[match_id][round_num] = {}

        pass_status[match_id][round_num][player] = 2  # ✅ 按 player 设置 pass

        return jsonify({
            'result': 0, 
            "message": "OK"
        })
    
    if request.json['move'] == "knock":
        target_match.knock_card(request.json['host'])
        return jsonify({
            'result': 0,
            'message': "Knock received"
        })

    if request.json['move'] == "opponent_status":
        sleep(1)
        last_player, last_op, last_card, last_picked_card = target_match.get_latest_operation()
        print(last_player, request.json['host'], last_op, last_card, last_picked_card)
        if last_player == request.json['host']:
            print("return 1")
            return jsonify({
                'result': 1, 
                "message": "Still Waiting",
            })
        print("return 0")
        return jsonify({
            'result': 0, 
            "message": "Ready",
        })
        
    if request.json['move'] == "wait_opponent":
        # last_card : dropped card
        # last_picked_card : picked card
        last_player, last_op, last_card, last_picked_card = target_match.get_latest_operation()
        remaining_cards = target_match.get_remaining_cards()
        print("operation", last_player, last_op, last_card, last_picked_card)

        print("last_drop_type", type(last_card), last_card)
        print("last_picked_type", type(last_picked_card), last_picked_card)
        """
        last_player = request.json['host']
        if last_player == request.json['host']:
            
            print(last_player, request.json['host'], last_op, last_card, last_picked_card)
            return jsonify({
                'result': 1, 
                "message": "Still Waiting",
            })"""
        return jsonify({
            'result': last_player, 
            "message": "OK",
            "operation": last_op,
            "dropped_card": json.dumps(last_card),
            "new_card": json.dumps(last_picked_card),
            "remaining_cards": remaining_cards
        })
    

game_started = {}

@app.route('/api/set_game_start', methods=['POST'])
def set_game_start():
    match_id = request.json.get('matchid')
    # if match_id not in rooms:
    #     return jsonify({'result': 1, 'message': 'Room Not Found'})
    game_started[match_id] = True
    return jsonify({'result': 0, 'message': 'Game started successfully'})

@app.route('/api/is_game_started', methods=['POST'])
def is_game_started():
    match_id = request.json.get('matchid')
    if match_id not in rooms:
        return jsonify({'result': 1, 'message': 'Room Not Found'})
    started = game_started.get(match_id, False)
    if started:
        return jsonify({'result': 0, 'message': 'Game has started'})
    else:
        return jsonify({'result': 2, 'message': 'Game not started yet'})


game_dealing_started = {}


@app.route('/api/set_game_dealing_started', methods=['POST'])
def set_game_dealing_started():
    match_id = request.json.get('matchid')
    game_dealing_started[match_id] = True
    return jsonify({'result': 0, 'message': 'Game dealing started'})

@app.route('/api/is_game_dealing_started', methods=['POST'])
def is_game_dealing_started():
    match_id = request.json.get('matchid')
    started = game_dealing_started.get(match_id, False)
    if started:
        return jsonify({'result': 0, 'message': 'Dealing started'})
    else:
        return jsonify({'result': 1, 'message': 'Not started yet'})


# pass_status = {}  # match_id -> { round -> bool }


# @app.route('/api/set_passed', methods=['POST'])
# def set_passed():
#     match_id = request.json.get('matchid')
#     round_num = str(request.json.get('round'))  # ✅ 新增 round 参数

#     if match_id not in pass_status:
#         pass_status[match_id] = {}
    
#     pass_status[match_id][round_num] = True  # ✅ 按 round 存储
#     return jsonify({'result': 0, 'message': 'Pass set'})


# @app.route('/api/is_passed', methods=['POST'])
# def is_passed():
#     match_id = request.json.get('matchid')
#     round_num = str(request.json.get('round'))  # ✅ 新增 round 参数

#     # 如果 host 已经摸牌/打牌了，就直接返回 result=2
#     if ongoing_matches.get(match_id).latest_player == '0':
#         return jsonify({'result': 2, 'message': 'Host Made a move'})

#     # ✅ 判断当前 round 是否存在 pass 状态
#     if pass_status.get(match_id, {}).get(round_num, False):
#         pass_status[match_id][round_num] = False  # 清掉状态
#         return jsonify({'result': 0, 'message': 'Host passed'})
#     else:
#         return jsonify({'result': 1, 'message': 'Not passed yet'})

pass_status = {}  # match_id -> { round -> { '0': False, '1': False } }
# 0: fasle
# 1：true
# 2：move

@app.route('/api/set_passed', methods=['POST'])
def set_passed():
    match_id = request.json.get('matchid')
    round_num = str(request.json.get('round'))
    player = request.json.get('player')  # '0' 或 '1'

    if match_id not in pass_status:
        pass_status[match_id] = {}
    if round_num not in pass_status[match_id]:
        pass_status[match_id][round_num] = {'0': 0, '1': 0}
    
    pass_status[match_id][round_num][player] = 1
    return jsonify({'result': 0, 'message': f'Player {player} passed'})

@app.route('/api/is_passed', methods=['POST'])
def is_passed():
    match_id = request.json.get('matchid')
    round_num = str(request.json.get('round'))
    player = request.json.get('player')  # '0' or '1'

    # match = ongoing_matches.get(match_id)
    # if match and match.latest_player == '0':
    # # if match and match.latest_player != player:

    #     return jsonify({'result': 2, 'message': 'Already moved'})
    
    pass_info = pass_status.get(match_id, {}).get(round_num, {'0': 0, '1': 0})
    p0 = pass_info.get('0', 0)
    p1 = pass_info.get('1', 0)

    if p0 and p1:
        pass_status[match_id][round_num] = {'0': 0, '1': 0}
        if p0 == 1 and p1 == 1:
            return jsonify({'result': 0, 'message': 'Both players passed'})
        else :
            return jsonify({'result': 2, 'message': 'Already moved'})
    elif p0 or p1:
        if p0 == 2 or p1 == 2:
            return jsonify({'result': 2, 'message': 'Already moved'})
        else:
            return jsonify({'result': 3, 'message': 'One player passed'})
    else:
        return jsonify({'result': 1, 'message': 'Not passed yet'})






# 改成支持按 round 存储
latest_moves = {}  # match_id -> { round -> move content }

@app.route('/api/submit_move', methods=['POST'])
def submit_move():
    data = request.get_json()
    match_id = data.get('matchid')
    round_num = data.get('round')
    score_summary = data.get('scoreSymmary')
    winner = data.get('winner')

    if not match_id or round_num is None:
        return jsonify({'result': 1, 'message': 'Missing match ID or round'})

    if match_id not in latest_moves:
        latest_moves[match_id] = {}

    latest_moves[match_id][round_num] = {
        'scoreSymmary': score_summary,
        'winner': winner,
    }

    return jsonify({'result': 0, 'message': 'Move submitted'})


@app.route('/api/get_latest_move', methods=['POST'])
def get_latest_move_post():
    data = request.get_json()
    match_id = data.get('matchid')
    round_num = data.get('round')

    if not match_id or round_num is None:
        return jsonify({'result': 1, 'message': 'Missing match ID or round'})

    move_data = latest_moves.get(match_id, {}).get(round_num)
    if not move_data:
        return jsonify({'result': 2, 'message': 'No move found for this round'})

    return jsonify({'result': 0, 'message': 'Move retrieved', **move_data})



waiting_next_round = {}  # match_id -> {'p1': False, 'p2': False, 'round': int}

@app.route('/api/set_waiting_next_round', methods=['POST'])
def set_waiting_next_round():
    data = request.get_json()
    match_id = data.get('matchid')
    host = data.get('host')  # '0' or '1'
    round_num = str(data.get('round'))  # round 也要作为 key 层

    if match_id not in waiting_next_round:
        waiting_next_round[match_id] = {}
    if round_num not in waiting_next_round[match_id]:
        waiting_next_round[match_id][round_num] = {'p1': False, 'p2': False}

    if host == '0':
        waiting_next_round[match_id][round_num]['p1'] = True
    elif host == '1':
        waiting_next_round[match_id][round_num]['p2'] = True

    print(f">> [set_waiting_next_round] {waiting_next_round}")
    return jsonify({'result': 0, 'message': 'Waiting flag set'})



@app.route('/api/is_both_waiting_next_round', methods=['POST'])
def is_both_waiting_next_round():
    data = request.get_json()
    match_id = data.get('matchid')
    round_num = str(data.get('round'))

    waiting = waiting_next_round.get(match_id, {}).get(round_num, {'p1': False, 'p2': False})
    both_ready = waiting['p1'] and waiting['p2']

    print(f">> [is_both_waiting_next_round] {waiting_next_round}")
    return jsonify({
        'result': 0,
        'both_ready': both_ready
    })



@app.route('/api/reset_game_dealing_started', methods=['POST'])
def reset_game_dealing_started():
    match_id = request.json.get('matchid')
    if match_id in game_dealing_started:
        game_dealing_started[match_id] = False
    return jsonify({'result': 0, 'message': 'Game dealing status reset'})


if __name__ == '__main__':
    
    app.run(debug=True, port=8080)
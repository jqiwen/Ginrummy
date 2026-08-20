# Flask to Socket.IO migration map

This map records the repository's actual Flask surface before the migration. Socket.IO acknowledgements replace request/response calls; broadcasts replace polling endpoints.

| Old Flask endpoint / operation | New Socket.IO event | Delivery |
| --- | --- | --- |
| `GET /` status page | `GET /` JSON health response | HTTP health check only |
| `POST /api/signup` | `auth:signup` | acknowledgement |
| `POST /api/login` | `auth:login` | acknowledgement |
| `POST /api/match_create` | `room:create` | acknowledgement plus `room:created` |
| `POST /api/join` | `room:join` | acknowledgement plus `room:joined` / `room:player-joined` |
| `POST /api/room_status` polling | `room:player-joined` | server push |
| `POST /api/set_game_start` | `game:start` | acknowledgement plus `game:started` |
| `POST /api/is_game_started` polling | `game:started` | server push |
| `POST /api/match_start` | `round:start` | acknowledgement plus player-specific `game:dealing-started` |
| `POST /api/set_game_dealing_started` | included in `round:start` | server push |
| `POST /api/is_game_dealing_started` polling | `game:dealing-started` | server push |
| `POST /api/reset_game_dealing_started` | no longer needed | event delivery is edge-triggered |
| `POST /api/match_move`, `move=stack` | `game:draw-stack` | acknowledgement |
| `POST /api/match_move`, `move=dropzone` | `game:draw-discard` | acknowledgement |
| `POST /api/match_move`, `move=drop` | `game:discard` | acknowledgement plus `game:opponent-action` |
| `POST /api/match_move`, `move=knock` | `game:knock` | acknowledgement plus `game:knocked` |
| `POST /api/match_move`, `move=opponent_status` polling | removed | server validates the turn and pushes actions |
| `POST /api/match_move`, `move=wait_opponent` polling | `game:opponent-action` | server push |
| `POST /api/set_passed` | `game:pass` | acknowledgement plus `game:pass-status` |
| `POST /api/is_passed` polling | `game:pass-status` | server push |
| `POST /api/submit_move` | `round:submit-result` | acknowledgement plus `round:result` |
| `POST /api/get_latest_move` polling/read | `round:result` | server push |
| `POST /api/set_waiting_next_round` | `round:ready-next` | acknowledgement |
| `POST /api/is_both_waiting_next_round` polling | `round:both-ready` | server push |

`room:resume` re-associates the game-page socket with its existing player slot after navigation or a simple reconnect. `room:leave` and the Socket.IO `disconnect` event notify the opponent through `room:player-left` without deleting unrelated matches.

"""
WebRTC сигнальный сервер: стабильное соединение через heartbeat, reconnect, инкрементальный ICE.
"""
import json
import os
import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

ICE_SERVERS = [
    {'urls': 'stun:stun.l.google.com:19302'},
    {'urls': 'stun:stun1.l.google.com:19302'},
    {'urls': 'stun:stun.cloudflare.com:3478'},
    {'urls': 'turn:openrelay.metered.ca:80',  'username': 'openrelayproject', 'credential': 'openrelayproject'},
    {'urls': 'turn:openrelay.metered.ca:443', 'username': 'openrelayproject', 'credential': 'openrelayproject'},
    {'urls': 'turn:openrelay.metered.ca:443?transport=tcp', 'username': 'openrelayproject', 'credential': 'openrelayproject'},
]

# Звонок считается зависшим если нет heartbeat дольше HANGUP_TIMEOUT секунд
HANGUP_TIMEOUT = 30


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def json_response(status: int, data: dict) -> dict:
    return {
        'statusCode': status,
        'headers': {'Content-Type': 'application/json', **CORS_HEADERS},
        'body': json.dumps(data, ensure_ascii=False, default=str),
    }


def get_user_by_token(cur, schema, token):
    cur.execute(
        f'''SELECT u.id, u.username, u.display_name, u.avatar_url
            FROM "{schema}".users u
            JOIN "{schema}".sessions s ON s.user_id = u.id
            WHERE s.token = %s AND s.expires_at > NOW()''',
        (token,)
    )
    return cur.fetchone()


def cleanup_stale_calls(cur, schema):
    """Завершаем звонки у которых не было heartbeat дольше HANGUP_TIMEOUT сек."""
    cur.execute(
        f'''UPDATE "{schema}".calls SET status = 'ended', updated_at = NOW()
            WHERE status = 'active'
            AND (
                caller_hb < NOW() - INTERVAL '{HANGUP_TIMEOUT} seconds'
                OR callee_hb < NOW() - INTERVAL '{HANGUP_TIMEOUT} seconds'
            )'''
    )
    cur.execute(
        f'''UPDATE "{schema}".calls SET status = 'missed', updated_at = NOW()
            WHERE status = 'calling'
            AND created_at < NOW() - INTERVAL '90 seconds' '''
    )


def handler(event: dict, context) -> dict:
    """Сигнальный сервер WebRTC: старт, ответ, ICE, heartbeat, статус, завершение."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    token = (event.get('headers') or {}).get('X-Session-Token', '')
    if not token:
        return json_response(401, {'error': 'Не авторизован'})

    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', '')

    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            return json_response(400, {'error': 'Неверный формат'})

    conn = get_conn()
    cur = conn.cursor()
    me = get_user_by_token(cur, schema, token)
    if not me:
        cur.close(); conn.close()
        return json_response(401, {'error': 'Сессия истекла'})

    my_id = me[0]

    cleanup_stale_calls(cur, schema)
    conn.commit()

    # ─── POST ?action=call ───────────────────────────────────────────────────
    if method == 'POST' and action == 'call':
        callee_id = body.get('callee_id')
        offer = body.get('offer')
        call_type = body.get('call_type', 'video')
        if call_type not in ('video', 'audio'):
            call_type = 'video'
        if not callee_id or not offer:
            cur.close(); conn.close()
            return json_response(400, {'error': 'callee_id и offer обязательны'})

        cur.execute(
            f'''UPDATE "{schema}".calls SET status = 'ended', updated_at = NOW()
                WHERE (caller_id = %s OR callee_id = %s) AND status IN ('calling', 'active')''',
            (my_id, my_id)
        )
        cur.execute(
            f'''INSERT INTO "{schema}".calls
                    (caller_id, callee_id, status, offer, call_type, updated_at, caller_hb, callee_hb)
                VALUES (%s, %s, 'calling', %s, %s, NOW(), NOW(), NOW()) RETURNING id''',
            (my_id, callee_id, json.dumps(offer), call_type)
        )
        call_id = cur.fetchone()[0]
        conn.commit()

        cur.execute(
            f'SELECT username, display_name, avatar_url FROM "{schema}".users WHERE id = %s',
            (my_id,)
        )
        caller = cur.fetchone()
        cur.close(); conn.close()
        return json_response(200, {
            'call_id': call_id,
            'caller': {'id': my_id, 'username': caller[0], 'display_name': caller[1], 'avatar_url': caller[2]},
            'ice_servers': ICE_SERVERS,
        })

    # ─── GET ?action=incoming ────────────────────────────────────────────────
    if method == 'GET' and action == 'incoming':
        cur.execute(
            f'''SELECT c.id, c.caller_id, u.username, u.display_name, u.avatar_url, c.offer, c.call_type
                FROM "{schema}".calls c
                JOIN "{schema}".users u ON u.id = c.caller_id
                WHERE c.callee_id = %s AND c.status = 'calling'
                ORDER BY c.created_at DESC LIMIT 1''',
            (my_id,)
        )
        row = cur.fetchone()
        cur.close(); conn.close()
        if not row:
            return json_response(200, {'call': None})
        return json_response(200, {
            'call': {
                'call_id': row[0],
                'caller': {'id': row[1], 'username': row[2], 'display_name': row[3], 'avatar_url': row[4]},
                'offer': json.loads(row[5]) if row[5] else None,
                'call_type': row[6] or 'video',
            },
            'ice_servers': ICE_SERVERS,
        })

    # ─── POST ?action=answer ─────────────────────────────────────────────────
    if method == 'POST' and action == 'answer':
        call_id = body.get('call_id')
        answer = body.get('answer')
        if not call_id or not answer:
            cur.close(); conn.close()
            return json_response(400, {'error': 'call_id и answer обязательны'})
        cur.execute(
            f'''UPDATE "{schema}".calls
                SET status = 'active', answer = %s, updated_at = NOW(), callee_hb = NOW()
                WHERE id = %s AND callee_id = %s AND status = 'calling' ''',
            (json.dumps(answer), call_id, my_id)
        )
        conn.commit()
        cur.close(); conn.close()
        return json_response(200, {'ok': True, 'ice_servers': ICE_SERVERS})

    # ─── POST ?action=reject ─────────────────────────────────────────────────
    if method == 'POST' and action == 'reject':
        call_id = body.get('call_id')
        if not call_id:
            cur.close(); conn.close()
            return json_response(400, {'error': 'call_id обязателен'})
        cur.execute(
            f'''UPDATE "{schema}".calls SET status = 'rejected', updated_at = NOW()
                WHERE id = %s AND callee_id = %s AND status = 'calling' ''',
            (call_id, my_id)
        )
        conn.commit()
        cur.close(); conn.close()
        return json_response(200, {'ok': True})

    # ─── POST ?action=end ────────────────────────────────────────────────────
    if method == 'POST' and action == 'end':
        call_id = body.get('call_id')
        if not call_id:
            cur.close(); conn.close()
            return json_response(400, {'error': 'call_id обязателен'})
        cur.execute(
            f'''UPDATE "{schema}".calls SET status = 'ended', updated_at = NOW()
                WHERE id = %s AND (caller_id = %s OR callee_id = %s)''',
            (call_id, my_id, my_id)
        )
        conn.commit()
        cur.close(); conn.close()
        return json_response(200, {'ok': True})

    # ─── POST ?action=heartbeat ──────────────────────────────────────────────
    if method == 'POST' and action == 'heartbeat':
        call_id = body.get('call_id')
        if not call_id:
            cur.close(); conn.close()
            return json_response(400, {'error': 'call_id обязателен'})
        cur.execute(
            f'SELECT caller_id, callee_id, status FROM "{schema}".calls WHERE id = %s',
            (call_id,)
        )
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return json_response(404, {'error': 'Звонок не найден'})
        caller_id, callee_id, status = row
        if status not in ('active', 'calling'):
            cur.close(); conn.close()
            return json_response(200, {'ok': True, 'status': status})
        if my_id == caller_id:
            cur.execute(
                f'UPDATE "{schema}".calls SET caller_hb = NOW() WHERE id = %s',
                (call_id,)
            )
        elif my_id == callee_id:
            cur.execute(
                f'UPDATE "{schema}".calls SET callee_hb = NOW() WHERE id = %s',
                (call_id,)
            )
        conn.commit()
        cur.close(); conn.close()
        return json_response(200, {'ok': True, 'status': status})

    # ─── POST ?action=ice ────────────────────────────────────────────────────
    if method == 'POST' and action == 'ice':
        call_id = body.get('call_id')
        candidate = body.get('candidate')
        if not call_id or candidate is None:
            cur.close(); conn.close()
            return json_response(400, {'error': 'call_id и candidate обязательны'})

        cur.execute(
            f'''SELECT caller_id, callee_id, caller_ice, callee_ice
                FROM "{schema}".calls WHERE id = %s AND status IN ('calling', 'active')''',
            (call_id,)
        )
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return json_response(404, {'error': 'Звонок не найден или завершён'})

        caller_id, callee_id, caller_ice, callee_ice = row
        if my_id == caller_id:
            ice_list = json.loads(caller_ice or '[]')
            ice_list.append(candidate)
            cur.execute(
                f'''UPDATE "{schema}".calls
                    SET caller_ice = %s, caller_ice_seq = caller_ice_seq + 1,
                        updated_at = NOW(), caller_hb = NOW()
                    WHERE id = %s''',
                (json.dumps(ice_list), call_id)
            )
        else:
            ice_list = json.loads(callee_ice or '[]')
            ice_list.append(candidate)
            cur.execute(
                f'''UPDATE "{schema}".calls
                    SET callee_ice = %s, callee_ice_seq = callee_ice_seq + 1,
                        updated_at = NOW(), callee_hb = NOW()
                    WHERE id = %s''',
                (json.dumps(ice_list), call_id)
            )
        conn.commit()
        cur.close(); conn.close()
        return json_response(200, {'ok': True})

    # ─── GET ?action=status ──────────────────────────────────────────────────
    if method == 'GET' and action == 'status':
        call_id = qs.get('call_id')
        if not call_id:
            cur.close(); conn.close()
            return json_response(400, {'error': 'call_id обязателен'})

        since_caller = int(qs.get('since_caller', '0'))
        since_callee = int(qs.get('since_callee', '0'))

        cur.execute(
            f'''SELECT status, answer, caller_ice, callee_ice, caller_id, callee_id,
                       caller_ice_seq, callee_ice_seq
                FROM "{schema}".calls WHERE id = %s''',
            (call_id,)
        )
        row = cur.fetchone()
        cur.close(); conn.close()
        if not row:
            return json_response(404, {'error': 'Звонок не найден'})

        status, answer, caller_ice, callee_ice, caller_id, callee_id, caller_seq, callee_seq = row
        caller_ice_list = json.loads(caller_ice or '[]')
        callee_ice_list = json.loads(callee_ice or '[]')

        if my_id == caller_id:
            new_ice = callee_ice_list[since_callee:]
            new_seq = callee_seq
        else:
            new_ice = caller_ice_list[since_caller:]
            new_seq = caller_seq

        result = {
            'status': status,
            'ice': new_ice,
            'ice_seq': new_seq,
        }
        if answer and my_id == caller_id:
            result['answer'] = json.loads(answer)

        return json_response(200, result)

    cur.close(); conn.close()
    return json_response(404, {'error': 'Неизвестный action'})

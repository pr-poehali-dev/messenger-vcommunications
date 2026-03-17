"""
WebRTC сигнальный сервер: инициация звонков, обмен offer/answer/ICE кандидатами.
"""
import json
import os
import psycopg2
from datetime import datetime, timedelta

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

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

def handler(event: dict, context) -> dict:
    """Сигнальный сервер для WebRTC звонков: старт, ответ, ICE-кандидаты, статус, завершение."""
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

    # Убираем зависшие звонки старше 90 секунд
    cur.execute(
        f'''UPDATE "{schema}".calls SET status = 'missed'
            WHERE status IN ('calling') AND created_at < NOW() - INTERVAL '90 seconds' ''',
    )
    conn.commit()

    # POST ?action=call — инициировать звонок
    if method == 'POST' and action == 'call':
        callee_id = body.get('callee_id')
        offer = body.get('offer')
        if not callee_id or not offer:
            cur.close(); conn.close()
            return json_response(400, {'error': 'callee_id и offer обязательны'})

        # Завершить предыдущие активные звонки этого пользователя
        cur.execute(
            f'''UPDATE "{schema}".calls SET status = 'ended'
                WHERE (caller_id = %s OR callee_id = %s) AND status IN ('calling', 'active')''',
            (my_id, my_id)
        )

        cur.execute(
            f'''INSERT INTO "{schema}".calls (caller_id, callee_id, status, offer, updated_at)
                VALUES (%s, %s, 'calling', %s, NOW()) RETURNING id''',
            (my_id, callee_id, json.dumps(offer))
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
        })

    # GET ?action=incoming — проверить входящий звонок
    if method == 'GET' and action == 'incoming':
        cur.execute(
            f'''SELECT c.id, c.caller_id, u.username, u.display_name, u.avatar_url, c.offer
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
            }
        })

    # POST ?action=answer — принять звонок
    if method == 'POST' and action == 'answer':
        call_id = body.get('call_id')
        answer = body.get('answer')
        if not call_id or not answer:
            cur.close(); conn.close()
            return json_response(400, {'error': 'call_id и answer обязательны'})
        cur.execute(
            f'''UPDATE "{schema}".calls SET status = 'active', answer = %s, updated_at = NOW()
                WHERE id = %s AND callee_id = %s AND status = 'calling' ''',
            (json.dumps(answer), call_id, my_id)
        )
        conn.commit()
        cur.close(); conn.close()
        return json_response(200, {'ok': True})

    # POST ?action=reject — отклонить звонок
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

    # POST ?action=end — завершить звонок
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

    # POST ?action=ice — добавить ICE-кандидат
    if method == 'POST' and action == 'ice':
        call_id = body.get('call_id')
        candidate = body.get('candidate')
        if not call_id or candidate is None:
            cur.close(); conn.close()
            return json_response(400, {'error': 'call_id и candidate обязательны'})

        cur.execute(
            f'SELECT caller_id, callee_id, caller_ice, callee_ice FROM "{schema}".calls WHERE id = %s',
            (call_id,)
        )
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return json_response(404, {'error': 'Звонок не найден'})

        caller_id, callee_id, caller_ice, callee_ice = row
        if my_id == caller_id:
            ice_list = json.loads(caller_ice or '[]')
            ice_list.append(candidate)
            cur.execute(
                f'UPDATE "{schema}".calls SET caller_ice = %s, updated_at = NOW() WHERE id = %s',
                (json.dumps(ice_list), call_id)
            )
        else:
            ice_list = json.loads(callee_ice or '[]')
            ice_list.append(candidate)
            cur.execute(
                f'UPDATE "{schema}".calls SET callee_ice = %s, updated_at = NOW() WHERE id = %s',
                (json.dumps(ice_list), call_id)
            )
        conn.commit()
        cur.close(); conn.close()
        return json_response(200, {'ok': True})

    # GET ?action=status&call_id=X — получить текущий статус звонка (answer + ICE)
    if method == 'GET' and action == 'status':
        call_id = qs.get('call_id')
        if not call_id:
            cur.close(); conn.close()
            return json_response(400, {'error': 'call_id обязателен'})
        cur.execute(
            f'''SELECT status, answer, caller_ice, callee_ice, caller_id, callee_id
                FROM "{schema}".calls WHERE id = %s''',
            (call_id,)
        )
        row = cur.fetchone()
        cur.close(); conn.close()
        if not row:
            return json_response(404, {'error': 'Звонок не найден'})
        status, answer, caller_ice, callee_ice, caller_id, callee_id = row
        is_caller = (my_id == caller_id)
        return json_response(200, {
            'status': status,
            'answer': json.loads(answer) if answer else None,
            'ice': json.loads(callee_ice or '[]') if is_caller else json.loads(caller_ice or '[]'),
        })

    cur.close(); conn.close()
    return json_response(400, {'error': 'Неизвестное действие'})

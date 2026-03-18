"""
Чаты и сообщения: список чатов, история сообщений, отправка, поиск пользователей.
"""
import json
import os
import psycopg2
from psycopg2 import pool
from datetime import datetime

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

_pool = None

def get_pool():
    global _pool
    if _pool is None or _pool.closed:
        _pool = pool.SimpleConnectionPool(1, 5, os.environ['DATABASE_URL'])
    return _pool

def get_conn():
    return get_pool().getconn()

def release_conn(conn):
    try:
        get_pool().putconn(conn)
    except Exception:
        pass

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
    """Управление чатами: список, история, отправка сообщений, поиск пользователей, онлайн-статус."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    token = (event.get('headers') or {}).get('X-Session-Token', '')
    if not token:
        return json_response(401, {'error': 'Не авторизован'})

    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    path = event.get('path', '/')
    action = qs.get('action') or path.rstrip('/').split('/')[-1]

    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            return json_response(400, {'error': 'Неверный формат запроса'})

    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor()
        me = get_user_by_token(cur, schema, token)
        if not me:
            cur.close()
            return json_response(401, {'error': 'Сессия истекла'})

        my_id = me[0]

        # POST ?action=ping — обновить last_seen
        if method == 'POST' and action == 'ping':
            cur.execute(f'UPDATE "{schema}".users SET last_seen_at = NOW() WHERE id = %s', (my_id,))
            conn.commit()
            cur.close()
            return json_response(200, {'ok': True})

        # GET ?action=online&user_id=X — статус онлайн
        if method == 'GET' and action == 'online':
            user_id = qs.get('user_id')
            if not user_id:
                cur.close()
                return json_response(400, {'error': 'user_id обязателен'})
            cur.execute(f'SELECT last_seen_at FROM "{schema}".users WHERE id = %s', (user_id,))
            row = cur.fetchone()
            cur.close()
            if not row or not row[0]:
                return json_response(200, {'online': False, 'last_seen': None})
            diff = (datetime.utcnow() - row[0]).total_seconds()
            return json_response(200, {'online': diff < 60, 'last_seen': str(row[0])})

        # GET ?action=conversations — список чатов
        if method == 'GET' and action == 'conversations':
            cur.execute(f'''
                SELECT
                    c.id,
                    CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END AS other_id,
                    u.username, u.display_name, u.avatar_url,
                    m.text AS last_text,
                    m.created_at AS last_at,
                    m.sender_id AS last_sender,
                    (SELECT COUNT(*) FROM "{schema}".messages m2
                     WHERE m2.conversation_id = c.id AND m2.sender_id != %s AND m2.read_at IS NULL) AS unread
                FROM "{schema}".conversations c
                JOIN "{schema}".users u ON u.id = (CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END)
                LEFT JOIN LATERAL (
                    SELECT text, created_at, sender_id FROM "{schema}".messages
                    WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
                ) m ON true
                WHERE c.user1_id = %s OR c.user2_id = %s
                ORDER BY COALESCE(m.created_at, c.created_at) DESC
            ''', (my_id, my_id, my_id, my_id, my_id))
            rows = cur.fetchall()
            cur.close()
            convs = []
            for r in rows:
                convs.append({
                    'id': r[0],
                    'other_user': {'id': r[1], 'username': r[2], 'display_name': r[3], 'avatar_url': r[4]},
                    'last_message': {'text': r[5], 'at': str(r[6]) if r[6] else None, 'mine': r[7] == my_id} if r[5] else None,
                    'unread': r[8],
                })
            return json_response(200, {'conversations': convs})

        # GET ?action=messages&conv_id=X&after=ID — история/новые сообщения
        if method == 'GET' and action == 'messages':
            conv_id = qs.get('conv_id')
            after = qs.get('after')
            if not conv_id:
                cur.close()
                return json_response(400, {'error': 'conv_id обязателен'})
            cur.execute(
                f'SELECT id FROM "{schema}".conversations WHERE id = %s AND (user1_id = %s OR user2_id = %s)',
                (conv_id, my_id, my_id)
            )
            if not cur.fetchone():
                cur.close()
                return json_response(403, {'error': 'Нет доступа'})
            if after:
                cur.execute(
                    f'SELECT id, sender_id, text, created_at, read_at FROM "{schema}".messages WHERE conversation_id = %s AND id > %s ORDER BY created_at ASC',
                    (conv_id, after)
                )
            else:
                cur.execute(
                    f'SELECT id, sender_id, text, created_at, read_at FROM "{schema}".messages WHERE conversation_id = %s ORDER BY created_at ASC LIMIT 100',
                    (conv_id,)
                )
            rows = cur.fetchall()
            cur.execute(
                f'UPDATE "{schema}".messages SET read_at = NOW() WHERE conversation_id = %s AND sender_id != %s AND read_at IS NULL',
                (conv_id, my_id)
            )
            conn.commit()
            cur.close()
            msgs = [{'id': r[0], 'sender_id': r[1], 'text': r[2], 'at': str(r[3]), 'read': r[4] is not None} for r in rows]
            return json_response(200, {'messages': msgs})

        # GET ?action=search&q=username — поиск пользователей
        if method == 'GET' and action == 'search':
            q = (qs.get('q') or '').strip().lstrip('@')
            if len(q) < 2:
                cur.close()
                return json_response(400, {'error': 'Минимум 2 символа'})
            cur.execute(
                f'''SELECT id, username, display_name, avatar_url FROM "{schema}".users
                    WHERE id != %s AND (username ILIKE %s OR display_name ILIKE %s)
                    LIMIT 20''',
                (my_id, f'%{q}%', f'%{q}%')
            )
            rows = cur.fetchall()
            cur.close()
            users = [{'id': r[0], 'username': r[1], 'display_name': r[2], 'avatar_url': r[3]} for r in rows]
            return json_response(200, {'users': users})

        # POST ?action=send — отправить сообщение
        if method == 'POST' and action == 'send':
            to_user_id = body.get('to_user_id')
            text = (body.get('text') or '').strip()
            if not to_user_id or not text:
                cur.close()
                return json_response(400, {'error': 'to_user_id и text обязательны'})
            if len(text) > 4000:
                cur.close()
                return json_response(400, {'error': 'Сообщение слишком длинное'})
            u1, u2 = (my_id, to_user_id) if my_id < to_user_id else (to_user_id, my_id)
            cur.execute(
                f'SELECT id FROM "{schema}".conversations WHERE user1_id = %s AND user2_id = %s',
                (u1, u2)
            )
            row = cur.fetchone()
            if row:
                conv_id = row[0]
            else:
                cur.execute(
                    f'INSERT INTO "{schema}".conversations (user1_id, user2_id) VALUES (%s, %s) RETURNING id',
                    (u1, u2)
                )
                conv_id = cur.fetchone()[0]
            cur.execute(
                f'INSERT INTO "{schema}".messages (conversation_id, sender_id, text) VALUES (%s, %s, %s) RETURNING id, created_at',
                (conv_id, my_id, text)
            )
            msg_id, created_at = cur.fetchone()
            conn.commit()
            cur.close()
            return json_response(200, {
                'message': {'id': msg_id, 'sender_id': my_id, 'text': text, 'at': str(created_at), 'read': False},
                'conv_id': conv_id,
            })

        # POST ?action=open_conv — открыть/создать разговор по user_id
        if method == 'POST' and action == 'open_conv':
            to_user_id = body.get('to_user_id')
            if not to_user_id:
                cur.close()
                return json_response(400, {'error': 'to_user_id обязателен'})
            u1, u2 = (my_id, to_user_id) if my_id < to_user_id else (to_user_id, my_id)
            cur.execute(
                f'SELECT id FROM "{schema}".conversations WHERE user1_id = %s AND user2_id = %s',
                (u1, u2)
            )
            row = cur.fetchone()
            if row:
                conv_id = row[0]
            else:
                cur.execute(
                    f'INSERT INTO "{schema}".conversations (user1_id, user2_id) VALUES (%s, %s) RETURNING id',
                    (u1, u2)
                )
                conv_id = cur.fetchone()[0]
            conn.commit()
            cur.execute(
                f'SELECT id, username, display_name, avatar_url FROM "{schema}".users WHERE id = %s',
                (to_user_id,)
            )
            u = cur.fetchone()
            cur.close()
            return json_response(200, {
                'conv_id': conv_id,
                'other_user': {'id': u[0], 'username': u[1], 'display_name': u[2], 'avatar_url': u[3]} if u else None,
            })

        cur.close()
        return json_response(404, {'error': 'Not found'})

    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        raise e
    finally:
        if conn:
            release_conn(conn)

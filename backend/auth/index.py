"""
Аутентификация пользователей: регистрация, вход, выход, получение профиля.
"""
import json
import os
import hashlib
import secrets
import psycopg2
from psycopg2 import pool
from datetime import datetime, timedelta

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

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def make_token() -> str:
    return secrets.token_hex(32)

def json_response(status: int, data: dict) -> dict:
    return {
        'statusCode': status,
        'headers': {'Content-Type': 'application/json', **CORS_HEADERS},
        'body': json.dumps(data, ensure_ascii=False),
    }

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', '')

    # Keep-alive ping — прогрев функции
    if action == 'ping':
        return json_response(200, {'ok': True})

    method = event.get('httpMethod', 'GET')
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            return json_response(400, {'error': 'Неверный формат запроса'})

    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    conn = None

    try:
        # POST /register
        if method == 'POST' and action == 'register':
            phone = (body.get('phone') or '').strip()
            username = (body.get('username') or '').strip()
            password = (body.get('password') or '').strip()

            if not phone or not username or not password:
                return json_response(400, {'error': 'Заполните все поля'})
            if len(password) < 6:
                return json_response(400, {'error': 'Пароль должен быть не менее 6 символов'})

            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f'SELECT id FROM "{schema}".users WHERE phone = %s OR username = %s', (phone, username))
            if cur.fetchone():
                cur.close()
                return json_response(409, {'error': 'Пользователь с таким номером или юзернеймом уже существует'})

            pw_hash = hash_password(password)
            cur.execute(
                f'INSERT INTO "{schema}".users (phone, username, password_hash) VALUES (%s, %s, %s) RETURNING id',
                (phone, username, pw_hash)
            )
            user_id = cur.fetchone()[0]

            token = make_token()
            expires = datetime.utcnow() + timedelta(days=30)
            cur.execute(
                f'INSERT INTO "{schema}".sessions (user_id, token, expires_at) VALUES (%s, %s, %s)',
                (user_id, token, expires)
            )
            conn.commit()
            cur.close()
            return json_response(200, {
                'token': token,
                'user': {'id': user_id, 'phone': phone, 'username': username}
            })

        # POST /login
        if method == 'POST' and action == 'login':
            login = (body.get('login') or '').strip()
            password = (body.get('password') or '').strip()

            if not login or not password:
                return json_response(400, {'error': 'Введите логин и пароль'})

            conn = get_conn()
            cur = conn.cursor()
            cur.execute(
                f'SELECT id, phone, username, avatar_url, display_name, status FROM "{schema}".users WHERE (phone = %s OR username = %s) AND password_hash = %s',
                (login, login, hash_password(password))
            )
            user = cur.fetchone()
            if not user:
                cur.close()
                return json_response(401, {'error': 'Неверный логин или пароль'})

            user_id, phone, username, avatar_url, display_name, status = user
            token = make_token()
            expires = datetime.utcnow() + timedelta(days=30)
            cur.execute(
                f'INSERT INTO "{schema}".sessions (user_id, token, expires_at) VALUES (%s, %s, %s)',
                (user_id, token, expires)
            )
            conn.commit()
            cur.close()
            return json_response(200, {
                'token': token,
                'user': {'id': user_id, 'phone': phone, 'username': username, 'avatar_url': avatar_url, 'display_name': display_name, 'status': status}
            })

        # GET /me
        if method == 'GET' and action == 'me':
            token = (event.get('headers') or {}).get('X-Session-Token', '')
            if not token:
                return json_response(401, {'error': 'Не авторизован'})

            conn = get_conn()
            cur = conn.cursor()
            cur.execute(
                f'''SELECT u.id, u.phone, u.username, u.avatar_url, u.display_name, u.status FROM "{schema}".users u
                   JOIN "{schema}".sessions s ON s.user_id = u.id
                   WHERE s.token = %s AND s.expires_at > NOW()''',
                (token,)
            )
            user = cur.fetchone()
            cur.close()

            if not user:
                return json_response(401, {'error': 'Сессия истекла'})

            return json_response(200, {'user': {'id': user[0], 'phone': user[1], 'username': user[2], 'avatar_url': user[3], 'display_name': user[4], 'status': user[5]}})

        # POST /logout
        if method == 'POST' and action == 'logout':
            token = (event.get('headers') or {}).get('X-Session-Token', '')
            if token:
                conn = get_conn()
                cur = conn.cursor()
                cur.execute(f'UPDATE "{schema}".sessions SET expires_at = NOW() WHERE token = %s', (token,))
                conn.commit()
                cur.close()
            return json_response(200, {'ok': True})

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

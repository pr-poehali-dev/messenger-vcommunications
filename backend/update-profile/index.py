"""
Обновление профиля пользователя: отображаемое имя и статус.
"""
import json
import os
import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def json_response(status: int, data: dict) -> dict:
    return {
        'statusCode': status,
        'headers': {'Content-Type': 'application/json', **CORS_HEADERS},
        'body': json.dumps(data, ensure_ascii=False),
    }

def handler(event: dict, context) -> dict:
    """Обновление отображаемого имени и статуса пользователя."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    token = (event.get('headers') or {}).get('X-Session-Token', '')
    if not token:
        return json_response(401, {'error': 'Не авторизован'})

    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            return json_response(400, {'error': 'Неверный формат запроса'})

    display_name = body.get('display_name', '').strip() if body.get('display_name') is not None else None
    status = body.get('status', '').strip() if body.get('status') is not None else None

    if display_name is not None and len(display_name) > 100:
        return json_response(400, {'error': 'Имя слишком длинное (макс. 100 символов)'})
    if status is not None and len(status) > 200:
        return json_response(400, {'error': 'Статус слишком длинный (макс. 200 символов)'})

    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f'SELECT u.id FROM "{schema}".users u JOIN "{schema}".sessions s ON s.user_id = u.id WHERE s.token = %s AND s.expires_at > NOW()',
        (token,)
    )
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        return json_response(401, {'error': 'Сессия истекла'})

    user_id = row[0]

    updates = []
    params = []
    if display_name is not None:
        updates.append('display_name = %s')
        params.append(display_name if display_name else None)
    if status is not None:
        updates.append('status = %s')
        params.append(status if status else None)

    if not updates:
        cur.close(); conn.close()
        return json_response(400, {'error': 'Нет данных для обновления'})

    params.append(user_id)
    cur.execute(
        f'UPDATE "{schema}".users SET {", ".join(updates)} WHERE id = %s RETURNING id, phone, username, avatar_url, display_name, status',
        params
    )
    user = cur.fetchone()
    conn.commit()
    cur.close(); conn.close()

    return json_response(200, {
        'user': {
            'id': user[0],
            'phone': user[1],
            'username': user[2],
            'avatar_url': user[3],
            'display_name': user[4],
            'status': user[5],
        }
    })

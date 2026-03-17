"""
Загрузка и обновление аватара пользователя.
Принимает base64-изображение, сохраняет в S3, обновляет avatar_url в БД.
"""
import json
import os
import base64
import psycopg2
import boto3
from uuid import uuid4

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
    """Загрузка аватара пользователя в S3 и обновление ссылки в профиле."""
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

    image_data = body.get('image')
    content_type = body.get('contentType', 'image/jpeg')

    if not image_data:
        return json_response(400, {'error': 'Изображение не передано'})

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

    ext = content_type.split('/')[-1]
    if ext == 'jpeg':
        ext = 'jpg'
    key = f'avatars/{user_id}/{uuid4().hex}.{ext}'

    image_bytes = base64.b64decode(image_data)

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(Bucket='files', Key=key, Body=image_bytes, ContentType=content_type)

    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

    cur.execute(f'UPDATE "{schema}".users SET avatar_url = %s WHERE id = %s', (cdn_url, user_id))
    conn.commit()
    cur.close(); conn.close()

    return json_response(200, {'avatar_url': cdn_url})

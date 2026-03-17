CREATE TABLE IF NOT EXISTS "t_p58147154_messenger_vcommunica".calls (
    id SERIAL PRIMARY KEY,
    caller_id INTEGER NOT NULL REFERENCES "t_p58147154_messenger_vcommunica".users(id),
    callee_id INTEGER NOT NULL REFERENCES "t_p58147154_messenger_vcommunica".users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'calling',
    offer TEXT,
    answer TEXT,
    caller_ice TEXT DEFAULT '[]',
    callee_ice TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS calls_callee_status ON "t_p58147154_messenger_vcommunica".calls(callee_id, status);
CREATE INDEX IF NOT EXISTS calls_caller_status ON "t_p58147154_messenger_vcommunica".calls(caller_id, status);
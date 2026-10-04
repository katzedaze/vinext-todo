-- owner_hash は訪問者 Cookie の SHA-256。Cookie の値そのものは保存しない
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_todos_owner ON todos (owner_hash, completed, id);

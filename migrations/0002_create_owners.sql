-- 訪問者ごとの最終利用日時。一定期間使われていない訪問者のデータを削除するために使う
CREATE TABLE owners (
  owner_hash TEXT PRIMARY KEY,
  last_seen TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_owners_last_seen ON owners (last_seen);

INSERT INTO owners (owner_hash) SELECT DISTINCT owner_hash FROM todos;

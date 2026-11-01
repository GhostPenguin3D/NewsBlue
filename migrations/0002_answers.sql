CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK(length(name) <= 40),
  body TEXT NOT NULL CHECK(length(body) BETWEEN 5 AND 240),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS answers_question_id_idx ON answers(question_id, id ASC);
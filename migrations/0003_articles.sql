CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 5 AND 120),
  excerpt TEXT NOT NULL DEFAULT '' CHECK(length(excerpt) <= 280),
  body TEXT NOT NULL CHECK(length(body) BETWEEN 20 AND 12000),
  category TEXT NOT NULL CHECK(category IN ('study', 'exam', 'mindset')),
  author TEXT NOT NULL DEFAULT 'ทีมไปต่อ ม.ปลาย' CHECK(length(author) <= 40),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS articles_created_at_idx ON articles(id DESC);

DROP TABLE IF EXISTS expenses;
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    total_amount INTEGER,
    payer TEXT,
    husband_burden INTEGER,
    wife_burden INTEGER
);
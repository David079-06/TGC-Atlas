"""Isolated, synthetic SQLite validation; never connects to production data."""

from pathlib import Path
import sqlite3

schema = (Path(__file__).resolve().parents[1] / "migrations" / "0001_initial.sql").read_text()
db = sqlite3.connect(":memory:")
db.executescript(schema)

# Synthetic fixture: not a real merchant or user record.
db.execute(
    "INSERT INTO store_registry (id,country,name,selected) VALUES(?,?,?,?)",
    ("test-shop", "ZZ", "Tienda de prueba", 0),
)
db.execute(
    """INSERT INTO shop_verification_reports
    (verification_key,country,name,facts_json,evidence_json)
    VALUES(?,?,?,?,?)""",
    ("ZZ|example.org", "ZZ", "Tienda de prueba", "{}", "[]"),
)
assert db.execute("SELECT COUNT(*) FROM store_registry").fetchone()[0] == 1

try:
    db.execute(
        "INSERT INTO shop_verification_reports (verification_key,country,name,facts_json) VALUES (?,?,?,?)",
        ("ZZ|invalid.example", "ZZ", "Prueba inválida", "{broken"),
    )
except sqlite3.IntegrityError:
    pass
else:
    raise AssertionError("Invalid JSON was accepted by D1-compatible schema")

try:
    db.execute(
        "INSERT INTO store_registry (id,country,name) VALUES (?,?,?)",
        ("test-shop", "ZZ", "Duplicada"),
    )
except sqlite3.IntegrityError:
    pass
else:
    raise AssertionError("Duplicate shop ID was accepted")

print("Cloudflare D1-compatible SQLite schema: syntax and constraints OK")
db.close()

import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:admin@localhost:5432/tienda_db")
SECRET_KEY = os.getenv("JSO8do4s574", "O8do4s5")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 300
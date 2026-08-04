from dotenv import load_dotenv
import os
from pathlib import Path

# Local dev: .env lives at the project root, one level above backend/.
# In Docker, only backend/ is mounted into the container, so that path won't
# exist there -- credentials instead arrive via docker-compose's env_file,
# already present in os.environ by the time this module runs.
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

OANDA_ACCOUNT_ID = os.environ.get("OANDA_ACCOUNT_ID")
OANDA_API_KEY = os.environ.get("OANDA_API_KEY")
OANDA_ENVIRONMENT = os.getenv("OANDA_ENVIRONMENT", "practice")

if not OANDA_ACCOUNT_ID or not OANDA_API_KEY:
    raise ValueError(
        "OANDA_ACCOUNT_ID and OANDA_API_KEY must be set in .env file at project root. "
        "Copy .env.example to .env and fill in your credentials."
    )

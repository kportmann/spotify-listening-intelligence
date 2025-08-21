from fastapi import FastAPI
import os

app = FastAPI()

@app.get("/")
def read_root():
    # Example of reading an environment variable
    db_user = os.getenv("POSTGRES_USER", "user_not_set")
    return {"message": "Hello from FastAPI!", "db_user": db_user}
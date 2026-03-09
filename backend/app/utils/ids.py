from uuid import uuid4


def generate_id(prefix: str | None = None) -> str:
    token = uuid4().hex
    return f"{prefix}_{token}" if prefix else token

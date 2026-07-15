from pwdlib import PasswordHash


_password_hasher = PasswordHash.recommended()


def hash_password(plain_password: str) -> str:
    """평문 비밀번호를 복구할 수 없는 해시로 변환한다."""
    return _password_hasher.hash(plain_password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """입력받은 비밀번호와 저장된 해시가 일치하는지 확인한다."""
    return _password_hasher.verify(
        plain_password,
        hashed_password,
    )
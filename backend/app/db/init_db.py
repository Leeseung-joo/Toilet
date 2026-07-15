from app.db.database import Base, engine

# 모든 ORM 모델을 Base.metadata에 등록한다.
import app.models  # noqa: F401


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    print("데이터베이스 테이블 생성 완료")


if __name__ == "__main__":
    init_db()
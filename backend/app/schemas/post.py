from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PostCreate(BaseModel):
    toilet_id: int = Field(
        gt=0,
        description="게시글과 연결할 화장실 ID",
    )
    nickname: str = Field(
        min_length=1,
        max_length=30,
    )
    password: str = Field(
        min_length=4,
        max_length=64,
    )
    title: str = Field(
        min_length=1,
        max_length=100,
    )
    content: str = Field(
        min_length=1,
        max_length=2000,
    )

    model_config = ConfigDict(
        str_strip_whitespace=True,
    )


class PostUpdate(BaseModel):
    password: str = Field(
        min_length=4,
        max_length=64,
    )
    title: str = Field(
        min_length=1,
        max_length=100,
    )
    content: str = Field(
        min_length=1,
        max_length=2000,
    )

    model_config = ConfigDict(
        str_strip_whitespace=True,
    )


class PostDeleteRequest(BaseModel):
    password: str = Field(
        min_length=4,
        max_length=64,
    )


class PostResponse(BaseModel):
    post_id: int
    toilet_id: int
    nickname: str
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )
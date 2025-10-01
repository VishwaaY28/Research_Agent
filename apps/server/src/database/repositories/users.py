from tortoise.exceptions import DoesNotExist

from database.models import User

class UserRepository:
    @staticmethod
    async def insert(name: str, email: str, password_hash: str) -> User:
        return await User.create(name=name, email=email, password_hash=password_hash)

    @staticmethod
    async def fetch_by_id(user_id: int) -> User | None:
        try:
            return await User.get(id=user_id)
        except DoesNotExist:
            return None

    @staticmethod
    async def fetch_by_email(email: str) -> User | None:
        try:
            return await User.get(email=email)
        except DoesNotExist:
            return None

    @staticmethod
    async def update(user_id: int, **kwargs) -> User | None:
        user = await UserRepository.fetch_by_id(user_id)
        if not user:
            return None
        for key, value in kwargs.items():
            setattr(user, key, value)
        await user.save()
        return user

    @staticmethod
    async def soft_delete(user_id: int) -> bool:
        user = await UserRepository.fetch_by_id(user_id)
        if not user:
            return False
        from datetime import datetime
        user.deleted_at = datetime.utcnow()
        await user.save()
        return True

    @staticmethod
    async def hard_delete(user_id: int) -> bool:
        user = await UserRepository.fetch_by_id(user_id)
        if not user:
            return False
        await user.delete()
        return True

user_repository = UserRepository()

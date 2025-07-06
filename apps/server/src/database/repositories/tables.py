from database.models import SourceTable
from typing import List, Dict

class SourceTableRepository:
    async def create_bulk(self, content_source_id: int, tables: List[Dict]):
        table_objects = []
        for tbl in tables:
            table_obj = SourceTable(
                content_source_id=content_source_id,
                path=tbl['path'],
                page_number=tbl.get('page_number'),
                caption=tbl.get('caption'),
                data=tbl.get('data')
            )
            table_objects.append(table_obj)

        if table_objects:
            await SourceTable.bulk_create(table_objects)
        return table_objects

    async def get_by_source(self, content_source_id: int):
        return await SourceTable.filter(
            content_source_id=content_source_id,
            deleted_at=None
        )

source_table_repository = SourceTableRepository()

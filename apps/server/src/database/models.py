from tortoise import fields, models

class TimestampMixin(models.Model):
  created_at = fields.DatetimeField(auto_now_add=True)
  updated_at = fields.DatetimeField(auto_now=True)
  deleted_at = fields.DatetimeField(null=True)

class User(TimestampMixin):
  id = fields.IntField(pk=True)
  name = fields.CharField(max_length=50)
  email = fields.CharField(max_length=100, unique=True)
  password_hash = fields.CharField(max_length=128)
class Workspace(TimestampMixin):
  id = fields.IntField(pk=True)
  name = fields.CharField(max_length=255)
  client = fields.CharField(max_length=255)

class Tag(TimestampMixin):
  id = fields.IntField(pk=True)
  name = fields.CharField(max_length=255)

class WorkspaceTag(TimestampMixin):
    id = fields.IntField(pk=True)
    workspace = fields.ForeignKeyField('models.Workspace', related_name='tags')
    tag = fields.ForeignKeyField('models.Tag', related_name='workspaces')

class Section(TimestampMixin):
    id = fields.IntField(pk=True)
    workspace = fields.ForeignKeyField('models.Workspace', related_name='sections')
    name = fields.CharField(max_length=255)
    content = fields.TextField()
    source = fields.CharField(max_length=1024)

class SectionTag(TimestampMixin):
    id = fields.IntField(pk=True)
    section = fields.ForeignKeyField('models.Section', related_name='tags')
    tag = fields.ForeignKeyField('models.Tag', related_name='sections')

class Proposal(TimestampMixin):
    id = fields.IntField(pk=True)
    workspace = fields.ForeignKeyField('models.Workspace', related_name='proposals')
    user = fields.ForeignKeyField('models.User', related_name='proposals')
    title = fields.CharField(max_length=255)
    generated_content = fields.TextField()
    prompt = fields.TextField()
    section_ids = fields.JSONField()

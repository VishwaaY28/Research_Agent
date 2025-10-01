import enum
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

class WorkspaceType(TimestampMixin):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255, unique=True)
    is_default = fields.BooleanField(default=False)

class Workspace(TimestampMixin):
  id = fields.IntField(pk=True)
  name = fields.CharField(max_length=255)
  client = fields.CharField(max_length=255)
  workspace_type = fields.ForeignKeyField('models.WorkspaceType', related_name='workspaces', null=True)
  last_used_at = fields.DatetimeField(null=True)

class Tag(TimestampMixin):
  id = fields.IntField(pk=True)
  name = fields.CharField(max_length=255)

class WorkspaceTag(TimestampMixin):
    id = fields.IntField(pk=True)
    workspace = fields.ForeignKeyField('models.Workspace', related_name='tags')
    tag = fields.ForeignKeyField('models.Tag', related_name='workspaces')

    class Meta:
        unique_together = (("workspace", "tag"),)

class SourceType(enum.Enum):
    WEB = "web"
    PDF = "pdf"
    DOCX = "docx"

class ContentSources(TimestampMixin):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255)
    source_url = fields.CharField(max_length=1024, unique=True)
    extracted_url = fields.CharField(max_length=1024, unique=True)
    type = fields.CharEnumField(SourceType, max_length=50)

class Section(TimestampMixin):
    id = fields.IntField(pk=True)
    content_source = fields.ForeignKeyField('models.ContentSources', related_name='sections')
    workspace = fields.ForeignKeyField("models.Workspace", related_name='sections')
    name = fields.CharField(max_length=255)
    content = fields.TextField()
    source = fields.CharField(max_length=1024)

class SectionTag(TimestampMixin):
    id = fields.IntField(pk=True)
    section = fields.ForeignKeyField('models.Section', related_name='tags')
    tag = fields.ForeignKeyField('models.Tag', related_name='sections')

class Prompt(TimestampMixin):
    id = fields.IntField(pk=True)
    workspace = fields.ForeignKeyField('models.Workspace', related_name='prompts')
    user = fields.ForeignKeyField('models.User', related_name='prompts')
    title = fields.CharField(max_length=255)
    content = fields.TextField()

class PromptTag(TimestampMixin):
    id = fields.IntField(pk=True)
    prompt = fields.ForeignKeyField('models.Prompt', related_name='tags')
    tag = fields.ForeignKeyField('models.Tag', related_name='prompt_tags')

class GeneratedContent(TimestampMixin):
    id = fields.IntField(pk=True)
    workspace = fields.ForeignKeyField('models.Workspace', related_name='generated_contents')
    prompt = fields.ForeignKeyField('models.Prompt', related_name='generated_contents')
    user = fields.ForeignKeyField('models.User', related_name='generated_contents')
    content = fields.TextField()

class GeneratedContentTag(TimestampMixin):
    id = fields.IntField(pk=True)
    generated_content = fields.ForeignKeyField('models.GeneratedContent', related_name='tags')
    tag = fields.ForeignKeyField('models.Tag', related_name='generated_content_tags')

class GeneratedContentSection(TimestampMixin):
    id = fields.IntField(pk=True)
    generated_content = fields.ForeignKeyField('models.GeneratedContent', related_name='sections')
    section = fields.ForeignKeyField('models.Section', related_name='generated_contents')

class SectionTemplate(TimestampMixin):
    id = fields.IntField(pk=True)
    workspace_type = fields.ForeignKeyField('models.WorkspaceType', related_name='sections')
    name = fields.CharField(max_length=255)
    order = fields.IntField(default=0)

class PromptTemplate(TimestampMixin):
    id = fields.IntField(pk=True)
    section_template = fields.ForeignKeyField('models.SectionTemplate', related_name='prompts')
    prompt = fields.TextField()
    is_default = fields.BooleanField(default=False)

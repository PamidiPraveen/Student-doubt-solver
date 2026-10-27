"""Add roster claim, library publishing and AI feedback

Revision ID: 9d41b7e2a0c3
Revises: c5ab9fdc4518
Create Date: 2026-10-24 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9d41b7e2a0c3'
down_revision = 'c5ab9fdc4518'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('roster_record_id', sa.Integer(), nullable=True))
        batch_op.create_unique_constraint('uq_users_roster_record_id', ['roster_record_id'])
        batch_op.create_foreign_key('fk_users_roster_record_id', 'roster_records', ['roster_record_id'], ['id'])

    with op.batch_alter_table('questions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_published', sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column('published_at', sa.DateTime(), nullable=True))
        batch_op.create_index(batch_op.f('ix_questions_is_published'), ['is_published'], unique=False)

    op.create_table('ai_feedback',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('feature', sa.String(length=40), nullable=False),
    sa.Column('target_id', sa.Integer(), nullable=True),
    sa.Column('helpful', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('ai_feedback', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_ai_feedback_user_id'), ['user_id'], unique=False)


def downgrade():
    with op.batch_alter_table('ai_feedback', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_ai_feedback_user_id'))

    op.drop_table('ai_feedback')

    with op.batch_alter_table('questions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_questions_is_published'))
        batch_op.drop_column('published_at')
        batch_op.drop_column('is_published')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('fk_users_roster_record_id', type_='foreignkey')
        batch_op.drop_constraint('uq_users_roster_record_id', type_='unique')
        batch_op.drop_column('roster_record_id')

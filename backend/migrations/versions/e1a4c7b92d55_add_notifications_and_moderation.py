"""Add notifications and moderation events

Revision ID: e1a4c7b92d55
Revises: b7e3c1d94f20
Create Date: 2026-10-25 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e1a4c7b92d55'
down_revision = 'b7e3c1d94f20'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('kind', sa.String(length=40), nullable=False),
        sa.Column('title', sa.String(length=160), nullable=False),
        sa.Column('message', sa.String(length=500), nullable=False),
        sa.Column('link', sa.String(length=200), nullable=True),
        sa.Column('is_read', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_notifications_user_id'), ['user_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_notifications_is_read'), ['is_read'], unique=False)

    op.create_table(
        'moderation_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('target', sa.String(length=20), nullable=False),
        sa.Column('categories', sa.String(length=120), nullable=False),
        sa.Column('source', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('moderation_events', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_moderation_events_user_id'), ['user_id'], unique=False)


def downgrade():
    with op.batch_alter_table('moderation_events', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_moderation_events_user_id'))
    op.drop_table('moderation_events')

    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_notifications_is_read'))
        batch_op.drop_index(batch_op.f('ix_notifications_user_id'))
    op.drop_table('notifications')

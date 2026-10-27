"""Remove ID-card verification, roster and approval

People now choose student or faculty when they register, so the roster,
the verification attempts and the per-user verification state are gone.

Revision ID: b7e3c1d94f20
Revises: 9d41b7e2a0c3
Create Date: 2026-10-25 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b7e3c1d94f20'
down_revision = '9d41b7e2a0c3'
branch_labels = None
depends_on = None


def upgrade():
    # The administrator role no longer exists; keep such accounts usable.
    op.execute("UPDATE users SET role = 'faculty' WHERE role = 'admin'")

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('fk_users_roster_record_id', type_='foreignkey')
        batch_op.drop_constraint('uq_users_roster_record_id', type_='unique')
        batch_op.drop_column('roster_record_id')
        batch_op.drop_column('verification_status')

    with op.batch_alter_table('verification_attempts', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_verification_attempts_user_id'))
    op.drop_table('verification_attempts')

    with op.batch_alter_table('roster_records', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_roster_records_college_id_number'))
    op.drop_table('roster_records')


def downgrade():
    op.create_table('roster_records',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('college_id_number', sa.String(length=100), nullable=False),
    sa.Column('official_name', sa.String(length=120), nullable=False),
    sa.Column('official_role', sa.String(length=20), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('roster_records', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_roster_records_college_id_number'), ['college_id_number'], unique=True)

    op.create_table('verification_attempts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=40), nullable=False),
    sa.Column('failure_code', sa.String(length=60), nullable=True),
    sa.Column('attempted_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('verification_attempts', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_verification_attempts_user_id'), ['user_id'], unique=False)

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('verification_status', sa.String(length=30), server_default='verified', nullable=False))
        batch_op.add_column(sa.Column('roster_record_id', sa.Integer(), nullable=True))
        batch_op.create_unique_constraint('uq_users_roster_record_id', ['roster_record_id'])
        batch_op.create_foreign_key('fk_users_roster_record_id', 'roster_records', ['roster_record_id'], ['id'])

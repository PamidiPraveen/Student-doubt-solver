
from app import db
from app.models import Answer, Question, User


PASSWORD = "Strong-Password-123!"


def create_user(client, email, name="Test User"):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": name,
            "email": email,
            "password": PASSWORD,
        },
    )
    assert response.status_code == 201

    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 200

    return response.get_json()["data"]["access_token"]


def set_verified_role(app, email, role="student"):
    with app.app_context():
        user = db.session.execute(
            db.select(User).where(User.email == email)
        ).scalar_one()

        user.role = role
        db.session.commit()


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_student_can_create_question(app, client):
    token = create_user(client, "student@example.com")
    set_verified_role(app, "student@example.com")

    response = client.post(
        "/api/v1/questions/",
        headers=auth(token),
        json={
            "subject": "Python",
            "title": "Loops",
            "body": "How does a for loop work?",
        },
    )

    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["subject"] == "Python"
    assert data["title"] == "Loops"
    assert data["status"] == "open"
    assert data["student_id"] is not None


def test_student_can_view_another_students_question(app, client):
    first_token = create_user(client, "first@example.com", "First Student")
    set_verified_role(app, "first@example.com")

    created = client.post(
        "/api/v1/questions/",
        headers=auth(first_token),
        json={
            "subject": "Math",
            "title": "Integration",
            "body": "How do I integrate x squared?",
        },
    )
    assert created.status_code == 201
    question_id = created.get_json()["data"]["id"]

    second_token = create_user(client, "second@example.com", "Second Student")
    set_verified_role(app, "second@example.com")

    response = client.get(
        f"/api/v1/questions/{question_id}",
        headers=auth(second_token),
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["id"] == question_id


def test_student_can_answer_own_question_without_marking_it_answered(app, client):
    token = create_user(client, "student2@example.com")
    set_verified_role(app, "student2@example.com")

    created = client.post(
        "/api/v1/questions/",
        headers=auth(token),
        json={
            "subject": "Python",
            "title": "Functions",
            "body": "What is a function?",
        },
    )
    question_id = created.get_json()["data"]["id"]

    response = client.post(
        f"/api/v1/questions/{question_id}/answers",
        headers=auth(token),
        json={"body": "A function is reusable code."},
    )

    # A follow-up from the asker is accepted but is not a solution.
    assert response.status_code == 201
    status = client.get(
        f"/api/v1/questions/{question_id}", headers=auth(token)
    ).get_json()["data"]["status"]
    assert status == "open"


def test_verified_faculty_can_answer_question(app, client):
    student_token = create_user(client, "owner@example.com", "Question Owner")
    set_verified_role(app, "owner@example.com")

    created = client.post(
        "/api/v1/questions/",
        headers=auth(student_token),
        json={
            "subject": "Python",
            "title": "Variables",
            "body": "What is a variable?",
        },
    )
    assert created.status_code == 201
    question_id = created.get_json()["data"]["id"]

    faculty_token = create_user(client, "faculty@example.com", "Faculty Member")
    set_verified_role(app, "faculty@example.com", role="faculty")

    response = client.post(
        f"/api/v1/questions/{question_id}/answers",
        headers=auth(faculty_token),
        json={"body": "A variable stores a value."},
    )

    assert response.status_code == 201
    assert response.get_json()["data"]["body"] == "A variable stores a value."

    with app.app_context():
        question = db.session.get(Question, question_id)
        assert question.status == "answered"

        answers = db.session.execute(
            db.select(Answer).where(Answer.question_id == question_id)
        ).scalars().all()
        assert len(answers) == 1


def test_invalid_question_payload_is_rejected(app, client):
    token = create_user(client, "invalid@example.com")
    set_verified_role(app, "invalid@example.com")

    response = client.post(
        "/api/v1/questions/",
        headers=auth(token),
        json={
            "subject": "",
            "title": "",
            "body": "",
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "VALIDATION_ERROR"

def test_student_can_filter_to_their_own_questions(app, client):
    first_token = create_user(client, "list_first@example.com")
    set_verified_role(app, "list_first@example.com")

    created = client.post(
        "/api/v1/questions/",
        headers=auth(first_token),
        json={
            "subject": "Python",
            "title": "Loops",
            "body": "Explain loops.",
        },
    )
    assert created.status_code == 201

    second_token = create_user(client, "list_second@example.com")
    set_verified_role(app, "list_second@example.com")

    everyone = client.get(
        "/api/v1/questions/",
        headers=auth(second_token),
    )
    mine = client.get(
        "/api/v1/questions/?mine=1",
        headers=auth(second_token),
    )

    assert everyone.status_code == 200
    assert len(everyone.get_json()["data"]) == 1
    assert mine.status_code == 200
    assert mine.get_json()["data"] == []


def test_student_can_list_answers_to_their_own_question(app, client):
    student_token = create_user(client, "answers_owner@example.com")
    set_verified_role(app, "answers_owner@example.com")

    created = client.post(
        "/api/v1/questions/",
        headers=auth(student_token),
        json={
            "subject": "Math",
            "title": "Derivatives",
            "body": "What is a derivative?",
        },
    )
    assert created.status_code == 201
    question_id = created.get_json()["data"]["id"]

    faculty_token = create_user(client, "answers_faculty@example.com")
    set_verified_role(
        app, "answers_faculty@example.com", role="faculty"
    )

    submitted = client.post(
        f"/api/v1/questions/{question_id}/answers",
        headers=auth(faculty_token),
        json={"body": "A derivative measures a rate of change."},
    )
    assert submitted.status_code == 201

    response = client.get(
        f"/api/v1/questions/{question_id}/answers",
        headers=auth(student_token),
    )

    assert response.status_code == 200
    answers = response.get_json()["data"]
    assert len(answers) == 1
    assert answers[0]["body"] == "A derivative measures a rate of change."


def test_student_can_answer_another_students_question(app, client):
    owner_token = create_user(client, "owner_q@example.com")
    set_verified_role(app, "owner_q@example.com")

    created = client.post(
        "/api/v1/questions/",
        headers=auth(owner_token),
        json={
            "subject": "Science",
            "title": "Gravity",
            "body": "Explain gravity.",
        },
    )
    assert created.status_code == 201
    question_id = created.get_json()["data"]["id"]

    other_token = create_user(client, "other_student@example.com")

    response = client.post(
        f"/api/v1/questions/{question_id}/answers",
        headers=auth(other_token),
        json={"body": "Gravity is an attractive force."},
    )

    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["author_role"] == "student"
    status = client.get(
        f"/api/v1/questions/{question_id}", headers=auth(owner_token)
    ).get_json()["data"]["status"]
    assert status == "answered"


def test_answer_to_nonexistent_question_returns_404(app, client):
    token = create_user(client, "faculty_missing@example.com")
    set_verified_role(app, "faculty_missing@example.com", "faculty")

    response = client.post(
        "/api/v1/questions/999999/answers",
        headers=auth(token),
        json={"body": "An answer."},
    )

    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "QUESTION_NOT_FOUND"

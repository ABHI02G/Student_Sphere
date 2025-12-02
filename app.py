import os
import csv
import pickle
import time
import matplotlib.pyplot as plt 
import seaborn as sns
from threading import Thread
from datetime import datetime

from flask import (
    Flask, render_template, request, redirect, url_for, flash,
    session, jsonify, send_file
)

import requests
import pandas as pd
from sklearn.linear_model import LinearRegression

import pyrebase
import sympy
from sympy.abc import x, y, z
import json
from google import genai
from dotenv import load_dotenv
from google.genai.errors import APIError


app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET", "super_secret_key")
load_dotenv()


client = None
try:
 
    client = genai.Client()
    print("Gemini API Client initialized successfully.")
except Exception as e:
    print(f"ERROR: Could not initialize Gemini Client. Make sure the API key is set correctly. Error: {e}")


firebaseConfig = {
    'apiKey': "AIzaSyB1fOpNGIOLzrvajGSAN-nJ2BWc5W87Vng",
    'authDomain': "stud-3ecff.firebaseapp.com",
    'projectId': "stud-3ecff",
    'storageBucket': "stud-3ecff.appspot.com",
    'messagingSenderId': "933099603133",
    'appId': "1:933099603133:web:53eb33089d3f19738d23d4",
    'measurementId': "G-VJXSQGGBWQ",
    'databaseURL': "https://stud-3ecff-default-rtdb.firebaseio.com/"
}

tracker_config = {
    'apiKey': "AIzaSyAaD7COIy8eGVr6QlAB27CjuHyhxgmnJ_U",
    'authDomain': "regression-f7263.firebaseapp.com",
    'projectId': "regression-f7263",
    'storageBucket': "regression-f7263.appspot.com",
    'messagingSenderId': "718898120272",
    'appId': "1:718898120272:web:3a19ef7ea6ab8782447355",
    'measurementId': "G-L6ZCVWDWHR",
    'databaseURL': "https://regression-f7263-default-rtdb.asia-southeast1.firebasedatabase.app"
}
firebase = pyrebase.initialize_app(firebaseConfig)
auth = firebase.auth()
db = firebase.database()

tracker_firebase = pyrebase.initialize_app(tracker_config)
tracker_db = tracker_firebase.database()

profile_config = {
    'apiKey': "AIzaSyDApTElWOZEFjyhzqIKL_GLjj6i2surOfo",
    'authDomain': "profile-4b5cc.firebaseapp.com",
    'projectId': "profile-4b5cc",
    'storageBucket': "profile-4b5cc.firebasestorage.app",
    'messagingSenderId': "927836274250",
    'appId': "1:927836274250:web:bac860793d23f2439b70b3",
    'measurementId': "G-VJXSQGGBWQ",
    'databaseURL': "https://profile-4b5cc-default-rtdb.asia-southeast1.firebasedatabase.app"
}

profile_firebase = pyrebase.initialize_app(profile_config)
profile_db = profile_firebase.database()

  

tracker_firebase = pyrebase.initialize_app(tracker_config)
tracker_db = tracker_firebase.database()


GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyDURhtAZEOh48rNZPd1DwjsdjiIf1tKJpQ")
MODEL_NAME = "gemini-2.0-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent"

def call_gemini(payload, retries=3):
    for _ in range(retries):
        try:
            r = requests.post(
                GEMINI_URL + f"?key={GEMINI_API_KEY}",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            data = r.json()
            if "error" not in data:
                return data
    
            if data["error"].get("status") in ["UNAVAILABLE", "RESOURCE_EXHAUSTED"]:
                time.sleep(1)
                continue
            return data
        except Exception:
            time.sleep(1)
            continue
    return {"error": "Gemini call failed"}


DATA_DIR = "tracker_data"
os.makedirs(DATA_DIR, exist_ok=True)
def user_key(email: str):
    if not email:
        return "unknown_user"
    return email.replace(".", "_")

def write_predefined_data(u_key: str):
    rows = PREDEFINED_DATA.get(u_key)
    if not rows:
        return False

    path = os.path.join(DATA_DIR, f"{u_key}.csv")
    header = [
        "date","current_grade","target_grade",
        "study_hours","sleep_hours","physical_hours",
        "leisure_hours","timestamp"
    ]

    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in rows:
            w.writerow([
                r.get("date"),
                r.get("current_grade"),
                r.get("target_grade"),
                r.get("study_hours"),
                r.get("sleep_hours"),
                r.get("physical_hours"),
                r.get("leisure_hours"),
                r.get("timestamp")
            ])
    return True

def generate_csv(u):
    if tracker_db is None:
        return False
    try:
        logs = tracker_db.child("daily_tracker").child(u).get().val()
    except:
        return False

    if not logs:
        return write_predefined_data(u)

    path = os.path.join(DATA_DIR, f"{u}.csv")

    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow([
            "date","current_grade","target_grade",
            "study_hours","sleep_hours","physical_hours",
            "leisure_hours","timestamp"
        ])

        for k in sorted(logs.keys()):
            e = logs[k]
            w.writerow([
                k,
                e.get("current_grade"),
                e.get("target_grade"),
                e.get("study_hours"),
                e.get("sleep_hours"),
                e.get("physical_hours"),
                e.get("leisure_hours"),
                e.get("timestamp")
            ])

    return True

def train_model(u):
    path = os.path.join(DATA_DIR, f"{u}.csv")
    if not os.path.exists(path):
        return False

    df = pd.read_csv(path)
    if df.shape[0] < 3:
        return False

    required = [
        "current_grade","target_grade",
        "study_hours","sleep_hours","physical_hours","leisure_hours"
    ]
    if not all(c in df.columns for c in required):
        return False

    df = df.dropna(subset=required)
    if df.shape[0] < 3:
        return False

    for c in required:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    df = df.dropna(subset=required)
    if df.shape[0] < 3:
        return False

    df["gap"] = df["target_grade"] - df["current_grade"]

    X = df[["study_hours","sleep_hours","physical_hours","leisure_hours"]].astype(float)
    y = df["gap"].astype(float)

    model = LinearRegression()
    model.fit(X, y)

    with open(os.path.join(DATA_DIR, f"{u}_model.pkl"), "wb") as f:
        pickle.dump(model, f)

    return True
# -------------------------
# WEEKLY REGRESSION HELPERS
# -------------------------
def get_last_n_days_logs(u_key, days=7):
    """Return logs only from last N days."""
    if tracker_db is None:
        return []

    try:
        logs = tracker_db.child("daily_tracker").child(u_key).get().val()
    except:
        return []

    if not logs:
        return []

    now = datetime.now().timestamp()
    cutoff = now - days * 86400

    filtered = []
    for k in sorted(logs.keys()):
        row = logs[k]
        if not row:
            continue
        ts = row.get("timestamp")
        if not ts:
            continue
        try:
            tsv = datetime.fromisoformat(ts).timestamp()
        except:
            continue
        if tsv >= cutoff:
            filtered.append(row)

    return filtered


def weekly_regression_predict(u_key):
    """Train weekly regression ON THE FLY without touching the original model."""
    rows = get_last_n_days_logs(u_key, days=7)
    if len(rows) < 3:
        return None  # not enough weekly data

    # Build DataFrame
    df = pd.DataFrame(rows)
    df["gap"] = df["target_grade"] - df["current_grade"]

    # Prepare regression feature matrix
    X = df[["study_hours", "sleep_hours", "physical_hours", "leisure_hours"]].astype(float)
    y = df["gap"].astype(float)

    # Train temporary weekly model
    model = LinearRegression()
    model.fit(X, y)

    last = rows[-1]
    X_latest = [[
        float(last.get("study_hours", 0)),
        float(last.get("sleep_hours", 0)),
        float(last.get("physical_hours", 0)),
        float(last.get("leisure_hours", 0))
    ]]

    pred_gap = float(model.predict(X_latest)[0])

    # Heuristic consistent with your main model
    required_hours = round(max(pred_gap / 0.8, 0.3), 2)

    return {
        "predicted_gap_week": round(pred_gap, 2),
        "required_hours_week": required_hours
    }


# -------------------------
# WEEKLY PREDICTION ENDPOINT
# -------------------------
@app.route("/api/predict_week", methods=["GET"])
def api_predict_week():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    u_key = user_key(session["user"])
    result = weekly_regression_predict(u_key)
    if not result:
        return jsonify({"error": "Not enough weekly logs"}), 400

    return jsonify(result), 200


# -------------------------
# BASIC ROUTES (UNCHANGED)
# -------------------------
@app.route('/')
def about():
    return render_template('about.html')

@app.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login_user():
    if auth is None:
        flash("Auth not configured", "danger")
        return redirect(url_for('login_page'))
    email = request.form.get('email')
    password = request.form.get('password')
    try:
        user = auth.sign_in_with_email_and_password(email, password)
        session['user'] = email
        session['user_uid'] = user.get('localId')
        return redirect(url_for('dashboard'))
    except Exception as e:
        flash("Login failed. Check email/password.", "danger")
        return redirect(url_for('login_page'))

@app.route('/register', methods=['POST'])
def register_user():
    if auth is None or db is None:
        flash("Auth/DB not configured", "danger")
        return redirect(url_for('login_page'))
    email = request.form.get('email')
    password = request.form.get('password')
    name = request.form.get('name')
    try:
        auth.create_user_with_email_and_password(email, password)
        db.child("users").push({"name": name, "email": email})
        flash("Account created!", "success")
        return redirect(url_for('login_page'))
    except Exception as e:
        flash("Registration failed", "danger")
        return redirect(url_for('login_page'))

@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    return render_template('dashboard.html')

@app.route('/logout')
def logout():
    session.pop('user', None)
    session.pop('user_uid', None)
    return redirect(url_for('login_page'))

# -------------------------
# PROFILE ROUTES (UNCHANGED)
# -------------------------
@app.route('/api/profile/save', methods=['POST'])
def api_profile_save():
    if 'user' not in session:
        return jsonify({"error":"Unauthorized"}), 401
    if profile_db is None:
        return jsonify({"error":"Profile DB not configured"}), 500
    data = request.get_json() or {}
    key = user_key(session['user'])
    try:
        profile_db.child("profiles").child(key).set(data)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/profile/load', methods=['GET'])
def api_profile_load():
    if 'user' not in session:
        return jsonify({"error":"Unauthorized"}), 401
    if profile_db is None:
        return jsonify({"error":"Profile DB not configured"}), 500
    key = user_key(session['user'])
    try:
        data = profile_db.child("profiles").child(key).get().val()
        return jsonify({"profile": data or {}}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------
# TIMETABLE & GOALS (UNCHANGED)
# -------------------------
@app.route('/api/timetable/save', methods=['POST'])
def api_timetable_save():
    if 'user' not in session:
        return jsonify({"error":"Unauthorized"}), 401
    if profile_db is None:
        return jsonify({"error":"Profile DB not configured"}), 500
    data = request.get_json() or {}
    table = data.get("timetable")
    if table is None:
        return jsonify({"error":"Missing timetable"}), 400
    key = user_key(session['user'])
    try:
        profile_db.child("users").child(key).child("timetable").set(table)
        return jsonify({"success":True})
    except Exception as e:
        return jsonify({"error":str(e)}), 500


@app.route('/api/timetable/load', methods=['GET'])
def api_timetable_load():
    if 'user' not in session:
        return jsonify({"error":"Unauthorized"}), 401
    if profile_db is None:
        return jsonify({"error":"Profile DB not configured"}), 500
    key = user_key(session['user'])
    try:
        table = profile_db.child("users").child(key).child("timetable").get().val()
        return jsonify({"timetable": table or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/goals/save', methods=['POST'])
def api_goals_save():
    if 'user' not in session:
        return jsonify({"error":"Unauthorized"}), 401
    if profile_db is None:
        return jsonify({"error":"Profile DB not configured"}), 500
    data = request.get_json() or {}
    goals = data.get("goals")
    if goals is None:
        return jsonify({"error":"Missing goals"}), 400
    key = user_key(session['user'])
    try:
        profile_db.child("users").child(key).child("goals").set(goals)
        return jsonify({"success":True})
    except Exception as e:
        return jsonify({"error":str(e)}), 500


@app.route('/api/goals/load', methods=['GET'])
def api_goals_load():
    if 'user' not in session:
        return jsonify({"error":"Unauthorized"}), 401
    if profile_db is None:
        return jsonify({"error":"Profile DB not configured"}), 500
    key = user_key(session['user'])
    try:
        goals = profile_db.child("users").child(key).child("goals").get().val()
        return jsonify({"goals": goals or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------
# HOMEWORK AI (UNCHANGED)
# -------------------------
@app.route('/api/homework', methods=['POST'])
def api_homework():
    data = request.get_json() or {}
    msg = data.get("message", "")
    if not msg:
        return jsonify({"error":"empty"}), 400

    payload = {"contents":[{"parts":[{"text": msg}]}]}
    result = call_gemini(payload)

    try:
        reply = result["candidates"][0]["content"]["parts"][0]["text"]
    except:
        reply = "AI error"

    return jsonify({"reply": reply})

# -------------------------
# TRACKER SAVE + DAILY PREDICTION (UNCHANGED)
# -------------------------
@app.route('/api/save_tracker', methods=['POST'])
def save_tracker():
    if 'user' not in session:
        return jsonify({"error":"Unauthorized"}), 401

    data = request.get_json() or {}
    fields = ["current_grade","target_grade","study","sleep","physical","leisure"]
    if any(data.get(f) is None for f in fields):
        return jsonify({"error":"Missing fields"}), 400

    try:
        current = float(data["current_grade"])
        target = float(data["target_grade"])
        study = float(data["study"])
        sleep = float(data["sleep"])
        physical = float(data["physical"])
        leisure = float(data["leisure"])
    except:
        return jsonify({"error":"Invalid numeric values"}), 400

    if current > target:
        return jsonify({"error":"Current grade cannot be greater than target grade"}), 400

    if study + sleep + physical + leisure > 24:
        return jsonify({"error":"Total hours exceed 24"}), 400

    key = user_key(session['user'])
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")

    entry = {
        "current_grade": current,
        "target_grade": target,
        "study_hours": study,
        "sleep_hours": sleep,
        "physical_hours": physical,
        "leisure_hours": leisure,
        "timestamp": datetime.now().isoformat()
    }

    try:
        tracker_db.child("daily_tracker").child(key).child(timestamp).set(entry)
    except Exception as e:
        return jsonify({"error":"DB write failed"}), 500

    Thread(target=lambda: (generate_csv(key) and train_model(key)), daemon=True).start()

    return jsonify({"success": True})


# -------------------------
# DAILY PREDICTION (UNCHANGED)
# -------------------------
@app.route('/api/predict_improvement', methods=['GET'])
def predict_improvement():
    if 'user' not in session:
        return jsonify({"error":"Unauthorized"}), 401

    key = user_key(session['user'])
    model_path = os.path.join(DATA_DIR, f"{key}_model.pkl")
    csv_path = os.path.join(DATA_DIR, f"{key}.csv")

    if not os.path.exists(model_path):
        generate_csv(key)
        train_model(key)

    if not os.path.exists(model_path):
        return jsonify({"error":"Model not trained"}), 400

    try:
        with open(model_path, "rb") as f:
            model = pickle.load(f)
    except Exception as e:
        return jsonify({"error": f"Model load failed: {e}"}), 500

    last = None
    try:
        logs = tracker_db.child("daily_tracker").child(key).get().val()
        if logs:
            last = logs[sorted(logs.keys())[-1]]
    except:
        last = None

    if not last:
        if os.path.exists(csv_path):
            df = pd.read_csv(csv_path)
            if df.shape[0] > 0:
                lr = df.tail(1).iloc[0]
                last = {
                    "study_hours": lr.get("study_hours", 0),
                    "sleep_hours": lr.get("sleep_hours", 0),
                    "physical_hours": lr.get("physical_hours", 0),
                    "leisure_hours": lr.get("leisure_hours", 0),
                    "current_grade": lr.get("current_grade", 0),
                    "target_grade": lr.get("target_grade", 0)
                }

    if not last:
        return jsonify({"error":"No logs available"}), 404

    try:
        study = float(last.get("study_hours", 0))
        sleep = float(last.get("sleep_hours", 0))
        physical = float(last.get("physical_hours", 0))
        leisure = float(last.get("leisure_hours", 0))
    except:
        return jsonify({"error":"Invalid last log values"}), 400

    try:
        pred_gap = float(model.predict([[study, sleep, physical, leisure]])[0])
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {e}"}), 500

    if abs(pred_gap) < 0.3:
        return jsonify({
            "predicted_grade_gap": round(pred_gap, 2),
            "required_additional_study_hours": 0,
            "message": "Efficient study. Continue this."
        })

    per_hour_effect = 0.8
    needed_hours = round(max(pred_gap / per_hour_effect, 0.3), 2)
    needed_hours = min(needed_hours, 4.0)

    if study >= needed_hours:
        return jsonify({
            "predicted_grade_gap": round(pred_gap, 2),
            "required_additional_study_hours": 0,
            "message": "Efficient study. Continue this."
        })

    return jsonify({
        "predicted_grade_gap": round(pred_gap, 2),
        "required_additional_study_hours": needed_hours
    })


# -------------------------
# QUIZ SYSTEM (UNCHANGED)
# -------------------------
@app.route('/profile')
def profile():
    return render_template('profile.html')


# -------------------------------------------------------
# RUN
# -------------------------------------------------------
@app.route('/quiz')
def quiz():
    return render_template('quiz.html')

# app.py: Helper function to prepare the data for quiz.js
def format_quiz_data(quiz_data):
    """
    Formats the structured quiz data into a dictionary suitable for quiz.js 
    to render questions. Stores the answer key in the session.
    """
    # Store the answer key in the session for grading later
    answer_key = {q['id']: q['correct_answer'] for q in quiz_data['questions']}
    session['quiz_answer_key'] = answer_key
    
    # Use UID to store XP (Assuming user_uid is in session after login)
    user_uid = session.get('user_uid')
    if user_uid:
        # Initialise or retrieve user XP/data here if needed for display
        pass

    # Prepare data for frontend
    frontend_data = {
        'title': quiz_data['title'],
        'questions': [
            {
                'id': q['id'],
                'text': q['question_text'],
                'options': q['options'] # List of strings
            }
            for q in quiz_data['questions']
        ]
    }
    return frontend_data


# app.py

@app.route('/generate_quiz_assignment', methods=['POST'])
def generate_quiz_assignment():
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json
    subject = data.get('subject')
    class_level = data.get('class')
    language = data.get('language')
    topic = data.get('topic')
    content_type = data.get('content_type')
    # NEW: Get question count, default to 15
    q_count = int(data.get('question_count', 15))

    if not all([subject, class_level, topic, language, content_type]):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        if content_type == 'Quiz':
            # --- STRUCTURED QUIZ GENERATION ---
            # Use the requested question count
            
            quiz_schema = {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "questions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "question_text": {"type": "string"},
                                "options": {"type": "array", "items": {"type": "string"}},
                                "correct_answer": {"type": "string", "description": "The exact text of the correct option."},
                                "id": {"type": "integer"}
                            },
                            "required": ["question_text", "options", "correct_answer", "id"]
                        }
                    }
                },
                "required": ["title", "questions"]
            }

            system_prompt = (
                f"You are a test generator. Create a {q_count}-question Multiple Choice Quiz for "
                f"Class {class_level}, covering the subject '{subject}' and the topic '{topic}'. "
                f"The language must be {language}. Ensure each question has 4 distinct options. Use the provided JSON schema."
            )

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[{"role": "user", "parts": [{"text": system_prompt}]}],
                config={"response_mime_type": "application/json", "response_schema": quiz_schema}
            )
            
            quiz_data = json.loads(response.text)
            formatted_data = format_quiz_data(quiz_data)
            
            return jsonify({
                'success': True, 
                'type': 'Quiz',
                'quiz_data': formatted_data
            })

        elif content_type == 'Assignment':
            # --- MODULAR ASSIGNMENT GENERATION (JSON) ---
            # We now ask for a structured list of tasks instead of a text block
            
            assign_schema = {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "overview": {"type": "string"},
                    "modules": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "task_name": {"type": "string"},
                                "instruction": {"type": "string"},
                                "estimated_time": {"type": "string"}
                            },
                            "required": ["task_name", "instruction"]
                        }
                    }
                },
                "required": ["title", "modules"]
            }

            system_prompt = (
                f"You are an assignment creator. Create a structured assignment for a student in "
                f"Class {class_level}, covering '{subject}': '{topic}'. Language: {language}. "
                f"Break the assignment into 3-5 distinct modular tasks/steps. Use the provided JSON schema."
            )
            
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[{"role": "user", "parts": [{"text": system_prompt}]}],
                config={"response_mime_type": "application/json", "response_schema": assign_schema}
            )
            
            assign_data = json.loads(response.text)
            
            return jsonify({
                'success': True, 
                'type': 'Assignment',
                'assignment_data': assign_data # Sending JSON now, not text
            })

    except Exception as e:
        print(f"Content Generation API Error: {e}")
        return jsonify({'error': 'An error occurred during content generation. Try again.'}), 500
    
# app.py

# ... existing imports ...

# Helper to generate the same key as the profile page
# app.py

# ... existing imports ...

# Helper to generate the same key as the profile page
def user_key(email: str):
    return email.replace('.', '_')

@app.route('/submit_quiz', methods=['POST'])
def submit_quiz():
    # 1. Check Authentication (Use Email, same as Profile)
    user_email = session.get('user')
    if not user_email:
        return jsonify({'success': False, 'message': 'User not authenticated'}), 401
    
    # 2. Get User Answers
    try:
        user_answers = request.get_json() 
    except:
        return jsonify({'success': False, 'message': 'Invalid data.'}), 400
        
    answer_key = session.pop('quiz_answer_key', None) 
    if not answer_key:
        return jsonify({'success': False, 'message': 'Quiz expired. Please regenerate.'}), 400

    # 3. Grade the Quiz
    correct_count = 0
    total_questions = len(answer_key)
    for q_id, correct_answer in answer_key.items():
        if user_answers.get(f"question_{q_id}") == correct_answer:
            correct_count += 1
            
    # 4. Calculate XP
    if correct_count >= 15: xp_awarded = 25
    elif correct_count == 14: xp_awarded = 15
    elif correct_count >= 13: xp_awarded = 10 
    else: xp_awarded = 5
        
    # 5. Update XP in PROFILE DATABASE (Critical Fix)
    try:
        # Generate the key consistent with your profile logic (email based)
        u_key = user_key(user_email)
        
        # Use profile_db (Database #3), NOT db
        xp_ref = profile_db.child("users").child(u_key).child("xp")
        
        current_xp = xp_ref.get().val()
        if current_xp is None: current_xp = 0
        
        new_xp = int(current_xp) + xp_awarded
        xp_ref.set(new_xp)
        
        # OPTIONAL: Also update Level logic here if you want server-side sync
        # level_ref = profile_db.child("users").child(u_key).child("level") ...

    except Exception as e:
        print(f"XP Save Error: {e}")
        # Return 200 OK even if DB fails, so the user doesn't get stuck
        return jsonify({
            'success': True,
            'score': f"{correct_count}/{total_questions}",
            'xp_awarded': xp_awarded,
            'message': f"Quiz passed! (+{xp_awarded} XP). (Note: Database sync error: {e})"
        })
    
    return jsonify({
        'success': True,
        'score': f"{correct_count}/{total_questions}",
        'xp_awarded': xp_awarded,
        'message': f"Quiz submitted! You got {correct_count}/{total_questions} and earned {xp_awarded} XP."
    })


@app.route('/submit_assignment', methods=['POST'])
def submit_assignment():
    # 1. Check Authentication (Use Email, same as Profile)
    user_email = session.get('user')
    if not user_email:
        return jsonify({'success': False, 'message': 'User not authenticated'}), 401
    
    XP_REWARD = 30 
    
    try:
        # 2. Generate the correct key (Email based)
        u_key = user_key(user_email)
        
        # 3. Use profile_db (Database #3) to match your Profile Page
        xp_ref = profile_db.child("users").child(u_key).child("xp")
        
        current_xp = xp_ref.get().val()
        if current_xp is None: current_xp = 0
        
        new_xp = int(current_xp) + XP_REWARD
        xp_ref.set(new_xp)
        
    except Exception as e:
        print(f"Assignment XP Save Error: {e}")
        # Return error but allowing client to proceed visually if needed
        return jsonify({'success': False, 'message': f'Database error during XP update: {e}'}), 500
    
    return jsonify({
        'success': True,
        'xp_awarded': XP_REWARD,
        'message': f"Assignment submitted! You earned {XP_REWARD} XP for completing the task."
    })

# -------------------------
# MATH SOLVER (UNCHANGED)
# -------------------------
@app.route('/m')
def math_solver_page():
    return render_template('m.html')

@app.route('/api/math_solver', methods=['POST'])
def math_solver_api():
    data = request.get_json() or {}
    q = data.get("question", "")
    if not q:
        return jsonify({"error":"Empty question"}), 400

    try:
        client = genai.Client()
        prompt = f"""
        Solve the following step-by-step:
        {q}
        Provide:
        1. Detailed steps
        2. Final answer
        3. LATEX: <latex>
        """

        ai_response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        text = ai_response.text

        if "LATEX:" in text:
            steps = text.split("LATEX:")[0].strip()
            latex = text.split("LATEX:")[1].strip()
        else:
            steps = text
            latex = "\\text{Error parsing latex}"

        return jsonify({"answer": steps, "latex_answer": latex})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------
# PAGE ROUTES (UNCHANGED)
# -------------------------
@app.route('/tracker')
def tracker():
    return render_template('tracker.html')

@app.route('/homework')
def homework():
    return render_template('homework.html')

@app.route('/profile')
def profile_page():
    return render_template('profile.html')

@app.route('/meditation')
def meditation():
    return render_template('meditation.html')


# -------------------------
# RUN SERVER
# -------------------------
if __name__ == "__main__":
    app.run(debug=True)

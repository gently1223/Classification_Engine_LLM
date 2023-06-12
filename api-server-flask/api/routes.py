# -*- encoding: utf-8 -*-
"""
Copyright (c) 2019 - present AppSeed.us
"""

import json
import os

from datetime import datetime, timezone, timedelta

from functools import wraps

from flask import jsonify, request, Flask
from flask_restx import Api, Resource, fields
from flask_cors import CORS

import jwt

from .models import db, Users, JWTTokenBlocklist
from .config import BaseConfig
import requests
from werkzeug.utils import secure_filename;

# -------------------------- OpenAI Embedded -------------------
import openai

import chromadb
import tiktoken

import pdfplumber, PyPDF2
from langchain.text_splitter import TokenTextSplitter
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from chromadb.config import Settings


UPLOAD_FOLDER = 'files'
ALLOWED_EXTENSIONS = {'txt', 'pdf'}
app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

rest_api = Api(version="1.0", title="Users API")


"""
    Flask-Restx models for api request and response data
"""

signup_model = rest_api.model('SignUpModel', {"username": fields.String(required=True, min_length=2, max_length=32),
                                              "email": fields.String(required=True, min_length=4, max_length=64),
                                              "password": fields.String(required=True, min_length=4, max_length=16)
                                              })

login_model = rest_api.model('LoginModel', {"email": fields.String(required=True, min_length=4, max_length=64),
                                            "password": fields.String(required=True, min_length=4, max_length=16)
                                            })

user_edit_model = rest_api.model('UserEditModel', {"userID": fields.String(required=True, min_length=1, max_length=32),
                                                   "username": fields.String(required=True, min_length=2, max_length=32),
                                                   "email": fields.String(required=True, min_length=4, max_length=64)
                                                   })
user_delete_model = rest_api.model('UserDeleteModel', {"userID": fields.String(required=True, min_length=1, max_length=32)
                                                    })

"""
   Helper function for JWT token required
"""

def token_required(f):

    @wraps(f)
    def decorator(*args, **kwargs):

        token = None

        if "authorization" in request.headers:
            token = request.headers["authorization"]

        if not token:
            return {"success": False, "msg": "Valid JWT token is missing"}, 400

        try:
            data = jwt.decode(token, BaseConfig.SECRET_KEY, algorithms=["HS256"])
            current_user = Users.get_by_email(data["email"])

            if not current_user:
                return {"success": False,
                        "msg": "Sorry. Wrong auth token. This user does not exist."}, 400

            token_expired = db.session.query(JWTTokenBlocklist.id).filter_by(jwt_token=token).scalar()

            if token_expired is not None:
                return {"success": False, "msg": "Token revoked."}, 400

            if not current_user.check_jwt_auth_active():
                return {"success": False, "msg": "Token expired."}, 400

        except:
            return {"success": False, "msg": "Token is invalid"}, 400

        return f(current_user, *args, **kwargs)

    return decorator


"""
    Flask-Restx routes
"""

@rest_api.route('/api/users/register')
class Register(Resource):
    """
       Creates a new user by taking 'signup_model' input
    """

    @rest_api.expect(signup_model, validate=True)
    def post(self):

        req_data = request.get_json()

        _username = req_data.get("username")
        _email = req_data.get("email")
        _password = req_data.get("password")

        user_exists = Users.get_by_email(_email)
        if user_exists:
            return {"success": False,
                    "msg": "Email already taken"}, 400

        new_user = Users(username=_username, email=_email)

        new_user.set_password(_password)
        new_user.save()

        return {"success": True,
                "userID": new_user.id,
                "msg": "The user was successfully registered"}, 200


@rest_api.route('/api/users/login')
class Login(Resource):
    """
       Login user by taking 'login_model' input and return JWT token
    """

    @rest_api.expect(login_model, validate=True)
    def post(self):
        print("Login successful")
        req_data = request.get_json()
        _email = req_data.get("email")
        _password = req_data.get("password")

        user_exists = Users.get_by_email(_email)
        print(user_exists)
        if not user_exists:
            return {"success": False,
                    "msg": "This email does not exist."}, 400

        if not user_exists.check_password(_password):
            return {"success": False,
                    "msg": "Wrong credentials."}, 400

        # create access token uwing JWT
        token = jwt.encode({'email': _email, 'exp': datetime.utcnow() + timedelta(minutes=30)}, BaseConfig.SECRET_KEY)

        user_exists.set_jwt_auth_active(True)
        user_exists.save()

        return {"success": True,
                "token": token,
                "user": user_exists.toJSON()}, 200


@rest_api.route('/api/users/edit')
class EditUser(Resource):
    """
       Edits User's username or password or both using 'user_edit_model' input
    """

    @rest_api.expect(user_edit_model)
    # @token_required
    # def post(self, current_user):
    def post(self):

        req_data = request.get_json()
        _new_id = json.loads(req_data.get("body"))["data"]["user_id"]
        _new_username = json.loads(req_data.get("body"))["data"]["username"]
        _new_email = json.loads(req_data.get("body"))["data"]["email"]
        user = Users.get_by_id(_new_id)
        if _new_username:
            user.username = _new_username
            
        if _new_email:
            user.email = _new_email

        print(_new_id)

        user.save()
        print(user)

        return {"success": True}, 200
    
@rest_api.route('/api/users/delete/<int:user_id>')
class DeleteUser(Resource):
    """
        Deletes the seleted User
    """

    @rest_api.expect(user_delete_model)
    def delete(self, user_id):

        user = Users.get_by_id(user_id)
        if user:
            db.session.delete(user)
            db.session.commit()
            return {"success": True}, 200
        else:
            return {"error": False}, 404
            

@rest_api.route('/api/users/logout')
class LogoutUser(Resource):
    """
       Logs out User using 'logout_model' input
    """

    # @token_required
    def post(self):

        _jwt_token = request.headers["authorization"]

        jwt_block = JWTTokenBlocklist(jwt_token=_jwt_token, created_at=datetime.now(timezone.utc))
        jwt_block.save()

        return {"success": True}, 200


@rest_api.route('/api/sessions/oauth/github/')
class GitHubLogin(Resource):
    def get(self):
        code = request.args.get('code')
        client_id = BaseConfig.GITHUB_CLIENT_ID
        client_secret = BaseConfig.GITHUB_CLIENT_SECRET
        root_url = 'https://github.com/login/oauth/access_token'

        params = { 'client_id': client_id, 'client_secret': client_secret, 'code': code }

        data = requests.post(root_url, params=params, headers={
            'Content-Type': 'application/x-www-form-urlencoded',
        })

        response = data._content.decode('utf-8')
        access_token = response.split('&')[0].split('=')[1]

        user_data = requests.get('https://api.github.com/user', headers={
            "Authorization": "Bearer " + access_token
        }).json()
        
        user_exists = Users.get_by_username(user_data['login'])
        if user_exists:
            user = user_exists
        else:
            try:
                user = Users(username=user_data['login'], email=user_data['email'])
                user.save()
            except:
                user = Users(username=user_data['login'])
                user.save()
        
        user_json = user.toJSON()

        token = jwt.encode({"username": user_json['username'], 'exp': datetime.utcnow() + timedelta(minutes=30)}, BaseConfig.SECRET_KEY)
        user.set_jwt_auth_active(True)
        user.save()

        return {"success": True,
                "user": {
                    "_id": user_json['_id'],
                    "email": user_json['email'],
                    "username": user_json['username'],
                    "token": token,
                }}, 200
    
@rest_api.route('/api/upload-pdf')
class FileHandler(Resource):
    def allowed_file(self, filename):
        return '.' in filename and \
            filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
    
    def post(self):
        # Get Text type fields
        form = request.form.to_dict()
        print(form)

        if 'file' not in request.files:
            return 'No file part'
        
        

        file = request.files.get('file')
        
        if file and self.allowed_file(file.filename):
            filename = secure_filename(file.filename)
            
            filename = os.path.join(os.getcwd(), app.config['UPLOAD_FOLDER'], filename)
            print (filename)
            file.save(filename)

            return 'File uploaded successfully'

@rest_api.route("/api/dashboard")
class Dashboard(Resource):
    def get(self):
        
        user_exists = Users.get_all()
        user_data = []
        for user in user_exists:
            user_dict = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin
            }
            user_data.append(user_dict)
        
        return user_data

@rest_api.route("/api/chatbot")
class ChatbotHandler(Resource):
    def post(self):
        req_data = request.get_json()
        _text =  req_data.get("body")
        question = json.loads(_text)["prompt"]

        answer = askAccountGPT(question)
        return "okokokok"
        # return answer

 #---------------------- OpenAI Embedded -------------------------------#
# os.environ["OPENAI_API_KEY"] = "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"
openai.api_key = "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"
collection_name = "account"

from chromadb.config import Settings
client = chromadb.Client(Settings(
    chroma_db_impl="duckdb+parquet",
    persist_directory="./chroma/chroma" # Optional, defaults to .chromadb/ in the current directory
))

embeddings = openai.Embedding()
account_collection = client.get_collection(name="account", embedding_function=embeddings)

def get_embedding(text, model="text-embedding-ada-002"):
    text = text.replace("\n", " ")
    response = openai.Embedding.create(input=[text], model=model)
    embedding = response['data'][0]['embedding']
    return embedding

def break_up_text_to_chunks(text, chunk_size=2000, overlap_size=100):
    encoding = tiktoken.get_encoding("gpt2")

    tokens = encoding.encode(text)
    num_tokens = len(tokens)

    chunks = []
    for i in range(0, num_tokens, chunk_size - overlap_size):
        chunk = tokens[i:i + chunk_size]
        chunks.append(chunk)
    
    return chunks

def askAccountGPT(question, debug=False):

    #Change question to embeddings.
    
    account_question_ids = get_embedding(question)

    #Query Account collections.
    account_query_results = account_collection.query(
        query_embeddings=account_question_ids,
        n_results=10,
        include=["documents"]
    )

    #Join all items in a list
    account_documents = account_query_results["documents"][0]
    account_query_results_doc = "".join(account_documents)

    if debug == True:
        print(account_query_results_doc)

    #For a given question, only return a list relevant Accounting that covers this topic.
    prompt_response = []
    encoding = tiktoken.get_encoding("gpt2")
    chunks = break_up_text_to_chunks(account_query_results_doc)
    
    for i, chunk in enumerate(chunks):
        prompt_request = question + " Only return a list relevant Accounting that covers this topic.: " + encoding.decode(chunks[i])
        #prompt_request = question + " Only return a list relevant Accounting that covers this topic.: " + convert_to_prompt_text(chunks[i])
        response = openai.Completion.create(
                model="text-davinci-003",
                prompt=prompt_request,
                temperature=0,
                max_tokens=1000,
                top_p=1,
                frequency_penalty=0,
                presence_penalty=0
        )        
        prompt_response.append(response["choices"][0]["text"].strip())

    #Consolidate a list relevant Accounting that covers this topic.
    prompt_request = "Consoloidate these a list of Accounting: " + str(prompt_response)

    if debug == True:
        print(prompt_request)

    response = openai.Completion.create(
            model="text-davinci-003",
            prompt=prompt_request,
            temperature=0,
            max_tokens=1000,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )
    
    account_codes = response["choices"][0]["text"].strip()
    return account_codes    
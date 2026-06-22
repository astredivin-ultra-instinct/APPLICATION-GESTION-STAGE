from flask import Flask, render_template
from flask_mail import Mail
from flask_cors import CORS
import cloudinary,cloudinary.uploader
from dotenv import load_dotenv
import os

app = Flask(__name__)
CORS(app)
load_dotenv()
app.secret_key = os.environ.get("SECRET_KEY")
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024
"""app.config["UPLOAD_FOLDER"] = "uploads/rapports" """
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] =(os.environ.get('MAIL_USE_TLS','True').lower() == 'true')
app.config['MAIL_USE_SSL'] = (os.environ.get('MAIL_USE_SSL','False').lower() == 'true')
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')
app.config["MAIL_TIMEOUT"] = 10
mail = Mail()
mail.init_app(app)

cloudinary.config(
    cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key =  os.environ.get('CLOUDINARY_API_KEY'),
    api_secret = os.environ.get('CLOUDINARY_API_SECRET'),
    secure = True
    
)


from route import api_bp

app.register_blueprint(api_bp, url_prefix="/api")

print("Debut......")
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    #from bdsql import  init_db
    with app.app_context():
        #init_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
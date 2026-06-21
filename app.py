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
app.config['MAIL_PORT'] = os.environ.get('MAIL_PORT')
app.config['MAIL_USE_TLS'] =os.environ.get('MAIL_USE_TLS')
app.config['MAIL_USE_SSL'] = False 
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')
mail = Mail(app)

cloudinary.config(
    cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key =  os.environ.get('CLOUDINARY_API_KEY'),
    api_secret = os.environ.get('CLOUDINARY_API_SECRET'),
    secure = True
    
)


#os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

from route import api_bp

app.register_blueprint(api_bp, url_prefix="/api")

print("Debut......")
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
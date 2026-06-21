from flask import Flask, render_template
from flask_mail import Mail
from flask_cors import CORS
import cloudinary,cloudinary.uploader
from dotenv import load_dotenv
app = Flask(__name__)
CORS(app)
load_dotenv()
app.secret_key = os.environ.get("SECRET_KEY")
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024
"""app.config["UPLOAD_FOLDER"] = "uploads/rapports" """
app.config['MAIL_SERVER'] = 'smtp-relay.brevo.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] =True
app.config['MAIL_USE_SSL'] = False 
app.config['MAIL_USERNAME'] = 'af70c8001@smtp-brevo.com'
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = 'folmusalfred@gmail.com'
mail = Mail(app)

cloudinary.config(
    cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key =  os.environ.get('CLOUDINARY_API_KEY'),
    api_secret = os.environ.get('CLOUDINARY_API_SECRET'),
    secure = True
    
)


os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

from route import api_bp

app.register_blueprint(api_bp, url_prefix="/api")

print("Debut......")
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == "__main__":
    app.run(debug=True)
from sqlalchemy import (create_engine,Column,Integer,String,Float,Date,DateTime,Text,ForeignKey,func)
from sqlalchemy.orm import (
declarative_base,
relationship,
sessionmaker
)
import os
#postgresql://gestion_stages_db_user:F3S8aBaCtntNY3HdY3YiYQrEGHZQ70S0@dpg-d8rpv0svikkc738sqfig-a/gestion_stages_db
from sqlalchemy.ext.hybrid import hybrid_property
from dotenv import load_dotenv

load_dotenv()
user = os.environ.get("DB_USER")
password = os.environ.get("DB_PASSWORD")
host = os.environ.get("DB_HOST")
port = os.environ.get("DB_PORT")
db_name = os.environ.get("DB_NAME")

DATABASE_URL = os.environ.get("DATABASE_URL")
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300,pool_size =5,max_overflow=10,connect_args={"sslmode":"require"})

Session = sessionmaker(bind=engine)

Base = declarative_base()

class Responsable(Base):
    __tablename__ = "responsable"

    id_responsable = Column(Integer, primary_key=True,autoincrement=True)

    nom = Column(String(50), nullable=False)
    prenom = Column(String(50), nullable=False)

    mail = Column(String(120), unique=True, nullable=False)

    password = Column(String(255), nullable=False)

    stages = relationship("Stage",back_populates="responsable",cascade="all, delete")

class Etudiant(Base):
    __tablename__ = "etudiant"

    id_etudiant = Column(Integer, primary_key=True,autoincrement=True)

    ine = Column(String(12), unique=True, nullable=False  )

    nom = Column(String(50), nullable=False)

    prenom = Column(String(50), nullable=False)

    mail = Column(String(120), unique=True, nullable=False)

    filiere = Column(String(50), nullable=False)

    semestre = Column(Integer, nullable=False)

    password = Column(String(255), nullable=False)

    id_responsable = Column(Integer,ForeignKey("responsable.id_responsable"))

    

class Superviseur(Base):
    __tablename__ = "superviseur"

    id_superviseur = Column(Integer, primary_key=True,autoincrement=True    )

    nom = Column(String(50), nullable=False)

    prenom = Column(String(50), nullable=False)

    mail = Column(String(120), unique=True, nullable=False)

    password = Column(String(255), nullable=False)

    id_responsable = Column(Integer,ForeignKey("responsable.id_responsable"))


class Rapporteur(Base):
    __tablename__ = "rapporteur"

    id_rapporteur = Column(Integer, primary_key=True,autoincrement=True )

    nom = Column(String(50), nullable=False)

    prenom = Column(String(50), nullable=False)

    mail = Column(String(120), unique=True, nullable=False)

    password = Column(String(255), nullable=False)

    id_responsable = Column(Integer,ForeignKey("responsable.id_responsable"))


class Stage(Base):
    __tablename__ = "stage"

    id_stage = Column(Integer, primary_key=True,autoincrement=True)

    titre = Column(String(150), nullable=False)

    entreprise = Column(String(150), nullable=False)

    ville = Column(String(150), nullable=False)

    localisation = Column(String(150))

    description = Column(Text)

    date_debut = Column(Date, nullable=False)

    date_fin = Column(Date, nullable=False)

    id_responsable = Column(Integer,ForeignKey("responsable.id_responsable"), unique=False)

    id_etudiant = Column(Integer,ForeignKey("etudiant.id_etudiant"), unique=True)

    id_superviseur = Column(Integer,ForeignKey("superviseur.id_superviseur"),unique=False)

    id_rapporteur = Column(Integer,ForeignKey("rapporteur.id_rapporteur"),unique=False)

    responsable = relationship("Responsable",back_populates="stages")

    etudiant = relationship("Etudiant")

    superviseur = relationship("Superviseur")

    rapporteur = relationship("Rapporteur")

class Rapport(Base):
    __tablename__ = "rapport"

    id_rapport = Column(Integer, primary_key=True,autoincrement=True)

    titre = Column(String(150), nullable=False)

    chemin_fichier = Column(String(255), nullable=False)

    status = Column(String(20),default="En attente")

    contenu = Column(Text,nullable=True)

    date_soumission = Column(DateTime,default=func.now())

    id_stage = Column(Integer,ForeignKey("stage.id_stage"))

    stage = relationship("Stage")

class Evaluation(Base):
    __tablename__ = "evaluation"

    id_evaluation = Column(Integer, primary_key=True,autoincrement=True)

    ine = Column(String(12),ForeignKey("etudiant.ine"),unique=True)

    note_superviseur = Column(Float)

    note_rapporteur = Column(Float)

    note_responsable = Column(Float)

    commentaire_superviseur = Column(Text)

    commentaire_rapporteur = Column(Text)

    commentaire_responsable = Column(Text)

    date_evaluation = Column(DateTime,default=func.now())

    id_rapport = Column(Integer,ForeignKey("rapport.id_rapport"),unique=True)

    etudiant = relationship("Etudiant")
    @hybrid_property
    def note_final(self):
        notes = []
        if self.note_superviseur is not None:
            notes.append(self.note_superviseur)

        if self.note_rapporteur is not None:
            notes.append(self.note_rapporteur)

        if self.note_responsable is not None:
            notes.append(self.note_responsable)

        if len(notes) == 0:
            return None

        return round(sum(notes) / len(notes), 2)

Base.metadata.create_all(engine)
print("Tables  créee avec succès")
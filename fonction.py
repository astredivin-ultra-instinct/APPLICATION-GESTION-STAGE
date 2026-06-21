import secrets
import string
from werkzeug.security import generate_password_hash, check_password_hash
from bdsql import Session, Responsable, Etudiant, Superviseur, Rapporteur, Stage, Rapport, Evaluation
import re
from flask import jsonify
# =========================
# OUTILS
# =========================

"""def generer_password(longueur=8):
    caracteres = string.ascii_letters + string.digits
    return ''.join(secrets.choice(caracteres) for _ in range(longueur))"""


def envoyer_mail(destinataire, sujet, contenu):
    try:
        msg = Message(sujet, sender="folmusalfred@gmail.com", recipients=[destinataire])
        msg.body = contenu
        mail.send(msg)
        return True
    except Exception as e:
        print(e)
        return False


# =========================
# RESPONSABLE
# =========================

def add_responsable(nom, prenom, mail_responsable, password):
    session = Session()
    try:
        existe = session.query(Responsable).filter_by(mail=mail_responsable).first()

        if existe:
            return {"success": False, "message": "Responsable déjà existant"}

        responsable = Responsable(
            nom=nom,
            prenom=prenom,
            mail=mail_responsable,
            password=generate_password_hash(password)
        )

        session.add(responsable)
        session.commit()
        return {"success": True, "message": "Responsable créé"}
    except Exception as e:
        session.rollback()
        return {"success": False, "message": str(e)}
    finally:
        session.close()


def login_responsable(mail_responsable, password):
    session = Session()
    try:
        responsable = session.query(Responsable).filter_by(mail=mail_responsable).first()

        if not responsable:
            return {"success": False, "message": "Compte introuvable, vérifier bien vos information"}

        if not check_password_hash(responsable.password, password):
            return {"success": False, "message": "Mot de passe incorrect"}

        return {
            "success": True,
            "id_responsable": responsable.id_responsable,
            "nom": responsable.nom,
            "prenom": responsable.prenom,
            "mail": responsable.mail
        }
    finally:
        session.close()


# =========================
# ETUDIANT
# =========================

def login_etudiant(ine, password):
    session = Session()
    try:
        etudiant = session.query(Etudiant).filter_by(ine=ine).first()

        if not etudiant:
            return {"success": False, "message": "Étudiant introuvable"}

        if not check_password_hash(etudiant.password, password):
            return {"success": False, "message": "Mot de passe incorrect"}

        return {
            "success": True,
            "id_etudiant": etudiant.id_etudiant,
            "ine": etudiant.ine,
            "nom": etudiant.nom,
            "prenom": etudiant.prenom
        }
    finally:
        session.close()




# =========================
# SUPERVISEUR
# =========================

def login_superviseur(mail_superviseur, password):
    session = Session()
    try:
        superviseur = session.query(Superviseur).filter_by(mail=mail_superviseur).first()

        if not superviseur:
            return {"success": False, "message": "Compte introuvable,verifier bien vos informations"}

        if not check_password_hash(superviseur.password, password):
            return {"success": False, "message": "Mot de passe incorrect"}

        return {
            "success": True,
            "id_superviseur": superviseur.id_superviseur,
            "nom": superviseur.nom,
            "prenom": superviseur.prenom
        }
    finally:
        session.close()


# =========================
# RAPPORTEUR
# =========================

def login_rapporteur(mail_rapporteur, password):
    session = Session()
    try:
        rapporteur = session.query(Rapporteur).filter_by(mail=mail_rapporteur).first()

        if not rapporteur:
            return {"success": False, "message": "Compte introuvable, verifier bien vos informations"}

        if not check_password_hash(rapporteur.password, password):
            return {"success": False, "message": "Mot de passe incorrect"}

        return {
            "success": True,
            "id_rapporteur": rapporteur.id_rapporteur,
            "nom": rapporteur.nom,
            "prenom": rapporteur.prenom
        }
    finally:
        session.close()

DOMAINS = ["gmail.com", "yahoo.com", "yahoo.fr"]


def email_valide(email):
    return any(email.endswith("@" + d) for d in DOMAINS)


# =========================
# ETUDIANT
# =========================
def add_etudiant(id_responsable, nom, prenom, ine, mail, filiere, semestre):
    if not email_valide(mail):
        return {"success": False, "message": "Email non autorisé"}
    session = Session()
    etudiant = session.query(Etudiant).filter_by(ine=ine).first()
    if etudiant:
        session.close()
        return False

    ap = string.ascii_letters + string.digits
    temp = ''.join(secrets.choice(ap) for i in range(8) )
    password_e = generate_password_hash(temp)
    etudiant = Etudiant(ine=ine, nom=nom, prenom=prenom, mail=mail,filiere=filiere,semestre=semestre, password=password_e,id_responsable=id_responsable)
    session.add(etudiant)
    session.commit()
    from flask_mail import Message,Mail
    from flask import current_app,Flask
    try:
        mail_instance = current_app.extensions['mail']
        msg = Message("Création de votre compte - Gestion des Stages",recipients=[mail])
        msg.body = f"""Camarade {prenom} {nom},
Votre compte(Etudiant) sur la plateforme de Gestion des Stages a été créé par le responsable.
Voici vos identifiants de connexion :
- INE : {ine}
- Mot de passe: {temp}
- Filière : {filiere}
- Lien : <https://application-gestion-stage-4.onrender.com>

Vous pourriez vous connecter et modifier votre mot de passe dès votre première connexion.

Cordialement,
L'administration."""  

        mail_instance.send(msg)
        session.close()
        return True
            
    except Exception as e:
        session.rollback()
        print(f"Erreur d'envoi de mail : {e}")
    finally:
        session.close()

def modifier_etudiant(id_responsable, id_etudiant,ine, nom, prenom,mail, filiere, semestre):
    session = Session()
    #resp = session.query(Responsable).filter_by(id_reponsable=id_responsable).first()
    try:
        etu = session.query(Etudiant).filter_by(id_etudiant=id_etudiant, id_responsable=id_responsable).first()

        if not etu:
            return False #{"success": False, "message": "Introuvable"}
        etu.id_responsable = id_responsable
        etu.ine = ine
        etu.nom = nom
        etu.prenom = prenom
        etu.mail = mail
        etu.filiere = filiere
        etu.semestre = semestre
        session.commit()
        try:
            from flask_mail import Message,Mail
            from flask import current_app,Flask
            msg = Message("Modification de votre Compte(Etudiant) - Gestion des Stages",recipients=[mail])
            msg.body = f"""Camarade {prenom} {nom},

Connectez vous à votre compte avec le même mot de passe pour voir les modification.
- INE:{etu.ine}
- Lien : <https://application-gestion-stage-4.onrender.com>
Cordialement,
L'administration."""

            mail_serveur = current_app.extensions['mail']
            mail_serveur.send(msg)
            session.close()
            return jsonify({"success": True,"message":"Etudiant modifié avec success ces identifiants lui on été envoyer par mail"})
            
        except Exception as e:
            session.rollback()
            print(f"Erreur d'envoi de mail : {e}")
            session.close()
            return False
        return {"success": True, "message": "Étudiant modifié"}

    finally:
        session.close()

def get_all_etudiants(id_responsable):
    session = Session()
    try:
        data = session.query(Etudiant).filter_by(id_responsable=id_responsable).all()
        return [
            {
                "id_etudiant": e.id_etudiant,
                "nom": e.nom,
                "prenom": e.prenom,
                "ine": e.ine,
                "mail": e.mail,
                "filiere": e.filiere,
                "semestre": e.semestre
            }
            for e in data
        ]
    finally:
        session.close()


def delete_etudiant(id_responsable, ine):
    session = Session()
    try:
        etu = session.query(Etudiant).filter_by(ine=ine, id_responsable=id_responsable).first()

        if not etu:
            return {"success": False, "message": "Introuvable"}

        session.delete(etu)
        session.commit()
        return {"success": True}
    finally:
        session.close()


# =========================
# SUPERVISEUR
# =========================
def add_superviseur(id_responsable, nom, prenom, mail):
    if not email_valide(mail):
        return {"success": False, "message": "Email non autorisé"}
    session = Session()
    try:
        responsable = session.query(Responsable).filter_by(id_responsable=id_responsable).first()
        #etudiant = session.query(Etudiant).filter_by(ine=ine).first()

        if not responsable:
            session.close()
            return False
        superviseur = session.query(Superviseur).filter_by(mail=mail).first()

        if superviseur is None:
            ap = string.ascii_letters + string.digits
            temp = ''.join(secrets.choice(ap) for i in range(8) )
            password_s = generate_password_hash(temp)
            superviseur = Superviseur(id_responsable=id_responsable,nom=nom, prenom=prenom, mail=mail, password=password_s)
            session.add(superviseur)
            session.commit()

            try:
                from flask_mail import Message,Mail
                from flask import current_app,Flask

                msg = Message("Création de votre compte - Gestion des Stages",recipients=[mail])
                msg.body = f"""Camarade {prenom} {nom},
Votre compte(Superviseur) sur la plateforme de Gestion des Stages a été créé par le responsable.
Voici vos identifiants de connexion :
- identifiant : {mail}
- Mot de passe: {temp}
- Lien : <https://application-gestion-stage-4.onrender.com>

Vous êtes solliciter à superviser un/des etudiant(s) sur un/des stage(s), 
Connecter vous à votre compte pour suivre son avancement.

Cordialement,
L'administration."""

                mail_serveur = current_app.extensions['mail']
                mail_serveur.send(msg)
                session.close()
                return True
            
            except Exception as e:
                session.rollback()
                print(f"Erreur d'envoi de mail : {e}")
        else:
 
            try:
                from flask_mail import Message,Mail
                from flask import current_app,Flask

                msg = Message("Nouvelle etudiant à superviser - Gestion des Stages",recipients=[mail])
                msg.body = f"""Camarade {superviseur.prenom} {superviseur.nom},

Vous êtes solliciter de nouveau à superviser un etudiant,
Connectez vous à votre compte pour suivre son avancement.
- Lien : <https://application-gestion-stage-4.onrender.com>
Cordialement,
L'administration."""

                mail_serveur = current_app.extensions['mail']
                mail_serveur.send(msg)
                session.close()
                return True
            
            except Exception as e:
                session.rollback()
                print(f"Erreur d'envoi de mail : {e}")
        return True

    except Exception as e:
        session.rollback()
        return False
    finally:
        session.close()

def get_all_superviseurs(id_responsable):
    session = Session()
    try:
        data = session.query(Superviseur).filter_by(id_responsable=id_responsable).all()
        return [
            {
                "id_superviseur": s.id_superviseur,
                "nom": s.nom,
                "prenom": s.prenom,
                "mail": s.mail
            }
            for s in data
        ]
    finally:
        session.close()


def delete_superviseur(id_responsable, id_superviseur):
    session = Session()
    try:
        sup = session.query(Superviseur).filter_by(id_superviseur=id_superviseur, id_responsable=id_responsable).first()

        if not sup:
            return {"success": False, "message": "Introuvable"}

        session.delete(sup)
        session.commit()
        return {"success": True}
    finally:
        session.close()


# =========================
# RAPPORTEUR
# =========================
def add_rapporteur(id_responsable, nom, prenom, mail):
    if not email_valide(mail):
        return {"success": False, "message": "Email non autorisé"}
    session = Session() 
    try:
        responsable = session.query(Responsable).filter_by(id_responsable=id_responsable).first()
        #etudiant = session.query(Etudiant).filter_by(ine=ine).first()

        if not responsable:
            session.close()
            return False
        
        rapporteur = session.query(Rapporteur).filter_by(mail=mail).first()

        if rapporteur is None:
            ap = string.ascii_letters + string.digits
            temp = ''.join(secrets.choice(ap) for i in range(8) )
            password_r = generate_password_hash(temp)
            rapporteur = Rapporteur(nom=nom, prenom=prenom,id_responsable=id_responsable, mail=mail, password=password_r)
            session.add(rapporteur)
            session.commit()

            try:
                from flask_mail import Message,Mail
                from flask import current_app,Flask

                msg = Message("Création de votre compte - Gestion des Stages",recipients=[mail])
                msg.body = f"""Camarade {prenom} {nom},
Votre compte(Rapporteur) sur la plateforme de Gestion des Stages a été créé par le responsable.
Voici vos identifiants de connexion :
- identifiant : {mail}
- Mot de passe: {temp}
- Lien : <https://application-gestion-stage-4.onrender.com>

Vous serez solliciter à suivre un/des etudiant(s) pour un/des stage(s).
Connecter vous pour suivre son/leur avancement.

Cordialement,
L'administration."""

                mail_serveur = current_app.extensions['mail']
                mail_serveur.send(msg)
                session.close()
                return True
            
            except Exception as e:
                session.rollback()
                print(f"Erreur d'envoi de mail : {e}")
        else:
            try:
                from flask_mail import Message,Mail
                from flask import current_app,Flask

                msg = Message("Nouvel etudiant à suivre - Gestion des Stages",recipients=[mail])
                msg.body = f"""Camarade {rapporteur.prenom} {rapporteur.nom},

Vous serez solliciter de nouveau à suivre un etudiant.
Connecter vous à votre compte pour suivre son avancement.
- Lien : <https://application-gestion-stage-4.onrender.com>
Cordialement,
L'administration."""

                mail_serveur = current_app.extensions['mail']
                mail_serveur.send(msg)
                session.close()
                return True
            
            except Exception as e:
                session.rollback()
                print(f"Erreur d'envoi de mail : {e}")
        return True

    except Exception as e:
        session.rollback()
        return False
    finally:
        session.close()

def get_all_rapporteurs(id_responsable):
    session = Session()
    try:
        data = session.query(Rapporteur).filter_by(id_responsable=id_responsable).all()
        return [
            {
                "id_rapporteur": r.id_rapporteur,
                "nom": r.nom,
                "prenom": r.prenom,
                "mail": r.mail
            }
            for r in data
        ]
    finally:
        session.close()


def delete_rapporteur(id_responsable, id_rapporteur):
    session = Session()
    try:
        rap = session.query(Rapporteur).filter_by(id_rapporteur=id_rapporteur, id_responsable=id_responsable).first()

        if not rap:
            return {"success": False, "message": "Introuvable"}

        session.delete(rap)
        session.commit()
        return {"success": True}
    finally:
        session.close()



from bdsql import Session, Stage, Rapport
from datetime import date


# =========================
# STAGE
# =========================
def add_stage(id_responsable, titre, entreprise, ville, description, date_debut, date_fin, id_etudiant, id_superviseur, id_rapporteur):
    session = Session()
    try:
        stage = Stage(
            id_responsable=id_responsable,
            titre=titre,
            entreprise=entreprise,
            ville=ville,
            description=description,
            date_debut=date_debut,
            date_fin=date_fin,
            id_etudiant=id_etudiant,
            id_superviseur=id_superviseur,
            id_rapporteur=id_rapporteur
        )
        session.add(stage)
        session.commit()
        return {"success": True, "message": "Stage ajouté"}
    except Exception as e:
        session.rollback()
        return {"success": False, "message": str(e)}
    finally:
        session.close()


def get_all_stages(id_responsable):
    session = Session()
    try:
        stages = session.query(Stage).filter_by(id_responsable=id_responsable).all()
        return [
            {
                "id_stage": s.id_stage,
                "titre": s.titre,
                "entreprise": s.entreprise,
                "ville": s.ville,
                "description": s.description,
                "date_debut": str(s.date_debut),
                "date_fin": str(s.date_fin),
                "etudiant": s.id_etudiant,
                "superviseur": s.id_superviseur,
                "rapporteur": s.id_rapporteur
            }
            for s in stages
        ]
    finally:
        session.close()


def delete_stage(id_responsable, id_stage):
    session = Session()
    try:
        stage = session.query(Stage).filter_by(id_stage=id_stage, id_responsable=id_responsable).first()

        if not stage:
            return {"success": False, "message": "Stage introuvable"}

        session.delete(stage)
        session.commit()
        return {"success": True}
    finally:
        session.close()


# =========================
# RAPPORT
# =========================
def add_rapport(id_stage, titre, chemin_fichier, contenu):
    session = Session()
    try:
        rapport = Rapport(
            id_stage=id_stage,
            titre=titre,
            chemin_fichier=chemin_fichier,
            contenu=contenu,
            status="En attente"
        )
        session.add(rapport)
        session.commit()
        return {"success": True, "message": "Rapport ajouté"}
    except Exception as e:
        session.rollback()
        return {"success": False, "message": str(e)}
    finally:
        session.close()


def get_rapport_by_stage(id_stage):
    session = Session()
    try:
        rapport = session.query(Rapport).filter_by(id_stage=id_stage).first()

        if not rapport:
            return None

        return {
            "id_rapport": rapport.id_rapport,
            "titre": rapport.titre,
            "chemin_fichier": rapport.chemin_fichier,
            "contenu": rapport.contenu,
            "status": rapport.status
        }
    finally:
        session.close()


def update_status_rapport(id_stage, status):
    session = Session()
    try:
        rapport = session.query(Rapport).filter_by(id_stage=id_stage).first()

        if not rapport:
            return {"success": False, "message": "Rapport introuvable"}

        rapport.status = status
        session.commit()
        return {"success": True}
    finally:
        session.close()

from bdsql import Session, Evaluation, Stage


# =========================
# ADD / UPDATE EVALUATION
# =========================
"""def add_or_update_evaluation(id_rapport, note_superviseur=None, note_rapporteur=None, note_responsable=None, commentaire_superviseur=None, commentaire_rapporteur=None, commentaire_responsable=None):
    session = Session()
    try:
        evaluation = session.query(Evaluation).filter_by(id_rapport=id_rapport).first()

        # si evaluation n'existe pas -> creation
        if not evaluation:
            evaluation = Evaluation(
                id_rapport=id_rapport,
                note_superviseur=note_superviseur,
                note_rapporteur=note_rapporteur,
                note_responsable=note_responsable,
                commentaire_superviseur=commentaire_superviseur,
                commentaire_rapporteur=commentaire_rapporteur,
                commentaire_responsable=commentaire_responsable
            )
            session.add(evaluation)

        # sinon update partiel
        else:
            if note_superviseur is not None:
                evaluation.note_superviseur = note_superviseur
            if note_rapporteur is not None:
                evaluation.note_rapporteur = note_rapporteur
            if note_responsable is not None:
                evaluation.note_responsable = note_responsable
            if commentaire_superviseur is not None:
                evaluation.commentaire_superviseur = commentaire_superviseur
            if commentaire_rapporteur is not None:
                evaluation.commentaire_rapporteur = commentaire_rapporteur
            if commentaire_responsable is not None:
                evaluation.commentaire_responsable = commentaire_responsable

        session.commit()
        return {"success": True, "message": "Évaluation enregistrée"}
    except Exception as e:
        session.rollback()
        return {"success": False, "message": str(e)}
    finally:
        session.close()"""


def get_ine_by_rapport(id_rapport):
    session = Session()
    try:
        rapport  = session.query(Rapport).filter_by(id_rapport=id_rapport).first()
        if not rapport: return None
        stage    = session.query(Stage).filter_by(id_stage=rapport.id_stage).first()
        if not stage: return None
        etudiant = session.query(Etudiant).filter_by(id_etudiant=stage.id_etudiant).first()
        return etudiant.ine if etudiant else None
    finally:
        session.close()

def evaluer_superviseur(ine, note, avis,id_rapport):
    session = Session()
    try:
        evaluation = session.query(Evaluation).filter_by(ine=ine).first()

        if not evaluation:
            evaluation = Evaluation(ine=ine,id_rapport=id_rapport)
            session.add(evaluation)

        evaluation.note_superviseur = note
        evaluation.commentaire_superviseur = avis

        session.commit()
        return {"success": True, "message": "Évaluation superviseur enregistrée"}
    except Exception as e:
        session.rollback()
        return {"success": False, "message": str(e)}
    finally:
        session.close()

def evaluer_rapporteur(ine, note, avis,id_rapport):
    session = Session()
    try:
        evaluation = session.query(Evaluation).filter_by(ine=ine).first()

        if not evaluation:
            evaluation = Evaluation(ine=ine,id_rapport=id_rapport)
            session.add(evaluation)

        evaluation.note_rapporteur = note
        evaluation.commentaire_rapporteur = avis

        session.commit()
        return {"success": True, "message": "Évaluation rapporteur enregistrée"}
    except Exception as e:
        session.rollback()
        return {"success": False, "message": str(e)}
    finally:
        session.close()
    
def evaluer_responsable(ine, note, avis,id_rapport):
    session = Session()
    try:
        evaluation = session.query(Evaluation).filter_by(ine=ine).first()

        if not evaluation:
            #return {"success": False, "message": "Evaluation introuvable"}
            evaluation = Evaluation(ine=ine,id_rapport=id_rapport)
            session.add(evaluation)

        evaluation.note_responsable = note
        evaluation.commentaire_responsable = avis

        session.commit()
        return {"success": True, "message": "Evaluation enregistrée"}
    except Exception as e:
        session.rollback()
        return {"success": False, "message": str(e)}
    finally:
        session.close()


# =========================
# GET EVALUATION
# =========================

def get_evaluations_etudiant(ine):
    session = Session()
    try:

        eval = session.query(Evaluation).filter_by(ine=ine).first()
        if not eval:
            return None

        return {
            "note_superviseur": eval.note_superviseur,
            "commentaire_superviseur": eval.commentaire_superviseur,

            "note_rapporteur": eval.note_rapporteur,
            "commentaire_rapporteur": eval.commentaire_rapporteur,

            "note_responsable": eval.note_responsable,
            "commentaire_responsable": eval.commentaire_responsable,

            "note_finale": eval.note_final
        }

    finally:
        session.close()

def get_evaluation_superviseur(ine):

    session = Session()

    try:
        etudiant = session.query(Etudiant).filter_by(ine=ine).first()
        if not etudiant :
            return None
        eval = session.query(Evaluation).filter_by(ine=ine).first()
        if not eval:
            return None
        return {
            "note_superviseur": eval.note_superviseur,
            "commentaire_superviseur": eval.commentaire_superviseur
        }

    finally:
        session.close()

def get_evaluation_rapporteur(ine):
    session = Session()

    try:
        etudiant = session.query(Etudiant).filter_by(ine=ine).first()
        if not etudiant :
            return None
        eval = session.query(Evaluation).filter_by(ine=ine).first()
        if not eval:
            return None

        return {
            "note_rapporteur": eval.note_rapporteur,
            "commentaire_rapporteur": eval.commentaire_rapporteur
        }

    finally:
        session.close()
    
def get_evaluation_responsable(ine):
    session = Session()
    try:

        eval = session.query(Evaluation).filter_by(ine=ine).first()

        if not eval:
            return None

        return {

            "note_superviseur": eval.note_superviseur,
            "commentaire_superviseur": eval.commentaire_superviseur,

            "note_rapporteur": eval.note_rapporteur,
            "commentaire_rapporteur": eval.commentaire_rapporteur,

            "note_responsable": eval.note_responsable,
            "commentaire_responsable": eval.commentaire_responsable,

            "note_finale": eval.note_final
        }

    finally:
        session.close()


def get_evaluation_by_id_rapport(id_rapport):
    session = Session()
    try:
        evaluation = session.query(Evaluation).filter_by(id_rapport=id_rapport).first()

        if not evaluation:
            return None

        return {
            "id_rapport": evaluation.id_rapport,
            "note_superviseur": evaluation.note_superviseur,
            "note_rapporteur": evaluation.note_rapporteur,
            "note_responsable": evaluation.note_responsable,
            "commentaire_superviseur": evaluation.commentaire_superviseur,
            "commentaire_rapporteur": evaluation.commentaire_rapporteur,
            "commentaire_responsable": evaluation.commentaire_responsable,
            "note_finale": evaluation.note_finale
        }
    finally:
        session.close()



def modifier_superviseur(id_responsable, id_superviseur, nom, prenom, mail):
    session = Session()
    try:
        sup = session.query(Superviseur).filter_by(id_superviseur=id_superviseur, id_responsable=id_responsable).first()

        if not sup:
            return {"success": False, "message": "Introuvable"}

        sup.nom = nom
        sup.prenom = prenom
        sup.mail = mail
        session.commit()
        try:
            from flask_mail import Message,Mail
            from flask import current_app,Flask
            msg = Message("Modification de votre Compte(Superviseur) - Gestion des Stages",recipients=[mail])
            msg.body = f"""Camarade {sup.prenom} {sup.nom},

Connectez vous à votre compte avec le même mot de passe pour voir les modification.

Cordialement,
L'administration."""

            mail_serveur = current_app.extensions['mail']
            mail_serveur.send(msg)
            session.close()
            return jsonify({"success": True,"message":"Superviseur modifié avec success ces identifiants lui on été envoyer par mail"})
            
        except Exception as e:
            session.rollback()
            print(f"Erreur d'envoi de mail : {e}")
            session.close()
            return False
        return {"success": True, "message": "Superviseur modifié"}
    finally:
        session.close()

def modifier_rapporteur(id_responsable, id_rapporteur, nom, prenom, mail):
    session = Session()
    try:
        rap = session.query(Rapporteur).filter_by(id_rapporteur=id_rapporteur, id_responsable=id_responsable).first()

        if not rap:
            return {"success": False, "message": "Introuvable"}

        rap.nom = nom
        rap.prenom = prenom
        rap.mail = mail
        session.commit()
        try:
            from flask_mail import Message,Mail
            from flask import current_app,Flask
            msg = Message("Modification de votre Compte(Rapporteur) - Gestion des Stages",recipients=[mail])
            msg.body = f"""Camarade {rap.prenom} {rap.nom},

Connectez vous à votre compte avec le même mot de passe pour voir les modification.

Cordialement,
L'administration."""

            mail_serveur = current_app.extensions['mail']
            mail_serveur.send(msg)
            session.close()
            return jsonify({"success": True,"message":"Rapporteur modifié avec success ces identifiants lui on été envoyer par mail"})
            
        except Exception as e:
            session.rollback()
            print(f"Erreur d'envoi de mail : {e}")
            session.close()
            return False
        return {"success": True, "message": "Rapporteur modifié"}
    finally:
        session.close()

def valider_rapport(id_stage):
    session = Session()
    try:
        rapport = session.query(Rapport).filter_by(id_stage=id_stage).first()

        if not rapport:
            return {"success": False, "message": "Rapport introuvable"}

        if rapport.status != "En attente":
            return {"success": False, "message": "Rapport déjà verrouillé"}

        rapport.status = "Terminé"
        session.commit()
        return {"success": True, "message": "Rapport validé et verrouillé"}
    finally:
        session.close()
    
def modifier_rapport(id_stage, titre, chemin_fichier, contenu):
    session = Session()
    try:
        rapport = session.query(Rapport).filter_by(id_stage=id_stage).first()

        if not rapport:
            return {"success": False, "message": "Introuvable"}

        if rapport.status == "Terminé":
            return {"success": False, "message": "Rapport verrouillé"}

        rapport.titre = titre
        rapport.chemin_fichier = chemin_fichier
        rapport.contenu = contenu

        session.commit()
        return {"success": True, "message": "Rapport modifié"}
    finally:
        session.close()

def verifier_responsable(id_responsable):

    session = Session()

    try:

        responsable = session.query(
            Responsable
        ).filter_by(
            id_responsable=id_responsable
        ).first()

        return responsable is not None

    finally:
        session.close()

def get_stages_superviseur(id_superviseur):

    session = Session()

    try:
        stages = session.query(Stage).filter_by(id_superviseur=id_superviseur).all()

        return [{
            "id_stage": s.id_stage,
            "titre": s.titre,
            "etudiant": s.id_etudiant,
            "status": session.query(Rapport).filter_by(id_stage=s.id_stage).first().status if session.query(Rapport).filter_by(id_stage=s.id_stage).first() else "En attente"
        } for s in stages]

    finally:
        session.close()

def get_stages_rapporteur(id_rapporteur):

    session = Session()

    try:
        stages = session.query(Stage).filter_by(id_rapporteur=id_rapporteur).all()

        return [{
            "id_stage": s.id_stage,
            "titre": s.titre,
            "etudiant": s.id_etudiant,
            "status": session.query(Rapport).filter_by(id_stage=s.id_stage).first().status if session.query(Rapport).filter_by(id_stage=s.id_stage).first() else "En attente"
        } for s in stages]

    finally:
        session.close()

def get_stage_etudiant(id_etudiant):

    session = Session()
    try:
        stage = session.query(Stage).filter_by(id_etudiant=id_etudiant).first()

        if not stage:
            return None

        rapport = session.query(Rapport).filter_by(id_stage=stage.id_stage).first()

        return {
            "id_stage": stage.id_stage,
            "titre": stage.titre,
            "entreprise": stage.entreprise,
            "superviseur": stage.id_superviseur,
            "date_debut":stage.date_debut,
            "date_fin":stage.date_fin,
            "rapporteur": stage.id_rapporteur,
            "rapport_status": rapport.status if rapport else "En attente"
        }

    finally:
        session.close()

print("ok")
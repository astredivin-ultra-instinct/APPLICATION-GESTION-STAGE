from flask import Blueprint, request, jsonify
from fonction import *
from werkzeug.utils import secure_filename
import os

api_bp = Blueprint("api", __name__)

# =========================
# AUTH RESPONSABLE
# =========================
@api_bp.route("/responsable/connexion", methods=["POST"])
def connexion_responsable():
    data = request.json
    return jsonify(login_responsable(data["mail"], data["password"]))

@api_bp.route("/responsable/ajouter", methods=["POST"])
def ajouter_responsable():
    data = request.json
    return jsonify(add_responsable(data["nom"], data["prenom"], data["mail"], data["password"]))


# =========================
# AUTH ETUDIANT
# =========================
@api_bp.route("/etudiant/connexion", methods=["POST"])
def connexion_etudiant():
    data = request.json
    return jsonify(login_etudiant(data["ine"], data["password"]))


# =========================
# AUTH SUPERVISEUR
# =========================
@api_bp.route("/superviseur/connexion", methods=["POST"])
def connexion_superviseur():
    data = request.json
    return jsonify(login_superviseur(data["mail"], data["password"]))


# =========================
# AUTH RAPPORTEUR
# =========================
@api_bp.route("/rapporteur/connexion", methods=["POST"])
def connexion_rapporteur():
    data = request.json
    return jsonify(login_rapporteur(data["mail"], data["password"]))


# =========================
# ETUDIANTS
# =========================
@api_bp.route("/etudiants/ajouter", methods=["POST"])
def ajouter_etudiant():
    data = request.json
    valid =(add_etudiant(data["id_responsable"], data["nom"], data["prenom"], data["ine"], data["mail"], data["filiere"], data["semestre"]))
    if valid:
        return jsonify({"success": True,"message":"Etudiant ajouté avec success ces identifiants lui on été envoyer par mail"})
    else:
        return jsonify({"success": False,"message":"Erreur lors de l'envoi du mail"})


@api_bp.route("/etudiants/liste/<int:id_responsable>", methods=["GET"])
def liste_etudiants(id_responsable):
    return jsonify(get_all_etudiants(id_responsable))


@api_bp.route("/etudiants/supprimer", methods=["POST"])
def supprimer_etudiant():
    data = request.json
    return jsonify(delete_etudiant(data.get("id_responsable"), data.get("ine")))


# =========================
# SUPERVISEURS
# =========================
@api_bp.route("/superviseurs/ajouter", methods=["POST"])
def ajouter_superviseur():
    data = request.json
    valid = (add_superviseur(data["id_responsable"], data["nom"], data["prenom"], data["mail"]))
    if valid:
        return jsonify({"success": True,"message":"Superviseur ajouté avec success ces identifiants lui on été envoyer par mail"})
    else:
        return jsonify({"success": False,"message":"Erreur lors de l'envoi du mail"})


@api_bp.route("/superviseurs/liste/<int:id_responsable>", methods=["GET"])
def liste_superviseurs(id_responsable):
    return jsonify(get_all_superviseurs(id_responsable))


@api_bp.route("/superviseurs/supprimer", methods=["POST"])
def supprimer_superviseur():
    data = request.json
    return jsonify(delete_superviseur(data["id_responsable"], data["id_superviseur"]))


# =========================
# RAPPORTEURS
# =========================
@api_bp.route("/rapporteurs/ajouter", methods=["POST"])
def ajouter_rapporteur():
    data = request.json
    valid = (add_rapporteur(data["id_responsable"], data["nom"], data["prenom"], data["mail"]))
    if valid:
        return jsonify({"success": True,"message":"Rapporteur ajouté avec success ces identifiants lui on été envoyer par mail"})
    else:
        return jsonify({"success": False,"message":"Erreur lors de l'envoi du mail"})



@api_bp.route("/rapporteurs/liste/<int:id_responsable>", methods=["GET"])
def liste_rapporteurs(id_responsable):
    return jsonify(get_all_rapporteurs(id_responsable))


@api_bp.route("/rapporteurs/supprimer", methods=["POST"])
def supprimer_rapporteur():
    data = request.json
    v = delete_rapporteur(data["id_responsable"], data["id_rapporteur"])
    if v:
        return jsonify({"success": True,"message":"Rapporteur modifié avec success ces identifiants lui on été envoyer par mail"})
    else:
        return jsonify({"success": False,"message":"Erreur lors de l'envoi du mail verifier bien les informations"})

# =========================
# STAGES
# =========================
@api_bp.route("/stages/ajouter", methods=["POST"])
def ajouter_stage():
    data = request.json
    return jsonify(add_stage(data["id_responsable"], data["titre"], data["entreprise"], data["ville"], data["description"], data["date_debut"], data["date_fin"], data["id_etudiant"], data["id_superviseur"], data["id_rapporteur"]))


@api_bp.route("/stages/liste/<int:id_responsable>", methods=["GET"])
def liste_stages(id_responsable):
    return jsonify(get_all_stages(id_responsable))


@api_bp.route("/stages/supprimer", methods=["POST"])
def supprimer_stage():
    data = request.json
    return jsonify(delete_stage(data["id_responsable"], data["id_stage"]))


# =========================
# RAPPORT
# =========================

import cloudinary
import cloudinary.uploader
from werkzeug.utils import secure_filename

@api_bp.route("/rapport/ajouter", methods=["POST"])
def ajouter_rapport():
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "Aucun fichier PDF trouvé"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "message": "Aucun fichier selectionné"}), 400
    
    if file and file.filename.endswith('.pdf'):
        try:
            id_stage = request.form.get("id_stage")
            titre = request.form.get("titre", "")
            contenu = request.form.get("contenu", "")
            
            filename = secure_filename(file.filename)
            public_id_name = f"stage_{id_stage}_{filename.rsplit('.', 1)[0]}"
            
            upload_result = cloudinary.uploader.upload(
                file,
                resource_type="auto",
                folder="rapports_stages",
                public_id=public_id_name
            )
            chemin_pour_bdd = upload_result.get('secure_url')
            
            if not chemin_pour_bdd:
                return jsonify({"success": False, "message": "Erreur lors de la génération du lien Cloudinary"}), 500
            
            # 4. Enregistrement de l'URL Cloudinary directement en Base de Données
            resultat = add_rapport(
                id_stage=int(id_stage),
                titre=titre,
                chemin_fichier=chemin_pour_bdd,
                contenu=contenu if contenu else None
            )
            return jsonify(resultat)
            
        except Exception as e:
            return jsonify({"success": False, "message": f"Erreur Cloudinary : {str(e)}"}), 500

    return jsonify({"success": False, "message": "Uniquement les fichiers pdf sont autorisé"}), 400

@api_bp.route("/rapport/voir/<int:id_stage>", methods=["GET"])
def voir_rapport(id_stage):
    return jsonify(get_rapport_by_stage(id_stage))


@api_bp.route("/rapport/statut", methods=["POST"])
def changer_statut_rapport():
    data = request.json
    return jsonify(update_status_rapport(data["id_stage"], data["status"]))


# =========================
# EVALUATION
# =========================
"""@api_bp.route("/evaluation/ajouter", methods=["POST"])
def evaluer():
    data = request.json
    return jsonify(add_or_update_evaluation(data["id_rapport"], data.get("note_superviseur"), data.get("note_rapporteur"), data.get("note_responsable"), data.get("commentaire_superviseur"), data.get("commentaire_rapporteur"), data.get("commentaire_responsable")))"""

@api_bp.route("/evaluation/responsable", methods=["POST"])
def evaluation_responsable():
    data = request.json
    id_rapport = data.get("id_rapport")
    ine = get_ine_by_rapport(id_rapport)
    return jsonify(evaluer_responsable(ine, data.get("note"), data.get("avis"),id_rapport=id_rapport))

@api_bp.route("/evaluation/superviseur", methods=["POST"])
def evaluation_superviseur():
    data = request.json
    id_rapport = data.get("id_rapport")
    ine = get_ine_by_rapport(id_rapport)
    return jsonify(evaluer_superviseur(ine, data.get("note"), data.get("avis"),id_rapport=id_rapport))

@api_bp.route("/evaluation/rapporteur", methods=["POST"])
def evaluation_rapporteur():
    data = request.json
    id_rapport = data.get("id_rapport")
    ine = get_ine_by_rapport(id_rapport)
    return jsonify(evaluer_rapporteur(ine, data.get("note"), data.get("avis"),id_rapport=id_rapport))



@api_bp.route("/evaluation/voir/<string:ine>", methods=["GET"])
def voir_evaluation(ine):
    return jsonify(get_evaluation_by_ine(ine))

@api_bp.route("/etudiant/evaluation/<string:ine>", methods=["GET"])
def eval_etudiant(ine):

    return jsonify(get_evaluations_etudiant(ine))

@api_bp.route("/superviseur/evaluation/<string:ine>", methods=["GET"])
def eval_superviseur(ine):

    valid =(get_evaluation_superviseur(ine))
    if valid:
        return jsonify(valid)
    else:
        return jsonify({"success":False,"message":"L'evalution à déjà été ajouté"})


@api_bp.route("/rapporteur/evaluation/<string:ine>", methods=["GET"])
def eval_rapporteur(ine):

    return jsonify(get_evaluation_rapporteur(ine))

@api_bp.route("/responsable/evaluation/<string:ine>", methods=["GET"])
def eval_responsable(ine):
    return jsonify(get_evaluation_responsable(ine))

@api_bp.route("/etudiants/modifier", methods=["POST"])
def modif_etudiant():
    data = request.json
    v = modifier_etudiant(data.get("id_responsable"),data.get("id_etudiant"),data.get("ine"),data.get("nom"),data.get("prenom"),data.get("mail"),data.get("filiere"),data.get("semestre"))
    if v:
        return jsonify({"success":True,"message":"Etudiant modifié avec succès"})
    else:
        return jsonify({"succes":True,"message":"Erreur lors de la modification"})

@api_bp.route("/superviseurs/modifier", methods=["POST"])
def modif_superviseur():
    data = request.json
    v =modifier_superviseur(data["id_responsable"],data["id_superviseur"],  data["nom"], data["prenom"], data["mail"] )
    if v:
        return jsonify({"success":True,"message":"Superviseur modifié avec succès"})
    else:
        return jsonify({"succes":True,"message":"Erreur lors de la modification"})

@api_bp.route("/rapporteurs/modifier", methods=["POST"])
def modif_rapporteur():
    data = request.json
    v =modifier_rapporteur(data["id_responsable"],data["id_rapporteur"],  data["nom"], data["prenom"], data["mail"] )
    if v:
        return jsonify({"success":True,"message":"Rapporteur modifié avec succès"})
    else:
        return jsonify({"succes":True,"message":"Erreur lors de la modification"})

@api_bp.route("/rapport/valider", methods=["POST"])
def valider_rapport_route():

    data = request.json

    return jsonify(
        valider_rapport(
            data["id_stage"]
        )
    )

@api_bp.route("/rapport/modifier", methods=["POST"])
def modif_rapport():

    data = request.json

    return jsonify(
        modifier_rapport(
            data["id_stage"],
            data["titre"],
            data["chemin_fichier"],
            data["contenu"]
        )
    )

@api_bp.route("/responsable/verifier/<int:id_responsable>", methods=["GET"])
def verifier_responsable_route(id_responsable):
    return jsonify(verifier_responsable(id_responsable))

@api_bp.route("/superviseur/stages/<int:id_superviseur>", methods=["GET"])
def stages_superviseur(id_superviseur):

    return jsonify(get_stages_superviseur(id_superviseur))

@api_bp.route("/rapporteur/stages/<int:id_rapporteur>", methods=["GET"])
def stages_rapporteur(id_rapporteur):

    return jsonify(get_stages_rapporteur(id_rapporteur))

@api_bp.route("/etudiant/stage/<int:id_etudiant>", methods=["GET"])
def stage_etudiant(id_etudiant):
    return jsonify(get_stage_etudiant(id_etudiant))


"""@api_bp.route('/etudiants/<int:id_pers>/by-id', methods=['GET'])
def get_etudiants_by_personnel(id_pers):
    try:
        from bdsql import Session
        session = Session()
        stages = session.query(Stage).filter((Stage.id_superviseur == id_pers) | (Stage.id_rapporteur == id_pers)).all()
        liste_etudiants = []
        for st in stages:
            etudiant = session.query(Etudiant).filter_by(id_etudiant=st.id_etudiant).first()
            if etudiant:
                liste_etudiants.append({
                    "id_etudiant": etudiant.id_etudiant,
                    "ine": etudiant.ine,  
                    "nom": etudiant.nom,
                    "prenom": etudiant.prenom
                })
        return jsonify(liste_etudiants), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400"""

@api_bp.route('/etudiants/<int:id_etudiant>/by-id', methods=['GET'])
def get_etudiant_by_id(id_etudiant):
    try:
        from bdsql import Session
        session = Session()

        etudiant = session.query(Etudiant).filter_by(id_etudiant=id_etudiant).first()

        if not etudiant:
            return jsonify([]), 200

        return jsonify({
            "id_etudiant": etudiant.id_etudiant,
            "ine": etudiant.ine,
            "nom": etudiant.nom,
            "prenom": etudiant.prenom
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_mysqldb import MySQL
from dotenv import load_dotenv
import os
import jwt
import datetime
from flask_mail import Mail, Message as MailMessage
import random
import string
import os
from werkzeug.utils import secure_filename


load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration MySQL
app.config['MYSQL_HOST']     = os.getenv('MYSQL_HOST')
app.config['MYSQL_USER']     = os.getenv('MYSQL_USER')
app.config['MYSQL_PASSWORD'] = os.getenv('MYSQL_PASSWORD')
app.config['MYSQL_DB']       = os.getenv('MYSQL_DB')
app.config['SECRET_KEY']     = os.getenv('SECRET_KEY')

mysql = MySQL(app)
# Config mail
app.config['MAIL_SERVER']         = 'smtp.gmail.com'
app.config['MAIL_PORT']           = 587
app.config['MAIL_USE_TLS']        = True
app.config['MAIL_USERNAME']       = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD']       = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')

mail = Mail(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = { 'png', 'jpg', 'jpeg'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 1000 * 1024 * 1024  # 100MB# Créer le dossier uploads s'il n'existe pas
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'documents'), exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

verification_codes = {}

def generate_code():
    return ''.join(random.choices(string.digits, k=6))
# ============================================================
# TEST CONNEXION BDD
# ============================================================

@app.route('/api/test')
def test():
    try:
        cur = mysql.connection.cursor()
        cur.execute('SELECT 1')
        return jsonify({'status': 'success', 'message': 'BDD connectée avec succès !'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

# ============================================================
# LOGIN UNIFIE (Admin + Pharmacie)
# ============================================================

@app.route('/api/login', methods=['POST'])
def login():
    data         = request.get_json()
    email        = data.get('email')
    mot_de_passe = data.get('mot_de_passe')

    try:
        cur = mysql.connection.cursor()

        # Vérifier dans administrateurs
        cur.execute("""
            SELECT admin_id, nom, email, mot_de_passe_hash, role
            FROM administrateurs
            WHERE email = %s
        """, (email,))
        admin = cur.fetchone()

        if admin and admin[3] == mot_de_passe:
            token = jwt.encode({
                'id':   admin[0],
                'role': 'admin',
                'exp':  datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }, os.getenv('SECRET_KEY'), algorithm='HS256')

            return jsonify({
                'token':    token,
                'role':     'admin',
                'nom':      admin[1],
                'email':    admin[2],
                'redirect': '/admin/dashboard'
            })

        # Vérifier dans pharmacies
        cur.execute("""
            SELECT pharmacie_id, nom, email, mot_de_passe_hash, statut
            FROM pharmacies
            WHERE email = %s
        """, (email,))
        pharmacie = cur.fetchone()

        if pharmacie and pharmacie[3] == mot_de_passe:

            # Suspendue → 403
            if pharmacie[4] == 'suspendue':
                return jsonify({
                    'message': 'Votre compte a été suspendu. Contactez l\'administration.',
                    'statut':  'suspendue'
                }), 403

            # En attente → token + redirect dashboard cadenassé
            if pharmacie[4] == 'en_attente':
                token = jwt.encode({
                    'id':   pharmacie[0],
                    'role': 'pharmacie',
                    'exp':  datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                }, os.getenv('SECRET_KEY'), algorithm='HS256')
                return jsonify({
                    'token':    token,
                    'role':     'pharmacie',
                    'nom':      pharmacie[1],
                    'email':    pharmacie[2],
                    'statut':   'en_attente',
                    'redirect': '/pharmacie/dashboard'
                })

            # Approuvée → accès normal
            token = jwt.encode({
                'id':   pharmacie[0],
                'role': 'pharmacie',
                'exp':  datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }, os.getenv('SECRET_KEY'), algorithm='HS256')
            return jsonify({
                'token':    token,
                'role':     'pharmacie',
                'nom':      pharmacie[1],
                'email':    pharmacie[2],
                'statut':   'approuvee',
                'redirect': '/pharmacie/dashboard'
            })

        return jsonify({'message': 'Email ou mot de passe incorrect'}), 401

    except Exception as e:
        return jsonify({'message': str(e)}), 500

def send_code_email(to_email, code, subject):
    try:
        msg = MailMessage(
            subject=subject,
            recipients=[to_email],
            html=f"""
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
                <div style="background: #008339; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">Dwak Hna</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #1f2937;">Votre code de vérification</h2>
                    <p style="color: #6b7280;">Utilisez ce code pour confirmer votre action :</p>
                    <div style="background: #008339; color: white; font-size: 32px; font-weight: bold;
                                text-align: center; padding: 20px; border-radius: 10px; letter-spacing: 8px;">
                        {code}
                    </div>
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                        Ce code expire dans 10 minutes. Ne le partagez pas.
                    </p>
                </div>
            </div>
            """
        )
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False

# ============================================================
# PROFIL ADMIN
# ============================================================

@app.route('/api/admin/profil', methods=['GET'])
def get_admin_profil():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        data  = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        admin_id = data['id']

        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT admin_id, nom, email, role, cree_le
            FROM administrateurs WHERE admin_id = %s
        """, (admin_id,))
        r = cur.fetchone()
        if not r:
            return jsonify({'message': 'Admin introuvable'}), 404

        return jsonify({
            'admin': {
                'admin_id': r[0],
                'nom':      r[1],
                'email':    r[2],
                'role':     r[3],
                'date':     str(r[4])[:10] if r[4] else '',
            }
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/profil/nom', methods=['PUT'])
def update_admin_nom():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        data  = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        admin_id = data['id']
        nom = request.get_json().get('nom')
        if not nom:
            return jsonify({'message': 'Nom obligatoire'}), 400
        cur = mysql.connection.cursor()
        cur.execute("UPDATE administrateurs SET nom = %s WHERE admin_id = %s", (nom, admin_id))
        mysql.connection.commit()
        localStorage_nom = nom
        return jsonify({'message': 'Nom mis à jour', 'nom': nom})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


# Envoyer code verification email
@app.route('/api/admin/profil/send-email-code', methods=['POST'])
def send_email_code():
    try:
        token    = request.headers.get('Authorization', '').replace('Bearer ', '')
        data     = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        admin_id = data['id']
        new_email = request.get_json().get('email')

        if not new_email:
            return jsonify({'message': 'Email obligatoire'}), 400

        # Vérifier si email déjà utilisé
        cur = mysql.connection.cursor()
        cur.execute("SELECT admin_id FROM administrateurs WHERE email = %s", (new_email,))
        if cur.fetchone():
            return jsonify({'message': 'Cet email est déjà utilisé'}), 400

        code = generate_code()
        verification_codes[f'email_{admin_id}'] = {
            'code':      code,
            'new_email': new_email,
            'expires':   datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
        }

        sent = send_code_email(new_email, code, 'Dwak Hna — Vérification de votre nouvel email')
        if not sent:
            return jsonify({'message': 'Erreur envoi email'}), 500

        return jsonify({'message': f'Code envoyé à {new_email}'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


# Confirmer changement email
@app.route('/api/admin/profil/verify-email', methods=['POST'])
def verify_email_code():
    try:
        token    = request.headers.get('Authorization', '').replace('Bearer ', '')
        data     = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        admin_id = data['id']
        code     = request.get_json().get('code')

        stored = verification_codes.get(f'email_{admin_id}')
        if not stored:
            return jsonify({'message': 'Aucun code en attente'}), 400
        if datetime.datetime.utcnow() > stored['expires']:
            del verification_codes[f'email_{admin_id}']
            return jsonify({'message': 'Code expiré'}), 400
        if stored['code'] != code:
            return jsonify({'message': 'Code incorrect'}), 400

        cur = mysql.connection.cursor()
        cur.execute("UPDATE administrateurs SET email = %s WHERE admin_id = %s",
                    (stored['new_email'], admin_id))
        mysql.connection.commit()
        del verification_codes[f'email_{admin_id}']

        return jsonify({'message': 'Email mis à jour avec succès', 'email': stored['new_email']})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


# Envoyer code verification mot de passe
@app.route('/api/admin/profil/send-password-code', methods=['POST'])
def send_password_code():
    try:
        token    = request.headers.get('Authorization', '').replace('Bearer ', '')
        data     = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        admin_id = data['id']

        cur = mysql.connection.cursor()
        cur.execute("SELECT email FROM administrateurs WHERE admin_id = %s", (admin_id,))
        admin = cur.fetchone()
        if not admin:
            return jsonify({'message': 'Admin introuvable'}), 404

        code = generate_code()
        verification_codes[f'password_{admin_id}'] = {
            'code':    code,
            'expires': datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
        }

        sent = send_code_email(admin[0], code, 'Dwak Hna — Vérification changement mot de passe')
        if not sent:
            return jsonify({'message': 'Erreur envoi email'}), 500

        return jsonify({'message': f'Code envoyé à {admin[0]}'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


# Confirmer changement mot de passe
@app.route('/api/admin/profil/verify-password', methods=['POST'])
def verify_password_code():
    try:
        token    = request.headers.get('Authorization', '').replace('Bearer ', '')
        data     = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        admin_id = data['id']
        body     = request.get_json()
        code     = body.get('code')
        new_pass = body.get('new_password')

        if not new_pass or len(new_pass) < 6:
            return jsonify({'message': 'Mot de passe trop court (min 6 caractères)'}), 400

        stored = verification_codes.get(f'password_{admin_id}')
        if not stored:
            return jsonify({'message': 'Aucun code en attente'}), 400
        if datetime.datetime.utcnow() > stored['expires']:
            del verification_codes[f'password_{admin_id}']
            return jsonify({'message': 'Code expiré'}), 400
        if stored['code'] != code:
            return jsonify({'message': 'Code incorrect'}), 400

        cur = mysql.connection.cursor()
        cur.execute("UPDATE administrateurs SET mot_de_passe_hash = %s WHERE admin_id = %s",
                    (new_pass, admin_id))
        mysql.connection.commit()
        del verification_codes[f'password_{admin_id}']

        return jsonify({'message': 'Mot de passe mis à jour avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


# ============================================================
# MOT DE PASSE OUBLIE (Login)
# ============================================================

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    try:
        email = request.get_json().get('email')
        if not email:
            return jsonify({'message': 'Email obligatoire'}), 400

        cur = mysql.connection.cursor()

        # Chercher dans admins
        cur.execute("SELECT admin_id, nom FROM administrateurs WHERE email = %s", (email,))
        admin = cur.fetchone()

        # Chercher dans pharmacies
        cur.execute("SELECT pharmacie_id, nom FROM pharmacies WHERE email = %s", (email,))
        pharmacie = cur.fetchone()

        if not admin and not pharmacie:
            return jsonify({'message': 'Email introuvable'}), 404

        code = generate_code()
        verification_codes[f'forgot_{email}'] = {
            'code':    code,
            'email':   email,
            'role':    'admin' if admin else 'pharmacie',
            'user_id': admin[0] if admin else pharmacie[0],
            'expires': datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
        }

        sent = send_code_email(email, code, 'Dwak Hna — Réinitialisation mot de passe')
        if not sent:
            return jsonify({'message': 'Erreur envoi email'}), 500

        return jsonify({'message': f'Code envoyé à {email}'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    try:
        body     = request.get_json()
        email    = body.get('email')
        code     = body.get('code')
        new_pass = body.get('new_password')

        if not new_pass or len(new_pass) < 6:
            return jsonify({'message': 'Mot de passe trop court (min 6 caractères)'}), 400

        stored = verification_codes.get(f'forgot_{email}')
        if not stored:
            return jsonify({'message': 'Aucun code en attente'}), 400
        if datetime.datetime.utcnow() > stored['expires']:
            del verification_codes[f'forgot_{email}']
            return jsonify({'message': 'Code expiré'}), 400
        if stored['code'] != code:
            return jsonify({'message': 'Code incorrect'}), 400

        cur = mysql.connection.cursor()
        if stored['role'] == 'admin':
            cur.execute("UPDATE administrateurs SET mot_de_passe_hash = %s WHERE admin_id = %s",
                        (new_pass, stored['user_id']))
        else:
            cur.execute("UPDATE pharmacies SET mot_de_passe_hash = %s WHERE pharmacie_id = %s",
                        (new_pass, stored['user_id']))

        mysql.connection.commit()
        del verification_codes[f'forgot_{email}']

        return jsonify({'message': 'Mot de passe réinitialisé avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
# ============================================================
# DASHBOARD STATS
# ============================================================

@app.route('/api/admin/stats')
def admin_stats():
    try:
        cur = mysql.connection.cursor()

        # Stats principales
        cur.execute("SELECT COUNT(*) FROM patients WHERE statut = 'actif'")
        patients = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM pharmacies WHERE statut = 'approuvee'")
        pharmacies = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM pharmacies WHERE statut = 'en_attente'")
        pharmacies_en_attente = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM demandes")
        demandes = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM demandes WHERE etat = 'en_attente'")
        demandes_en_attente = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM medicaments WHERE est_actif = 1")
        medicaments = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM patients WHERE statut = 'suspendu'")
        patients_suspendus = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM admin_produits WHERE est_actif = 1")
        produits = int(cur.fetchone()[0])

        # Demandes par mois (6 derniers mois)
        cur.execute("""
            SELECT DATE_FORMAT(cree_le, '%b %Y') as mois,
                   COUNT(*) as total
            FROM demandes
            WHERE cree_le >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(cree_le, '%Y-%m'), DATE_FORMAT(cree_le, '%b %Y')
            ORDER BY MIN(cree_le) ASC
        """)
        demandes_chart = [{'mois': r[0], 'total': r[1]} for r in cur.fetchall()]

        # Statut pharmacies
        cur.execute("""
            SELECT statut, COUNT(*) as total
            FROM pharmacies
            GROUP BY statut
        """)
        pharmacies_chart = [{'name': r[0], 'value': int(r[1])} for r in cur.fetchall()]

        # Demandes par type
        cur.execute("""
            SELECT type, COUNT(*) as total
            FROM demandes
            GROUP BY type
        """)
        demandes_type_chart = [{'name': r[0], 'value': int(r[1])} for r in cur.fetchall()]

        # Patients inscrits par mois
        cur.execute("""
            SELECT DATE_FORMAT(cree_le, '%b %Y') as mois,
                   COUNT(*) as total
            FROM patients
            WHERE cree_le >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(cree_le, '%Y-%m'), DATE_FORMAT(cree_le, '%b %Y')
            ORDER BY MIN(cree_le) ASC
        """)
        patients_chart = [{'mois': r[0], 'total': r[1]} for r in cur.fetchall()]

        # Dernières demandes
        cur.execute("""
            SELECT d.demande_id,
                   CONCAT(p.prenom, ' ', p.nom) as patient,
                   d.type, d.etat,
                   DATE_FORMAT(d.cree_le, '%d/%m/%Y') as date
            FROM demandes d
            JOIN patients p ON d.patient_id = p.patient_id
            ORDER BY d.cree_le DESC
            LIMIT 8
        """)
        rows = cur.fetchall()
        demandes_recentes = [{
            'demande_id': r[0],
            'patient':    r[1],
            'type':       r[2],
            'etat':       r[3],
            'date':       r[4],
        } for r in rows]

        # Dernières pharmacies en attente
        cur.execute("""
            SELECT pharmacie_id, nom, email, cree_le
            FROM pharmacies
            WHERE statut = 'en_attente'
            ORDER BY cree_le DESC
            LIMIT 5
        """)
        rows = cur.fetchall()
        pharmacies_attente = [{
            'pharmacie_id': r[0],
            'nom':          r[1],
            'email':        r[2],
            'date':         str(r[3])[:10] if r[3] else '',
        } for r in rows]

        return jsonify({
            'stats': {
                'patients':              patients,
                'patients_suspendus':    patients_suspendus,
                'pharmacies':            pharmacies,
                'pharmacies_en_attente': pharmacies_en_attente,
                'demandes':              demandes,
                'demandes_en_attente':   demandes_en_attente,
                'medicaments':           medicaments,
                'produits':              produits,
                'demandes_recentes':     demandes_recentes,
                'pharmacies_attente':    pharmacies_attente,
            },
            'demandes_chart':      demandes_chart,
            'pharmacies_chart':    pharmacies_chart,
            'demandes_type_chart': demandes_type_chart,
            'patients_chart':      patients_chart,
        })

    except Exception as e:
        return jsonify({'message': str(e)}), 500
# ============================================================
# PATIENTS
# ============================================================
@app.route('/api/admin/patients', methods=['GET'])
def get_patients():
    try:
        page   = int(request.args.get('page', 1))
        search = request.args.get('search', '')
        limit  = 10
        offset = (page - 1) * limit

        cur = mysql.connection.cursor()

        search_param = f'%{search}%'

        # Total pour pagination
        cur.execute("""
            SELECT COUNT(*) FROM patients
            WHERE (nom LIKE %s OR prenom LIKE %s OR email LIKE %s)
            AND statut != 'supprime'
        """, (search_param, search_param, search_param))
        total = int(cur.fetchone()[0])

        # Liste patients
        query = """
            SELECT patient_id, nom, prenom, email, telephone,
                   statut, cree_le
            FROM patients
            WHERE (nom LIKE %s OR prenom LIKE %s OR email LIKE %s)
            AND statut != 'supprime'
            ORDER BY cree_le DESC
            LIMIT {limit} OFFSET {offset}
        """.format(limit=limit, offset=offset)

        cur.execute(query, (search_param, search_param, search_param))
        rows = cur.fetchall()

        patients = [{
            'patient_id': r[0],
            'nom':        r[1],
            'prenom':     r[2],
            'email':      r[3],
            'telephone':  r[4] or '',
            'statut':     r[5],
            'date':       str(r[6])[:10] if r[6] else '',
        } for r in rows]

        # Stats
        cur.execute("SELECT COUNT(*) FROM patients WHERE statut = 'actif'")
        actifs = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM patients WHERE statut = 'suspendu'")
        suspendus = int(cur.fetchone()[0])

        return jsonify({
            'patients': patients,
            'total':    total,
            'pages':    (total + limit - 1) // limit,
            'stats': {
                'total':     total,
                'actifs':    actifs,
                'suspendus': suspendus,
            }
        })

    except Exception as e:
        return jsonify({'message': str(e)}), 500
    
@app.route('/api/admin/patients/<int:patient_id>/suspendre', methods=['PUT'])
def suspendre_patient(patient_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT statut FROM patients WHERE patient_id = %s", (patient_id,))
        patient = cur.fetchone()
        if not patient:
            return jsonify({'message': 'Patient introuvable'}), 404
        
        nouveau_statut = 'suspendu' if patient[0] == 'actif' else 'actif'
        cur.execute("""
            UPDATE patients SET statut = %s
            WHERE patient_id = %s
        """, (nouveau_statut, patient_id))
        mysql.connection.commit()
        return jsonify({'message': f'Patient {nouveau_statut} avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/patients/<int:patient_id>', methods=['DELETE'])
def supprimer_patient(patient_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT patient_id FROM patients WHERE patient_id = %s", (patient_id,))
        if not cur.fetchone():
            return jsonify({'message': 'Patient introuvable'}), 404
        cur.execute("""
            UPDATE patients SET statut = 'supprime'
            WHERE patient_id = %s
        """, (patient_id,))
        mysql.connection.commit()
        return jsonify({'message': 'Patient supprimé avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    # ============================================================
# DEMANDES
# ============================================================


@app.route('/api/admin/demandes', methods=['GET'])
def get_demandes():
    try:
        page   = int(request.args.get('page', 1))
        search = request.args.get('search', '')
        filtre = request.args.get('filtre', 'tous')
        limit  = 10
        offset = (page - 1) * limit

        cur = mysql.connection.cursor()
        search_param = f'%{search}%'

        if filtre == 'en_attente':
            filtre_sql = "AND d.etat = 'en_attente'"
        elif filtre == 'reponse_recue':
            filtre_sql = "AND d.etat = 'reponse_recue'"
        elif filtre == 'termine':
            filtre_sql = "AND d.etat = 'termine'"
        elif filtre == 'annule':
            filtre_sql = "AND d.etat = 'annule'"
        else:
            filtre_sql = ''

        cur.execute(f"""
            SELECT COUNT(*) FROM demandes d
            JOIN patients p ON d.patient_id = p.patient_id
            WHERE (p.nom LIKE %s OR p.prenom LIKE %s OR p.email LIKE %s)
            {filtre_sql}
        """, (search_param, search_param, search_param))
        total = int(cur.fetchone()[0])

        query = f"""
            SELECT d.demande_id,
                   CONCAT(p.prenom, ' ', p.nom) as patient,
                   p.telephone as patient_tel,
                   d.type, d.etat, d.rayon_km,
                   d.note_pharmacie, d.commentaire,
                   d.message_patient,
                   ph.nom as pharmacie_choisie,
                   d.cree_le
            FROM demandes d
            JOIN patients p ON d.patient_id = p.patient_id
            LEFT JOIN pharmacies ph ON d.pharmacie_choisie_id = ph.pharmacie_id
            WHERE (p.nom LIKE %s OR p.prenom LIKE %s OR p.email LIKE %s)
            {filtre_sql}
            ORDER BY d.cree_le DESC
            LIMIT {limit} OFFSET {offset}
        """

        cur.execute(query, (search_param, search_param, search_param))
        rows = cur.fetchall()

        demandes = [{
            'demande_id':        r[0],
            'patient':           r[1],
            'patient_tel':       r[2] or '',
            'type':              r[3],
            'etat':              r[4],
            'rayon_km':          r[5],
            'note_pharmacie':    r[6],
            'commentaire':       r[7] or '',
            'message_patient':   r[8] or '',
            'pharmacie_choisie': r[9] or '',
            'date':              str(r[10])[:16] if r[10] else '',
        } for r in rows]

        cur.execute("SELECT COUNT(*) FROM demandes")
        total_tous = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM demandes WHERE etat = 'en_attente'")
        en_attente = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM demandes WHERE etat = 'reponse_recue'")
        reponse_recue = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM demandes WHERE etat = 'termine'")
        termine = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM demandes WHERE etat = 'annule'")
        annule = int(cur.fetchone()[0])

        return jsonify({
            'demandes': demandes,
            'total':    total,
            'pages':    (total + limit - 1) // limit,
            'stats': {
                'total':         total_tous,
                'en_attente':    en_attente,
                'reponse_recue': reponse_recue,
                'termine':       termine,
                'annule':        annule,
            }
        })

    except Exception as e:
        return jsonify({'message': str(e)}), 500
    
@app.route('/api/admin/demandes/<int:demande_id>', methods=['GET'])
def get_demande_detail(demande_id):
    try:
        cur = mysql.connection.cursor()

        cur.execute("""
            SELECT d.demande_id, CONCAT(p.prenom, ' ', p.nom) as patient,
                   p.email, p.telephone, d.type, d.etat,
                   d.rayon_km, d.note_pharmacie, d.commentaire,
                   d.message_patient, d.latitude, d.longitude,
                   ph.nom as pharmacie_choisie,
                   d.cree_le
            FROM demandes d
            JOIN patients p ON d.patient_id = p.patient_id
            LEFT JOIN pharmacies ph ON d.pharmacie_choisie_id = ph.pharmacie_id
            WHERE d.demande_id = %s
        """, (demande_id,))
        r = cur.fetchone()
        if not r:
            return jsonify({'message': 'Demande introuvable'}), 404

        demande = {
            'demande_id':        r[0],
            'patient':           r[1],
            'patient_email':     r[2],
            'patient_tel':       r[3] or '',
            'type':              r[4],
            'etat':              r[5],
            'rayon_km':          r[6],
            'note_pharmacie':    r[7],
            'commentaire':       r[8] or '',
            'message_patient':   r[9] or '',
            'latitude':          float(r[10]) if r[10] else None,
            'longitude':         float(r[11]) if r[11] else None,
            'pharmacie_choisie': r[12] or '',
            'date':              str(r[13])[:16] if r[13] else '',
        }

        # Medicaments
        cur.execute("""
            SELECT dm.nom_libre, m.nom, dm.quantite
            FROM demande_medicaments dm
            LEFT JOIN medicaments m ON dm.medicament_id = m.medicament_id
            WHERE dm.demande_id = %s
        """, (demande_id,))
        medicaments = [{
            'nom':      r[1] or r[0] or 'Inconnu',
            'quantite': r[2],
        } for r in cur.fetchall()]

        # Ordonnances
        cur.execute("""
            SELECT url FROM demande_ordonnances
            WHERE demande_id = %s
        """, (demande_id,))
        ordonnances = [r[0] for r in cur.fetchall()]

        # Reponses pharmacies
        cur.execute("""
            SELECT ph.nom, dp.statut, dp.message, dp.repondu_le
            FROM demande_pharmacies dp
            JOIN pharmacies ph ON dp.pharmacie_id = ph.pharmacie_id
            WHERE dp.demande_id = %s
            ORDER BY dp.cree_le DESC
        """, (demande_id,))
        reponses = [{
            'pharmacie': r[0],
            'statut':    r[1],
            'message':   r[2] or '',
            'date':      str(r[3])[:16] if r[3] else '',
        } for r in cur.fetchall()]

        return jsonify({
            'demande':    demande,
            'medicaments': medicaments,
            'ordonnances': ordonnances,
            'reponses':    reponses,
        })

    except Exception as e:
        return jsonify({'message': str(e)}), 500
    

    # ============================================================
# PHARMACIES
# ============================================================

@app.route('/api/admin/pharmacies', methods=['GET'])
def get_pharmacies():
    try:
        page   = int(request.args.get('page', 1))
        search = request.args.get('search', '')
        limit  = 10
        offset = (page - 1) * limit

        cur = mysql.connection.cursor()
        search_param = f'%{search}%'

        cur.execute("""
            SELECT COUNT(*) FROM pharmacies
            WHERE (nom LIKE %s OR email LIKE %s)
            AND statut != 'supprimee'
        """, (search_param, search_param))
        total = int(cur.fetchone()[0])

        query = """
    SELECT p.pharmacie_id, p.nom, p.email, p.telephone,
           p.statut, p.est_ouverte, p.est_de_garde,
           w.nom as wilaya, p.cree_le
    FROM pharmacies p
    LEFT JOIN wilayas w ON p.wilaya_id = w.wilaya_id
    WHERE (p.nom LIKE %s OR p.email LIKE %s)
    AND p.statut != 'supprimee'
    ORDER BY
        CASE p.statut
            WHEN 'en_attente' THEN 1
            WHEN 'approuvee'  THEN 2
            WHEN 'suspendue'  THEN 3
            ELSE 4
        END ASC,
        p.cree_le DESC
    LIMIT {limit} OFFSET {offset}
""".format(limit=limit, offset=offset)

        cur.execute(query, (search_param, search_param))
        rows = cur.fetchall()

        pharmacies = [{
            'pharmacie_id': r[0],
            'nom':          r[1],
            'email':        r[2],
            'telephone':    r[3] or '',
            'statut':       r[4],
            'est_ouverte':  r[5],
            'est_de_garde': r[6],
            'wilaya':       r[7] or '',
            'date':         str(r[8])[:10] if r[8] else '',
        } for r in rows]

        cur.execute("SELECT COUNT(*) FROM pharmacies WHERE statut = 'approuvee'")
        approuvees = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM pharmacies WHERE statut = 'en_attente'")
        en_attente = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM pharmacies WHERE statut = 'suspendue'")
        suspendues = int(cur.fetchone()[0])

        return jsonify({
            'pharmacies': pharmacies,
            'total':      total,
            'pages':      (total + limit - 1) // limit,
            'stats': {
                'total':      total,
                'approuvees': approuvees,
                'en_attente': en_attente,
                'suspendues': suspendues,
            }
        })

    except Exception as e:
        return jsonify({'message': str(e)}), 500
@app.route('/api/admin/pharmacies/<int:pharmacie_id>', methods=['GET'])
def get_pharmacie_detail(pharmacie_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT p.pharmacie_id, p.nom, p.email, p.telephone, p.adresse,
                   p.statut, p.est_ouverte, p.est_de_garde,
                   p.latitude, p.longitude,
                   p.logo_url, p.registre_commerce, p.carte_identite,
                   p.horaires, p.cree_le,
                   w.nom as wilaya, c.nom as commune
            FROM pharmacies p
            LEFT JOIN wilayas w  ON p.wilaya_id  = w.wilaya_id
            LEFT JOIN communes c ON p.commune_id = c.commune_id
            WHERE p.pharmacie_id = %s
        """, (pharmacie_id,))
        r = cur.fetchone()
        if not r:
            return jsonify({'message': 'Pharmacie introuvable'}), 404

        return jsonify({'pharmacie': {
            'pharmacie_id':      r[0],
            'nom':               r[1],
            'email':             r[2],
            'telephone':         r[3] or '',
            'adresse':           r[4] or '',
            'statut':            r[5],
            'est_ouverte':       bool(r[6]),
            'est_de_garde':      bool(r[7]),
            'latitude':          float(r[8]) if r[8] else None,
            'longitude':         float(r[9]) if r[9] else None,
            'logo_url':          r[10] or '',
            'registre_commerce': r[11] or '',
            'carte_identite':    r[12] or '',
            'horaires':          r[13] or '',
            'date':              str(r[14])[:10] if r[14] else '',
            'wilaya':            r[15] or '',
            'commune':           r[16] or '',
        }})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/admin/pharmacies/<int:pharmacie_id>/approuver', methods=['PUT'])
def approuver_pharmacie(pharmacie_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE pharmacies SET statut = 'approuvee'
            WHERE pharmacie_id = %s
        """, (pharmacie_id,))
        mysql.connection.commit()
        return jsonify({'message': 'Pharmacie approuvée avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/pharmacies/<int:pharmacie_id>/suspendre', methods=['PUT'])
def suspendre_pharmacie(pharmacie_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE pharmacies
            SET statut = CASE
                WHEN statut = 'approuvee' THEN 'suspendue'
                WHEN statut = 'suspendue' THEN 'approuvee'
                ELSE statut
            END
            WHERE pharmacie_id = %s
        """, (pharmacie_id,))
        mysql.connection.commit()
        return jsonify({'message': 'Statut mis à jour avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/pharmacies/<int:pharmacie_id>', methods=['DELETE'])
def supprimer_pharmacie(pharmacie_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE pharmacies SET statut = 'supprimee'
            WHERE pharmacie_id = %s
        """, (pharmacie_id,))
        mysql.connection.commit()
        return jsonify({'message': 'Pharmacie supprimée avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


# ============================================================
# MEDICAMENTS
# ============================================================
# ============================================================
# MEDICAMENTS
# ============================================================

@app.route('/api/admin/medicaments', methods=['GET'])
def get_medicaments():
    try:
        page   = int(request.args.get('page', 1))
        search = request.args.get('search', '')
        filtre = request.args.get('filtre', 'tous')  # tous / actif / inactif
        limit  = 10
        offset = (page - 1) * limit

        cur = mysql.connection.cursor()
        search_param = f'%{search}%'

        # Condition filtre
        if filtre == 'actif':
            filtre_sql = 'AND est_actif = 1'
        elif filtre == 'inactif':
            filtre_sql = 'AND est_actif = 0'
        else:
            filtre_sql = ''

        cur.execute(f"""
            SELECT COUNT(*) FROM medicaments
            WHERE (nom LIKE %s OR denomination_commune LIKE %s)
            {filtre_sql}
        """, (search_param, search_param))
        total = int(cur.fetchone()[0])

        query = f"""
            SELECT medicament_id, nom, denomination_commune,
                   forme, dosage, fabricant,
                   necessite_ordonnance, est_actif, cree_le
            FROM medicaments
            WHERE (nom LIKE %s OR denomination_commune LIKE %s)
            {filtre_sql}
            ORDER BY cree_le DESC
            LIMIT {limit} OFFSET {offset}
        """

        cur.execute(query, (search_param, search_param))
        rows = cur.fetchall()

        medicaments = [{
            'medicament_id':        r[0],
            'nom':                  r[1],
            'denomination_commune': r[2] or '',
            'forme':                r[3] or '',
            'dosage':               r[4] or '',
            'fabricant':            r[5] or '',
            'necessite_ordonnance': bool(r[6]),
            'est_actif':            bool(r[7]),
            'date':                 str(r[8])[:10] if r[8] else '',
        } for r in rows]

        cur.execute("SELECT COUNT(*) FROM medicaments")
        total_tous = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM medicaments WHERE est_actif = 1")
        actifs = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM medicaments WHERE necessite_ordonnance = 1")
        avec_ordonnance = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM medicaments WHERE necessite_ordonnance = 0")
        sans_ordonnance = int(cur.fetchone()[0])

        return jsonify({
            'medicaments': medicaments,
            'total':       total,
            'pages':       (total + limit - 1) // limit,
            'stats': {
                'total':           total_tous,
                'actifs':          actifs,
                'avec_ordonnance': avec_ordonnance,
                'sans_ordonnance': sans_ordonnance,
            }
        })

    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/medicaments', methods=['POST'])
def create_medicament():
    try:
        data = request.get_json()
        cur  = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO medicaments
            (nom, denomination_commune, forme, dosage, fabricant, necessite_ordonnance, description)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get('nom'),
            data.get('denomination_commune', ''),
            data.get('forme', ''),
            data.get('dosage', ''),
            data.get('fabricant', ''),
            data.get('necessite_ordonnance', False),
            data.get('description', ''),
        ))
        mysql.connection.commit()
        return jsonify({'message': 'Médicament créé avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/medicaments/<int:medicament_id>', methods=['PUT'])
def update_medicament(medicament_id):
    try:
        data = request.get_json()
        cur  = mysql.connection.cursor()
        cur.execute("""
            UPDATE medicaments
            SET nom = %s, denomination_commune = %s, forme = %s,
                dosage = %s, fabricant = %s, necessite_ordonnance = %s,
                description = %s
            WHERE medicament_id = %s
        """, (
            data.get('nom'),
            data.get('denomination_commune', ''),
            data.get('forme', ''),
            data.get('dosage', ''),
            data.get('fabricant', ''),
            data.get('necessite_ordonnance', False),
            data.get('description', ''),
            medicament_id,
        ))
        mysql.connection.commit()
        return jsonify({'message': 'Médicament mis à jour avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/medicaments/<int:medicament_id>/toggle', methods=['PUT'])
def toggle_medicament(medicament_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE medicaments
            SET est_actif = CASE WHEN est_actif = 1 THEN 0 ELSE 1 END
            WHERE medicament_id = %s
        """, (medicament_id,))
        mysql.connection.commit()
        return jsonify({'message': 'Statut mis à jour avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/medicaments/<int:medicament_id>', methods=['DELETE'])
def supprimer_medicament(medicament_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            DELETE FROM medicaments
            WHERE medicament_id = %s
        """, (medicament_id,))
        mysql.connection.commit()
        return jsonify({'message': 'Médicament supprimé avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

# ============================================================
# PRODUITS ADMIN
# ============================================================
# ============================================================
# PRODUITS ADMIN
# ============================================================

@app.route('/api/admin/produits', methods=['GET'])
def get_produits():
    try:
        page   = int(request.args.get('page', 1))
        search = request.args.get('search', '')
        filtre = request.args.get('filtre', 'tous')
        limit  = 10
        offset = (page - 1) * limit

        cur = mysql.connection.cursor()
        search_param = f'%{search}%'

        if filtre == 'medicament':
            filtre_sql = "AND type_produit = 'medicament'"
        elif filtre == 'parapharmacie':
            filtre_sql = "AND type_produit = 'parapharmacie'"
        else:
            filtre_sql = ''

        cur.execute(f"""
            SELECT COUNT(*) FROM admin_produits
            WHERE nom LIKE %s {filtre_sql}
        """, (search_param,))
        total = int(cur.fetchone()[0])

        query = f"""
            SELECT ap.admin_produit_id, ap.nom, ap.description,
                   ap.type_produit, ap.est_actif, ap.cree_le,
                   GROUP_CONCAT(c.nom SEPARATOR ', ') as categories
            FROM admin_produits ap
            LEFT JOIN produit_categories pc ON ap.admin_produit_id = pc.admin_produit_id
            LEFT JOIN categories c ON pc.categorie_id = c.categorie_id
            WHERE ap.nom LIKE %s {filtre_sql}
            GROUP BY ap.admin_produit_id
            ORDER BY ap.cree_le DESC
            LIMIT {limit} OFFSET {offset}
        """

        cur.execute(query, (search_param,))
        rows = cur.fetchall()

        produits = [{
            'admin_produit_id': r[0],
            'nom':              r[1],
            'description':      r[2] or '',
            'type_produit':     r[3],
            'est_actif':        bool(r[4]),
            'date':             str(r[5])[:10] if r[5] else '',
            'categories':       r[6] or '—',
        } for r in rows]

        cur.execute("SELECT COUNT(*) FROM admin_produits")
        total_tous = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM admin_produits WHERE type_produit = 'medicament'")
        medicaments = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM admin_produits WHERE type_produit = 'parapharmacie'")
        parapharmacie = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM admin_produits WHERE est_actif = 1")
        actifs = int(cur.fetchone()[0])

        return jsonify({
            'produits': produits,
            'total':    total,
            'pages':    (total + limit - 1) // limit,
            'stats': {
                'total':         total_tous,
                'medicaments':   medicaments,
                'parapharmacie': parapharmacie,
                'actifs':        actifs,
            }
        })

    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/produits', methods=['POST'])
def create_produit():
    try:
        data = request.get_json()
        cur  = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO admin_produits (nom, description, type_produit)
            VALUES (%s, %s, %s)
        """, (
            data.get('nom'),
            data.get('description', ''),
            data.get('type_produit'),
        ))
        produit_id = cur.lastrowid

        # Assigner categories
        categories = data.get('categories', [])
        for cat_id in categories:
            cur.execute("""
                INSERT INTO produit_categories (admin_produit_id, categorie_id)
                VALUES (%s, %s)
            """, (produit_id, cat_id))

        mysql.connection.commit()
        return jsonify({'message': 'Produit créé avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/produits/<int:produit_id>', methods=['PUT'])
def update_produit(produit_id):
    try:
        data = request.get_json()
        cur  = mysql.connection.cursor()
        cur.execute("""
            UPDATE admin_produits
            SET nom = %s, description = %s, type_produit = %s
            WHERE admin_produit_id = %s
        """, (
            data.get('nom'),
            data.get('description', ''),
            data.get('type_produit'),
            produit_id,
        ))

        # Mettre a jour categories
        cur.execute("DELETE FROM produit_categories WHERE admin_produit_id = %s", (produit_id,))
        categories = data.get('categories', [])
        for cat_id in categories:
            cur.execute("""
                INSERT INTO produit_categories (admin_produit_id, categorie_id)
                VALUES (%s, %s)
            """, (produit_id, cat_id))

        mysql.connection.commit()
        return jsonify({'message': 'Produit mis à jour avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/produits/<int:produit_id>/toggle', methods=['PUT'])
def toggle_produit(produit_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE admin_produits
            SET est_actif = CASE WHEN est_actif = 1 THEN 0 ELSE 1 END
            WHERE admin_produit_id = %s
        """, (produit_id,))
        mysql.connection.commit()
        return jsonify({'message': 'Statut mis à jour avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/produits/<int:produit_id>', methods=['DELETE'])
def supprimer_produit(produit_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM produit_categories WHERE admin_produit_id = %s", (produit_id,))
        cur.execute("DELETE FROM admin_produits WHERE admin_produit_id = %s", (produit_id,))
        mysql.connection.commit()
        return jsonify({'message': 'Produit supprimé avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/categories', methods=['GET'])
def get_categories():
    try:
        type_produit = request.args.get('type', '')
        cur = mysql.connection.cursor()
        if type_produit:
            cur.execute("""
                SELECT categorie_id, nom, type_produit
                FROM categories WHERE type_produit = %s
                ORDER BY nom
            """, (type_produit,))
        else:
            cur.execute("""
                SELECT categorie_id, nom, type_produit
                FROM categories ORDER BY type_produit, nom
            """)
        rows = cur.fetchall()
        categories = [{'categorie_id': r[0], 'nom': r[1], 'type_produit': r[2]} for r in rows]
        return jsonify({'categories': categories})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


# ============================================================
# PARTENAIRES
# ============================================================

@app.route('/api/admin/partenaires', methods=['GET'])
def get_partenaires():
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT p.partenaire_id, p.nom, p.site_web, p.description,
                   p.est_actif, p.cree_le,
                   COUNT(pub.publicite_id) as nb_publicites
            FROM partenaires p
            LEFT JOIN publicites pub ON p.partenaire_id = pub.partenaire_id
            GROUP BY p.partenaire_id
            ORDER BY p.cree_le DESC
        """)
        rows = cur.fetchall()
        partenaires = [{
            'partenaire_id':  r[0],
            'nom':            r[1],
            'site_web':       r[2] or '',
            'description':    r[3] or '',
            'est_actif':      bool(r[4]),
            'date':           str(r[5])[:10] if r[5] else '',
            'nb_publicites':  int(r[6]),
        } for r in rows]

        cur.execute("SELECT COUNT(*) FROM partenaires")
        total = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM partenaires WHERE est_actif = 1")
        actifs = int(cur.fetchone()[0])

        return jsonify({
            'partenaires': partenaires,
            'total':       total,
            'actifs':      actifs,
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/partenaires', methods=['POST'])
def create_partenaire():
    try:
        data = request.get_json()
        cur  = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO partenaires (nom, site_web, description)
            VALUES (%s, %s, %s)
        """, (data.get('nom'), data.get('site_web', ''), data.get('description', '')))
        mysql.connection.commit()
        return jsonify({'message': 'Partenaire créé avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/partenaires/<int:partenaire_id>', methods=['PUT'])
def update_partenaire(partenaire_id):
    try:
        data = request.get_json()
        cur  = mysql.connection.cursor()
        cur.execute("""
            UPDATE partenaires
            SET nom = %s, site_web = %s, description = %s
            WHERE partenaire_id = %s
        """, (
            data.get('nom'),
            data.get('site_web', ''),
            data.get('description', ''),
            partenaire_id,
        ))
        mysql.connection.commit()
        return jsonify({'message': 'Partenaire mis à jour avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/partenaires/<int:partenaire_id>/toggle', methods=['PUT'])
def toggle_partenaire(partenaire_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE partenaires
            SET est_actif = CASE WHEN est_actif = 1 THEN 0 ELSE 1 END
            WHERE partenaire_id = %s
        """, (partenaire_id,))
        mysql.connection.commit()
        return jsonify({'message': 'Statut mis à jour avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/partenaires/<int:partenaire_id>', methods=['DELETE'])
def supprimer_partenaire(partenaire_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM partenaires WHERE partenaire_id = %s", (partenaire_id,))
        mysql.connection.commit()
        return jsonify({'message': 'Partenaire supprimé avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


# ============================================================
# PUBLICITES
# ============================================================

@app.route('/api/admin/pubs', methods=['GET'])
def get_publicites():

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT p.publicite_id, p.titre, p.image_url, p.lien_cible,
                   p.proprietaire, p.date_debut, p.date_fin, p.est_active,
                   p.emplacement_pharmacie, p.emplacement_patient_accueil,
                   p.emplacement_patient_store, p.position,
                   pa.nom as partenaire_nom, p.partenaire_id,
                   p.cree_le
            FROM publicites p
            LEFT JOIN partenaires pa ON p.partenaire_id = pa.partenaire_id
            ORDER BY p.position ASC, p.cree_le DESC
        """)
        rows = cur.fetchall()
        publicites = [{
            'publicite_id':                r[0],
            'titre':                       r[1],
            'image_url':                   r[2] or '',
            'lien_cible':                  r[3] or '',
            'proprietaire':                r[4],
            'date_debut':                  str(r[5]) if r[5] else '',
            'date_fin':                    str(r[6]) if r[6] else '',
            'est_active':                  bool(r[7]),
            'emplacement_pharmacie':       bool(r[8]),
            'emplacement_patient_accueil': bool(r[9]),
            'emplacement_patient_store':   bool(r[10]),
            'position':                    r[11],
            'partenaire_nom':              r[12] or '',
            'partenaire_id':               r[13],
            'date':                        str(r[14])[:10] if r[14] else '',
        } for r in rows]

        cur.execute("SELECT COUNT(*) FROM publicites")
        total = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM publicites WHERE est_active = 1")
        actives = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM publicites WHERE proprietaire = 'plateforme'")
        plateforme = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM publicites WHERE proprietaire = 'partenaire'")
        partenaire = int(cur.fetchone()[0])

        return jsonify({
            'publicites': publicites,
            'stats': {
                'total':      total,
                'actives':    actives,
                'plateforme': plateforme,
                'partenaire': partenaire,
            }
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/pubs', methods=['POST'])
def create_publicite():
    try:
        data = request.get_json()
        cur  = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO publicites
            (titre, image_url, lien_cible, proprietaire, partenaire_id,
             date_debut, date_fin, est_active, position,
             emplacement_pharmacie, emplacement_patient_accueil, emplacement_patient_store)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get('titre'),
            data.get('image_url', ''),
            data.get('lien_cible', ''),
            data.get('proprietaire', 'plateforme'),
            data.get('partenaire_id') or None,
            data.get('date_debut'),
            data.get('date_fin'),
            data.get('est_active', True),
            data.get('position', 0),
            data.get('emplacement_pharmacie', False),
            data.get('emplacement_patient_accueil', False),
            data.get('emplacement_patient_store', False),
        ))
        mysql.connection.commit()
        return jsonify({'message': 'Publicité créée avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/pubs/<int:publicite_id>', methods=['PUT'])
def update_publicite(publicite_id):
    try:
        data = request.get_json()
        cur  = mysql.connection.cursor()
        cur.execute("""
            UPDATE publicites
            SET titre = %s, image_url = %s, lien_cible = %s,
                proprietaire = %s, partenaire_id = %s,
                date_debut = %s, date_fin = %s,
                est_active = %s, position = %s,
                emplacement_pharmacie = %s,
                emplacement_patient_accueil = %s,
                emplacement_patient_store = %s
            WHERE publicite_id = %s
        """, (
            data.get('titre'),
            data.get('image_url', ''),
            data.get('lien_cible', ''),
            data.get('proprietaire', 'plateforme'),
            data.get('partenaire_id') or None,
            data.get('date_debut'),
            data.get('date_fin'),
            data.get('est_active', True),
            data.get('position', 0),
            data.get('emplacement_pharmacie', False),
            data.get('emplacement_patient_accueil', False),
            data.get('emplacement_patient_store', False),
            publicite_id,
        ))
        mysql.connection.commit()
        return jsonify({'message': 'Publicité mise à jour avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/pubs/<int:publicite_id>/toggle', methods=['PUT'])
def toggle_publicite(publicite_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE publicites
            SET est_active = CASE WHEN est_active = 1 THEN 0 ELSE 1 END
            WHERE publicite_id = %s
        """, (publicite_id,))
        mysql.connection.commit()
        return jsonify({'message': 'Statut mis à jour avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/pubs/<int:publicite_id>', methods=['DELETE'])
def supprimer_publicite(publicite_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM publicites WHERE publicite_id = %s", (publicite_id,))
        mysql.connection.commit()
        return jsonify({'message': 'Publicité supprimée avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    # ============================================================
# NOTIFICATIONS ADMIN
# ============================================================

@app.route('/api/admin/notifications', methods=['GET'])
def get_notifications():
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT n.notif_admin_id, n.titre, n.corps, n.type,
                   n.patient_id, n.pharmacie_id, n.envoye_le,
                   CONCAT(p.prenom, ' ', p.nom) as patient_nom,
                   ph.nom as pharmacie_nom
            FROM notifications_admin n
            LEFT JOIN patients pa_t ON n.patient_id = pa_t.patient_id
            LEFT JOIN patients p ON n.patient_id = p.patient_id
            LEFT JOIN pharmacies ph ON n.pharmacie_id = ph.pharmacie_id
            ORDER BY n.envoye_le DESC
        """)
        rows = cur.fetchall()
        notifications = [{
            'notif_admin_id': r[0],
            'titre':          r[1],
            'corps':          r[2],
            'type':           r[3],
            'patient_id':     r[4],
            'pharmacie_id':   r[5],
            'date':           str(r[6])[:16] if r[6] else '',
            'patient_nom':    r[7] or '',
            'pharmacie_nom':  r[8] or '',
        } for r in rows]

        cur.execute("SELECT COUNT(*) FROM notifications_admin")
        total = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM notifications_admin WHERE type = 'patient'")
        patients = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM notifications_admin WHERE type = 'pharmacie'")
        pharmacies = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM notifications_admin WHERE type = 'tous'")
        tous = int(cur.fetchone()[0])

        return jsonify({
            'notifications': notifications,
            'stats': {
                'total':      total,
                'patients':   patients,
                'pharmacies': pharmacies,
                'tous':       tous,
            }
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/notifications', methods=['POST'])
def send_notification():
    try:
        data = request.get_json()
        cur  = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO notifications_admin
            (titre, corps, type, patient_id, pharmacie_id)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            data.get('titre'),
            data.get('corps'),
            data.get('type'),
            data.get('patient_id') or None,
            data.get('pharmacie_id') or None,
        ))
        mysql.connection.commit()
        return jsonify({'message': 'Notification envoyée avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/notifications/<int:notif_id>', methods=['DELETE'])
def supprimer_notification(notif_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM notifications_admin WHERE notif_admin_id = %s", (notif_id,))
        mysql.connection.commit()
        return jsonify({'message': 'Notification supprimée avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


# Route pour chercher patients et pharmacies dans le formulaire notif
@app.route('/api/admin/search/patients', methods=['GET'])
def search_patients_notif():
    try:
        search = request.args.get('search', '')
        cur    = mysql.connection.cursor()
        cur.execute("""
            SELECT patient_id, nom, prenom, email
            FROM patients
            WHERE (nom LIKE %s OR prenom LIKE %s OR email LIKE %s)
            AND statut = 'actif'
            LIMIT 10
        """, (f'%{search}%', f'%{search}%', f'%{search}%'))
        rows = cur.fetchall()
        return jsonify({'results': [
            {'id': r[0], 'label': f"{r[2]} {r[1]} — {r[3]}"}
            for r in rows
        ]})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/search/pharmacies', methods=['GET'])
def search_pharmacies_notif():
    try:
        search = request.args.get('search', '')
        cur    = mysql.connection.cursor()
        cur.execute("""
            SELECT pharmacie_id, nom, email
            FROM pharmacies
            WHERE (nom LIKE %s OR email LIKE %s)
            AND statut = 'approuvee'
            LIMIT 10
        """, (f'%{search}%', f'%{search}%'))
        rows = cur.fetchall()
        return jsonify({'results': [
            {'id': r[0], 'label': f"{r[1]} — {r[2]}"}
            for r in rows
        ]})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    

    # ============================================================
# MESSAGES PREDEFINIS
# ============================================================

@app.route('/api/admin/messages', methods=['GET'])
def get_messages():
    try:
        type_filtre = request.args.get('type', '')
        cur = mysql.connection.cursor()

        if type_filtre:
            cur.execute("""
                SELECT message_id, contenu, type, est_actif, cree_le
                FROM messages_predefinis
                WHERE type = %s
                ORDER BY type, cree_le DESC
            """, (type_filtre,))
        else:
            cur.execute("""
                SELECT message_id, contenu, type, est_actif, cree_le
                FROM messages_predefinis
                ORDER BY type, cree_le DESC
            """)
        rows = cur.fetchall()
        messages = [{
            'message_id': r[0],
            'contenu':    r[1],
            'type':       r[2],
            'est_actif':  bool(r[3]),
            'date':       str(r[4])[:10] if r[4] else '',
        } for r in rows]

        cur.execute("SELECT COUNT(*) FROM messages_predefinis")
        total = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM messages_predefinis WHERE type = 'pharmacie_reponse'")
        pharmacie = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM messages_predefinis WHERE type = 'patient_demande'")
        patient = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM messages_predefinis WHERE est_actif = 1")
        actifs = int(cur.fetchone()[0])

        return jsonify({
            'messages': messages,
            'stats': {
                'total':    total,
                'pharmacie': pharmacie,
                'patient':   patient,
                'actifs':    actifs,
            }
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/messages', methods=['POST'])
def create_message():
    try:
        data = request.get_json()
        cur  = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO messages_predefinis (contenu, type)
            VALUES (%s, %s)
        """, (data.get('contenu'), data.get('type')))
        mysql.connection.commit()
        return jsonify({'message': 'Message créé avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/messages/<int:message_id>', methods=['PUT'])
def update_message(message_id):
    try:
        data = request.get_json()
        cur  = mysql.connection.cursor()
        cur.execute("""
            UPDATE messages_predefinis
            SET contenu = %s, type = %s
            WHERE message_id = %s
        """, (data.get('contenu'), data.get('type'), message_id))
        mysql.connection.commit()
        return jsonify({'message': 'Message modifié avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/messages/<int:message_id>/toggle', methods=['PUT'])
def toggle_message(message_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE messages_predefinis
            SET est_actif = CASE WHEN est_actif = 1 THEN 0 ELSE 1 END
            WHERE message_id = %s
        """, (message_id,))
        mysql.connection.commit()
        return jsonify({'message': 'Statut mis à jour avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/admin/messages/<int:message_id>', methods=['DELETE'])
def delete_message(message_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM messages_predefinis WHERE message_id = %s", (message_id,))
        mysql.connection.commit()
        return jsonify({'message': 'Message supprimé avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    

# ============================================================# ============================================================
# PARTIE WEB PHARMACIE 
# ============================================================# ============================================================
# ============================================================
# INSCRIPTION PHARMACIE
# ============================================================
@app.route('/api/pharmacie/register', methods=['POST'])
def register_pharmacie():
    try:
        data = request.get_json()

        nom               = data.get('nom')
        email             = data.get('email')
        mot_de_passe      = data.get('mot_de_passe')
        telephone         = data.get('telephone', '')
        wilaya_id         = data.get('wilaya_id')
        commune_id        = data.get('commune_id')
        latitude          = data.get('latitude')
        longitude         = data.get('longitude')
        carte_identite    = data.get('carte_identite', '')
        registre_commerce = data.get('registre_commerce', '')

        if not all([nom, email, mot_de_passe, wilaya_id, commune_id]):
            return jsonify({'message': 'Champs obligatoires manquants'}), 400

        cur = mysql.connection.cursor()
        cur.execute("SELECT pharmacie_id FROM pharmacies WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({'message': 'Cet email est déjà utilisé'}), 400

        # ✅ Stocker en mémoire SEULEMENT — pas encore en BDD
        code = generate_code()
        verification_codes[f'register_{email}'] = {
            'code':             code,
            'expires':          datetime.datetime.utcnow() + datetime.timedelta(minutes=10),
            'nom':              nom,
            'email':            email,
            'mot_de_passe':     mot_de_passe,
            'telephone':        telephone,
            'wilaya_id':        wilaya_id,
            'commune_id':       commune_id,
            'latitude':         latitude,
            'longitude':        longitude,
            'carte_identite':   carte_identite,
            'registre_commerce': registre_commerce,
        }

        sent = send_code_email(email, code, 'Dwak Hna — Confirmez votre adresse email')
        if not sent:
            return jsonify({'message': 'Erreur envoi email'}), 500

        return jsonify({'message': f'Code envoyé à {email}', 'email': email})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500

@app.route('/api/pharmacie/resend-code', methods=['POST'])
def resend_pharmacie_code():
    try:
        email  = request.get_json().get('email')
        stored = verification_codes.get(f'register_{email}')
        if not stored:
            return jsonify({'message': 'Aucune inscription en cours pour cet email'}), 404

        # Nouveau code en gardant TOUTES les données
        new_code = generate_code()
        verification_codes[f'register_{email}'] = {
            **stored,  # garde nom, wilaya_id, commune_id, etc.
            'code':    new_code,
            'expires': datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
        }

        sent = send_code_email(email, new_code, 'Dwak Hna — Nouveau code de vérification')
        if not sent:
            return jsonify({'message': 'Erreur envoi email'}), 500

        return jsonify({'message': f'Nouveau code envoyé à {email}'})

    except Exception as e:
        return jsonify({'message': str(e)}), 500



# ============================================================
# POLLING APPROBATION (page attente)
# ============================================================

@app.route('/api/pharmacie/check-statut', methods=['GET'])
def check_pharmacie_statut():
    try:
        email = request.args.get('email')
        cur   = mysql.connection.cursor()
        cur.execute("""
            SELECT statut, email_verifie, pharmacie_id, nom
            FROM pharmacies WHERE email = %s
        """, (email,))
        p = cur.fetchone()
        if not p:
            return jsonify({'message': 'Pharmacie introuvable'}), 404

        return jsonify({
            'statut':        p[0],
            'email_verifie': bool(p[1]),
            'pharmacie_id':  p[2],
            'nom':           p[3],
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 500


# ============================================================
# DASHBOARD PHARMACIE
# ============================================================

@app.route('/api/pharmacie/dashboard', methods=['GET'])
def pharmacie_dashboard():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        data  = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        pharmacie_id = data['id']

        cur = mysql.connection.cursor()

        cur.execute("SELECT COUNT(*) FROM demande_pharmacies WHERE pharmacie_id = %s", (pharmacie_id,))
        total_demandes = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM demande_pharmacies WHERE pharmacie_id = %s AND statut = 'acceptee'", (pharmacie_id,))
        acceptees = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM demande_pharmacies WHERE pharmacie_id = %s AND statut = 'refusee'", (pharmacie_id,))
        refusees = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM demande_pharmacies WHERE pharmacie_id = %s AND statut = 'en_attente'", (pharmacie_id,))
        en_attente = int(cur.fetchone()[0])

        cur.execute("""
            SELECT AVG(note_pharmacie), COUNT(*)
            FROM demandes
            WHERE pharmacie_choisie_id = %s AND note_pharmacie IS NOT NULL
        """, (pharmacie_id,))
        r = cur.fetchone()
        note_moyenne    = round(float(r[0]), 1) if r[0] else 0
        nb_fois_choisie = int(r[1])

        # Statut pharmacie
        cur.execute("""
            SELECT est_ouverte, est_de_garde, nom, email, telephone, adresse, statut
            FROM pharmacies WHERE pharmacie_id = %s
        """, (pharmacie_id,))
        p = cur.fetchone()

        # Dernières demandes
        cur.execute(f"""
            SELECT d.demande_id, CONCAT(pa.prenom, ' ', pa.nom),
                   d.type, d.etat, dp.statut, d.cree_le
            FROM demande_pharmacies dp
            JOIN demandes d  ON dp.demande_id = d.demande_id
            JOIN patients pa ON d.patient_id  = pa.patient_id
            WHERE dp.pharmacie_id = {pharmacie_id}
            ORDER BY d.cree_le DESC LIMIT 5
        """)
        rows = cur.fetchall()
        dernieres_demandes = [{
            'demande_id': r[0], 'patient': r[1],
            'type': r[2], 'etat': r[3],
            'ma_reponse': r[4],
            'date': str(r[5])[:16] if r[5] else '',
        } for r in rows]

        # ✅ Graphique demandes par mois (6 derniers mois)
        cur.execute(f"""
            SELECT DATE_FORMAT(d.cree_le, '%b %Y') as mois, COUNT(*) as total
            FROM demande_pharmacies dp
            JOIN demandes d ON dp.demande_id = d.demande_id
            WHERE dp.pharmacie_id = {pharmacie_id}
            AND d.cree_le >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(d.cree_le, '%Y-%m'), DATE_FORMAT(d.cree_le, '%b %Y')
            ORDER BY MIN(d.cree_le) ASC
        """)
        demandes_par_mois = [{'mois': r[0], 'total': int(r[1])} for r in cur.fetchall()]

        # ✅ Graphique réponses pie
        reponses_chart = [
            {'name': 'Acceptées', 'value': acceptees},
            {'name': 'Refusées',  'value': refusees},
            {'name': 'En attente','value': en_attente},
        ]

        return jsonify({
            'stats': {
                'total_demandes':  total_demandes,
                'acceptees':       acceptees,
                'refusees':        refusees,
                'en_attente':      en_attente,
                'note_moyenne':    note_moyenne,
                'nb_fois_choisie': nb_fois_choisie,
            },
            'pharmacie': {
                'est_ouverte':  bool(p[0]),
                'est_de_garde': bool(p[1]),
                'nom':          p[2],
                'email':        p[3],
                'telephone':    p[4] or '',
                'adresse':      p[5] or '',
                'statut':       p[6],
            },
            'dernieres_demandes': dernieres_demandes,
            'demandes_par_mois':  demandes_par_mois,
            'reponses_chart':     reponses_chart,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500


# ============================================================
# TOGGLE OUVERT / GARDE
# ============================================================

@app.route('/api/pharmacie/toggle-ouvert', methods=['PUT'])
def toggle_ouvert():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        data  = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        pharmacie_id = data['id']

        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE pharmacies
            SET est_ouverte = CASE WHEN est_ouverte = 1 THEN 0 ELSE 1 END
            WHERE pharmacie_id = %s
        """, (pharmacie_id,))
        mysql.connection.commit()

        cur.execute("SELECT est_ouverte FROM pharmacies WHERE pharmacie_id = %s", (pharmacie_id,))
        nouvel_etat = bool(cur.fetchone()[0])

        return jsonify({'est_ouverte': nouvel_etat})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/pharmacie/toggle-garde', methods=['PUT'])
def toggle_garde():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        data  = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        pharmacie_id = data['id']

        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE pharmacies
            SET est_de_garde = CASE WHEN est_de_garde = 1 THEN 0 ELSE 1 END
            WHERE pharmacie_id = %s
        """, (pharmacie_id,))
        mysql.connection.commit()

        cur.execute("SELECT est_de_garde FROM pharmacies WHERE pharmacie_id = %s", (pharmacie_id,))
        nouvel_etat = bool(cur.fetchone()[0])

        return jsonify({'est_de_garde': nouvel_etat})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


# ============================================================
# DEMANDES PHARMACIE
# ============================================================

@app.route('/api/pharmacie/demandes', methods=['GET'])
def get_pharmacie_demandes():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        data  = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        pharmacie_id = data['id']

        page   = int(request.args.get('page', 1))
        search = request.args.get('search', '')
        filtre = request.args.get('filtre', 'tous')
        limit  = 10
        offset = (page - 1) * limit

        search_param = f'%{search}%'

        if filtre == 'en_attente':
            filtre_sql = "AND dp.statut = 'en_attente'"
        elif filtre == 'acceptee':
            filtre_sql = "AND dp.statut = 'acceptee'"
        elif filtre == 'refusee':
            filtre_sql = "AND dp.statut = 'refusee'"
        else:
            filtre_sql = ''

        cur = mysql.connection.cursor()

        cur.execute(f"""
            SELECT COUNT(*) FROM demande_pharmacies dp
            JOIN demandes d  ON dp.demande_id = d.demande_id
            JOIN patients pa ON d.patient_id  = pa.patient_id
            WHERE dp.pharmacie_id = {pharmacie_id}
            AND (pa.nom LIKE %s OR pa.prenom LIKE %s)
            {filtre_sql}
        """, (search_param, search_param))
        total = int(cur.fetchone()[0])

        query = f"""
            SELECT d.demande_id, CONCAT(pa.prenom, ' ', pa.nom) as patient,
                   pa.telephone, d.type, d.etat, d.message_patient,
                   d.rayon_km, dp.statut as ma_reponse, dp.message as ma_reponse_msg,
                   d.cree_le, d.latitude, d.longitude
            FROM demande_pharmacies dp
            JOIN demandes d  ON dp.demande_id = d.demande_id
            JOIN patients pa ON d.patient_id  = pa.patient_id
            WHERE dp.pharmacie_id = {pharmacie_id}
            AND (pa.nom LIKE %s OR pa.prenom LIKE %s)
            {filtre_sql}
            ORDER BY d.cree_le DESC
            LIMIT {limit} OFFSET {offset}
        """
        cur.execute(query, (search_param, search_param))
        rows = cur.fetchall()

        demandes = []
        for r in rows:
            # Médicaments
            cur.execute("""
                SELECT dm.nom_libre, m.nom, dm.quantite
                FROM demande_medicaments dm
                LEFT JOIN medicaments m ON dm.medicament_id = m.medicament_id
                WHERE dm.demande_id = %s
            """, (r[0],))
            meds = [{'nom': mr[1] or mr[0] or 'Inconnu', 'quantite': mr[2]} for mr in cur.fetchall()]

            # Ordonnances
            cur.execute("SELECT url FROM demande_ordonnances WHERE demande_id = %s", (r[0],))
            ords = [or_[0] for or_ in cur.fetchall()]

            demandes.append({
                'demande_id':      r[0],
                'patient':         r[1],
                'patient_tel':     r[2] or '',
                'type':            r[3],
                'etat':            r[4],
                'message_patient': r[5] or '',
                'rayon_km':        r[6],
                'ma_reponse':      r[7],
                'ma_reponse_msg':  r[8] or '',
                'date':            str(r[9])[:16] if r[9] else '',
                'latitude':        float(r[10]) if r[10] else None,
                'longitude':       float(r[11]) if r[11] else None,
                'medicaments':     meds,
                'ordonnances':     ords,
            })

        # Stats
        cur.execute(f"SELECT COUNT(*) FROM demande_pharmacies WHERE pharmacie_id = {pharmacie_id} AND statut = 'en_attente'")
        nb_en_attente = int(cur.fetchone()[0])

        cur.execute(f"SELECT COUNT(*) FROM demande_pharmacies WHERE pharmacie_id = {pharmacie_id} AND statut = 'acceptee'")
        nb_acceptees = int(cur.fetchone()[0])

        cur.execute(f"SELECT COUNT(*) FROM demande_pharmacies WHERE pharmacie_id = {pharmacie_id} AND statut = 'refusee'")
        nb_refusees = int(cur.fetchone()[0])

        return jsonify({
            'demandes':     demandes,
            'total':        total,
            'pages':        (total + limit - 1) // limit,
            'stats': {
                'en_attente': nb_en_attente,
                'acceptees':  nb_acceptees,
                'refusees':   nb_refusees,
            }
        })

    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/pharmacie/demandes/<int:demande_id>/repondre', methods=['PUT'])
def repondre_demande(demande_id):
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        data  = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        pharmacie_id = data['id']

        body    = request.get_json()
        statut  = body.get('statut')   # 'acceptee' ou 'refusee'
        message = body.get('message', '')

        if statut not in ['acceptee', 'refusee']:
            return jsonify({'message': 'Statut invalide'}), 400

        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE demande_pharmacies
            SET statut = %s, message = %s, repondu_le = NOW()
            WHERE demande_id = %s AND pharmacie_id = %s
        """, (statut, message, demande_id, pharmacie_id))

        # Mettre à jour etat de la demande
        cur.execute("""
            UPDATE demandes SET etat = 'reponse_recue'
            WHERE demande_id = %s AND etat = 'en_attente'
        """, (demande_id,))

        mysql.connection.commit()
        return jsonify({'message': f'Réponse envoyée avec succès'})

    except Exception as e:
        return jsonify({'message': str(e)}), 500


# ============================================================
# NOTIFICATIONS PHARMACIE (polling)
# ============================================================

@app.route('/api/pharmacie/notifications', methods=['GET'])
def get_pharmacie_notifications():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        data  = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        pharmacie_id = data['id']

        cur = mysql.connection.cursor()

        # Notifs admin → pharmacie
        cur.execute("""
            SELECT notif_admin_id, titre, corps, est_lue, envoye_le
            FROM notifications_admin
            WHERE pharmacie_id = %s OR type = 'tous'
            ORDER BY envoye_le DESC
            LIMIT 20
        """, (pharmacie_id,))
        rows = cur.fetchall()
        notifs = [{
            'id':       r[0],
            'titre':    r[1],
            'corps':    r[2],
            'est_lue':  bool(r[3]),
            'date':     str(r[4])[:16] if r[4] else '',
        } for r in rows]

        # Nb nouvelles demandes non répondues
        cur.execute("""
            SELECT COUNT(*) FROM demande_pharmacies
            WHERE pharmacie_id = %s AND statut = 'en_attente'
        """, (pharmacie_id,))
        nb_demandes = int(cur.fetchone()[0])

        # Nb notifs non lues
        cur.execute("""
            SELECT COUNT(*) FROM notifications_admin
            WHERE (pharmacie_id = %s OR type = 'tous') AND est_lue = FALSE
        """, (pharmacie_id,))
        nb_non_lues = int(cur.fetchone()[0])

        return jsonify({
            'notifications': notifs,
            'nb_demandes':   nb_demandes,
            'nb_non_lues':   nb_non_lues,
        })

    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/pharmacie/notifications/<int:notif_id>/lire', methods=['PUT'])
def marquer_notif_lue(notif_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("UPDATE notifications_admin SET est_lue = TRUE WHERE notif_admin_id = %s", (notif_id,))
        mysql.connection.commit()
        return jsonify({'message': 'Notification marquée comme lue'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


# ============================================================
# PRODUITS PHARMACIE
# ============================================================

@app.route('/api/pharmacie/produits', methods=['GET'])
def get_pharmacie_produits():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        data  = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        pharmacie_id = data['id']

        cur = mysql.connection.cursor()
        cur.execute(f"""
            SELECT pp.pharmacie_produit_id, ap.nom, ap.type_produit,
                   pp.prix, pp.est_disponible, pp.description_perso,
                   ap.admin_produit_id, ap.description
            FROM pharmacie_produits pp
            JOIN admin_produits ap ON pp.admin_produit_id = ap.admin_produit_id
            WHERE pp.pharmacie_id = {pharmacie_id}
            ORDER BY pp.cree_le DESC
        """)
        rows = cur.fetchall()
        produits = [{
            'pharmacie_produit_id': r[0],
            'nom':                  r[1],
            'type_produit':         r[2],
            'prix':                 float(r[3]) if r[3] else None,
            'est_disponible':       bool(r[4]),
            'description_perso':    r[5] or '',
            'admin_produit_id':     r[6],
            'description':          r[7] or '',
        } for r in rows]

        return jsonify({'produits': produits})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/pharmacie/produits/search', methods=['GET'])
def search_admin_produits():
    try:
        search       = request.args.get('search', '')
        type_produit = request.args.get('type', '')
        token        = request.headers.get('Authorization', '').replace('Bearer ', '')
        data         = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        pharmacie_id = data['id']

        type_sql = "AND ap.type_produit = %s" if type_produit else ""
        params   = [f'%{search}%', pharmacie_id]
        if type_produit:
            params.insert(1, type_produit)

        cur = mysql.connection.cursor()
        cur.execute(f"""
            SELECT ap.admin_produit_id, ap.nom, ap.type_produit, ap.description
            FROM admin_produits ap
            WHERE ap.nom LIKE %s
            {type_sql}
            AND ap.est_actif = 1
            AND ap.admin_produit_id NOT IN (
                SELECT admin_produit_id FROM pharmacie_produits
                WHERE pharmacie_id = %s
            )
            LIMIT 20
        """, params)
        rows = cur.fetchall()
        return jsonify({'resultats': [
            {'admin_produit_id': r[0], 'nom': r[1], 'type_produit': r[2], 'description': r[3] or ''}
            for r in rows
        ]})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    
    
@app.route('/api/pharmacie/produits', methods=['POST'])
def add_pharmacie_produit():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        data  = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        pharmacie_id = data['id']

        body     = request.get_json()
        produits = body.get('produits', [])  # liste de produits

        cur = mysql.connection.cursor()
        for p in produits:
            cur.execute("""
                INSERT INTO pharmacie_produits
                (pharmacie_id, admin_produit_id, prix, description_perso, est_disponible)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                pharmacie_id,
                p.get('admin_produit_id'),
                p.get('prix') or None,
                p.get('description_perso', ''),
                p.get('est_disponible', True),
            ))
        mysql.connection.commit()
        return jsonify({'message': f'{len(produits)} produit(s) ajouté(s) avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/pharmacie/produits/<int:pp_id>', methods=['PUT'])
def update_pharmacie_produit(pp_id):
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        data  = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        pharmacie_id = data['id']

        body = request.get_json()
        cur  = mysql.connection.cursor()
        cur.execute("""
            UPDATE pharmacie_produits
            SET prix = %s, description_perso = %s, est_disponible = %s
            WHERE pharmacie_produit_id = %s AND pharmacie_id = %s
        """, (
            body.get('prix') or None,
            body.get('description_perso', ''),
            body.get('est_disponible', True),
            pp_id, pharmacie_id,
        ))
        mysql.connection.commit()
        return jsonify({'message': 'Produit mis à jour avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/pharmacie/produits/<int:pp_id>', methods=['DELETE'])
def delete_pharmacie_produit(pp_id):
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        data  = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        pharmacie_id = data['id']

        cur = mysql.connection.cursor()
        cur.execute("""
            DELETE FROM pharmacie_produits
            WHERE pharmacie_produit_id = %s AND pharmacie_id = %s
        """, (pp_id, pharmacie_id))
        mysql.connection.commit()
        return jsonify({'message': 'Produit supprimé avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


# ============================================================
# PROFIL PHARMACIE
# ============================================================

@app.route('/api/pharmacie/profil', methods=['GET'])
def get_pharmacie_profil():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        data  = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        pharmacie_id = data['id']

        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT p.pharmacie_id, p.nom, p.email, p.telephone, p.adresse,
                   p.statut, p.est_ouverte, p.est_de_garde,
                   p.latitude, p.longitude, p.logo_url,
                   p.registre_commerce, p.carte_identite,
                   p.horaires, p.cree_le,
                   w.nom as wilaya, c.nom as commune,
                   p.wilaya_id, p.commune_id
            FROM pharmacies p
            LEFT JOIN wilayas  w ON p.wilaya_id  = w.wilaya_id
            LEFT JOIN communes c ON p.commune_id = c.commune_id
            WHERE p.pharmacie_id = %s
        """, (pharmacie_id,))
        r = cur.fetchone()
        if not r:
            return jsonify({'message': 'Pharmacie introuvable'}), 404

        return jsonify({'pharmacie': {
            'pharmacie_id':      r[0],
            'nom':               r[1],
            'email':             r[2],
            'telephone':         r[3] or '',
            'adresse':           r[4] or '',
            'statut':            r[5],
            'est_ouverte':       bool(r[6]),
            'est_de_garde':      bool(r[7]),
            'latitude':          float(r[8]) if r[8] else None,
            'longitude':         float(r[9]) if r[9] else None,
            'logo_url':          r[10] or '',
            'registre_commerce': r[11] or '',
            'carte_identite':    r[12] or '',
            'horaires':          r[13] or '',
            'date':              str(r[14])[:10] if r[14] else '',
            'wilaya':            r[15] or '',
            'commune':           r[16] or '',
            'wilaya_id':         r[17],
            'commune_id':        r[18],
        }})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/pharmacie/profil', methods=['PUT'])
def update_pharmacie_profil():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        data  = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        pharmacie_id = data['id']

        body = request.get_json()
        cur  = mysql.connection.cursor()
        cur.execute("""
            UPDATE pharmacies
            SET nom        = %s, telephone  = %s,
                wilaya_id  = %s, commune_id = %s,
                horaires   = %s, logo_url   = %s
            WHERE pharmacie_id = %s
        """, (
            body.get('nom'),
            body.get('telephone', ''),
            body.get('wilaya_id')  or None,
            body.get('commune_id') or None,
            body.get('horaires')   or None,
            body.get('logo_url')   or None,
            pharmacie_id,
        ))
        mysql.connection.commit()
        return jsonify({'message': 'Profil mis à jour avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    
# Routes email/password pharmacie (même logique admin)
@app.route('/api/pharmacie/profil/send-email-code', methods=['POST'])
def pharmacie_send_email_code():
    try:
        token        = request.headers.get('Authorization', '').replace('Bearer ', '')
        data         = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        pharmacie_id = data['id']
        new_email    = request.get_json().get('email')

        if not new_email:
            return jsonify({'message': 'Email obligatoire'}), 400

        cur = mysql.connection.cursor()
        cur.execute("SELECT pharmacie_id FROM pharmacies WHERE email = %s", (new_email,))
        if cur.fetchone():
            return jsonify({'message': 'Cet email est déjà utilisé'}), 400

        code = generate_code()
        verification_codes[f'ph_email_{pharmacie_id}'] = {
            'code': code, 'new_email': new_email,
            'expires': datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
        }
        sent = send_code_email(new_email, code, 'Dwak Hna — Vérification nouvel email')
        if not sent:
            return jsonify({'message': 'Erreur envoi email'}), 500
        return jsonify({'message': f'Code envoyé à {new_email}'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/pharmacie/verify-email', methods=['POST'])
def verify_pharmacie_email():
    try:
        body  = request.get_json()
        email = body.get('email')
        code  = body.get('code')

        stored = verification_codes.get(f'register_{email}')
        if not stored:
            return jsonify({'message': 'Aucun code en attente'}), 400
        if datetime.datetime.utcnow() > stored['expires']:
            del verification_codes[f'register_{email}']
            return jsonify({'message': 'Code expiré'}), 400
        if stored['code'] != code:
            return jsonify({'message': 'Code incorrect'}), 400

        # ✅ Code correct → créer compte en BDD
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO pharmacies
            (nom, email, mot_de_passe_hash, telephone,
             wilaya_id, commune_id, latitude, longitude,
             carte_identite, registre_commerce,
             statut, email_verifie)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'en_attente', TRUE)
        """, (
            stored['nom'],
            stored['email'],
            stored['mot_de_passe'],
            stored['telephone'],
            stored['wilaya_id'],
            stored['commune_id'],
            stored['latitude'],
            stored['longitude'],
            stored['carte_identite'],
            stored['registre_commerce'],
        ))
        mysql.connection.commit()
        del verification_codes[f'register_{email}']

        return jsonify({'message': 'Email confirmé, compte créé avec succès'})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500




@app.route('/api/pharmacie/profil/send-password-code', methods=['POST'])
def pharmacie_send_password_code():
    try:
        token        = request.headers.get('Authorization', '').replace('Bearer ', '')
        data         = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        pharmacie_id = data['id']

        cur = mysql.connection.cursor()
        cur.execute("SELECT email FROM pharmacies WHERE pharmacie_id = %s", (pharmacie_id,))
        p = cur.fetchone()
        if not p:
            return jsonify({'message': 'Pharmacie introuvable'}), 404

        code = generate_code()
        verification_codes[f'ph_password_{pharmacie_id}'] = {
            'code': code,
            'expires': datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
        }
        sent = send_code_email(p[0], code, 'Dwak Hna — Changement mot de passe')
        if not sent:
            return jsonify({'message': 'Erreur envoi email'}), 500
        return jsonify({'message': f'Code envoyé à {p[0]}'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/pharmacie/profil/verify-password', methods=['POST'])
def pharmacie_verify_password():
    try:
        token        = request.headers.get('Authorization', '').replace('Bearer ', '')
        data         = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        pharmacie_id = data['id']
        body         = request.get_json()
        code         = body.get('code')
        new_pass     = body.get('new_password')

        if not new_pass or len(new_pass) < 6:
            return jsonify({'message': 'Mot de passe trop court'}), 400

        stored = verification_codes.get(f'ph_password_{pharmacie_id}')
        if not stored:
            return jsonify({'message': 'Aucun code en attente'}), 400
        if datetime.datetime.utcnow() > stored['expires']:
            del verification_codes[f'ph_password_{pharmacie_id}']
            return jsonify({'message': 'Code expiré'}), 400
        if stored['code'] != code:
            return jsonify({'message': 'Code incorrect'}), 400

        cur = mysql.connection.cursor()
        cur.execute("UPDATE pharmacies SET mot_de_passe_hash = %s WHERE pharmacie_id = %s",
                    (new_pass, pharmacie_id))
        mysql.connection.commit()
        del verification_codes[f'ph_password_{pharmacie_id}']
        return jsonify({'message': 'Mot de passe mis à jour avec succès'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


# ============================================================
# WILAYAS ET COMMUNES (pour inscription)
# ============================================================

@app.route('/api/wilayas', methods=['GET'])
def get_wilayas():
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT wilaya_id, code, nom FROM wilayas ORDER BY code")
        rows = cur.fetchall()
        return jsonify({'wilayas': [
            {'wilaya_id': r[0], 'code': r[1], 'nom': r[2]} for r in rows
        ]})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/communes/<int:wilaya_id>', methods=['GET'])
def get_communes(wilaya_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT commune_id, nom FROM communes
            WHERE wilaya_id = %s ORDER BY nom
        """, (wilaya_id,))
        rows = cur.fetchall()
        return jsonify({'communes': [
            {'commune_id': r[0], 'nom': r[1]} for r in rows
        ]})
    except Exception as e:
        return jsonify({'message': str(e)}), 500


# ============================================================
# MESSAGES PREDEFINIS (pour pharmacie)
# ============================================================

@app.route('/api/pharmacie/messages-predefinis', methods=['GET'])
def get_messages_predefinis_pharmacie():
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT message_id, contenu FROM messages_predefinis
            WHERE type = 'pharmacie_reponse' AND est_actif = 1
            ORDER BY message_id
        """)
        rows = cur.fetchall()
        return jsonify({'messages': [
            {'message_id': r[0], 'contenu': r[1]} for r in rows
        ]})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

# ============================================================
# UPLOAD DOCUMENTS
# ============================================================
@app.route('/api/pharmacie/upload-document', methods=['POST'])
def upload_document():
    try:
        # Vérifier taille avant tout
        content_length = request.content_length
        if content_length and content_length > 50 * 1024 * 1024:
            return jsonify({'message': 'Fichier trop volumineux (max 50MB)'}), 413

        if 'file' not in request.files:
            return jsonify({'message': 'Aucun fichier fourni'}), 400

        file     = request.files['file']
        doc_type = request.form.get('type', 'document')
        email    = request.form.get('email', 'temp')

        if file.filename == '':
            return jsonify({'message': 'Fichier vide'}), 400

        if not allowed_file(file.filename):
            return jsonify({'message': 'Format non supporté ( PNG, JPG uniquement)'}), 400

        ext      = file.filename.rsplit('.', 1)[1].lower()
        filename = secure_filename(
            f"{doc_type}_{email.replace('@','_').replace('.','_')}_{int(datetime.datetime.now(datetime.timezone.utc).timestamp())}.{ext}"
        )
        filepath = os.path.join(UPLOAD_FOLDER, 'documents', filename)
        file.save(filepath)

        url = f"http://127.0.0.1:5000/uploads/documents/{filename}"
        return jsonify({'message': 'Document uploadé avec succès', 'url': url})

    except RequestEntityTooLarge:
        return jsonify({'message': 'Fichier trop volumineux (max 50MB)'}), 413
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500




# Servir les fichiers uploadés
from flask import send_from_directory

@app.route('/uploads/documents/<filename>')
def serve_document(filename):
    return send_from_directory(
        os.path.join(UPLOAD_FOLDER, 'documents'),
        filename
    )

# ============================================================
# RUN
# ============================================================

# tes routes ici...

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        debug=True
    )
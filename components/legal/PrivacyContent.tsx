'use client'
// components/legal/PrivacyContent.tsx
// Contenu réel de /legal/privacy — séparé de app/legal/privacy/page.tsx (qui
// reste un Server Component pour pouvoir exporter `metadata`) et rendu
// entièrement côté client avec LegalLayout, pour que les tableaux
// sections/essentials (objets contenant des éléments React) ne traversent
// jamais la frontière Server → Client Component en tant que props — un cas
// limite de la sérialisation RSC qui déclenchait de faux avertissements de
// clé React sans rapport avec le code lui-même.
import LegalLayout from '@/components/legal/LegalLayout'
import Brand from '@/components/ui/Brand'
import styles from '@/components/legal/LegalLayout.module.css'
import { PROVIDERS_LIVE_LABEL } from '@/lib/providers'
import { IconUser, IconMail, IconTrash, IconInfo, IconCheck } from '@/components/legal/icons'
import { IconBrain, IconLock, IconLink, IconShield } from '@/components/landing/icons'
import { BRAND_EMAIL, PRIVACY_EMAIL } from '@/lib/brand'

export default function PrivacyContent() {
  return (
    <LegalLayout
      title="Politique de confidentialité"
      updated="1er octobre 2026"
      readingMinutes={5}
      essentialsTitle="L’essentiel, avant le texte complet"
      essentials={[
        { icon: <IconCheck />, text: <>Vos emails sont analysés pour vous aider, <strong>jamais utilisés pour entraîner un modèle d’IA</strong>.</> },
        { icon: <IconCheck />, text: <>Aucune réponse n’est <strong>jamais envoyée automatiquement</strong> — vous validez chaque brouillon.</> },
        { icon: <IconCheck />, text: <>Vos jetons de connexion sont <strong>chiffrés</strong>, et vos données <strong>isolées</strong> de celles des autres utilisateurs.</> },
        { icon: <IconCheck />, text: <>Vous pouvez <strong>tout supprimer</strong> en une demande, à tout moment.</> },
      ]}
      sections={[
        {
          id: 'qui-sommes-nous',
          icon: <IconUser />,
          title: 'Qui nous sommes',
          content: (
            <>
              <div className={styles.signature}>
                <span className={styles.signatureAvatar}>SR</span>
                <div>
                  <p className={styles.signatureName}>Steven Rakotomandimby</p>
                  <p className={styles.signatureRole}>Développeur et éditeur de <Brand /></p>
                </div>
              </div>
              <p>
                <Brand /> est actuellement développé et édité à titre individuel par Steven Rakotomandimby. Le service n’est
                pas encore exploité au sein d’une société immatriculée ; cette page sera mise à jour avec les mentions
                légales complètes dès que ce sera le cas. Pour toute question relative à vos données personnelles, vous
                pouvez écrire directement à <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
              </p>
            </>
          ),
        },
        {
          id: 'donnees-collectees',
          icon: <IconMail />,
          title: 'Données que nous collectons',
          content: (
            <>
              <p>Pour fonctionner, <Brand /> traite les données suivantes :</p>
              <ul>
                <li><strong>Informations de compte</strong> — nom, adresse email, mot de passe (jamais stocké en clair, géré par notre fournisseur d’authentification).</li>
                <li><strong>Contenu de votre boîte mail</strong> — une fois votre compte {PROVIDERS_LIVE_LABEL} connecté, nous lisons vos emails (objet, expéditeur, corps du message, pièces jointes) afin de les trier, les résumer, en proposer des réponses et détecter les rendez-vous qu’ils contiennent. C’est strictement nécessaire au fonctionnement du produit.</li>
                <li><strong>Jetons de connexion OAuth</strong> — chiffrés au repos (AES-256-GCM) avant stockage, jamais transmis en clair ni accessibles depuis votre navigateur.</li>
                <li><strong>Données d’usage du produit</strong> — tâches, événements d’agenda, préférences de notification, compteur d’utilisation de l’IA pour l’application du forfait choisi.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'intelligence-artificielle',
          icon: <IconBrain />,
          title: "Utilisation de l’intelligence artificielle",
          content: (
            <p>
              Le contenu de vos emails est transmis à notre fournisseur d’inférence IA (Groq) au moment de l’analyse,
              uniquement pour générer la classification, le résumé et la proposition de réponse associés à cet email
              précis. Ce contenu n’est ni conservé par ce fournisseur au-delà du traitement de la requête, ni utilisé
              pour entraîner un quelconque modèle. Aucune réponse n’est jamais envoyée automatiquement en votre nom :
              toute réponse générée reste un brouillon que vous devez relire et valider vous-même.
            </p>
          ),
        },
        {
          id: 'api-google',
          icon: <IconLink />,
          title: 'Utilisation des API Google',
          content: (
            <>
              <div className={styles.callout}>
                L’utilisation et le transfert, par <Brand />, des informations reçues des API Google vers toute autre application
                respecteront la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>,
                y compris les exigences de Limited Use.
              </div>
              <p>
                <Brand /> demande l’accès à votre compte Gmail (lecture, envoi, modification) et, en option, à votre Google
                Agenda, uniquement pour fournir les fonctionnalités que vous utilisez directement dans l’application :
                tri des emails, rédaction de brouillons de réponse, et synchronisation des rendez-vous détectés. Ces
                accès ne sont jamais utilisés à des fins publicitaires.
              </p>
            </>
          ),
        },
        {
          id: 'partage',
          icon: <IconShield />,
          title: 'Partage avec des tiers',
          content: (
            <>
              <p>Nous faisons appel aux sous-traitants suivants, chacun n’ayant accès qu’aux données strictement nécessaires à sa fonction :</p>
              <ul>
                <li><strong>Supabase</strong> — hébergement de la base de données et authentification. Vos données sont stockées dans l’Union européenne (Irlande).</li>
                <li><strong>Groq</strong> — analyse IA du contenu des emails (voir section précédente). <strong>Société établie aux États-Unis</strong> : voir « Transferts hors de l’Union européenne » ci-dessous.</li>
                <li><strong>Vercel</strong> — hébergement de l’application et exécution des traitements serveur.</li>
                <li><strong>Google</strong> — fournisseur d’accès Gmail / Google Calendar lorsque vous connectez ces services.</li>
              </ul>
              <p>Nous ne vendons ni ne louons vos données personnelles à qui que ce soit.</p>
            </>
          ),
        },
        {
          // Article 13.1.f du RGPD : informer de tout transfert vers un pays
          // tiers et des garanties qui l'encadrent. Cette section manquait
          // entièrement, alors que le CONTENU DES EMAILS — la donnée la plus
          // sensible du produit — part chez Groq, société américaine.
          // Le mot « transfert » n'apparaissait que dans la section Google,
          // à propos d'un sujet sans rapport.
          id: 'transferts',
          icon: <IconShield />,
          title: 'Transferts hors de l’Union européenne',
          content: (
            <>
              <p>
                Votre base de données est hébergée dans l’Union européenne (Irlande). En revanche,
                l’analyse de vos emails est réalisée par <strong>Groq, Inc.</strong>, société établie
                aux <strong>États-Unis</strong>. Le contenu des emails analysés y est donc transmis,
                le temps du traitement.
              </p>
              <p>
                Concrètement : l’objet, l’expéditeur et un extrait du corps de chaque email analysé
                sortent de l’Union européenne. Ces données ne sont pas conservées par <Brand /> chez
                ce prestataire — seul le résultat de l’analyse (priorité, résumé, points clés,
                brouillon de réponse) revient et est stocké dans l’Union européenne.
              </p>
              <p>
                Si ce transfert vous pose problème, la seule façon de l’éviter aujourd’hui est de ne
                pas connecter de boîte mail : sans analyse, aucune donnée ne sort de l’Union.
              </p>
            </>
          ),
        },
        {
          // Article 13.1.c : indiquer la base légale de chaque traitement.
          // Elle n'était écrite nulle part.
          id: 'base-legale',
          icon: <IconInfo />,
          title: 'Sur quelle base nous traitons vos données',
          content: (
            <ul>
              <li>
                <strong>Exécution du contrat</strong> (art. 6.1.b du RGPD) — pour tout ce qui constitue
                le service lui-même : tri des emails, résumés, brouillons de réponse, tâches, agenda.
                Sans ces traitements, il n’y a pas de produit.
              </li>
              <li>
                <strong>Votre consentement</strong> (art. 6.1.a) — pour l’accès à votre boîte Gmail et à
                votre Google Agenda. Vous le donnez lors de l’autorisation Google et vous pouvez le
                retirer à tout moment en déconnectant la boîte depuis les réglages.
              </li>
              <li>
                <strong>Obligation légale</strong> (art. 6.1.c) — pour la conservation des pièces
                comptables, le jour où le service devient payant.
              </li>
            </ul>
          ),
        },
        {
          id: 'securite',
          icon: <IconLock />,
          title: 'Sécurité',
          content: (
            <ul>
              <li>Chiffrement des jetons OAuth au repos (AES-256-GCM, clé serveur uniquement).</li>
              <li>Isolation stricte des données par utilisateur au niveau de la base de données (Row Level Security) — un utilisateur ne peut techniquement jamais accéder aux données d’un autre.</li>
              <li>Connexions chiffrées (HTTPS/TLS) de bout en bout.</li>
              <li>Le contenu HTML des emails affichés est nettoyé puis isolé dans un cadre restreint avant affichage, pour empêcher tout code malveillant qu’un email reçu pourrait contenir de s’exécuter.</li>
            </ul>
          ),
        },
        {
          id: 'conservation',
          icon: <IconTrash />,
          title: 'Conservation et suppression',
          content: (
            <p>
              Vos données sont conservées tant que votre compte existe. Vous pouvez supprimer votre compte vous-même,
              à tout moment, depuis Réglages → Zone de danger : cette action entraîne la suppression immédiate et
              définitive de l’ensemble des données associées (emails indexés, tâches, événements, jetons de connexion).
              Pour toute question, contactez <a href={`mailto:${BRAND_EMAIL}`}>{BRAND_EMAIL}</a>.
            </p>
          ),
        },
        {
          id: 'droits',
          icon: <IconInfo />,
          title: 'Vos droits',
          content: (
            <p>
              Conformément au RGPD, vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation,
              d’opposition et de portabilité de vos données, ainsi que du droit de retirer votre consentement à tout
              moment (notamment en déconnectant votre boîte mail depuis les réglages). Deux d’entre eux s’exercent
              sans nous écrire, directement depuis Réglages → Sécurité : l’export complet de vos données
              (portabilité) et la suppression définitive de votre compte (effacement). Nous répondons à toute
              demande dans un délai maximum d’un mois. Pour exercer ces droits, écrivez à{' '}
              <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. Vous pouvez également introduire une réclamation
              auprès de la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">cnil.fr</a>).
            </p>
          ),
        },
        {
          id: 'modifications',
          icon: <IconMail />,
          title: 'Modifications de cette politique',
          content: (
            <p>
              Nous pouvons mettre à jour cette politique de confidentialité pour refléter des évolutions du produit ou
              de la réglementation. Toute modification substantielle vous sera communiquée par email ou via l’application.
            </p>
          ),
        },
      ]}
    />
  )
}

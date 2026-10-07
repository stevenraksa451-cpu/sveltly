'use client'
// components/legal/TermsContent.tsx — voir PrivacyContent.tsx pour
// l'explication de cette séparation (évite de passer des éléments React
// comme props à travers la frontière Server → Client Component).
import LegalLayout from '@/components/legal/LegalLayout'
import Brand from '@/components/ui/Brand'
import { IconUser, IconCard, IconBan, IconCopyright, IconAlert, IconDoor, IconScale, IconMessage, IconCheck } from '@/components/legal/icons'
import { IconBrain } from '@/components/landing/icons'
import styles from '@/components/legal/LegalLayout.module.css'

export default function TermsContent() {
  return (
    <LegalLayout
      title="Conditions générales d'utilisation"
      updated="1er octobre 2026"
      readingMinutes={4}
      essentialsTitle="L'essentiel, avant le texte complet"
      essentials={[
        { icon: <IconCheck />, text: <>Le forfait Gratuit est <strong>vraiment gratuit</strong>, aucune carte requise.</> },
        { icon: <IconCheck />, text: <>Vous gardez le <strong>contrôle total</strong> sur chaque brouillon généré par l'IA.</> },
        { icon: <IconCheck />, text: <>Vous pouvez <strong>résilier à tout moment</strong>, sans justification.</> },
        { icon: <IconCheck />, text: <>Droit français — litiges traités de façon <strong>équitable et transparente</strong>.</> },
      ]}
      sections={[
        {
          id: 'objet',
          icon: <IconUser />,
          title: 'Objet',
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
                Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation du service
                <Brand />, une application de gestion d'emails assistée par intelligence artificielle, actuellement
                développée et éditée à titre individuel par Steven Rakotomandimby. En créant un compte, vous acceptez
                sans réserve les présentes CGU.
              </p>
            </>
          ),
        },
        {
          id: 'description',
          icon: <IconBrain />,
          title: 'Description du service',
          content: (
            <p>
              <Brand /> se connecte à votre boîte mail (Gmail ou Outlook) pour trier automatiquement vos emails par priorité,
              générer des résumés et des brouillons de réponse, et détecter les rendez-vous mentionnés afin de les
              proposer à votre agenda. Aucune réponse n'est jamais envoyée automatiquement : chaque brouillon généré
              par l'IA doit être relu et validé par vous avant tout envoi.
            </p>
          ),
        },
        {
          id: 'compte',
          icon: <IconUser />,
          title: 'Compte utilisateur',
          content: (
            <p>
              Vous êtes responsable de la confidentialité de vos identifiants et de toute activité effectuée depuis
              votre compte. Vous vous engagez à fournir des informations exactes lors de votre inscription et à nous
              informer de toute utilisation non autorisée de votre compte.
            </p>
          ),
        },
        {
          id: 'forfaits',
          icon: <IconCard />,
          title: 'Forfaits et facturation',
          content: (
            <p>
              <Brand /> propose un forfait Gratuit et un forfait Pro payant, dont le détail (fonctionnalités, limites,
              tarifs) est présenté sur notre page d'accueil et dans les réglages de l'application. Les tarifs peuvent
              évoluer ; toute modification vous sera communiquée à l'avance et n'affectera pas une période déjà payée.
            </p>
          ),
        },
        {
          id: 'utilisation',
          icon: <IconBan />,
          title: 'Utilisation acceptable',
          content: (
            <>
              <p>Vous vous engagez à ne pas utiliser <Brand /> pour :</p>
              <ul>
                <li>Envoyer des messages illégaux, frauduleux, diffamatoires ou constitutifs de harcèlement.</li>
                <li>Tenter d'accéder aux données d'un autre utilisateur ou de contourner les mesures de sécurité du service.</li>
                <li>Surcharger intentionnellement l'infrastructure du service (par exemple par des requêtes automatisées abusives).</li>
                <li>Utiliser les brouillons générés par l'IA à des fins de spam ou de prospection non sollicitée.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'propriete',
          icon: <IconCopyright />,
          title: 'Propriété intellectuelle',
          content: (
            <p>
              Le service <Brand />, sa marque, son interface et son code sont la propriété exclusive de son éditeur. Vous
              conservez l'intégralité des droits sur le contenu de vos emails ; <Brand /> n'en revendique aucun usage
              au-delà de ce qui est nécessaire au fonctionnement du service (voir notre{' '}
              <a href="/legal/privacy">politique de confidentialité</a>).
            </p>
          ),
        },
        {
          id: 'responsabilite',
          icon: <IconAlert />,
          title: 'Limitation de responsabilité',
          content: (
            <p>
              Les classifications, résumés et brouillons de réponse générés par l'intelligence artificielle de <Brand />
              sont fournis à titre d'assistance et peuvent contenir des erreurs. Il vous appartient de vérifier leur
              exactitude avant toute action (envoi d'un email, ajout d'un événement à l'agenda). <Brand /> ne saurait être
              tenu responsable des conséquences d'une information erronée générée par l'IA que vous auriez utilisée
              sans vérification.
            </p>
          ),
        },
        {
          id: 'resiliation',
          icon: <IconDoor />,
          title: 'Résiliation',
          content: (
            <p>
              Vous pouvez supprimer votre compte à tout moment en nous contactant à{' '}
              <a href="mailto:support@sveltly.fr">support@sveltly.fr</a>. Nous nous réservons le droit de suspendre ou
              résilier un compte en cas de violation manifeste des présentes CGU.
            </p>
          ),
        },
        {
          id: 'droit-applicable',
          icon: <IconScale />,
          title: 'Droit applicable',
          content: (
            <p>
              Les présentes CGU sont soumises au droit français. Tout litige relatif à leur interprétation ou leur
              exécution relève de la compétence des tribunaux français, sous réserve des dispositions légales
              impératives applicables aux consommateurs.
            </p>
          ),
        },
        {
          id: 'contact',
          icon: <IconMessage />,
          title: 'Contact',
          content: (
            <p>
              Pour toute question relative aux présentes CGU, contactez-nous à{' '}
              <a href="mailto:support@sveltly.fr">support@sveltly.fr</a>.
            </p>
          ),
        },
      ]}
    />
  )
}

'use client'
// app/help/page.tsx
import { useState, ReactNode } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Brand from '@/components/ui/Brand'
import styles from './help.module.css'

const FAQ = [
  {
    q: 'Comment connecter ma boîte Gmail ?',
    a: 'Lors de la connexion, cliquez sur « Continuer avec Google » et acceptez les permissions Gmail. Votre boîte est connectée automatiquement.'
  },
  {
    q: 'Comment fonctionne le tri par priorité ?',
    a: <><Brand /> analyse le sujet et le contenu de chaque email pour le classer en urgent, important ou normal, selon la présence d'un délai, d'une action demandée, ou du type d'expéditeur.</>
  },
  {
    q: 'Les réponses IA sont-elles envoyées automatiquement ?',
    a: 'Non. Ce sont des brouillons que vous pouvez modifier avant d\'envoyer — vous gardez le contrôle total sur ce qui part de votre boîte.'
  },
  {
    q: 'Comment les rendez-vous sont-ils ajoutés à mon agenda ?',
    a: <><Brand /> détecte les dates et heures mentionnées dans un email, vérifie vos disponibilités et vos horaires de travail, puis ajoute l'événement à votre agenda — sans double réservation.</>
  },
  {
    q: 'Mon token Gmail a expiré, que faire ?',
    a: <><Brand /> renouvelle automatiquement votre token en arrière-plan. Si le problème persiste, déconnectez-vous puis reconnectez-vous avec Google.</>
  },
  {
    q: 'Comment changer le ton des réponses IA ?',
    a: 'Dans Paramètres → Intelligence artificielle → Ton des réponses. Choisissez entre professionnel, formel ou décontracté.'
  },
  {
    q: 'Mes données sont-elles protégées ?',
    a: 'Oui. Chaque compte n\'a accès qu\'à ses propres données grâce à des règles d\'accès strictes au niveau de la base de données. Nous ne traitons vos emails que pour les fonctions que vous activez vous-même.'
  },
  {
    q: 'Puis-je connecter plusieurs boîtes mail ?',
    a: 'Depuis Paramètres → Boîtes mail, vous pouvez ajouter un nouveau compte à tout moment via le bouton « Ajouter une boîte mail ».'
  },
]

const QUICKSTART = [
  { n: '01', color: 'stepAccent', title: 'Connectez Gmail', text: <>Une autorisation, et <Brand /> commence à lire votre boîte de réception.</> },
  { n: '02', color: 'stepDusk', title: <><Brand /> trie et rédige</>, text: 'Chaque email reçoit une priorité et, si besoin, un brouillon de réponse prêt à relire.' },
  { n: '03', color: 'stepGold', title: 'Votre agenda se remplit', text: 'Les rendez-vous détectés dans vos emails apparaissent directement dans le calendrier.' },
]

export default function HelpPage() {
  return (
    <AppLayout title="Aide & Support" subtitle="Comment pouvons-nous vous aider ?">
      <div className={styles.layout}>

        {/* Bannière contact */}
        <div className={styles.banner}>
          <div className={styles.bannerContent}>
            <span className={styles.bannerIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            <div>
              <p className={styles.bannerTitle}>Besoin d'aide personnalisée ?</p>
              <p className={styles.bannerDesc}>Notre équipe répond sous 24h</p>
            </div>
          </div>
          <a href="mailto:support@sveltly.fr" className={styles.bannerBtn}>
            Contacter le support
          </a>
        </div>

        <div className={styles.cols}>
          {/* FAQ */}
          <div className={styles.faqSection}>
            <h2 className={styles.sectionTitle}>Questions fréquentes</h2>
            <div className={styles.faqList}>
              {FAQ.map((item, i) => (
                <FAQItem key={i} question={item.q} answer={item.a} />
              ))}
            </div>
          </div>

          {/* Démarrage rapide + Info */}
          <div className={styles.aside}>
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Démarrage rapide</h2>
              <div className={styles.quickstart}>
                {QUICKSTART.map(step => (
                  <div key={step.n} className={styles.quickstartRow}>
                    <span className={`${styles.quickstartNum} ${styles[step.color]}`}>{step.n}</span>
                    <div>
                      <p className={styles.quickstartTitle}>{step.title}</p>
                      <p className={styles.quickstartText}>{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>À propos de <Brand /></h2>
              <div className={styles.about}>
                <p>Version <strong>1.0.0</strong></p>
                <p>Propulsé par <strong>Groq AI</strong> et <strong>Gmail API</strong></p>
                <p>Base de données <strong>Supabase</strong></p>
                <p className={styles.aboutFootnote}>
                  © {new Date().getFullYear()} <Brand />. Tous droits réservés.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function FAQItem({ question, answer }: { question: ReactNode; answer: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`${styles.faqItem} ${open ? styles.faqOpen : ''}`}>
      <button className={styles.faqQuestion} onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{question}</span>
        <svg
          className={styles.faqChevron}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className={styles.faqAnswer}>
          <p>{answer}</p>
        </div>
      )}
    </div>
  )
}

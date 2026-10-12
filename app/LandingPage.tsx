'use client'
import { useState } from 'react'
import Link from 'next/link'
import '@/styles/marketing.css'
import Logo from '@/components/ui/Logo'
import Brand from '@/components/ui/Brand'
import ImpactCalculator from '@/components/landing/ImpactCalculator'
import Reveal from '@/components/landing/Reveal'
import Navbar from '@/components/landing/nav/Navbar'
import SiteFooter from '@/components/marketing/SiteFooter'
import ScrollProgress from '@/components/landing/ScrollProgress'
import HeroSpotlight from '@/components/landing/HeroSpotlight'
import ParallaxImage from '@/components/landing/ParallaxImage'
import ProviderMarks from '@/components/landing/ProviderMarks'
import { PROVIDERS_LIVE_LABEL } from '@/lib/providers'
import ProductPreview from '@/components/landing/ProductPreview'
import PaperPlaneDoodle from '@/components/landing/PaperPlaneDoodle'
import SparkleDoodle from '@/components/landing/SparkleDoodle'
import ConfettiDoodle from '@/components/landing/ConfettiDoodle'
import PriorityBadge from '@/components/ui/PriorityBadge'
import { IconCalendar, IconFocus, IconLock, IconLink, IconBrain, IconShield, IconSync, IconCheckSquare, IconCode, IconPalette, IconBriefcase, IconPen, IconUsers, IconKey, IconDatabase, IconTrash } from '@/components/landing/icons'
import { PLANS, formatPrice } from '@/lib/plans'
import { SAVINGS_RATIO } from '@/lib/time-saved'
import styles from './page.module.css'

// Repère affiché dans le badge du hero. Calculé depuis SAVINGS_RATIO et la
// même base de 8 h/semaine que le simulateur plus bas, pour que les deux
// chiffres de la page concordent — un visiteur qui fait défiler retrouve
// exactement le même résultat. Remplace un « 8 h gagnées par semaine en
// moyenne » qui annonçait une moyenne mesurée sur une base d'utilisateurs
// que le produit, tout juste lancé, n'a pas encore.
const BASELINE_EMAIL_HOURS = 8
const HOURS_GIVEN_BACK = Math.round(BASELINE_EMAIL_HOURS * SAVINGS_RATIO)

// Les 4 fonctionnalités "secondaires" de la grille bento (tuiles simples,
// icône + texte) — les 3 principales (tri, réponses IA, calendrier) ont
// chacune un mini-aperçu dédié, écrit directement dans le JSX ci-dessous
// plutôt que dans ce tableau, pour ne pas forcer des visuels différents
// dans une structure de données commune.
const SMALL_FEATURES = [
  { number: '03', icon: <IconCalendar />, title: 'Agenda automatique', desc: 'Les rendez-vous et réunions mentionnés dans vos emails sont détectés et ajoutés à votre agenda sans aucune action de votre part.' },
  { number: '04', icon: <IconCheckSquare />, title: 'Tâches automatiques', desc: <><Brand /> repère les actions à faire dans vos emails et les transforme en tâches, classées et prêtes à traiter — sans que vous ayez à les recopier.</> },
  { number: '06', icon: <IconFocus />, title: 'Zéro distraction', desc: 'Une interface pensée pour aller à l\'essentiel. Pas de notifications inutiles, pas de complexité. Juste vos emails, organisés.' },
  // "Chiffrement de bout en bout" retiré : le produit ne l'implémente pas et
  // ne peut pas l'implémenter — les emails doivent être lisibles côté serveur
  // pour être analysés. Remplacé par ce qui est réellement en place (voir la
  // section #securite et components/landing/nav/navConfig.tsx).
  { number: '07', icon: <IconLock />, title: 'Vos données restent privées', desc: 'Données cloisonnées compte par compte, jetons de connexion chiffrés au repos — vos emails ne sont jamais partagés ni utilisés pour entraîner un modèle.' },
]

// Cibles des entrées du menu "Solutions". Volontairement factuel : chaque
// ligne décrit ce que le produit fait déjà pour ce métier, sans promesse
// chiffrée ni témoignage inventé.
const SOLUTIONS = [
  { icon: <IconCode />, title: 'Développeurs', desc: <>Les demandes qui peuvent attendre descendent d’elles-mêmes dans la liste. Vos plages de concentration ne sont interrompues que par ce qui est réellement urgent.</> },
  { icon: <IconPalette />, title: 'Designers', desc: 'Les retours clients arrivent résumés en une phrase, avec les points clés extraits — vous voyez ce qui est demandé avant d’ouvrir le fil.' },
  { icon: <IconBriefcase />, title: 'Consultants', desc: 'Une relance qui devient pressante est classée urgente avant qu’elle ne vous coûte un client. Les réunions mentionnées atterrissent dans l’agenda.' },
  { icon: <IconPen />, title: 'Rédacteurs & traducteurs', desc: <>Un brief, une échéance, une consigne : <Brand /> en fait une tâche datée, sans que vous ayez à recopier quoi que ce soit.</> },
  { icon: <IconUsers />, title: 'Indépendants multi-clients', desc: 'Plusieurs boîtes Gmail réunies dans une seule vue, triées ensemble, avec les doublons écartés automatiquement.' },
]

// Affirmations de sécurité. Chacune est vérifiable dans le dépôt — voir
// components/landing/nav/navConfig.tsx, qui liste les références. Rien n'est
// affirmé au-delà : aucune certification, aucune promesse de chiffrement
// de bout en bout.
const SECURITY_POINTS = [
  { icon: <IconKey />, title: 'Connexion Gmail par OAuth', desc: 'Vous autorisez Sveltly depuis Google. Votre mot de passe Gmail ne transite jamais par nos serveurs, et nous ne pouvons pas le connaître.' },
  { icon: <IconDatabase />, title: 'Données cloisonnées par compte', desc: 'La base applique le Row Level Security : une requête ne peut techniquement retourner que vos propres lignes, jamais celles d’un autre utilisateur.' },
  { icon: <IconShield />, title: 'Jetons chiffrés au repos', desc: 'Les jetons d’accès Google sont chiffrés en AES-256-GCM avant stockage, avec une clé qui ne quitte jamais le serveur.' },
  { icon: <IconLock />, title: 'Usage limité des données Gmail', desc: 'Vos emails servent à les trier, les résumer et proposer des réponses — rien d’autre. Jamais de revente, jamais d’entraînement de modèle.' },
  { icon: <IconTrash />, title: 'Suppression définitive', desc: 'Un bouton dans vos réglages supprime le compte, les données associées et les jetons de connexion. Sans délai et sans démarche à faire.' },
]

const STEPS = [
  // PROVIDERS_LIVE_LABEL, pas « Gmail ou Outlook » en dur : cette étape décrit
  // ce qu'on peut faire maintenant, et Outlook n'est pas encore branché.
  { number: '1', icon: <IconLink />, title: 'Connectez votre boîte mail', desc: <>{PROVIDERS_LIVE_LABEL}, en toute sécurité via OAuth. <Brand /> ne stocke jamais votre mot de passe.</> },
  { number: '2', icon: <IconBrain />, title: 'L\'IA analyse vos emails', desc: 'Chaque message est classé par priorité et une réponse est proposée automatiquement, prête à relire.' },
  { number: '3', icon: <IconShield />, title: 'Vous gardez le contrôle', desc: 'Vous validez, modifiez ou ignorez chaque suggestion. Rien n\'est envoyé sans votre accord.' },
]

const FAQ = [
  { q: <>Est-ce que <Brand /> lit vraiment mes emails ?</>, a: 'Oui, c\'est nécessaire pour l\'analyse et la classification. Vos données ne sont jamais partagées ni utilisées à d\'autres fins.' },
  { q: 'Les réponses sont-elles envoyées automatiquement ?', a: <>Non, jamais. <Brand /> rédige des brouillons que vous devez relire et valider vous-même avant tout envoi.</> },
  { q: 'Est-ce gratuit ?', a: 'Oui. La création de compte et l\'utilisation de base sont gratuites.' },
  { q: <><Brand /> est-il un produit récent ?</>, a: <>Oui, <Brand /> vient d'être lancé. Vous faites partie des premiers utilisateurs à le tester.</> },
]

export default function LandingPage() {
  const [annual, setAnnual] = useState(true)

  // « mkc » ne peint rien : il pose les tokens --mk-*, dont --mk-max et
  // --mk-gutter, qui règlent désormais le cadre de la landing comme celui des
  // pages vitrine. Les couleurs de la landing restent les siennes.
  return (
    <div className={`mkc ${styles.page}`}>
      <ScrollProgress />
      <Navbar />

      <section className={styles.heroSection}>
        <div className={styles.bgGlow} aria-hidden="true" />
        <div className={styles.bgGrid} aria-hidden="true" />
        <HeroSpotlight />

        <div className={styles.hero}>
          {/* immediate : contenu au-dessus de la ligne de flottaison, il ne
              doit jamais partir à opacity 0 (voir Reveal.tsx). */}
          <Reveal variant="up" immediate>
            <div className={styles.heroContent}>
              <PaperPlaneDoodle size={34} className={styles.heroPlane} />
              <div className={styles.badge}>
                ~{HOURS_GIVEN_BACK} h rendues par semaine sur {BASELINE_EMAIL_HOURS} h d'emails
              </div>
              <h1 className={styles.heroTitle}>
                Planifiez. Simplifiez.<br />
                <span className={styles.heroAccentWrap}>
                  <span className={styles.heroAccent}>Avancez.</span>
                  <SparkleDoodle size={20} rotate={14} className={styles.heroSparkle} />
                </span>
              </h1>
              <p className={styles.heroDesc}>
                <Brand /> centralise vos emails, votre agenda et vos tâches pour vous aider à rester concentré sur l'essentiel.
              </p>
              <div className={styles.heroCtas}>
                <Link href="/auth/register" className={styles.heroCta}>Commencer gratuitement</Link>
              </div>
              {/* La note « Gratuit · … » a sauté : le bouton juste au-dessus
                  dit déjà « Commencer gratuitement ». La ligne sert mieux à
                  répondre à la question suivante — avec quelle boîte ? */}
              <ProviderMarks />
            </div>
          </Reveal>
        </div>

        <Reveal variant="scale" delay={150} immediate className={styles.heroVisual}>
          <ProductPreview />
        </Reveal>
      </section>

      <Reveal variant="left">
        <section className={styles.photoSection}>
          <div className={styles.photoContent}>
            <h2 className={styles.photoTitle}>
              Une meilleure façon de travailler.
              <SparkleDoodle size={14} rotate={-8} className={styles.titleSparkle} />
            </h2>
            <p className={styles.photoDesc}>
              <Brand /> réunit vos emails, votre agenda et vos priorités dans un seul espace, afin de simplifier votre quotidien et de garder le contrôle sur votre temps.
            </p>
          </div>
          <ParallaxImage
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=80"
            alt="Freelance travaillant sereinement sur son ordinateur"
          />
        </section>
      </Reveal>

      <Reveal variant="scale">
        <ImpactCalculator />
      </Reveal>

      <Reveal variant="up">
        <section id="how" className={styles.howSection}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Trois étapes, aucune configuration compliquée</h2>
          </div>
          <div className={styles.stepsGrid}>
            {STEPS.map((s, i) => (
              <Reveal key={s.number} variant="up" delay={i * 100}>
                <div className={styles.stepCard}>
                  <div className={styles.stepIconWrap}>{s.icon}</div>
                  <span className={styles.stepNumber}>{s.number}</span>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Section cible des entrées du menu "Solutions" : aucune page par
          métier n'existe, et créer cinq pages vides aurait produit cinq
          liens morts. */}
      <Reveal variant="up">
        <section id="solutions" className={styles.solutions}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Conçu pour ceux qui travaillent seuls</h2>
            <p className={styles.sectionDesc}>
              Sans assistant pour filtrer vos emails, chaque message vous revient. <Brand /> fait
              ce premier tri à votre place, quel que soit votre métier.
            </p>
          </div>
          <div className={styles.solutionsGrid}>
            {SOLUTIONS.map((s, i) => (
              <Reveal key={s.title} variant="up" delay={i * 70}>
                <div className={styles.solutionCard}>
                  <span className={styles.solutionIcon}>{s.icon}</span>
                  <h3 className={styles.solutionTitle}>{s.title}</h3>
                  <p className={styles.solutionDesc}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal variant="right">
        <section className={styles.photoSectionReverse}>
          <ParallaxImage
            src="https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=900&q=80"
            alt="Bureau organisé avec agenda et planification claire"
          />
          <div className={styles.photoContent}>
            <h2 className={styles.photoTitle}>
              Le problème du calendrier éclaté, enfin résolu.
              <SparkleDoodle size={14} rotate={10} className={styles.titleSparkle} />
            </h2>
            <p className={styles.photoDesc}>
              Chaque réunion mentionnée dans un email atterrit directement dans votre agenda — plus besoin de la recopier vous-même.
              Et avec la synchronisation Google Calendar (Pro), plus besoin non plus de jongler entre deux calendriers : <Brand /> et
              Google Calendar restent alignés en permanence, dans les deux sens.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal variant="up">
        <section id="features" className={styles.features}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Tout ce dont vous avez besoin</h2>
            <p className={styles.sectionDesc}>
              Une plateforme complète pour reprendre le contrôle de vos communications professionnelles.
            </p>
          </div>
          <div className={styles.bentoGrid}>
            {/* Tuile principale — tri intelligent, avec un vrai mini-aperçu
                de la boîte de réception plutôt qu'une icône abstraite. */}
            <Reveal variant="scale" delay={0} className={`${styles.bentoTile} ${styles.bentoBig}`}>
              <div className={styles.bentoText}>
                <span className={styles.featureNumber}>01</span>
                <h3 className={styles.bentoTitle}>
                  Tri intelligent
                  <SparkleDoodle size={16} rotate={-10} />
                </h3>
                <p className={styles.bentoDesc}>
                  Chaque email est analysé et classé automatiquement selon son urgence. Urgent, important ou normal — vous savez immédiatement sur quoi vous concentrer.
                </p>
              </div>
              <div className={styles.mockInbox} aria-hidden="true">
                <div className={styles.mockInboxRow}>
                  <span className={styles.mockAvatar}>ML</span>
                  <div className={styles.mockRowBody}>
                    <p className={styles.mockSender}>Marine Lecomte</p>
                    <p className={styles.mockPreview}>Pouvez-vous valider le devis avant vendredi ?</p>
                  </div>
                  <PriorityBadge priority="urgent" size="sm" />
                </div>
                <div className={styles.mockInboxRow}>
                  <span className={styles.mockAvatar}>TB</span>
                  <div className={styles.mockRowBody}>
                    <p className={styles.mockSender}>Thomas Bernard</p>
                    <p className={styles.mockPreview}>Réunion déplacée à 15h, salle B.</p>
                  </div>
                  <PriorityBadge priority="important" size="sm" />
                </div>
                <div className={styles.mockInboxRow}>
                  <span className={styles.mockAvatar}>CN</span>
                  <div className={styles.mockRowBody}>
                    <p className={styles.mockSender}>Camille Noël</p>
                    <p className={styles.mockPreview}>Merci pour votre retour rapide.</p>
                  </div>
                  <PriorityBadge priority="normal" size="sm" />
                </div>
              </div>
            </Reveal>

            {/* Tuile moyenne — réponses IA, avec un mini-aperçu du brouillon généré */}
            <Reveal variant="scale" delay={80} className={`${styles.bentoTile} ${styles.bentoMed}`}>
              <span className={styles.featureNumber}>02</span>
              <h3 className={styles.bentoTitle}>Réponses générées par l'IA</h3>
              <p className={styles.bentoDesc}>
                Des brouillons adaptés au contexte et au ton de l'expéditeur. Vous relisez, vous ajustez, vous envoyez.
              </p>
              <div className={styles.mockReply} aria-hidden="true">
                <p className={styles.mockQuoted}>« Pouvez-vous valider le devis avant vendredi ? »</p>
                <p className={styles.mockReplyText}>Bonjour Marine, le devis est validé de mon côté. Je vous transmets la version signée d'ici vendredi.</p>
                <span className={styles.mockReadyChip}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  Prêt à envoyer
                </span>
              </div>
            </Reveal>

            {/* Tuile moyenne — synchronisation Google Calendar (Pro) */}
            <Reveal variant="scale" delay={160} className={`${styles.bentoTile} ${styles.bentoMed} ${styles.bentoPremium}`}>
              <span className={styles.featureProBadge}>Pro</span>
              <span className={styles.featureNumber}>05</span>
              <h3 className={styles.bentoTitle}>Google Calendar, toujours à jour</h3>
              <p className={styles.bentoDesc}>
                Chaque changement se synchronise automatiquement dans les deux sens, sans jamais rien recopier.
              </p>
              <div className={styles.mockSync} aria-hidden="true">
                <span className={styles.mockSyncChip}><Brand /></span>
                <span className={styles.mockSyncIcon}><IconSync /></span>
                <span className={styles.mockSyncChip}>Google Calendar</span>
              </div>
            </Reveal>

            {SMALL_FEATURES.map((f, i) => (
              <Reveal key={f.title} variant="scale" delay={240 + i * 80} className={`${styles.bentoTile} ${styles.bentoSmall}`}>
                <div className={styles.featureIconWrap}>{f.icon}</div>
                <span className={styles.featureNumber}>{f.number}</span>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal variant="left">
        <section id="securite" className={styles.photoSection}>
          <div className={styles.photoContent}>
            <h2 className={styles.photoTitle}>
              Vos emails sont sensibles. Nous les traitons comme tels.
              <SparkleDoodle size={14} rotate={-6} className={styles.titleSparkle} />
            </h2>
            {/* Formulation revue : la version précédente annonçait un
                "chiffrement de bout en bout" que le produit n'implémente pas
                (les emails sont déchiffrables côté serveur — ils doivent
                l'être pour être analysés). Ne restent que des affirmations
                vérifiables, détaillées dans la grille juste en dessous. */}
            <p className={styles.photoDesc}>
              Connexion par OAuth, données cloisonnées compte par compte, jetons chiffrés au repos :
              vos emails ne sont ni partagés, ni revendus, ni utilisés pour entraîner un modèle d'IA.
              Chaque affirmation ci-dessous correspond à quelque chose d'implémenté, pas à une intention.
            </p>
          </div>
          <ParallaxImage
            src="https://images.unsplash.com/photo-1633265486064-086b219458ec?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cyVDMyVBOWN1cml0JUMzJUE5fGVufDB8fDB8fHww"
            alt="Cadenas symbolisant la protection des données sur un ordinateur portable"
          />
        </section>
      </Reveal>

      <Reveal variant="up">
        <section className={styles.securityGridSection}>
          <div className={styles.securityGrid}>
            {SECURITY_POINTS.map((p, i) => (
              <Reveal key={p.title} variant="up" delay={i * 60}>
                <div className={styles.securityCard}>
                  <span className={styles.securityIcon}>{p.icon}</span>
                  <h3 className={styles.securityTitle}>{p.title}</h3>
                  <p className={styles.securityDesc}>{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className={styles.securityNote}>
            Le détail complet — données collectées, durées de conservation, sous-traitants — est dans la{' '}
            <Link href="/legal/privacy" className={styles.securityNoteLink}>politique de confidentialité</Link>.
          </p>
        </section>
      </Reveal>

      <Reveal variant="up">
        <section id="pricing" className={styles.pricing}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Un tarif simple, sans surprise</h2>
            <p className={styles.sectionDesc}>
              Commencez gratuitement. Passez au plan Pro quand votre activité le justifie.
            </p>
          </div>

          <div className={styles.billingToggleRow}>
            <span className={!annual ? styles.billingToggleLabelActive : styles.billingToggleLabel}>Mensuel</span>
            <button
              className={`${styles.billingToggle} ${annual ? styles.billingToggleOn : ''}`}
              onClick={() => setAnnual(!annual)}
              aria-label="Basculer entre facturation mensuelle et annuelle"
            >
              <span className={styles.billingToggleThumb} />
            </button>
            <span className={annual ? styles.billingToggleLabelActive : styles.billingToggleLabel}>
              Annuel
              <span className={styles.savingsBadge}>-20%</span>
            </span>
          </div>

          <div className={styles.planGrid}>
            {PLANS.map((plan, i) => {
              const { price, period } = formatPrice(plan, annual)

              return (
                <Reveal key={plan.id} variant="scale" delay={i * 100}>
                  <div className={`${styles.planCard} ${plan.id === 'pro' ? styles.planCardFeatured : ''}`}>
                    {plan.id === 'pro' && (
                      <span className={styles.featuredBadge}>
                        Recommandé
                        <SparkleDoodle size={13} rotate={8} color="white" />
                      </span>
                    )}

                    <h3 className={styles.planName}>{plan.name}</h3>
                    <p className={styles.planTagline}>{plan.tagline}</p>

                    <p className={styles.planPrice}>
                      {price}<span className={styles.planPeriod}>{period}</span>
                    </p>

                    <Link href="/auth/register" className={styles.planBtn}>
                      {plan.id === 'free' ? 'Commencer gratuitement' : <>Essayer <Brand color="white" /> Pro</>}
                    </Link>

                    <ul className={styles.planFeatures}>
                      {plan.features.map(f => (
                        <li key={f} className={styles.planFeatureItem}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )
            })}
          </div>

          <p className={styles.pricingFootnote}>
            Changez de forfait ou annulez à tout moment.
          </p>
        </section>
      </Reveal>

      <Reveal variant="blur">
        <section id="faq" className={styles.faqSection}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Questions fréquentes</h2>
          </div>
          <div className={styles.faqGrid}>
            {FAQ.map((item, i) => (
              <div key={i} className={styles.faqCard}>
                <h3 className={styles.faqQuestion}>{item.q}</h3>
                <p className={styles.faqAnswer}>{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal variant="scale">
        <section className={styles.ctaBanner}>
          <ConfettiDoodle />
          <h2 className={styles.ctaBannerTitle}>
            <SparkleDoodle size={18} rotate={-12} className={styles.ctaSparkleLeft} />
            Prêt à reprendre le contrôle ?
            <SparkleDoodle size={14} rotate={16} className={styles.ctaSparkleRight} />
          </h2>
          <p className={styles.ctaBannerDesc}>
            <Brand /> vient d'être lancé — soyez parmi les premiers à l'essayer.
          </p>
          <Link href="/auth/register" className={styles.ctaBannerBtn}>
            Créer un compte gratuitement
          </Link>
        </section>
      </Reveal>

      {/* Même pied de page que les pages marketing, alimenté par
          lib/navigation.ts — l'ancien pied de la landing listait six ancres
          internes qui ne menaient nulle part ailleurs que sur cette page. */}
      <SiteFooter />
    </div>
  )
}

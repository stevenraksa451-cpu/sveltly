'use client'
import { useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import Brand from '@/components/ui/Brand'
import ImpactCalculator from '@/components/landing/ImpactCalculator'
import Reveal from '@/components/landing/Reveal'
import StickyNav from '@/components/landing/StickyNav'
import ScrollProgress from '@/components/landing/ScrollProgress'
import HeroSpotlight from '@/components/landing/HeroSpotlight'
import ParallaxImage from '@/components/landing/ParallaxImage'
import ProductPreview from '@/components/landing/ProductPreview'
import PaperPlaneDoodle from '@/components/landing/PaperPlaneDoodle'
import SparkleDoodle from '@/components/landing/SparkleDoodle'
import ConfettiDoodle from '@/components/landing/ConfettiDoodle'
import PriorityBadge from '@/components/ui/PriorityBadge'
import { IconCalendar, IconFocus, IconLock, IconLink, IconBrain, IconShield, IconSync, IconCheckSquare } from '@/components/landing/icons'
import { PLANS, formatPrice } from '@/lib/plans'
import styles from './page.module.css'

// Les 4 fonctionnalités "secondaires" de la grille bento (tuiles simples,
// icône + texte) — les 3 principales (tri, réponses IA, calendrier) ont
// chacune un mini-aperçu dédié, écrit directement dans le JSX ci-dessous
// plutôt que dans ce tableau, pour ne pas forcer des visuels différents
// dans une structure de données commune.
const SMALL_FEATURES = [
  { number: '03', icon: <IconCalendar />, title: 'Agenda automatique', desc: 'Les rendez-vous et réunions mentionnés dans vos emails sont détectés et ajoutés à votre agenda sans aucune action de votre part.' },
  { number: '04', icon: <IconCheckSquare />, title: 'Tâches automatiques', desc: <><Brand /> repère les actions à faire dans vos emails et les transforme en tâches, classées et prêtes à traiter — sans que vous ayez à les recopier.</> },
  { number: '06', icon: <IconFocus />, title: 'Zéro distraction', desc: 'Une interface pensée pour aller à l\'essentiel. Pas de notifications inutiles, pas de complexité. Juste vos emails, organisés.' },
  { number: '07', icon: <IconLock />, title: 'Vos données restent privées', desc: 'Chiffrement de bout en bout, accès strictement personnel — vos emails ne sont jamais partagés ni utilisés pour entraîner un modèle.' },
]

const STEPS = [
  { number: '1', icon: <IconLink />, title: 'Connectez votre boîte mail', desc: <>Gmail ou Outlook, en toute sécurité via OAuth. <Brand /> ne stocke jamais votre mot de passe.</> },
  { number: '2', icon: <IconBrain />, title: 'L\'IA analyse vos emails', desc: 'Chaque message est classé par priorité et une réponse est proposée automatiquement, prête à relire.' },
  { number: '3', icon: <IconShield />, title: 'Vous gardez le contrôle', desc: 'Vous validez, modifiez ou ignorez chaque suggestion. Rien n\'est envoyé sans votre accord.' },
]

const FAQ = [
  { q: <>Est-ce que <Brand /> lit vraiment mes emails ?</>, a: 'Oui, c\'est nécessaire pour l\'analyse et la classification. Vos données ne sont jamais partagées ni utilisées à d\'autres fins.' },
  { q: 'Les réponses sont-elles envoyées automatiquement ?', a: <>Non, jamais. <Brand /> rédige des brouillons que vous devez relire et valider vous-même avant tout envoi.</> },
  { q: 'Est-ce gratuit ?', a: 'Oui, la création de compte et l\'utilisation de base sont gratuites, sans carte bancaire requise.' },
  { q: <><Brand /> est-il un produit récent ?</>, a: <>Oui, <Brand /> vient d'être lancé. Vous faites partie des premiers utilisateurs à le tester.</> },
]

export default function LandingPage() {
  const [annual, setAnnual] = useState(true)

  return (
    <div className={styles.page}>
      <ScrollProgress />
      <StickyNav />

      <section className={styles.heroSection}>
        <div className={styles.bgGlow} aria-hidden="true" />
        <div className={styles.bgGrid} aria-hidden="true" />
        <HeroSpotlight />

        <div className={styles.hero}>
          <Reveal variant="up">
            <div className={styles.heroContent}>
              <PaperPlaneDoodle size={34} className={styles.heroPlane} />
              <div className={styles.badge}>8h gagnées par semaine en moyenne</div>
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
              <p className={styles.heroNote}>Gratuit · Aucune carte requise · Gmail & Outlook</p>
            </div>
          </Reveal>
        </div>

        <Reveal variant="scale" delay={150} className={styles.heroVisual}>
          <ProductPreview />
        </Reveal>
      </section>

      <Reveal variant="left">
        <section className={styles.photoSection}>
          <div className={styles.photoContent}>
            <div className={styles.photoLabel}>
              Pensé pour vous
              <SparkleDoodle size={14} rotate={-8} />
            </div>
            <h2 className={styles.photoTitle}>
              Une meilleure façon de travailler.
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
            <div className={styles.sectionLabel}>Comment ça marche</div>
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

      <Reveal variant="right">
        <section className={styles.photoSectionReverse}>
          <ParallaxImage
            src="https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=900&q=80"
            alt="Bureau organisé avec agenda et planification claire"
          />
          <div className={styles.photoContent}>
            <div className={styles.photoLabel}>
              Une journée maîtrisée
              <SparkleDoodle size={14} rotate={10} />
            </div>
            <h2 className={styles.photoTitle}>
              Le problème du calendrier éclaté, enfin résolu.
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
            <div className={styles.sectionLabel}>Fonctionnalités</div>
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
        <section id="security" className={styles.photoSection}>
          <div className={styles.photoContent}>
            <div className={styles.photoLabel}>
              Sécurité & confidentialité
              <SparkleDoodle size={14} rotate={-6} />
            </div>
            <h2 className={styles.photoTitle}>
              Vos emails sont sensibles. Nous les traitons comme tels.
            </h2>
            <p className={styles.photoDesc}>
              Chiffrement de bout en bout, accès strictement personnel à vos données, connexion sécurisée via OAuth —
              vos emails ne sont jamais partagés ni utilisés pour entraîner un modèle d'IA. Votre confidentialité
              n'est pas une option chez <Brand />, c'est le fondement du produit.
            </p>
          </div>
          <ParallaxImage
            src="https://images.unsplash.com/photo-1633265486064-086b219458ec?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cyVDMyVBOWN1cml0JUMzJUE5fGVufDB8fDB8fHww"
            alt="Cadenas symbolisant la protection des données sur un ordinateur portable"
          />
        </section>
      </Reveal>

      <Reveal variant="up">
        <section id="pricing" className={styles.pricing}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionLabel}>Forfait</div>
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
            Aucune carte requise pour démarrer. Changez de forfait ou annulez à tout moment.
          </p>
        </section>
      </Reveal>

      <Reveal variant="blur">
        <section id="faq" className={styles.faqSection}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionLabel}>FAQ</div>
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

      <footer className={styles.footer}>
        <Logo size={28} showText />
        <p className={styles.footerText}>© {new Date().getFullYear()} <Brand />.</p>
        <div className={styles.footerLinks}>
          <a href="#security">Sécurité</a>
          <a href="#pricing">Forfait</a>
          <Link href="/legal/privacy">Confidentialité</Link>
          <Link href="/legal/terms">CGU</Link>
          <a href="mailto:support@sveltly.fr">Contact</a>
        </div>
      </footer>
    </div>
  )
}

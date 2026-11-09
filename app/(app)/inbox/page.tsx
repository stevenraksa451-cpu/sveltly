'use client'
// app/(app)/inbox/page.tsx
import { useState, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import EmailListItem from '@/components/inbox/EmailListItem'
import EmailDetail from '@/components/inbox/EmailDetail'
import InboxSidePanel from '@/components/inbox/InboxSidePanel'
import { supabase } from '@/lib/supabase'
import { useEmails } from '@/hooks/useEmails'
import { estNewsletter } from '@/lib/categories-email'
import styles from './inbox.module.css'

type Tab = 'inbox' | 'archived'
type Filter = 'all' | 'unread' | 'urgent' | 'important' | 'newsletters'

function InboxContent() {
  const { emails, loading, refresh } = useEmails()
  const searchParams = useSearchParams()
  // Ouvert depuis la palette de recherche (Cmd/Ctrl+K) via /inbox?open=<id>
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('open'))
  const [tab, setTab] = useState<Tab>('inbox')
  const [filter, setFilter] = useState<Filter>('all')
  const [actionLoading, setActionLoading] = useState(false)

  const filtered = useMemo(() => {
    let list = emails.filter((e: any) =>
      tab === 'inbox' ? e.labelIds?.includes('INBOX') !== false : !e.labelIds?.includes('INBOX')
    )
    // « Newsletters » est le SEUL filtre qui les montre. Partout ailleurs
    // elles sortent de la liste, y compris de Non lus, Urgent et Important —
    // sans quoi une promo classée urgente par erreur reviendrait par la
    // fenêtre, et la catégorie ne servirait à rien.
    if (filter === 'newsletters') list = list.filter(estNewsletter)
    else list = list.filter((e: any) => !estNewsletter(e))

    if (filter === 'unread') list = list.filter((e: any) => !e.isRead)
    if (filter === 'urgent') list = list.filter((e: any) => e.priority === 'urgent')
    if (filter === 'important') list = list.filter((e: any) => e.priority === 'important')
    return list.sort((a: any, b: any) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
  }, [emails, tab, filter])

  // Sélectionne le premier email dès que la liste est chargée, si rien n'est encore sélectionné
  const selected = emails.find((e: any) => e.id === selectedId) || (!selectedId && filtered[0]) || null
  const effectiveSelectedId = selected?.id || null

  // Un seul passage mémoïsé pour les trois compteurs : c'étaient trois
  // .filter() complets sur toute la boîte (jusqu'à 300 emails), refaits à
  // CHAQUE rendu — y compris pour un simple clic sur un email, un changement
  // d'onglet, ou chacun des polls à 4 s pendant l'analyse IA.
  const counts = useMemo(() => {
    let urgent = 0, important = 0, unread = 0, newsletters = 0
    for (const e of emails as any[]) {
      // Un compteur doit annoncer ce que son filtre AFFICHERA : les
      // newsletters sont donc exclues des trois autres, exactement comme de
      // leurs listes. Sinon « Non lus 12 » mènerait à une liste de trois.
      if (estNewsletter(e)) { newsletters++; continue }
      if (e.priority === 'urgent') urgent++
      else if (e.priority === 'important') important++
      if (!e.isRead) unread++
    }
    return { urgent, important, unread, newsletters }
  }, [emails])

  // Identité stable : c'est ce qui permet au memo d'EmailListItem de tenir —
  // une fonction recréée ici à chaque rendu re-rendrait toutes les lignes.
  const handleSelect = useCallback((id: string) => setSelectedId(id), [])

  async function handleAction(action: 'archive' | 'unarchive' | 'markUnread' | 'markRead') {
    if (!selected) return
    setActionLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setActionLoading(false); return }

    const res = await fetch(`/api/emails/${selected.id}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action }),
    })

    if (res.ok) {
      // Met à jour le cache SWR localement, sans attendre un nouveau fetch complet
      refresh((current: any) => (current || []).map((e: any) => {
        if (e.id !== selected.id) return e
        if (action === 'archive') return { ...e, labelIds: (e.labelIds || []).filter((l: string) => l !== 'INBOX') }
        if (action === 'unarchive') return { ...e, labelIds: [...(e.labelIds || []), 'INBOX'] }
        if (action === 'markUnread') return { ...e, isRead: false }
        if (action === 'markRead') return { ...e, isRead: true }
        return e
      }), { revalidate: false })

      if (action === 'archive') setSelectedId(null)
    }
    setActionLoading(false)
  }

  return (
    <AppLayout title="Boîte de réception" subtitle="Gérez vos emails au même endroit">
      <div className={styles.layout}>

        {/* Liste */}
        <div className={styles.listCol}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'inbox' ? styles.tabActive : ''}`} onClick={() => setTab('inbox')}>
              Boîte de réception
            </button>
            <button className={`${styles.tab} ${tab === 'archived' ? styles.tabActive : ''}`} onClick={() => setTab('archived')}>
              Archivés
            </button>
          </div>

          <div className={styles.filters}>
            <button className={`${styles.filterBtn} ${filter === 'all' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('all')}>
              Tous
            </button>
            <button className={`${styles.filterBtn} ${filter === 'unread' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('unread')}>
              Non lus {counts.unread > 0 && <span className={styles.filterCount}>{counts.unread}</span>}
            </button>
            <button className={`${styles.filterBtn} ${styles.urgent} ${filter === 'urgent' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('urgent')}>
              Urgent {counts.urgent > 0 && <span className={styles.filterCount}>{counts.urgent}</span>}
            </button>
            <button className={`${styles.filterBtn} ${styles.important} ${filter === 'important' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('important')}>
              Important {counts.important > 0 && <span className={styles.filterCount}>{counts.important}</span>}
            </button>
            {/* Seule entrée qui AJOUTE des emails à la vue au lieu d'en
                retirer : tous les autres filtres les excluent. */}
            <button className={`${styles.filterBtn} ${filter === 'newsletters' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('newsletters')}>
              Newsletters {counts.newsletters > 0 && <span className={styles.filterCount}>{counts.newsletters}</span>}
            </button>
          </div>

          <div className={styles.list}>
            {loading && emails.length === 0 ? (
              [...Array(5)].map((_, i) => <div key={i} className={`${styles.skeletonItem} skeleton`} />)
            ) : filtered.length === 0 ? (
              // Cet état vient AVEC le classement, il n'est pas décoratif :
              // une boîte neuve est majoritairement faite de notifications et
              // de promotions, donc « Tous » peut légitimement être vide
              // alors que des emails sont arrivés. Un « Aucun email ici » sec
              // se lirait comme une panne. On dit où ils sont partis.
              <div className={styles.empty}>
                {filter !== 'newsletters' && counts.newsletters > 0 ? (
                  <>
                    <p>Rien à traiter ici.</p>
                    <button type="button" className={styles.emptyLink} onClick={() => setFilter('newsletters')}>
                      {counts.newsletters === 1
                        ? 'Voir l’email rangé dans Newsletters'
                        : `Voir les ${counts.newsletters} emails rangés dans Newsletters`}
                    </button>
                  </>
                ) : (
                  <p>Aucun email ici.</p>
                )}
              </div>
            ) : (
              filtered.map((email: any) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  selected={email.id === effectiveSelectedId}
                  onSelect={handleSelect}
                />
              ))
            )}
          </div>
        </div>

        {/* Détail */}
        <div className={styles.detailCol}>
          {selected ? (
            // key={selected.id} force React à remonter le composant à chaque
            // changement d'email — sinon son état interne (réponse IA, ton
            // sélectionné, formulaire d'événement...) reste bloqué sur
            // l'email précédemment ouvert au lieu de se réinitialiser.
            <EmailDetail
              key={selected.id}
              email={selected}
              onClose={() => setSelectedId(null)}
              onArchive={() => handleAction(selected.labelIds?.includes('INBOX') === false ? 'unarchive' : 'archive')}
            />
          ) : (
            <div className={styles.emptyDetail}><p>Sélectionnez un email</p></div>
          )}
        </div>

        {/* Panneau IA / Contact / Actions */}
        <div className={styles.panelCol}>
          {selected && (
            // Même raison que pour EmailDetail : sans key, l'état interne
            // (tâche créée, planification en cours...) reste collé à l'ancien
            // email sélectionné.
            <InboxSidePanel
              key={selected.id}
              email={selected}
              onArchive={() => handleAction(selected.labelIds?.includes('INBOX') === false ? 'unarchive' : 'archive')}
              onToggleRead={() => handleAction(selected.isRead ? 'markUnread' : 'markRead')}
              loading={actionLoading}
              onAnalyzed={(emailId, analysis) => {
                // Même mécanique que handleAction : met à jour le cache SWR
                // local sans re-fetch, pour que le résumé obtenu ici reste
                // visible si l'utilisateur ouvre un autre email puis revient
                // sur celui-ci (au lieu de le redemander à Groq).
                refresh((current: any) => (current || []).map((e: any) =>
                  e.id === emailId ? { ...e, ...analysis } : e
                ), { revalidate: false })
              }}
            />
          )}
        </div>

      </div>
    </AppLayout>
  )
}

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <InboxContent />
    </Suspense>
  )
}

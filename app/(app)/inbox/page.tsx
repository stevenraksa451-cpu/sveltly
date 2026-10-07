'use client'
// app/(app)/inbox/page.tsx
import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import EmailListItem from '@/components/inbox/EmailListItem'
import EmailDetail from '@/components/inbox/EmailDetail'
import InboxSidePanel from '@/components/inbox/InboxSidePanel'
import { supabase } from '@/lib/supabase'
import { useEmails } from '@/hooks/useEmails'
import styles from './inbox.module.css'

type Tab = 'inbox' | 'archived'
type Filter = 'all' | 'unread' | 'urgent' | 'important'

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
    if (filter === 'unread') list = list.filter((e: any) => !e.isRead)
    if (filter === 'urgent') list = list.filter((e: any) => e.priority === 'urgent')
    if (filter === 'important') list = list.filter((e: any) => e.priority === 'important')
    return list.sort((a: any, b: any) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
  }, [emails, tab, filter])

  // Sélectionne le premier email dès que la liste est chargée, si rien n'est encore sélectionné
  const selected = emails.find((e: any) => e.id === selectedId) || (!selectedId && filtered[0]) || null
  const effectiveSelectedId = selected?.id || null

  const urgentCount = emails.filter((e: any) => e.priority === 'urgent').length
  const importantCount = emails.filter((e: any) => e.priority === 'important').length
  const unreadCount = emails.filter((e: any) => !e.isRead).length

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
    <AppLayout title="Inbox" subtitle="Gérez vos emails au même endroit.">
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
              Non lus {unreadCount > 0 && <span className={styles.filterCount}>{unreadCount}</span>}
            </button>
            <button className={`${styles.filterBtn} ${styles.urgent} ${filter === 'urgent' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('urgent')}>
              Urgent {urgentCount > 0 && <span className={styles.filterCount}>{urgentCount}</span>}
            </button>
            <button className={`${styles.filterBtn} ${styles.important} ${filter === 'important' ? styles.filterBtnActive : ''}`} onClick={() => setFilter('important')}>
              Important {importantCount > 0 && <span className={styles.filterCount}>{importantCount}</span>}
            </button>
          </div>

          <div className={styles.list}>
            {loading && emails.length === 0 ? (
              [...Array(5)].map((_, i) => <div key={i} className={`${styles.skeletonItem} skeleton`} />)
            ) : filtered.length === 0 ? (
              <div className={styles.empty}><p>Aucun email ici.</p></div>
            ) : (
              filtered.map((email: any) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  selected={email.id === effectiveSelectedId}
                  onClick={() => setSelectedId(email.id)}
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

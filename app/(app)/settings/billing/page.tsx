'use client'
// app/settings/billing/page.tsx
import AppLayout from '@/components/layout/AppLayout'
import PlanCards from '@/components/settings/PlanCards'

export default function BillingPage() {
  return (
    <AppLayout title="Changer de forfait" subtitle="Choisissez le plan adapté à votre activité.">
      <PlanCards />
    </AppLayout>
  )
}

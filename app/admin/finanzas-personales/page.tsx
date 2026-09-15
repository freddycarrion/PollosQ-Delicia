import { Metadata } from 'next'
import FinanzasClient from './FinanzasClient'

export const metadata: Metadata = {
  title: 'Ingreso / Egreso Personal | Pollos Q\' Delicia',
  description: 'Registra y consulta tus ingresos y egresos personales.',
}

export default function FinanzasPersonalesPage() {
  return <FinanzasClient />
}

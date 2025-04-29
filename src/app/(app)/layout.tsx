// Layout.tsx
'use client'
import AppSidebar from '@/components/ui/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import NavbarSticky from '@/components/custom/NavbarSticky'
import { useEffect, useState, useRef } from 'react'
import { getOrganization } from '@/actions/get-organization'
import { PriceModeSelector } from '@/components/ui/price-mode-selector'

interface Org { logo: string | null; thumbnail: string | null; name: string }

export default function Layout({ children }: { children: React.ReactNode }) {
  const [org, setOrg] = useState<Org | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => { getOrganization().then(setOrg).catch(console.error) }, [])

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const onScroll = () => setScrolled(el.scrollTop > 20)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className=" relative">
          <SidebarTrigger />
        </div>
        <main
          ref={mainRef}
          className="flex flex-col flex-1 overflow-y-auto items-center"
        >
          <div className="flex items-end w-full justify-end pr-16">
            <PriceModeSelector />
          </div>
          {org && <NavbarSticky organization={org} isScrolled={scrolled} />}

          <div className="w-full">
            {children}
          </div>
        </main>
      </div >
    </SidebarProvider >
  )
}

// NavbarSticky.tsx
'use client'
import { OrganizationLogo } from './OrganizationLogo'

interface NavbarStickyProps {
    organization: { logo: string | null; thumbnail: string | null; name: string }
    isScrolled: boolean
}

export default function NavbarSticky({ organization, isScrolled }: NavbarStickyProps) {
    const logoKey = isScrolled
        ? organization.thumbnail ?? organization.logo
        : organization.logo

    return (
        <div
            className={`
        sticky top-0 z-50 flex items-center justify-center space-x-6
        bg-background transition-[height,padding] duration-300 ease-in-out
        ${isScrolled ? 'h-14 py-1' : 'h-20 py-3'}
      `}
        >
            <OrganizationLogo
                logo={logoKey}
                name={organization.name}
                size={isScrolled ? 'sm' : 'lg'}
                variant={isScrolled ? 'default' : 'bare'}
            />
            {isScrolled && (
                <span className="text-2xl font-bold">{organization.name}</span>
            )}
        </div>
    )
}

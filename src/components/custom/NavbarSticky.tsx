// NavbarSticky.tsx
'use client'
import OrganizationLogo from './OrganizationLogo'
import { useMemo } from 'react'

interface NavbarStickyProps {
    organization: { logo: string | null; thumbnail: string | null; name: string }
    scrollAmount: number
}

export default function NavbarSticky({ organization, scrollAmount }: NavbarStickyProps) {
    const logoKey = useMemo(() => {
        return scrollAmount > 0.5 && organization.thumbnail ? organization.thumbnail : organization.logo;
    }, [organization.logo, organization.thumbnail, scrollAmount]);

    const height = useMemo(() => {
        const startHeight = 5;
        const endHeight = 3.5;
        return startHeight - (scrollAmount * (startHeight - endHeight));
    }, [scrollAmount]);

    const paddingY = useMemo(() => {
        const startPadding = 0.75;
        const endPadding = 0.25;
        return startPadding - (scrollAmount * (startPadding - endPadding));
    }, [scrollAmount]);

    const logoSize = useMemo(() => {
        const startSize = 8;
        const endSize = 2.5;
        return Math.max(endSize, startSize - (scrollAmount * (startSize - endSize)));
    }, [scrollAmount]);

    const logoVariant = useMemo(() => {
        return scrollAmount > 0.3 ? 'default' : 'bare';
    }, [scrollAmount]);

    const showName = scrollAmount > 0.7;
    const nameOpacity = useMemo(() => {
        const startFade = 0.8;
        const endFade = 0.95;

        let calculatedOpacity = 0;
        if (scrollAmount <= startFade) {
            calculatedOpacity = 0;
        } else if (scrollAmount >= endFade) {
            calculatedOpacity = 1;
        } else {
            calculatedOpacity = (scrollAmount - startFade) / (endFade - startFade);
        }
        console.log("scrollAmount:", scrollAmount.toFixed(3), "=> nameOpacity:", calculatedOpacity.toFixed(3));
        return calculatedOpacity;
    }, [scrollAmount]);

    return (
        <div
            className={`
        sticky top-0 z-50 flex items-center justify-center space-x-4
        bg-background transition-all duration-200 ease-out
      `}
            style={{
                height: `${height}rem`,
                padding: `${paddingY}rem 0`
            }}
        >
            <OrganizationLogo
                logo={logoKey}
                thumbnail={organization.thumbnail}
                name={organization.name}
                size={logoSize}
                variant={logoVariant}
                nameDisplayOpacity={nameOpacity}
            />

        </div>
    )
}

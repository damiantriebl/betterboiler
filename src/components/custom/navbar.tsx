'use client'

import Link from "next/link";
import LogoutButton from "./logout-button";
import { Session } from "@/auth";

export default function Navbar({session}: {session: Session | null}) {  
    return (
        <nav className="flex justify-between items-center py-3 px-4 fixed top-0 left-0 right-0 z-50 bg-slate-100">
            <Link href={"/"} className="text-xl font-bold">
                Dashboard
            </Link>
            {!session ? (
                <div className="flex gap-2 justify-center">
                    <Link href={"/signin"}>
                        singin
                    </Link>
                    <Link href={"/signup"}>
                        singup
                    </Link> 
                </div>

            ): (
                <div className="flex gap-2 justify-center">
                    <LogoutButton />
                </div>
            )}
        </nav>
    )
}
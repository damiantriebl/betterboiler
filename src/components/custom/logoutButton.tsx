'use client'

import { useState } from "react";
import { authClient } from "@/auth-client";
import LoadingButton from "./loadingButton";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
    const router = useRouter()
    const [pending, setPending] = useState(false);

    const handleSingOut = async () => {
        try {
            setPending(true);
            await authClient.signOut({
                fetchOptions: {
                    onSuccess: () => {
                        router.push("sign-in");
                    }
                }
            })
        } catch (error) {
            console.error("Error signin out:", error)
        } finally {
            setPending(false);
        }
    }
    return (
        <LoadingButton pending={pending} onClick={handleSingOut}>
            Desloguearse
        </LoadingButton>
    )
}
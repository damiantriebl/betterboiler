import Link from "next/link";
import { Button } from "../ui/button";

const SessionButtons = ()=> {
    return (
        <nav className="flex justify-between items-center py-3 px-4 fixed top-0 left-0 right-0 z-50 bg-slate-100">        
            <div className="flex gap-2 justify-center">
                <Button>
                    <Link href={"/sign-in"}>Ingresar</Link>
                </Button>
                <Button>
                    <Link href={"/sign-up"}>Crear Cuenta</Link>
                </Button>
            </div>
        </nav>
    );
}

export default SessionButtons;
'use server';

import { revalidatePath } from 'next/cache';

type State = {
    success: boolean;
    error: string;
    activeTab: string;
};

export async function createMotoAction(prevState: State, formData: FormData): Promise<State> {
    try {
        // Por ahora solo vamos a simular la creación
        console.log('Datos recibidos:', Object.fromEntries(formData));

        // Aquí iría la lógica para guardar en la base de datos
        await new Promise(resolve => setTimeout(resolve, 1000));

        revalidatePath('/stock');
        return { 
            success: true, 
            error: '',
            activeTab: prevState.activeTab 
        };
    } catch (error) {
        console.error('Error al crear la moto:', error);
        return { 
            success: false, 
            error: 'Error al crear la moto',
            activeTab: prevState.activeTab 
        };
    }
} 
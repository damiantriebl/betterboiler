"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import SingleBrandColumn from './SingleBrandColumn';

const initialData: Record<string, string[]> = {
    honda: ['Wave 110', 'GLH 150 Gaucha', 'XR 150L', 'XR 250 Tornado', 'CB 300F Twister', 'Africa Twin'],
    yamaha: ['Crypton 110', 'FZ-S FI', 'MT-03', 'Tenere 700', 'R1M'],
    kawasaki: ['Ninja 400', 'Z650', 'Versys 650', 'Z900', 'ZX-10R'],
    suzuki: ['AX 100', 'GN 125', 'Gixxer 150', 'V-Strom 650XT', 'GSX-R 1000R'],
};

export default function GestionMarcas() {
    const [brandsData, setBrandsData] = useState(initialData);
    const [brandOrder, setBrandOrder] = useState<string[]>(Object.keys(initialData));

    const handleAddBrand = () => {
        const newBrandName = prompt("Ingresa el nombre de la nueva marca:");
        if (newBrandName && newBrandName.trim()) {
            const brandKey = newBrandName.trim().toLowerCase().replace(/\s+/g, '-');
            if (!brandsData[brandKey]) {
                setBrandsData(prev => ({ ...prev, [brandKey]: [] }));
                setBrandOrder(prev => [...prev, brandKey]);
                console.log(`Marca "${newBrandName}" añadida con clave "${brandKey}".`);
            } else {
                alert(`La marca "${newBrandName}" (clave: ${brandKey}) ya existe.`);
            }
        }
    };

    const handleBrandDelete = (brandIdToDelete: string) => {
        setBrandsData(prev => {
            const newData = { ...prev };
            delete newData[brandIdToDelete];
            return newData;
        });
        setBrandOrder(prev => prev.filter(id => id !== brandIdToDelete));
    };

    const handleBrandRename = (oldBrandId: string, newBrandId: string) => {
        if (brandsData[newBrandId] && newBrandId !== oldBrandId) {
            alert(`La clave de marca "${newBrandId}" ya está en uso.`);
            return;
        }

        setBrandsData(prev => {
            const newData = { ...prev };
            if (newData[oldBrandId]) {
                newData[newBrandId] = newData[oldBrandId];
                if (oldBrandId !== newBrandId) {
                    delete newData[oldBrandId];
                }
            }
            return newData;
        });

        setBrandOrder(prev =>
            prev.map(id => (id === oldBrandId ? newBrandId : id))
        );
    };

    return (
        <div className="w-full space-y-4 my-4">
            <Button onClick={handleAddBrand} variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Agregar Marca
            </Button>

            <div className="flex flex-col gap-4">
                {brandOrder.map((brandId) => (
                    <SingleBrandColumn
                        key={brandId}
                        brandId={brandId}
                        initialModels={brandsData[brandId] || []}
                        onBrandDelete={handleBrandDelete}
                        onBrandRename={handleBrandRename}
                    />
                ))}
            </div>
        </div>
    );
}
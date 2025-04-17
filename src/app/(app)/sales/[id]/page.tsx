"use client";

import { useEffect, useState } from "react";
import { motorcycles } from "@/data/motorcycles";
import { Motorcycle } from "@/types/BikesType";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface StepperProps {
    currentStep: number;
    steps: string[];
}

function Stepper({ currentStep, steps }: StepperProps) {
    return (
        <div className="flex items-center justify-center w-full mb-8">
            {steps.map((step, index) => (
                <div key={step} className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 
                        ${index < currentStep
                            ? "bg-green-500 border-green-500 text-white"
                            : index === currentStep
                                ? "border-blue-500 text-blue-500"
                                : "border-gray-300 text-gray-300"}`}
                    >
                        {index < currentStep ? "✓" : index + 1}
                    </div>
                    {index < steps.length - 1 && (
                        <div className={`w-20 h-1 mx-2 
                            ${index < currentStep
                                ? "bg-green-500"
                                : "bg-gray-300"}`}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

interface BuyerFormData {
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    email: string;
    direccion: string;
}

interface PaymentFormData {
    metodoPago: string;
    cuotas: number;
    banco: string;
}

export default function VentaPage({ params }: { params: { id: string } }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [moto, setMoto] = useState<Motorcycle | null>(null);
    const [loading, setLoading] = useState(false);
    const [buyerData, setBuyerData] = useState<BuyerFormData>({
        nombre: "",
        apellido: "",
        dni: "",
        telefono: "",
        email: "",
        direccion: ""
    });
    const [paymentData, setPaymentData] = useState<PaymentFormData>({
        metodoPago: "",
        cuotas: 1,
        banco: ""
    });

    const steps = [
        "Confirmar Moto",
        "Datos del Comprador",
        "Método de Pago",
        "Confirmación"
    ];

    useEffect(() => {
        const foundMoto = motorcycles.find(m => m.id === params.id);
        if (foundMoto) {
            setMoto(foundMoto);
        }
    }, [params.id]);

    const handleEditInfo = () => {
        console.log("Editar información de la moto");
    };

    const handleBuyerDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setBuyerData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePaymentDataChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setPaymentData(prev => ({
            ...prev,
            [name]: name === 'cuotas' ? parseInt(value) : value
        }));
    };

    const handleNext = async () => {
        if (currentStep === steps.length - 1) return;

        if (currentStep === 2) { // Si estamos en el paso de pago
            setLoading(true);
            // Simulamos una espera de la API
            await new Promise(resolve => setTimeout(resolve, 2000));
            setLoading(false);
            // Log de la información completa
            console.log('Venta completada:', {
                moto: {
                    marca: moto?.marca,
                    modelo: moto?.modelo,
                    año: moto?.año,
                    precio: moto?.precio,
                    id: moto?.id
                },
                comprador: buyerData,
                pago: paymentData
            });
        }

        setCurrentStep(prev => prev + 1);
    };

    const handleBack = () => {
        if (currentStep === 0) return;
        setCurrentStep(prev => prev - 1);
    };

    if (!moto) {
        return <div>Moto no encontrada</div>;
    }

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Detalles de la Moto</h3>
                                <div className="space-y-2">
                                    <p><span className="font-medium">Marca:</span> {moto.marca}</p>
                                    <p><span className="font-medium">Modelo:</span> {moto.modelo}</p>
                                    <p><span className="font-medium">Año:</span> {moto.año}</p>
                                    <p><span className="font-medium">Cilindrada:</span> {moto.cilindrada}cc</p>
                                    <p><span className="font-medium">Tipo:</span> {moto.tipo}</p>
                                    <p><span className="font-medium">Color:</span> {moto.color}</p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Estado y Ubicación</h3>
                                <div className="space-y-2">
                                    <p><span className="font-medium">Estado:</span> {moto.estado}</p>
                                    <p><span className="font-medium">Kilometraje:</span> {moto.kilometraje}km</p>
                                    <p><span className="font-medium">Transmisión:</span> {moto.transmision}</p>
                                    <p><span className="font-medium">Ubicación:</span> {moto.ubicacion}</p>
                                    <p><span className="font-medium">Precio:</span> {formatPrice(moto.precio)}</p>
                                </div>
                            </div>
                        </div>
                        <Button onClick={handleEditInfo} variant="outline" className="mt-4">
                            Editar Información
                        </Button>
                    </div>
                );
            case 1:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Datos del Comprador</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block">Nombre</label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={buyerData.nombre}
                                    onChange={handleBuyerDataChange}
                                    className="w-full p-2 border rounded"
                                    placeholder="Nombre"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block">Apellido</label>
                                <input
                                    type="text"
                                    name="apellido"
                                    value={buyerData.apellido}
                                    onChange={handleBuyerDataChange}
                                    className="w-full p-2 border rounded"
                                    placeholder="Apellido"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block">DNI</label>
                                <input
                                    type="text"
                                    name="dni"
                                    value={buyerData.dni}
                                    onChange={handleBuyerDataChange}
                                    className="w-full p-2 border rounded"
                                    placeholder="DNI"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block">Teléfono</label>
                                <input
                                    type="tel"
                                    name="telefono"
                                    value={buyerData.telefono}
                                    onChange={handleBuyerDataChange}
                                    className="w-full p-2 border rounded"
                                    placeholder="Teléfono"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={buyerData.email}
                                    onChange={handleBuyerDataChange}
                                    className="w-full p-2 border rounded"
                                    placeholder="Email"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block">Dirección</label>
                                <input
                                    type="text"
                                    name="direccion"
                                    value={buyerData.direccion}
                                    onChange={handleBuyerDataChange}
                                    className="w-full p-2 border rounded"
                                    placeholder="Dirección"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Método de Pago</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block" id="metodo-pago-label">Método de Pago</label>
                                <select
                                    name="metodoPago"
                                    value={paymentData.metodoPago}
                                    onChange={handlePaymentDataChange}
                                    className="w-full p-2 border rounded"
                                    aria-labelledby="metodo-pago-label"
                                >
                                    <option value="">Seleccionar método</option>
                                    <option value="efectivo">Efectivo</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="financiacion">Financiación</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block" id="cuotas-label">Cuotas</label>
                                <select
                                    name="cuotas"
                                    value={paymentData.cuotas.toString()}
                                    onChange={handlePaymentDataChange}
                                    className="w-full p-2 border rounded"
                                    aria-labelledby="cuotas-label"
                                >
                                    <option value="1">1 cuota</option>
                                    <option value="6">6 cuotas</option>
                                    <option value="12">12 cuotas</option>
                                    <option value="24">24 cuotas</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block" id="banco-label">Banco</label>
                                <select
                                    name="banco"
                                    value={paymentData.banco}
                                    onChange={handlePaymentDataChange}
                                    className="w-full p-2 border rounded"
                                    aria-labelledby="banco-label"
                                >
                                    <option value="">Seleccionar banco</option>
                                    <option value="santander">Santander</option>
                                    <option value="bbva">BBVA</option>
                                    <option value="galicia">Galicia</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="text-center space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <p>Procesando la venta con la API del gobierno...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h3 className="text-2xl font-bold text-green-600">¡Felicitaciones!</h3>
                                <p className="text-lg">
                                    La moto {moto.marca} {moto.modelo} fue vendida exitosamente.
                                </p>
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <p>Los documentos de la venta serán enviados al email registrado.</p>
                                </div>
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle>Proceso de Venta</CardTitle>
                </CardHeader>
                <CardContent>
                    <Stepper currentStep={currentStep} steps={steps} />
                    <div className="min-h-[400px]">
                        {renderStepContent()}
                    </div>
                    <div className="flex justify-between mt-8">
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            disabled={currentStep === 0}
                        >
                            Anterior
                        </Button>
                        <Button
                            onClick={handleNext}
                            disabled={currentStep === steps.length - 1}
                            className={currentStep === 2 ? "bg-red-600 hover:bg-red-700" : ""}
                        >
                            {currentStep === 2 ? "Confirmar Venta" : "Siguiente"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 
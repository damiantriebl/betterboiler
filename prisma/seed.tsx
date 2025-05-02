import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    // Define the brand colors
    const marcaColores: Record<string, string> = {
        Honda: "#e60012",           // rojo clásico Honda (Corrected hex)
        Yamaha: "#d90000",          // rojo profundo
        Bajaj: "#005baa",           // azul institucional
        KTM: "#ff6600",             // naranja KTM icónico
        Suzuki: "#005bac",          // azul Suzuki
        BMW: "#1c69d4",             // azul BMW
        Kawasaki: "#66ff00",        // verde lima Kawasaki
        RoyalEnfield: "#d9230f",    // rojo indio tradicional
        Ducati: "#cc0000",          // rojo Ducati
        "Harley-Davidson": "#ff6600", // naranja y negro clásico HD (Quoted key)
        Husqvarna: "#002d56",       // azul oscuro sueco
        Zanella: "#9e0b0f",         // rojo oscuro Zanella
        Motomel: "#003399",         // azul fuerte
        Corven: "#f25c00",          // naranja Corven
        Gilera: "#bd0000",          // rojo oscuro deportivo
        TVS: "#004aad"              // azul TVS
    };

    // Assign the data array to the 'motos' variable
    const motos = [
        {
            "marca": "Honda",
            "modelos": [
                "XR150L", "CB1", "Storm 125", "Biz 125", "Wave 110", "CB125F Twister", "CB190R",
                "CB250 Twister", "CB300F Twister", "CB750 Hornet", "XR190L", "XR250 Tornado",
                "XRE300", "CRF250R", "CRF300L", "CRF300 Rally", "PCX 160", "Navi 110", "Elite 125",
                "Africa Twin", "NC750X", "CB500F", "CB500X", "CB650R", "CBR650R", "CBR600RR",
                "CBR1000RR-R Fireblade", "Rebel 500", "Rebel 1100", "Forza 350", "Forza 750", "ADV350",
                "Gold Wing"
            ]
        },
        {
            "marca": "Yamaha",
            "modelos": [
                "YBR125", "FZ25", "MT-03", "FZ-S FI V3", "FZ-X", "FZ V4", "MT-07", "MT-09", "MT-09 SP",
                "MT-10", "XSR700", "XSR900", "XSR900 GP", "R3", "R6 Race", "R1", "R1M", "XMAX 300",
                "NMAX 155", "Ray ZR 125", "Fascino 125", "XMAX 250", "XMAX 400", "TMAX 560",
                "Tracer 700", "Tracer 900", "Tracer 900 GT", "Super Ténéré 1200", "XTZ125", "XTZ150",
                "XTZ250", "WR250F", "WR450F", "YZ125", "YZ250", "YZ250F", "YZ450F"
            ]
        },
        {
            "marca": "Bajaj",
            "modelos": ["Pulsar P150", "Rouser NS200", "NS160", "Dominar 400"]
        },
        {
            "marca": "KTM",
            "modelos": ["200 Duke", "250 Duke", "390 Duke", "250 Adventure"]
        },
        {
            "marca": "Suzuki",
            "modelos": ["V-Strom 1050DE", "GSX-R1000R", "Hayabusa", "DR650SE"]
        },
        {
            "marca": "BMW",
            "modelos": ["G 310 R", "R 1250 GS", "S 1000 RR", "R 1250 RT"]
        },
        {
            "marca": "Kawasaki",
            "modelos": ["Ninja 500 ABS", "Z 650 ABS", "Versys X300 ABS", "KLR 650 ABS"]
        },
        {
            "marca": "Royal Enfield",
            "modelos": ["Meteor 350", "Classic 350", "Himalayan 450", "Interceptor 650"]
        },
        {
            "marca": "Ducati",
            "modelos": ["Multistrada V2", "Panigale V4", "Scrambler Icon", "Monster 937"]
        },
        {
            "marca": "Harley-Davidson",
            "modelos": ["Road King Special", "Street Glide", "Road Glide", "Street Glide Ultra"]
        },
        {
            "marca": "Husqvarna",
            "modelos": ["Vitpilen 401", "Svartpilen 401", "701 Enduro", "701 Supermoto"]
        },
        {
            "marca": "Zanella",
            "modelos": ["ZB 110 Z1", "RX 150 G3", "ZR 250 LT", "Patagonian Eagle 250"]
        },
        {
            "marca": "Motomel",
            "modelos": ["Blitz 110", "CG 150 Serie 2", "Sirius 200", "Skua 250"]
        },
        {
            "marca": "Corven",
            "modelos": ["Energy 110", "Triax 150", "Mirage 110", "TXR 250"]
        },
        {
            "marca": "Gilera",
            "modelos": ["Smash 110", "VC 150", "Sahel 150", "Yamaha FZ16"]
        },
        {
            "marca": "TVS",
            "modelos": ["Apache RTR 160 4V", "Apache RTR 200 4V", "RR 310"]
        }
    ]; // End of motos array assignment

    for (const { marca, modelos } of motos) {
        const color = marcaColores[marca.replace(/-/g, '')] || '#CCCCCC'; // Get color, handle hyphens, provide default

        const brand = await prisma.brand.upsert({
            where: { name: marca },
            update: { color: color }, // Update color if brand exists
            create: { name: marca, color: color }, // Create brand with color
        });

        for (const modelo of modelos) {
            await prisma.model.upsert({
                where: { name_brandId: { name: modelo, brandId: brand.id } }, // Assumes @@unique([name, brandId])
                update: {}, // No specific model fields to update here
                create: {
                    name: modelo,
                    brandId: brand.id,
                },
            });
        }
    }

    console.log("Seed finished successfully.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
export interface BuildingData {
    rc: string;
    uso: string;
    surface: string;
    year: string;
    image_url?: string;
    source?: string;
    display_name?: string;
}

export default function BuildingDetails({ data }: { data: BuildingData }) {
    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-4">

            {/* Facade Image */}
            {data.image_url && (
                <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white p-2">
                    <img
                        src={data.image_url}
                        alt="Façana de l'edifici (Catastro)"
                        className="w-full h-64 object-cover rounded-lg hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                    <div className="text-center text-xs text-gray-400 mt-2">Imatge: Sede Electrónica del Catastro</div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Any de Construcció */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
                    <div className="p-3 bg-blue-50 rounded-full mb-3 text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="16" rx="2" /><line x1="16" y1="3" x2="16" y2="7" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="4" y1="11" x2="20" y2="11" /><rect x="8" y="15" width="2" height="2" /></svg>
                    </div>
                    <span className="text-gray-500 text-sm font-medium uppercase">Any Construcció</span>
                    <span className="text-3xl font-bold text-gray-900 mt-1">{data.year || '-'}</span>
                </div>

                {/* Superfície */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
                    <div className="p-3 bg-green-50 rounded-full mb-3 text-green-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M5 21V7l8-4 8 4v14" /><path d="M17 21v-8.5a1.5 1.5 0 0 0-1.5-1.5h-5a1.5 1.5 0 0 0-1.5 1.5V21" /></svg>
                    </div>
                    <span className="text-gray-500 text-sm font-medium uppercase">Superfície</span>
                    <span className="text-3xl font-bold text-gray-900 mt-1">{data.surface || '-'} <span className="text-lg text-gray-400 font-normal">m²</span></span>
                </div>

                {/* Ús Principal */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
                    <div className="p-3 bg-purple-50 rounded-full mb-3 text-purple-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M5 21V7l8-4 8 4v14" /><path d="M17 21v-8.5a1.5 1.5 0 0 0-1.5-1.5h-5a1.5 1.5 0 0 0-1.5 1.5V21" /></svg>
                    </div>
                    <span className="text-gray-500 text-sm font-medium uppercase">Ús Principal</span>
                    <span className="text-xl font-bold text-gray-900 mt-1 break-words w-full px-2">{data.uso || '-'}</span>
                </div>
            </div>

            {/* Data Sources Footer */}
            {data.source && (
                <div className="text-xs text-center text-gray-400 mt-4">
                    Dades complementàries: {data.source}
                </div>
            )}
        </div>
    );
}

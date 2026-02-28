import { Database, AlertTriangle, Lightbulb } from 'lucide-react';

export default function ExtractedDataView() {
    return (
        <div className="w-full flex justify-center animate-in slide-in-from-bottom-8 duration-500">
            <div className="surface-neu p-8 w-full">

                <h3 className="text-2xl font-bold mb-6 flex items-center">
                    <Database className="w-6 h-6 mr-3 text-primary" />
                    Extraction Matrix
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Methodology Card */}
                    <div className="surface-neu-pressed p-6 rounded-2xl">
                        <h4 className="font-semibold text-textMain mb-4 flex items-center">
                            <Lightbulb className="w-5 h-5 mr-2 text-primary" />
                            Methodology
                        </h4>
                        <ul className="space-y-3 text-sm">
                            <li className="flex justify-between border-b border-white/20 pb-2">
                                <span className="text-textLight">Datasets</span>
                                <span className="font-medium text-right">WMT 2014, WMT 2014 IT</span>
                            </li>
                            <li className="flex justify-between border-b border-white/20 pb-2">
                                <span className="text-textLight">Base Models</span>
                                <span className="font-medium text-right">Transformer (Base)</span>
                            </li>
                            <li className="flex justify-between pb-2">
                                <span className="text-textLight">Optimization</span>
                                <span className="font-medium text-right">Adam Optimizer</span>
                            </li>
                        </ul>
                    </div>

                    {/* Gap Radar Card */}
                    <div className="surface-neu-pressed p-6 rounded-2xl">
                        <h4 className="font-semibold text-textMain mb-4 flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
                            Gap Radar (Limitations)
                        </h4>
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                            <p className="text-sm font-medium text-amber-700">
                                "The model is currently restricted to text-to-text modalities."
                            </p>
                            <p className="text-xs text-amber-600/70 mt-2 font-semibold">Source context: Page 10</p>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

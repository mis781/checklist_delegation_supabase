import React, { useState } from 'react';
import { CreditCard, Banknote, Truck } from 'lucide-react';
import AdvancePayment from './AdvancePayment';
import VendorPayment from './VendorPayment';
import FreightPayment from './FreightPayment';

export default function Payment() {
  const [activeTab, setActiveTab] = useState('advance');

  return (
    <div className="h-full flex flex-col min-h-0 bg-slate-50/50">
      <div className="px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <CreditCard className="text-indigo-600" />
          Payments Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage advance, vendor, and freight payments.</p>
        
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            onClick={() => setActiveTab('advance')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'advance' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Banknote size={16} />
            Advance Payment
          </button>
          
          <button
            onClick={() => setActiveTab('vendor')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'vendor' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <CreditCard size={16} />
            Vendor Payment
          </button>
          
          <button
            onClick={() => setActiveTab('freight')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'freight' 
                ? 'bg-amber-600 text-white shadow-md' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Truck size={16} />
            Freight Payment
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'advance' && <AdvancePayment />}
        {activeTab === 'vendor' && <VendorPayment />}
        {activeTab === 'freight' && <FreightPayment />}
      </div>
    </div>
  );
}

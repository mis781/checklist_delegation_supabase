import React, { useState } from 'react';
import { Search, Plus, Users, Building2, Layers, FolderTree, Scale, Building, FileText, Truck, UserCircle, Package, Wallet } from 'lucide-react';
import PartyMaster from './PartyMaster';
import Division from './Division';
import UOM from './UOM';
import Item from './Item';
import TransportingType from './TransportingType';
import TransporterAgency from './TransporterAgency';
import OrderReceivedBy from './OrderReceivedBy';
import PaymentTerms from './PaymentTerms';

const masterTabs = [
  { id: 'Party', label: 'Party Details', icon: Users },
  { id: 'Division', label: 'Division Details', icon: Layers },
  { id: 'UOM', label: 'UOM', icon: Scale },
  { id: 'Product', label: 'Product Name', icon: Package },
  { id: 'Transporting Type', label: 'Transporting Type', icon: Truck },
  { id: 'Transporter Agency', label: 'Transporter Agency', icon: Truck },
  { id: 'Order Received By', label: 'Order Received By', icon: UserCircle },
  { id: 'Payment Terms', label: 'Payment Terms', icon: Wallet },
];

export default function Master() {
  const [activeTab, setActiveTab] = useState('Party');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Triggers to open Add Modal in child components
  const [triggerAddParty, setTriggerAddParty] = useState(0);
  const [triggerAddDivision, setTriggerAddDivision] = useState(0);
  const [triggerAddUOM, setTriggerAddUOM] = useState(0);
  const [triggerAddTT, setTriggerAddTT] = useState(0);
  const [triggerAddTA, setTriggerAddTA] = useState(0);
  const [triggerAddPerson, setTriggerAddPerson] = useState(0);
  const [triggerAddItem, setTriggerAddItem] = useState(0);
  const [triggerAddPT, setTriggerAddPT] = useState(0);

  const handleAddClick = () => {
    if (activeTab === 'Party') setTriggerAddParty(prev => prev + 1);
    else if (activeTab === 'Division') setTriggerAddDivision(prev => prev + 1);
    else if (activeTab === 'UOM') setTriggerAddUOM(prev => prev + 1);
    else if (activeTab === 'Product') setTriggerAddItem(prev => prev + 1);
    else if (activeTab === 'Transporting Type') setTriggerAddTT(prev => prev + 1);
    else if (activeTab === 'Transporter Agency') setTriggerAddTA(prev => prev + 1);
    else if (activeTab === 'Order Received By') setTriggerAddPerson(prev => prev + 1);
    else if (activeTab === 'Payment Terms') setTriggerAddPT(prev => prev + 1);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 bg-gray-50/50 p-2 lg:p-6 gap-4 lg:gap-6">
      {/* Left Sidebar for Master Data (Desktop) */}
      <div className="w-64 md:w-72 flex-shrink-0 flex-col bg-white rounded-xl border border-gray-100 shadow-sm hidden lg:flex overflow-hidden">
        <div className="px-6 py-6 border-b border-gray-100 bg-white">
          <h2 className="text-[12px] font-bold text-slate-400 tracking-[0.15em] uppercase">Master Data</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {masterTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                }}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-100/50 text-indigo-600 border-l-4 border-indigo-600' 
                    : 'text-gray-700 hover:bg-indigo-50/50 hover:text-indigo-600 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className="group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="font-black leading-tight whitespace-nowrap">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm">
        
        {/* Mobile Tabs (Horizontal Scroll) */}
        <div className="lg:hidden flex overflow-x-auto gap-2 p-3 border-b border-gray-100 scrollbar-hide">
          {masterTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
                className={`flex items-center gap-2 flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                  isActive ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-gray-50 text-gray-600 border border-gray-200'
                }`}
              >
                <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Header (Search & Actions) */}
        <div className="p-4 lg:p-5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-t-xl z-10">
          
          {/* Search */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab.toLowerCase()} details...`} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={handleAddClick}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-5 py-2 rounded-xl text-[13px] font-medium transition-all shadow-sm shadow-indigo-500/20"
            >
              <Plus size={16} strokeWidth={2.5} />
              Add Details
            </button>
          </div>
        </div>

        {/* Content Render */}
        <div className="flex-1 overflow-hidden bg-white flex flex-col relative rounded-b-xl">
            {activeTab === 'Party' && <PartyMaster searchQuery={searchQuery} triggerAdd={triggerAddParty} />}
            {activeTab === 'Division' && <Division searchQuery={searchQuery} triggerAdd={triggerAddDivision} />}
            {activeTab === 'UOM' && <UOM searchQuery={searchQuery} triggerAdd={triggerAddUOM} />}
            {activeTab === 'Product' && <Item searchQuery={searchQuery} triggerAdd={triggerAddItem} />}
            {activeTab === 'Transporting Type' && <TransportingType searchQuery={searchQuery} triggerAdd={triggerAddTT} />}
            {activeTab === 'Transporter Agency' && <TransporterAgency searchQuery={searchQuery} triggerAdd={triggerAddTA} />}
            {activeTab === 'Order Received By' && <OrderReceivedBy searchQuery={searchQuery} triggerAdd={triggerAddPerson} />}
            {activeTab === 'Payment Terms' && <PaymentTerms searchQuery={searchQuery} triggerAdd={triggerAddPT} />}
        </div>
      </div>
    </div>
  );
}

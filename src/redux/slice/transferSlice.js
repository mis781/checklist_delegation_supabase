// src/redux/slice/transferSlice.js
import { createSlice } from "@reduxjs/toolkit";

const LOCAL_STORAGE_KEY = "sp_transfer_requests";

// Load initial transfer requests from localStorage or provide sample mock data
const loadInitialTransfers = () => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error("Failed to load transfer requests from localStorage", err);
  }

  // Initial mock sample data for demonstration
  return [
    {
      id: "TRF-00001",
      fromDivision: "Division 1",
      toDivision: "Division 2",
      skuCode: "SKU-1001",
      skuName: "Steel Rod 12mm",
      quantity: 50,
      availableQty: 1800,
      transferDate: new Date().toISOString().slice(0, 10),
      fromLocation: "WH-A / Rack 1",
      toLocation: "WH-B / Rack 3",
      operatorName: "Arjun Mehta",
      remarks: "Urgent transfer for project B",
      newSkuCode: "SKU-1001-D2",
      status: "Pending",
      submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      approvedAt: null,
      approverName: null,
    },
    {
      id: "TRF-00002",
      fromDivision: "Division 2",
      toDivision: "Division 3",
      skuCode: "SKU-1002",
      skuName: "Copper Wire 2.5mm",
      quantity: 100,
      availableQty: 4200,
      transferDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      fromLocation: "WH-A / Rack 4",
      toLocation: "WH-C / Rack 2",
      operatorName: "Priya Sharma",
      remarks: "Regular stock rebalancing",
      newSkuCode: "SKU-1002-D3",
      status: "Approved",
      submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      approvedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      approverName: "test-user",
    },
  ];
};

const saveTransfersToStorage = (transfers) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(transfers));
  } catch (err) {
    console.error("Failed to save transfer requests to localStorage", err);
  }
};

const initialState = {
  transfers: loadInitialTransfers(),
};

const transferSlice = createSlice({
  name: "transfers",
  initialState,
  reducers: {
    // TODO: Wire to Supabase API when database backend is ready
    submitTransfer: (state, action) => {
      const nextSeq = state.transfers.length + 1;
      const newId = `TRF-${String(nextSeq).padStart(5, "0")}`;
      const newRecord = {
        id: newId,
        ...action.payload,
        status: "Pending",
        submittedAt: new Date().toISOString(),
        approvedAt: null,
        approverName: null,
      };
      state.transfers.unshift(newRecord);
      saveTransfersToStorage(state.transfers);
    },
    // TODO: Wire to Supabase API when database backend is ready
    approveTransfer: (state, action) => {
      const { id, approverName } = action.payload;
      const target = state.transfers.find((t) => t.id === id);
      if (target) {
        target.status = "Approved";
        target.approverName = approverName || "Admin";
        target.approvedAt = new Date().toISOString();
        saveTransfersToStorage(state.transfers);
      }
    },
    // TODO: Wire to Supabase API when database backend is ready
    rejectTransfer: (state, action) => {
      const { id, approverName } = action.payload;
      const target = state.transfers.find((t) => t.id === id);
      if (target) {
        target.status = "Rejected";
        target.approverName = approverName || "Admin";
        target.approvedAt = new Date().toISOString();
        saveTransfersToStorage(state.transfers);
      }
    },
  },
});

export const { submitTransfer, approveTransfer, rejectTransfer } =
  transferSlice.actions;

export default transferSlice.reducer;

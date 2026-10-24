// src/redux/slice/transferSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  fetchTransfersApi,
  submitTransferApi,
  approveTransferApi,
  rejectTransferApi,
  approveMultipleTransfersApi,
  rejectMultipleTransfersApi,
} from "../api/transferApi";
import { fetchInventoryData } from "./inventorySlice";

// Fetch transfers thunk
export const fetchTransfers = createAsyncThunk(
  "transfers/fetchTransfers",
  async (_, thunkAPI) => {
    const response = await fetchTransfersApi();
    if (response.error) return thunkAPI.rejectWithValue(response.error);
    return response.data;
  }
);

// Submit transfer thunk
export const submitTransfer = createAsyncThunk(
  "transfers/submitTransfer",
  async (payload, thunkAPI) => {
    const response = await submitTransferApi(payload);
    if (response.error) return thunkAPI.rejectWithValue(response.error);
    return response.data;
  }
);

// Approve transfer thunk
export const approveTransfer = createAsyncThunk(
  "transfers/approveTransfer",
  async ({ id, approverName }, thunkAPI) => {
    const response = await approveTransferApi(id, approverName);
    if (response.error) return thunkAPI.rejectWithValue(response.error);
    // Refresh inventory materials to reflect updated opening stocks & newly inserted rows
    thunkAPI.dispatch(fetchInventoryData());
    return response.data;
  }
);

// Reject transfer thunk
export const rejectTransfer = createAsyncThunk(
  "transfers/rejectTransfer",
  async ({ id, approverName }, thunkAPI) => {
    const response = await rejectTransferApi(id, approverName);
    if (response.error) return thunkAPI.rejectWithValue(response.error);
    return response.data;
  }
);

// Approve multiple transfers thunk
export const approveMultipleTransfers = createAsyncThunk(
  "transfers/approveMultipleTransfers",
  async ({ ids, approverName }, thunkAPI) => {
    const response = await approveMultipleTransfersApi(ids, approverName);
    if (response.error && (!response.data || response.data.length === 0)) {
      return thunkAPI.rejectWithValue(response.error);
    }
    // Refresh inventory materials and full transfer list
    thunkAPI.dispatch(fetchInventoryData());
    thunkAPI.dispatch(fetchTransfers());
    return response.data;
  }
);

// Reject multiple transfers thunk
export const rejectMultipleTransfers = createAsyncThunk(
  "transfers/rejectMultipleTransfers",
  async ({ ids, approverName }, thunkAPI) => {
    const response = await rejectMultipleTransfersApi(ids, approverName);
    if (response.error && (!response.data || response.data.length === 0)) {
      return thunkAPI.rejectWithValue(response.error);
    }
    thunkAPI.dispatch(fetchTransfers());
    return response.data;
  }
);

const initialState = {
  transfers: [],
  loading: false,
  submitting: false,
  error: null,
};

const transferSlice = createSlice({
  name: "transfers",
  initialState,
  reducers: {
    setTransfers: (state, action) => {
      state.transfers = action.payload || [];
    },
    clearTransferError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTransfers
      .addCase(fetchTransfers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransfers.fulfilled, (state, action) => {
        state.loading = false;
        state.transfers = action.payload || [];
      })
      .addCase(fetchTransfers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch transfers";
      })
      // submitTransfer
      .addCase(submitTransfer.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitTransfer.fulfilled, (state, action) => {
        state.submitting = false;
        if (action.payload) {
          state.transfers = [action.payload, ...state.transfers.filter((t) => t.id !== action.payload.id)];
        }
      })
      .addCase(submitTransfer.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || "Failed to submit transfer";
      })
      // approveTransfer
      .addCase(approveTransfer.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.transfers.findIndex((t) => t.id === action.payload.id);
          if (index !== -1) {
            state.transfers[index] = action.payload;
          }
        }
      })
      // rejectTransfer
      .addCase(rejectTransfer.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.transfers.findIndex((t) => t.id === action.payload.id);
          if (index !== -1) {
            state.transfers[index] = action.payload;
          }
        }
      })
      // approveMultipleTransfers
      .addCase(approveMultipleTransfers.fulfilled, (state, action) => {
        if (Array.isArray(action.payload)) {
          const updatedMap = new Map(action.payload.map((item) => [item.id, item]));
          state.transfers = state.transfers.map((t) => updatedMap.get(t.id) || t);
        }
      })
      // rejectMultipleTransfers
      .addCase(rejectMultipleTransfers.fulfilled, (state, action) => {
        if (Array.isArray(action.payload)) {
          const updatedMap = new Map(action.payload.map((item) => [item.id, item]));
          state.transfers = state.transfers.map((t) => updatedMap.get(t.id) || t);
        }
      });
  },
});

export const { setTransfers, clearTransferError } = transferSlice.actions;
export default transferSlice.reducer;

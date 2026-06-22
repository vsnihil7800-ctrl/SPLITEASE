import { useEffect, useState, useCallback } from "react";
import {
  getBillsByGroupRequest,
  createBillRequest,
  markBillPaidRequest,
  deleteBillRequest,
} from "../api/bills";
import { useAuth } from "../context/useAuth";
import Button from "./Button";
import Modal from "./Modal";
import BillCard from "./BillCard";
import AddBillForm from "./AddBillForm";

export default function BillsPanel({ groupId, members }) {
  const { user } = useAuth();

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const [showAddBill, setShowAddBill] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchBills = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getBillsByGroupRequest(groupId);
      setBills(res.data.bills);
    } catch (e) {
      setError(e.response?.data?.message || "Couldn't load bills.");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleAddBill = async (payload) => {
    setFormError("");
    setFormSubmitting(true);
    try {
      await createBillRequest({ ...payload, groupId });
      setShowAddBill(false);
      await fetchBills();
    } catch (e) {
      setFormError(e.response?.data?.message || "Couldn't add the bill.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleMarkPaid = async (billId, userId) => {
    try {
      await markBillPaidRequest(billId, userId);
      await fetchBills();
    } catch (e) {
      setError(e.response?.data?.message || "Couldn't mark that share as paid.");
    }
  };

  const handleDeleteBill = async (billId) => {
    setDeletingId(billId);
    try {
      await deleteBillRequest(billId);
      await fetchBills();
    } catch (e) {
      setError(e.response?.data?.message || "Couldn't delete the bill.");
    } finally {
      setDeletingId(null);
    }
  };

  // Sort: unpaid (overdue first, then soonest due) ahead of fully paid bills
  const sortedBills = [...bills].sort((a, b) => {
    if (a.status === "paid" && b.status !== "paid") return 1;
    if (a.status !== "paid" && b.status === "paid") return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Bills</h2>
        <Button
          variant="accent"
          onClick={() => {
            setFormError("");
            setShowAddBill(true);
          }}
        >
          + Add bill
        </Button>
      </div>

      <div className="mt-3">
        {loading && <p className="text-sm text-muted">Loading bills…</p>}

        {!loading && error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
        )}

        {!loading && !error && sortedBills.length === 0 && (
          <div className="rounded-2xl border border-dashed border-hairline bg-surface/50 p-8 text-center">
            <p className="text-sm text-muted">
              No bills yet. Add a recurring bill like rent or WiFi to track who's
              paid their share.
            </p>
          </div>
        )}

        {!loading && !error && sortedBills.length > 0 && (
          <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
            {sortedBills.map((bill) => (
              <BillCard
                key={bill._id}
                bill={bill}
                currentUserId={user?.id}
                onMarkPaid={handleMarkPaid}
                onDelete={handleDeleteBill}
                deleting={deletingId === bill._id}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showAddBill}
        onClose={() => setShowAddBill(false)}
        title="Add a bill"
      >
        <AddBillForm
          members={members}
          currentUserId={user?.id}
          onCreate={handleAddBill}
          submitting={formSubmitting}
          error={formError}
        />
      </Modal>
    </div>
  );
}

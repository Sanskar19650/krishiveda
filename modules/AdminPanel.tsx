import React, { useEffect, useState } from "react";
import { Language } from "../translations";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from "firebase/firestore";

interface AdminPanelProps {
  lang: Language;
}

const AdminPanel: React.FC<AdminPanelProps> = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState({
    users: 0,
    revenue: 0,
    listings: 0,
    soilTests: 0
  });

  /* ============================
     🔥 LOAD ALL ADMIN DATA
     ============================ */
  const loadData = async () => {
    /* USERS */
    const userSnap = await getDocs(collection(db, "users"));
    const userData = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setUsers(userData);

    /* PRODUCTS */
    const productSnap = await getDocs(collection(db, "products"));
    const productData = productSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setProducts(productData);

    /* ANALYTICS */
    const orderSnap = await getDocs(collection(db, "orders"));
    let revenue = 0;
    orderSnap.docs.forEach(d => revenue += Number(d.data().amount || 0));

    const soilSnap = await getDocs(collection(db, "soilTests"));

    setAnalytics({
      users: userData.length,
      listings: productData.length,
      revenue,
      soilTests: soilSnap.size
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ============================
     🚫 ENABLE / DISABLE USER
     ============================ */
  const toggleUserStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, "users", id), {
      status: status === "ACTIVE" ? "DISABLED" : "ACTIVE"
    });
    loadData();
  };

  /* ============================
     📦 APPROVE PRODUCT
     ============================ */
  const approveProduct = async (id: string, status: string) => {
    await updateDoc(doc(db, "products", id), {
      status
    });
    loadData();
  };

  return (
    <div className="p-10 space-y-16">

      {/* ============================
         📈 ANALYTICS
         ============================ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Users", value: analytics.users },
          { label: "Revenue", value: `₹${analytics.revenue}` },
          { label: "Listings", value: analytics.listings },
          { label: "Soil Tests", value: analytics.soilTests }
        ].map((a, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow">
            <p className="text-xs text-stone-400">{a.label}</p>
            <p className="text-3xl font-black">{a.value}</p>
          </div>
        ))}
      </div>

      {/* ============================
         📊 USER TABLE
         ============================ */}
      <section>
        <h2 className="text-2xl font-black mb-4">Users</h2>
        <table className="w-full border">
          <thead className="bg-stone-100">
            <tr>
              <th className="p-2">Phone</th>
              <th className="p-2">Role</th>
              <th className="p-2">Status</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="p-2">{u.phone}</td>
                <td className="p-2 font-bold">{u.role}</td>
                <td className="p-2">{u.status}</td>
                <td className="p-2">
                  <button
                    onClick={() => toggleUserStatus(u.id, u.status)}
                    className={`px-3 py-1 rounded text-white ${
                      u.status === "ACTIVE" ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                  >
                    {u.status === "ACTIVE" ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ============================
         📦 PRODUCT APPROVAL
         ============================ */}
      <section>
        <h2 className="text-2xl font-black mb-4">Product Listings</h2>
        <table className="w-full border">
          <thead className="bg-stone-100">
            <tr>
              <th className="p-2">Product</th>
              <th className="p-2">Price</th>
              <th className="p-2">Status</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td className="p-2">{p.name}</td>
                <td className="p-2">₹{p.price}</td>
                <td className="p-2 font-bold">{p.status}</td>
                <td className="p-2 space-x-2">
                  <button
                    onClick={() => approveProduct(p.id, "APPROVED")}
                    className="px-3 py-1 bg-emerald-500 text-white rounded"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => approveProduct(p.id, "REJECTED")}
                    className="px-3 py-1 bg-rose-500 text-white rounded"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default AdminPanel;

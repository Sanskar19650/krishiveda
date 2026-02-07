import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  Timestamp
} from "firebase/firestore";

/* ============================
   TYPES
============================ */
interface User {
  id: string;
  phone: string;
  role: string;
  status: "ACTIVE" | "DISABLED";
}

interface Product {
  id: string;
  name: string;
  price: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

interface Analytics {
  users: number;
  revenue: number;
  listings: number;
  soilTests: number;
}

/* ============================
   ADMIN PANEL
============================ */
const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    users: 0,
    revenue: 0,
    listings: 0,
    soilTests: 0,
  });

  const [loading, setLoading] = useState(true);

  /* ============================
     LOAD ALL ADMIN DATA
  ============================ */
  const loadData = async () => {
    try {
      setLoading(true);

      /* USERS */
      const userSnap = await getDocs(collection(db, "users"));
      const userData = userSnap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<User, "id">),
      }));
      setUsers(userData);

      /* PRODUCTS */
      const productSnap = await getDocs(collection(db, "products"));
      const productData = productSnap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<Product, "id">),
      }));
      setProducts(productData);

      /* ORDERS → REVENUE */
      const orderSnap = await getDocs(collection(db, "orders"));
      let revenue = 0;
      orderSnap.forEach(d => {
        revenue += Number(d.data().amount || 0);
      });

      /* SOIL TESTS (⚠ correct name) */
      const soilSnap = await getDocs(collection(db, "soil_tests"));

      setAnalytics({
        users: userData.length,
        listings: productData.length,
        revenue,
        soilTests: soilSnap.size,
      });
    } catch (err) {
      console.error("Admin load error:", err);
      alert("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ============================
     ENABLE / DISABLE USER
  ============================ */
  const toggleUserStatus = async (user: User) => {
    await updateDoc(doc(db, "users", user.id), {
      status: user.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
      updatedAt: Timestamp.now(),
    });
    loadData();
  };

  /* ============================
     APPROVE / REJECT PRODUCT
  ============================ */
  const updateProductStatus = async (
    id: string,
    status: Product["status"]
  ) => {
    await updateDoc(doc(db, "products", id), {
      status,
      reviewedAt: Timestamp.now(),
    });
    loadData();
  };

  /* ============================
     UI
  ============================ */
  if (loading) {
    return (
      <div className="p-10 text-center text-xl font-bold">
        Loading Admin Dashboard…
      </div>
    );
  }

  return (
    <div className="p-10 space-y-16">

      {/* ANALYTICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Users", value: analytics.users },
          { label: "Revenue", value: `₹${analytics.revenue}` },
          { label: "Listings", value: analytics.listings },
          { label: "Soil Tests", value: analytics.soilTests },
        ].map((a, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow">
            <p className="text-xs text-stone-400">{a.label}</p>
            <p className="text-3xl font-black">{a.value}</p>
          </div>
        ))}
      </div>

      {/* USERS */}
      <section>
        <h2 className="text-2xl font-black mb-4">Users</h2>
        <table className="w-full border bg-white">
          <thead className="bg-stone-100">
            <tr>
              <th className="p-2 text-left">Phone</th>
              <th className="p-2">Role</th>
              <th className="p-2">Status</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.phone}</td>
                <td className="p-2 font-bold">{u.role}</td>
                <td className="p-2">{u.status}</td>
                <td className="p-2">
                  <button
                    onClick={() => toggleUserStatus(u)}
                    className={`px-3 py-1 rounded text-white ${
                      u.status === "ACTIVE"
                        ? "bg-rose-500"
                        : "bg-emerald-500"
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

      {/* PRODUCTS */}
      <section>
        <h2 className="text-2xl font-black mb-4">Product Listings</h2>
        <table className="w-full border bg-white">
          <thead className="bg-stone-100">
            <tr>
              <th className="p-2 text-left">Product</th>
              <th className="p-2">Price</th>
              <th className="p-2">Status</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.name}</td>
                <td className="p-2">₹{p.price}</td>
                <td className="p-2 font-bold">{p.status}</td>
                <td className="p-2 space-x-2">
                  <button
                    onClick={() => updateProductStatus(p.id, "APPROVED")}
                    className="px-3 py-1 bg-emerald-500 text-white rounded"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateProductStatus(p.id, "REJECTED")}
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

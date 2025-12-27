import { db } from "../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

export const getCachedMarketRates = async (
  commodity: string,
  district: string
) => {
  const date = today();
  const docId = `${district}_${commodity}_${date}`;
  const ref = doc(db, "liveRates", docId);

  // 🔹 1. Try Firestore
  const snap = await getDoc(ref);
  if (snap.exists()) {
    console.log("✅ Loaded from Firestore cache");
    return snap.data().rates;
  }

  // 🔹 2. Fetch from API
  console.log("🌐 Fetching from Agmarknet API");
  const url = `https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24
    ?api-key=${import.meta.env.local.VITE_DATA_GOV_API}
    &format=json
    &filters[State]=Maharashtra
    &filters[District]=${district}
    &filters[Commodity]=${commodity}`;

  const res = await fetch(url);
  const data = await res.json();

  const rates =
    data.records?.map((r: any) => ({
      market: r.Market,
      price: Number(r.Modal_Price)
    })) || [];

  // 🔹 3. Save to Firestore
  await setDoc(ref, {
    district,
    commodity,
    date,
    rates,
    createdAt: serverTimestamp()
  });

  return rates;
};

const today = () => new Date().toISOString().split("T")[0];

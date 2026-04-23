"use client";

import Navbar from "@/components/Navbar";
import ItemCard from "@/components/ItemCard";
import UndoButton from "@/components/UndoButton";
import { Calendar, SlidersHorizontal, ChevronDown, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

const RENTAL_DATA = [
  {
    id: "r1",
    title: "Casio fx-991EX ClassWiz",
    price: 3000,
    category: "Electronics",
    type: "RENT",
    condition: "Excellent",
    isRental: true,
    image: "https://loremflickr.com/800/600/calculator,scientific"
  },
  {
    id: "r2",
    title: "Electric Kettle (Pigeon 1.5L)",
    price: 2500,
    category: "Appliances",
    type: "RENT",
    condition: "Good",
    isRental: true,
    image: "https://loremflickr.com/800/600/kettle,electric"
  },
  {
    id: "r3",
    title: "Engineering Drafter & Board",
    price: 4000,
    category: "Lab Gear",
    type: "RENT",
    condition: "Fair",
    isRental: true,
    image: "https://loremflickr.com/800/600/drafting,board"
  },
  {
    id: "r4",
    title: "Mi Power Bank 3i 20000mAh",
    price: 5000,
    category: "Electronics",
    type: "RENT",
    condition: "New",
    isRental: true,
    image: "https://loremflickr.com/800/600/powerbank"
  },
  {
    id: "r5",
    title: "Badminton Racket (Yonex)",
    price: 2000,
    category: "Sports",
    type: "RENT",
    condition: "Well Used",
    isRental: true,
    image: "https://loremflickr.com/800/600/badminton,racket"
  },
  {
    id: "r6",
    title: "Iron Box (Bajaj)",
    price: 1500,
    category: "Appliances",
    type: "RENT",
    condition: "Working",
    isRental: true,
    image: "https://loremflickr.com/800/600/iron,box"
  }
];

export default function RentalsPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      {/* Header */}
      <header className="bg-accent-teal text-white py-16 border-b-4 border-black">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8">
            <div className="space-y-4">
              <div className="inline-block bg-black text-accent-lime px-3 py-1 text-xs font-black uppercase italic tracking-widest border-2 border-black">
                Rentals & Shared Gear
              </div>
              <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic">
                Borrow <span className="text-black">Smarten</span>
              </h1>
              <p className="text-xl font-bold opacity-90 max-w-xl">
                Need a drafter for one lab? An iron for an interview? Rent it from your dorm mates for a few bucks.
              </p>
            </div>

            <div className="w-full md:w-auto card-neo bg-white text-black p-6 space-y-4">
              <div className="flex items-center gap-2 font-black uppercase text-sm">
                <Calendar size={18} /> Select Dates
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-gray-400">From</p>
                  <input type="date" className="input-neo py-2 px-3 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-gray-400">Until</p>
                  <input type="date" className="input-neo py-2 px-3 text-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 text-black">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Filters */}
          <aside className="w-full lg:w-72 space-y-8">
            <div className="card-neo bg-accent-cyan p-6">
              <h3 className="text-xl font-black uppercase mb-4 italic">Safety First</h3>
              <ul className="space-y-3 font-bold text-sm">
                <li className="flex gap-2"><ShieldCheck size={18} /> Verified IDs</li>
                <li className="flex gap-2"><ShieldCheck size={18} /> Deposit Escrow</li>
                <li className="flex gap-2"><ShieldCheck size={18} /> UPI Protection</li>
              </ul>
            </div>

            <div className="space-y-6">
              <div>
                <SlidersHorizontal size={18} /> Filtering
                <div className="space-y-4">
                  <div className="card-neo bg-white p-4">
                    <p className="text-xs font-black uppercase mb-3">Price / Day</p>
                    <input type="range" className="w-full accent-black" />
                    <div className="flex justify-between font-bold text-[10px] mt-1">
                      <span>₹10</span>
                      <span>₹200+</span>
                    </div>
                  </div>

                  <div className="card-neo bg-white p-4">
                    <p className="text-xs font-black uppercase mb-3">Hostel Block</p>
                    <div className="relative">
                      <select className="w-full appearance-none border-2 border-black p-2 font-bold text-xs">
                        <option>All Blocks</option>
                        <option>Block A</option>
                        <option>Block B</option>
                        <option>Canteen Area</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" size={14} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Listing Grid */}
          <section className="flex-1">
            <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-black text-black">
              <div className="font-black uppercase italic text-gray-500 tracking-tight">
                MLRIT <span className="text-black">RENTALS HUB</span> | {RENTAL_DATA.length} ITEMS AVAILABLE
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {RENTAL_DATA.map((item) => (
                <ItemCard
                  key={item.id}
                  id={item.id}
                  name={item.title}
                  category={item.category}
                  condition={item.condition}
                  type={item.type === "RENT" ? "Rent" : item.type}
                  pricePerDay={item.price}
                  images={[item.image]}
                  currentState="Available"
                  ownerID={{ username: "CampusOwner", reputationScore: 10 }}
                />
              ))}
            </div>

            {/* Empty State / Bottom Info */}
            <div className="mt-16 card-neo bg-white p-12 text-center space-y-6 text-black">
              <div className="text-5xl">⚡</div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Don&apos;t see what you need?</h2>
              <p className="font-bold text-gray-600 max-w-md mx-auto italic">
                Post a &quot;Wishlist&quot; request and let someone in the campus know you&apos;re looking to rent.
              </p>
              <button
                onClick={() => router.push("/create-listing")}
                className="btn-neo bg-accent-teal text-white px-8 py-3 text-lg"
              >
                LIST AN ITEM
              </button>
            </div>
          </section>
        </div>
      </div>

      <UndoButton />
    </main>
  );
}

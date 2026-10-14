/**
 * Shop types and the items each one usually sells. Used to suggest item names while the
 * owner types an entry or checks a scanned bill, and to tell the AI what kind of shop it reads for.
 * Suggestions are only for typing faster; the owner can write any item.
 */
export const SHOP_TYPES = ["kirana", "medical", "clothes"] as const;
export type ShopType = (typeof SHOP_TYPES)[number];
export const isShopType = (v: unknown): v is ShopType => SHOP_TYPES.includes(v as ShopType);

export const CATALOG: Record<ShopType, string[]> = {
  kirana: [
    "Atta", "Rice", "Sugar", "Toor Dal", "Moong Dal", "Chana Dal", "Mustard Oil", "Refined Oil", "Ghee",
    "Tea", "Milk", "Curd", "Paneer", "Bread", "Eggs", "Biscuits", "Namkeen", "Maggi", "Salt", "Haldi",
    "Mirch Powder", "Jeera", "Besan", "Poha", "Soap", "Detergent", "Toothpaste", "Shampoo", "Matchbox", "Agarbatti",
  ],
  medical: [
    "Paracetamol 500", "Dolo 650", "Crocin", "Cetirizine", "ORS", "Digene", "Eno", "Pantoprazole", "Vitamin C",
    "B-Complex", "Calcium", "Cough Syrup", "Vicks VapoRub", "Volini", "Moov", "Band-Aid", "Cotton", "Bandage",
    "Dettol", "Savlon", "Hand Sanitizer", "Thermometer", "BP Monitor", "Glucose Strips", "Sanitary Pads",
    "Baby Diapers", "Face Mask", "Eye Drops", "Antiseptic Cream", "Protein Powder",
  ],
  clothes: [
    "Shirt", "T-Shirt", "Jeans", "Trousers", "Kurta", "Kurti", "Saree", "Salwar Suit", "Leggings", "Dupatta",
    "Lehenga", "Sherwani", "Blazer", "Jacket", "Sweater", "Shawl", "Kids Frock", "Kids Set", "Night Suit",
    "Pyjama", "Banian", "Innerwear", "Socks", "Handkerchief", "Towel", "Bedsheet", "Blanket", "Cap", "Belt", "School Uniform",
  ],
};

/** What the AI should know when reading this shop's entries and bills. */
export const AI_CONTEXT: Record<ShopType, string> = {
  kirana:
    "The shop is an Indian kirana (grocery) store. Items are groceries and household goods; quantities are usually kg, g, L, packets or pieces.",
  medical:
    "The shop is an Indian medical store (chemist / pharmacy). Items are medicines and health products: keep the brand or generic name with its strength exactly as written (e.g. \"Dolo 650\", \"Pantoprazole 40\"), and quantities like strips, tablets, bottles or tubes. Never change or guess a medicine name.",
  clothes:
    "The shop is an Indian clothing / garments store. Items are clothes and textiles: keep size and colour if written (e.g. \"Shirt (L, blue)\"), and quantities as pieces, sets or metres.",
};

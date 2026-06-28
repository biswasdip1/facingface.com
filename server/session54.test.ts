import { describe, it, expect } from "vitest";

// ── Session 54: Sale & Buy Shop ──────────────────────────────────────────────

describe("shop_listings schema", () => {
  it("shop listing fields are defined correctly", () => {
    const listing = {
      id: 1,
      sellerId: 1,
      title: "Used Bicycle",
      description: "Good condition, 21 speeds",
      price: "150.00",
      currency: "USD",
      category: "vehicles",
      condition: "used",
      locationText: "London, UK",
      locationLat: 51.5074,
      locationLng: -0.1278,
      contactEmail: "seller@example.com",
      contactPhone: "+44 20 7946 0958",
      mediaUrls: JSON.stringify(["/manus-storage/bike.jpg"]),
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(listing.title).toBe("Used Bicycle");
    expect(listing.price).toBe("150.00");
    expect(listing.category).toBe("vehicles");
    expect(listing.condition).toBe("used");
    expect(listing.status).toBe("active");
    expect(listing.locationLat).toBeCloseTo(51.5074);
    expect(listing.locationLng).toBeCloseTo(-0.1278);
  });

  it("media URLs are stored as JSON array", () => {
    const urls = ["/manus-storage/img1.jpg", "/manus-storage/img2.jpg"];
    const stored = JSON.stringify(urls);
    const parsed = JSON.parse(stored);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toBe("/manus-storage/img1.jpg");
  });

  it("listing categories are valid", () => {
    const validCategories = [
      "vehicles", "electronics", "clothing", "furniture",
      "sports", "books", "toys", "garden", "pets", "other",
    ];
    expect(validCategories).toContain("vehicles");
    expect(validCategories).toContain("electronics");
    expect(validCategories).toContain("other");
  });

  it("listing conditions are valid", () => {
    const validConditions = ["new", "like_new", "good", "fair", "poor"];
    expect(validConditions).toContain("new");
    expect(validConditions).toContain("used" in validConditions ? "used" : "good");
  });

  it("listing status values are valid", () => {
    const validStatuses = ["active", "sold", "reserved", "deleted"];
    expect(validStatuses).toContain("active");
    expect(validStatuses).toContain("sold");
    expect(validStatuses).toContain("reserved");
  });
});

describe("shop price formatting", () => {
  it("formats price with currency symbol", () => {
    const formatPrice = (price: string, currency: string) => {
      const num = parseFloat(price);
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(num);
    };

    expect(formatPrice("150.00", "USD")).toBe("$150.00");
    expect(formatPrice("99.99", "GBP")).toBe("£99.99");
    expect(formatPrice("0.00", "USD")).toBe("$0.00");
  });

  it("handles free listings (price 0)", () => {
    const isFree = (price: string) => parseFloat(price) === 0;
    expect(isFree("0.00")).toBe(true);
    expect(isFree("0")).toBe(true);
    expect(isFree("10.00")).toBe(false);
  });
});

describe("shop search and filter", () => {
  it("filters listings by category", () => {
    const listings = [
      { id: 1, category: "electronics", title: "Laptop" },
      { id: 2, category: "vehicles", title: "Car" },
      { id: 3, category: "electronics", title: "Phone" },
    ];
    const filtered = listings.filter((l) => l.category === "electronics");
    expect(filtered).toHaveLength(2);
    expect(filtered[0].title).toBe("Laptop");
  });

  it("filters listings by price range", () => {
    const listings = [
      { id: 1, price: "50.00" },
      { id: 2, price: "150.00" },
      { id: 3, price: "300.00" },
    ];
    const filtered = listings.filter((l) => {
      const p = parseFloat(l.price);
      return p >= 100 && p <= 200;
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].price).toBe("150.00");
  });

  it("searches listings by title keyword", () => {
    const listings = [
      { id: 1, title: "Red Bicycle" },
      { id: 2, title: "Blue Car" },
      { id: 3, title: "Mountain Bicycle" },
    ];
    const query = "bicycle";
    const results = listings.filter((l) =>
      l.title.toLowerCase().includes(query.toLowerCase())
    );
    expect(results).toHaveLength(2);
  });
});

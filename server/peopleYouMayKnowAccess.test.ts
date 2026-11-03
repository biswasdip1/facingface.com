import { describe, expect, it } from "vitest";
import { filterPeopleYouMayKnowCandidates } from "./peopleYouMayKnowAccess";

describe("People You May Know exclusion policy", () => {
  const candidates = [
    { id: 11, name: "Asha", avatar: null, isVerified: true },
    { id: 22, name: "Bhim", avatar: "/media/bhim.jpg", isVerified: false },
    { id: 33, name: "Chandra", avatar: null, isVerified: false },
  ];

  it("keeps candidates that have not been globally removed", () => {
    expect(filterPeopleYouMayKnowCandidates(candidates, [])).toEqual(candidates);
  });

  it("removes only globally excluded members from suggestion results", () => {
    expect(filterPeopleYouMayKnowCandidates(candidates, [22])).toEqual([
      candidates[0],
      candidates[2],
    ]);
  });
});

# Live `/shop/new` check notes

Visited `https://www.facingface.com/shop/new` from the sandbox browser on 2026-05-20. The sandbox browser is not authenticated and was redirected to the FacingFace login page, so the live upload and publish action could not be directly exercised without user login/session takeover.

The user's provided screenshot remains the primary live evidence: the selected photo preview appears as a broken image in the Photos & Videos area, and the Publish Listing button does not complete. This points to an upload response/path handling problem before or during listing submission, plus possible PostgreSQL compatibility issues in the listing insertion path.
